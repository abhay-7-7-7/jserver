/**
 * Raw telemetry payload expected from ESP32 over EMQX MQTT
 */
export interface RawTelemetryPayload {
  device: string;
  voltage_v: number;
  current_a: number;
  power_w: number;
  energy_wh: number;
  energy_kwh: number;
  alert: boolean;
  valid: boolean;
  uptimeMs: number;
}

/**
 * Validated telemetry with backend-recorded receive timestamp
 */
export interface ValidatedTelemetry extends RawTelemetryPayload {
  receivedAt: string;       // ISO 8601 string
  receivedTimestamp: number; // Unix epoch ms
}

/**
 * System status enum
 */
export type SystemOperationalStatus = 
  | 'NORMAL' 
  | 'OVERLOAD' 
  | 'SENSOR_ERROR' 
  | 'STALE_DATA' 
  | 'DISCONNECTED';

/**
 * MQTT connection states
 */
export type MqttConnectionState = 
  | 'CONNECTING' 
  | 'CONNECTED' 
  | 'RECONNECTING' 
  | 'DISCONNECTED' 
  | 'ERROR';

/**
 * Device status payload from STATUS_TOPIC
 */
export interface DeviceStatusPayload {
  status: 'online' | 'offline' | 'sensor_error' | 'stale_data' | string;
  device?: string;
  receivedAt: string;
}

/**
 * Hardware alert payload from ALERT_TOPIC
 */
export interface HardwareAlertPayload {
  alert: boolean;
  message?: string;
  device?: string;
  receivedAt: string;
}

/**
 * Full state snapshot for initial SSE connection and GET /api/status
 */
export interface SystemStateSnapshot {
  systemStatus: SystemOperationalStatus;
  mqttStatus: MqttConnectionState;
  mqttBroker: string; // Host & port only, never credentials
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
}

/**
 * SSE Event types sent to the browser
 */
export type SSEEvent = 
  | { type: 'snapshot'; data: SystemStateSnapshot & { history: ValidatedTelemetry[] } }
  | { type: 'telemetry'; data: ValidatedTelemetry; systemStatus: SystemOperationalStatus; dataAgeMs: number; isStale: boolean }
  | { type: 'status'; data: { mqttStatus: MqttConnectionState; esp32Status: string; systemStatus: SystemOperationalStatus; isStale: boolean; dataAgeMs: number | null } }
  | { type: 'stale'; data: { isStale: boolean; systemStatus: SystemOperationalStatus; dataAgeMs: number | null } }
  | { type: 'heartbeat'; data: { timestamp: number } };
