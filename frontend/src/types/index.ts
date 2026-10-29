export interface ValidatedTelemetry {
  device: string;
  voltage_v: number;
  current_a: number;
  power_w: number;
  energy_wh: number;
  energy_kwh: number;
  alert: boolean;
  valid: boolean;
  uptimeMs: number;
  receivedAt: string;
  receivedTimestamp: number;
}

export type SystemOperationalStatus = 
  | 'NORMAL' 
  | 'OVERLOAD' 
  | 'SENSOR_ERROR' 
  | 'STALE_DATA' 
  | 'DISCONNECTED';

export type MqttConnectionState = 
  | 'CONNECTING' 
  | 'CONNECTED' 
  | 'RECONNECTING' 
  | 'DISCONNECTED' 
  | 'ERROR';

export interface SystemStateSnapshot {
  systemStatus: SystemOperationalStatus;
  mqttStatus: MqttConnectionState;
  mqttBroker: string;
  esp32Status: string;
  latestTelemetry: ValidatedTelemetry | null;
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
  history?: ValidatedTelemetry[];
}

export interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}
