import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateManager } from '../src/stateManager.js';
import { ValidatedTelemetry } from '../src/types.js';

describe('StateManager', () => {
  let stateManager: StateManager;

  const mockTelemetry: ValidatedTelemetry = {
    device: 'SMART_ENERGY_ESP32',
    voltage_v: 230.5,
    current_a: 1.8,
    power_w: 414.9,
    energy_wh: 15.2,
    energy_kwh: 0.0152,
    alert: false,
    valid: true,
    uptimeMs: 50000,
    receivedAt: new Date().toISOString(),
    receivedTimestamp: Date.now(),
  };

  beforeEach(() => {
    stateManager = new StateManager();
  });

  afterEach(() => {
    stateManager.destroy();
  });

  it('starts in CONNECTING state with no telemetry', () => {
    const snapshot = stateManager.getSnapshot();
    expect(snapshot.mqttStatus).toBe('CONNECTING');
    expect(snapshot.systemStatus).toBe('DISCONNECTED');
    expect(snapshot.latestTelemetry).toBeNull();
    expect(snapshot.isStale).toBe(false);
  });

  it('transitions to NORMAL status when connected and valid telemetry is recorded', () => {
    stateManager.setMqttStatus('CONNECTED');
    stateManager.recordTelemetry(mockTelemetry);

    const snapshot = stateManager.getSnapshot();
    expect(snapshot.mqttStatus).toBe('CONNECTED');
    expect(snapshot.systemStatus).toBe('NORMAL');
    expect(snapshot.latestTelemetry).toEqual(mockTelemetry);
    expect(snapshot.metrics.validMessagesCount).toBe(1);
  });

  it('bounds history to maxHistoryPoints', () => {
    stateManager.setMqttStatus('CONNECTED');
    for (let i = 0; i < 250; i++) {
      stateManager.recordTelemetry({
        ...mockTelemetry,
        voltage_v: 230 + i,
        receivedTimestamp: Date.now() + i,
      });
    }

    const history = stateManager.getHistory();
    expect(history.length).toBeLessThanOrEqual(200);
    // Oldest was shifted out, latest is present
    expect(history[history.length - 1].voltage_v).toBe(230 + 249);
  });

  it('transitions to OVERLOAD when telemetry has alert: true', () => {
    stateManager.setMqttStatus('CONNECTED');
    stateManager.recordTelemetry({
      ...mockTelemetry,
      alert: true,
      power_w: 3500,
    });

    const snapshot = stateManager.getSnapshot();
    expect(snapshot.systemStatus).toBe('OVERLOAD');
    expect(snapshot.isOverload).toBe(true);
  });

  it('transitions to SENSOR_ERROR when valid: false or sensor_error status occurs', () => {
    stateManager.setMqttStatus('CONNECTED');
    stateManager.recordRejectedMessage('Sensor error', true);

    const snapshot = stateManager.getSnapshot();
    expect(snapshot.systemStatus).toBe('SENSOR_ERROR');
    expect(snapshot.isSensorError).toBe(true);
  });

  it('detects STALE_DATA when telemetry stops updating', () => {
    stateManager.setMqttStatus('CONNECTED');
    const oldTime = Date.now() - 10000; // 10 seconds ago (staleness timeout is 5s)
    stateManager.recordTelemetry({
      ...mockTelemetry,
      receivedTimestamp: oldTime,
    });

    expect(stateManager.checkIsStale()).toBe(true);
    expect(stateManager.computeOperationalStatus()).toBe('STALE_DATA');

    const snapshot = stateManager.getSnapshot();
    expect(snapshot.isStale).toBe(true);
    expect(snapshot.systemStatus).toBe('STALE_DATA');
    // Still preserves the latest telemetry for historical display!
    expect(snapshot.latestTelemetry).not.toBeNull();
  });

  it('returns DISCONNECTED when MQTT drops even if data was previously normal', () => {
    stateManager.setMqttStatus('CONNECTED');
    stateManager.recordTelemetry(mockTelemetry);
    expect(stateManager.computeOperationalStatus()).toBe('NORMAL');

    stateManager.setMqttStatus('DISCONNECTED');
    expect(stateManager.computeOperationalStatus()).toBe('DISCONNECTED');
  });
});
