import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { StateManager } from '../src/stateManager.js';
import { SSEManager } from '../src/sseManager.js';

describe('Express API Endpoints', () => {
  let stateManager: StateManager;
  let sseManager: SSEManager;
  let app: ReturnType<typeof createApp>;

  const validSample = {
    device: 'SMART_ENERGY_ESP32',
    voltage_v: 230.0,
    current_a: 2.0,
    power_w: 460.0,
    energy_wh: 12.5,
    energy_kwh: 0.0125,
    alert: false,
    valid: true,
    uptimeMs: 123456,
  };

  beforeEach(() => {
    stateManager = new StateManager();
    sseManager = new SSEManager(stateManager);
    app = createApp(stateManager, sseManager);
  });

  afterEach(() => {
    sseManager.destroy();
    stateManager.destroy();
  });

  it('GET /api/health returns 200 with uptime', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('GET /api/status returns initial snapshot without exposing credentials', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body.mqttStatus).toBe('CONNECTING');
    expect(res.body.mqttBroker).toContain('mqtt://');
    expect(res.body.mqttBroker).not.toContain('password');
    expect(res.body.latestTelemetry).toBeNull();
    expect(res.body.metrics.validMessagesCount).toBe(0);
  });

  it('POST /api/test/telemetry accepts valid payload and updates status & history', async () => {
    const postRes = await request(app)
      .post('/api/test/telemetry')
      .send(validSample);

    expect(postRes.status).toBe(200);
    expect(postRes.body.success).toBe(true);
    expect(postRes.body.data.device).toBe('SMART_ENERGY_ESP32');

    // Verify GET /api/status now reflects this data
    const statusRes = await request(app).get('/api/status');
    expect(statusRes.body.latestTelemetry).not.toBeNull();
    expect(statusRes.body.latestTelemetry.voltage_v).toBe(230.0);
    expect(statusRes.body.metrics.validMessagesCount).toBe(1);

    // Verify GET /api/history contains this item
    const historyRes = await request(app).get('/api/history');
    expect(historyRes.body.count).toBe(1);
    expect(historyRes.body.history[0].power_w).toBe(460.0);
  });

  it('POST /api/test/telemetry rejects invalid payloads with 400', async () => {
    const invalidPayload = {
      device: 'SMART_ENERGY_ESP32',
      voltage_v: 'not-a-number',
    };

    const res = await request(app)
      .post('/api/test/telemetry')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    // Rejection count incremented
    const statusRes = await request(app).get('/api/status');
    expect(statusRes.body.metrics.rejectedMessagesCount).toBe(1);
  });
});
