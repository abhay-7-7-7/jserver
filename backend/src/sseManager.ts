import { Response, Request } from 'express';
import { StateManager } from './stateManager.js';
import { SSEEvent } from './types.js';

interface ClientConnection {
  id: string;
  res: Response;
  req: Request;
  connectedAt: Date;
}

export class SSEManager {
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;

    // Listen to state manager events and broadcast immediately
    this.stateManager.on('telemetry', (payload) => {
      this.broadcast({
        type: 'telemetry',
        data: payload.telemetry,
        systemStatus: payload.systemStatus,
        dataAgeMs: payload.dataAgeMs,
        isStale: payload.isStale,
      });
    });

    this.stateManager.on('status_change', (payload) => {
      this.broadcast({
        type: 'status',
        data: {
          mqttStatus: payload.mqttStatus,
          esp32Status: payload.esp32Status,
          systemStatus: payload.systemStatus,
          isStale: payload.isStale,
          dataAgeMs: payload.dataAgeMs,
        },
      });
    });

    this.stateManager.on('stale_change', (payload) => {
      this.broadcast({
        type: 'stale',
        data: {
          isStale: payload.isStale,
          systemStatus: payload.systemStatus,
          dataAgeMs: payload.dataAgeMs,
        },
      });
    });

    // Start 15-second heartbeat to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: 'heartbeat',
        data: { timestamp: Date.now() },
      });
    }, 15000);
  }

  /**
   * Register a new SSE connection
   */
  public handleConnection(req: Request, res: Response): void {
    const clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Set proper SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    // Flush headers if supported
    res.flushHeaders?.();

    const client: ClientConnection = {
      id: clientId,
      res,
      req,
      connectedAt: new Date(),
    };

    this.clients.set(clientId, client);

    // Clean up on disconnect
    req.on('close', () => {
      this.clients.delete(clientId);
    });

    req.on('error', () => {
      this.clients.delete(clientId);
    });

    // Send initial snapshot immediately upon connection
    const snapshot = this.stateManager.getSnapshot(this.clients.size);
    const history = this.stateManager.getHistory();

    this.sendToClient(client, {
      type: 'snapshot',
      data: {
        ...snapshot,
        history,
      },
    });
  }

  /**
   * Send SSE event to a specific client
   */
  private sendToClient(client: ClientConnection, event: SSEEvent): void {
    try {
      client.res.write(`event: ${event.type}\n`);
      client.res.write(`data: ${JSON.stringify(event.type === 'snapshot' ? event.data : ('data' in event ? event : {}))}\n\n`);
    } catch {
      this.clients.delete(client.id);
    }
  }

  /**
   * Broadcast an event to all connected SSE clients
   */
  public broadcast(event: SSEEvent): void {
    if (this.clients.size === 0) return;

    const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(payload);
      } catch {
        this.clients.delete(id);
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const [, client] of this.clients) {
      try {
        client.res.end();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
  }
}
