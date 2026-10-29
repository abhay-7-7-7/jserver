import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { StateManager } from './stateManager.js';
import { SSEManager } from './sseManager.js';
import { config } from './config.js';
import { validateTelemetry } from './telemetryValidator.js';

export function createApp(stateManager: StateManager, sseManager: SSEManager): Express {
  const app: Express = express();

  // Basic security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Don't interfere with SSE and development assets
      crossOriginEmbedderPolicy: false,
    })
  );

  // Enable CORS
  app.use(
    cors({
      origin: '*', // Allows local dev frontend at localhost:5173
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '100kb' }));

  // Root / Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  // GET /api/status - current system status snapshot
  app.get('/api/status', (_req: Request, res: Response) => {
    const clientsCount = sseManager.getConnectedClientsCount();
    const snapshot = stateManager.getSnapshot(clientsCount);
    res.json(snapshot);
  });

  // GET /api/history - bounded array of valid historical telemetry readings
  app.get('/api/history', (_req: Request, res: Response) => {
    const history = stateManager.getHistory();
    res.json({
      count: history.length,
      history,
    });
  });

  // GET /api/stream - Server-Sent Events endpoint
  app.get('/api/stream', (req: Request, res: Response) => {
    sseManager.handleConnection(req, res);
  });

  // POST /api/test/telemetry - Protected test injection endpoint (dev only)
  app.post('/api/test/telemetry', (req: Request, res: Response) => {
    // Strictly disable if not allowed in config or in production
    if (!config.allowTestInjection || config.nodeEnv === 'production') {
      res.status(403).json({
        success: false,
        error: 'Test telemetry injection is disabled in this environment',
      });
      return;
    }

    const validation = validateTelemetry(req.body, Date.now());
    if (!validation.success) {
      stateManager.recordRejectedMessage(validation.error, validation.isSensorError);
      res.status(400).json({
        success: false,
        error: validation.error,
        isSensorError: validation.isSensorError,
      });
      return;
    }

    stateManager.recordTelemetry(validation.data);
    res.status(200).json({
      success: true,
      message: 'Telemetry injected successfully',
      data: validation.data,
    });
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Central error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
