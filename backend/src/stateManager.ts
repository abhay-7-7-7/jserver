import { EventEmitter } from 'events';
import {
  ValidatedTelemetry,
  MqttConnectionState,
  SystemOperationalStatus,
  SystemStateSnapshot,
} from './types.js';
import { config } from './config.js';

export class StateManager extends EventEmitter {
  private latestTelemetry: ValidatedTelemetry | null = null;
  private history: ValidatedTelemetry[] = [];
  private mqttStatus: MqttConnectionState = 'CONNECTING';
  private esp32Status: string = 'unknown';
  private isSensorError: boolean = false;
  private isHardwareAlert: boolean = false;

  private validMessagesCount: number = 0;
  private rejectedMessagesCount: number = 0;
  private startTime: number = Date.now();

  private stalenessCheckInterval: NodeJS.Timeout | null = null;
  private wasStale: boolean = false;

  constructor() {
    super();
    this.startStalenessWatcher();
  }

  /**
   * Starts periodic timer to check for telemetry staleness independently of MQTT status
   */
  private startStalenessWatcher(): void {
    if (this.stalenessCheckInterval) {
      clearInterval(this.stalenessCheckInterval);
    }

    // Check staleness every 500ms
    this.stalenessCheckInterval = setInterval(() => {
      this.evaluateStaleness();
    }, 500);
  }

  private evaluateStaleness(): void {
    const isCurrentlyStale = this.checkIsStale();
    if (isCurrentlyStale !== this.wasStale) {
      this.wasStale = isCurrentlyStale;
      const dataAgeMs = this.getDataAgeMs();
      const systemStatus = this.computeOperationalStatus();

      this.emit('stale_change', {
        isStale: isCurrentlyStale,
        systemStatus,
        dataAgeMs,
      });
    }
  }

  public checkIsStale(): boolean {
    if (!this.latestTelemetry) {
      return false; // No data yet received
    }
    const age = Date.now() - this.latestTelemetry.receivedTimestamp;
    return age > config.telemetry.stalenessTimeoutMs;
  }

  public getDataAgeMs(): number | null {
    if (!this.latestTelemetry) return null;
    return Math.max(0, Date.now() - this.latestTelemetry.receivedTimestamp);
  }

  /**
   * Authoritative operational status logic
   */
  public computeOperationalStatus(): SystemOperationalStatus {
    if (this.mqttStatus !== 'CONNECTED') {
      return 'DISCONNECTED';
    }

    if (this.isSensorError || this.esp32Status === 'sensor_error') {
      return 'SENSOR_ERROR';
    }

    if (this.esp32Status === 'offline') {
      return 'DISCONNECTED';
    }

    if (this.checkIsStale() || this.esp32Status === 'stale_data') {
      return 'STALE_DATA';
    }

    // If hardware reports overload
    if (this.latestTelemetry && this.latestTelemetry.alert) {
      return 'OVERLOAD';
    }

    if (this.isHardwareAlert) {
      return 'OVERLOAD';
    }

    if (!this.latestTelemetry) {
      // Connected but waiting for first message
      return 'NORMAL';
    }

    return 'NORMAL';
  }

  /**
   * Records a validated telemetry reading
   */
  public recordTelemetry(telemetry: ValidatedTelemetry): void {
    this.latestTelemetry = telemetry;
    this.validMessagesCount++;
    this.isSensorError = false; // Valid reading received clears previous sensor error
    this.isHardwareAlert = telemetry.alert;
    this.wasStale = false;

    // Append to bounded in-memory history
    this.history.push(telemetry);
    if (this.history.length > config.telemetry.maxHistoryPoints) {
      this.history.shift(); // Remove oldest
    }

    const dataAgeMs = 0;
    const isStale = false;
    const systemStatus = this.computeOperationalStatus();

    this.emit('telemetry', {
      telemetry,
      systemStatus,
      dataAgeMs,
      isStale,
    });
  }

  /**
   * Records a rejected message (malformed, invalid numbers, or valid: false)
   */
  public recordRejectedMessage(reason: string, isSensorError: boolean = false): void {
    this.rejectedMessagesCount++;
    if (isSensorError) {
      this.isSensorError = true;
    }
    const systemStatus = this.computeOperationalStatus();
    this.emit('rejected', { reason, isSensorError, systemStatus });
  }

  /**
   * Updates MQTT connection state
   */
  public setMqttStatus(status: MqttConnectionState): void {
    if (this.mqttStatus !== status) {
      this.mqttStatus = status;
      const systemStatus = this.computeOperationalStatus();
      this.emit('status_change', {
        mqttStatus: this.mqttStatus,
        esp32Status: this.esp32Status,
        systemStatus,
        isStale: this.checkIsStale(),
        dataAgeMs: this.getDataAgeMs(),
      });
    }
  }

  /**
   * Updates ESP32 device status from STATUS_TOPIC
   */
  public setEsp32Status(status: string): void {
    const normalized = status.toLowerCase().trim();
    this.esp32Status = normalized;

    if (normalized === 'sensor_error') {
      this.isSensorError = true;
    } else if (normalized === 'online') {
      this.isSensorError = false;
    }

    const systemStatus = this.computeOperationalStatus();
    this.emit('status_change', {
      mqttStatus: this.mqttStatus,
      esp32Status: this.esp32Status,
      systemStatus,
      isStale: this.checkIsStale(),
      dataAgeMs: this.getDataAgeMs(),
    });
  }

  /**
   * Updates Alert status from ALERT_TOPIC
   */
  public setAlertStatus(alert: boolean): void {
    this.isHardwareAlert = alert;
    const systemStatus = this.computeOperationalStatus();
    this.emit('status_change', {
      mqttStatus: this.mqttStatus,
      esp32Status: this.esp32Status,
      systemStatus,
      isStale: this.checkIsStale(),
      dataAgeMs: this.getDataAgeMs(),
    });
  }

  /**
   * Snapshot of full system state
   */
  public getSnapshot(sseClientsCount: number = 0): SystemStateSnapshot {
    const isStale = this.checkIsStale();
    const dataAgeMs = this.getDataAgeMs();
    const systemStatus = this.computeOperationalStatus();

    return {
      systemStatus,
      mqttStatus: this.mqttStatus,
      mqttBroker: config.mqtt.safeBrokerEndpoint,
      esp32Status: this.esp32Status,
      latestTelemetry: this.latestTelemetry,
      lastValidTimestamp: this.latestTelemetry ? this.latestTelemetry.receivedTimestamp : null,
      dataAgeMs,
      isStale,
      isOverload: (this.latestTelemetry?.alert || this.isHardwareAlert) ?? false,
      isSensorError: this.isSensorError || this.esp32Status === 'sensor_error',
      metrics: {
        validMessagesCount: this.validMessagesCount,
        rejectedMessagesCount: this.rejectedMessagesCount,
        sseClientsCount,
        uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      },
      stalenessTimeoutMs: config.telemetry.stalenessTimeoutMs,
    };
  }

  /**
   * Return copy of historical data
   */
  public getHistory(): ValidatedTelemetry[] {
    return [...this.history];
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.stalenessCheckInterval) {
      clearInterval(this.stalenessCheckInterval);
      this.stalenessCheckInterval = null;
    }
    this.removeAllListeners();
  }
}
