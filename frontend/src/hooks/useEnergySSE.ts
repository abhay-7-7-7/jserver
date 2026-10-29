import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ValidatedTelemetry,
  SystemOperationalStatus,
  MqttConnectionState,
  SystemStateSnapshot,
  SSEConnectionState,
} from '../types';

interface UseEnergySSEReturn {
  telemetry: ValidatedTelemetry | null;
  history: ValidatedTelemetry[];
  systemStatus: SystemOperationalStatus;
  mqttStatus: MqttConnectionState;
  esp32Status: string;
  mqttBroker: string;
  lastValidTimestamp: number | null;
  dataAgeMs: number | null;
  isStale: boolean;
  isOverload: boolean;
  isSensorError: boolean;
  metrics: {
    validMessagesCount: number;
    rejectedMessagesCount: number;
    sseClientsCount: number;
    uptimeSeconds: number;
  };
  stalenessTimeoutMs: number;
  sseState: SSEConnectionState;
  reconnect: () => void;
}

export function useEnergySSE(): UseEnergySSEReturn {
  const [telemetry, setTelemetry] = useState<ValidatedTelemetry | null>(null);
  const [history, setHistory] = useState<ValidatedTelemetry[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemOperationalStatus>('DISCONNECTED');
  const [mqttStatus, setMqttStatus] = useState<MqttConnectionState>('CONNECTING');
  const [esp32Status, setEsp32Status] = useState<string>('unknown');
  const [mqttBroker, setMqttBroker] = useState<string>('mqtt.dev.geotechs.in:1883');
  const [lastValidTimestamp, setLastValidTimestamp] = useState<number | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [isOverload, setIsOverload] = useState<boolean>(false);
  const [isSensorError, setIsSensorError] = useState<boolean>(false);
  const [metrics, setMetrics] = useState({
    validMessagesCount: 0,
    rejectedMessagesCount: 0,
    sseClientsCount: 0,
    uptimeSeconds: 0,
  });
  const [stalenessTimeoutMs, setStalenessTimeoutMs] = useState<number>(5000);

  const [sseState, setSseState] = useState<SSEConnectionState>({
    isConnected: false,
    isConnecting: true,
    error: null,
  });

  const [liveAgeMs, setLiveAgeMs] = useState<number | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate live age every 250ms for smooth UI feedback
  useEffect(() => {
    ageIntervalRef.current = setInterval(() => {
      if (lastValidTimestamp) {
        const age = Math.max(0, Date.now() - lastValidTimestamp);
        setLiveAgeMs(age);

        // Client-side staleness detection fallback
        if (age > stalenessTimeoutMs && !isStale) {
          setIsStale(true);
          setSystemStatus((prev) => (prev === 'NORMAL' ? 'STALE_DATA' : prev));
        }
      } else {
        setLiveAgeMs(null);
      }
    }, 250);

    return () => {
      if (ageIntervalRef.current) clearInterval(ageIntervalRef.current);
    };
  }, [lastValidTimestamp, stalenessTimeoutMs, isStale]);

  const connectSSE = useCallback(() => {
    // Clear any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setSseState({ isConnected: false, isConnecting: true, error: null });

    const es = new EventSource('/api/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      setSseState({ isConnected: true, isConnecting: false, error: null });
    };

    es.onerror = () => {
      setSseState({
        isConnected: false,
        isConnecting: false,
        error: 'SSE stream disconnected. Reconnecting...',
      });
      es.close();
      eventSourceRef.current = null;

      // Reconnect after 3 seconds
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectSSE();
      }, 3000);
    };

    // 1. Initial snapshot
    es.addEventListener('snapshot', (e: MessageEvent) => {
      try {
        const snapshot: SystemStateSnapshot = JSON.parse(e.data);
        setSystemStatus(snapshot.systemStatus);
        setMqttStatus(snapshot.mqttStatus);
        setEsp32Status(snapshot.esp32Status);
        setMqttBroker(snapshot.mqttBroker);
        setTelemetry(snapshot.latestTelemetry);
        setLastValidTimestamp(snapshot.lastValidTimestamp);
        setIsStale(snapshot.isStale);
        setIsOverload(snapshot.isOverload);
        setIsSensorError(snapshot.isSensorError);
        setMetrics(snapshot.metrics);
        setStalenessTimeoutMs(snapshot.stalenessTimeoutMs);

        if (snapshot.history && Array.isArray(snapshot.history)) {
          setHistory(snapshot.history);
        }
      } catch (err) {
        console.error('Failed to parse snapshot SSE event:', err);
      }
    });

    // 2. Real-time telemetry
    es.addEventListener('telemetry', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const data: ValidatedTelemetry = payload.data;

        setTelemetry(data);
        setLastValidTimestamp(data.receivedTimestamp);
        setIsStale(payload.isStale ?? false);
        setIsOverload(data.alert);
        setIsSensorError(false);
        setSystemStatus(payload.systemStatus);

        setMetrics((prev) => ({
          ...prev,
          validMessagesCount: prev.validMessagesCount + 1,
        }));

        setHistory((prevHistory) => {
          const next = [...prevHistory, data];
          // Keep bounded to last 200 data points
          return next.length > 200 ? next.slice(next.length - 200) : next;
        });
      } catch (err) {
        console.error('Failed to parse telemetry SSE event:', err);
      }
    });

    // 3. Status changes (MQTT, ESP32 status)
    es.addEventListener('status', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const statusData = payload.data;
        if (statusData.mqttStatus) setMqttStatus(statusData.mqttStatus);
        if (statusData.esp32Status) setEsp32Status(statusData.esp32Status);
        if (statusData.systemStatus) setSystemStatus(statusData.systemStatus);
        if (typeof statusData.isStale === 'boolean') setIsStale(statusData.isStale);
      } catch (err) {
        console.error('Failed to parse status SSE event:', err);
      }
    });

    // 4. Staleness state changes
    es.addEventListener('stale', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const staleData = payload.data;
        setIsStale(staleData.isStale);
        setSystemStatus(staleData.systemStatus);
      } catch (err) {
        console.error('Failed to parse stale SSE event:', err);
      }
    });

    // 5. Heartbeat
    es.addEventListener('heartbeat', () => {
      // Just keep-alive acknowledge
    });
  }, []);

  useEffect(() => {
    connectSSE();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connectSSE]);

  return {
    telemetry,
    history,
    systemStatus,
    mqttStatus,
    esp32Status,
    mqttBroker,
    lastValidTimestamp,
    dataAgeMs: liveAgeMs,
    isStale,
    isOverload,
    isSensorError,
    metrics,
    stalenessTimeoutMs,
    sseState,
    reconnect: connectSSE,
  };
}
