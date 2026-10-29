import { describe, it, expect } from 'vitest';
import { validateTelemetry } from '../src/telemetryValidator.js';

describe('telemetryValidator', () => {
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

  it('validates a correct object payload', () => {
    const result = validateTelemetry(validSample, 1700000000000);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.device).toBe('SMART_ENERGY_ESP32');
      expect(result.data.voltage_v).toBe(230.0);
      expect(result.data.current_a).toBe(2.0);
      expect(result.data.power_w).toBe(460.0);
      expect(result.data.energy_wh).toBe(12.5);
      expect(result.data.energy_kwh).toBe(0.0125);
      expect(result.data.alert).toBe(false);
      expect(result.data.valid).toBe(true);
      expect(result.data.uptimeMs).toBe(123456);
      expect(result.data.receivedTimestamp).toBe(1700000000000);
    }
  });

  it('validates a valid JSON string or Buffer payload', () => {
    const jsonStr = JSON.stringify(validSample);
    const result = validateTelemetry(jsonStr);
    expect(result.success).toBe(true);

    const bufferResult = validateTelemetry(Buffer.from(jsonStr));
    expect(bufferResult.success).toBe(true);
  });

  it('rejects malformed JSON', () => {
    const malformed = '{ "device": "SMART_ENERGY_ESP32", "voltage_v": ';
    const result = validateTelemetry(malformed);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Malformed JSON payload');
    }
  });

  it('rejects non-object payloads like null, arrays, numbers', () => {
    expect(validateTelemetry(null).success).toBe(false);
    expect(validateTelemetry(123).success).toBe(false);
    expect(validateTelemetry([]).success).toBe(false);
  });

  it('rejects missing or empty device identifier', () => {
    const payload = { ...validSample, device: '' };
    const result = validateTelemetry(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Missing or invalid "device" identifier');
    }
  });

  it('rejects invalid or non-finite numeric values (NaN, Infinity)', () => {
    const withNaN = { ...validSample, voltage_v: NaN };
    expect(validateTelemetry(withNaN).success).toBe(false);

    const withInfinity = { ...validSample, current_a: Infinity };
    expect(validateTelemetry(withInfinity).success).toBe(false);

    const withNegative = { ...validSample, power_w: -50 };
    expect(validateTelemetry(withNegative).success).toBe(false);

    const withStringNumber = { ...validSample, energy_wh: '12.5' as unknown as number };
    expect(validateTelemetry(withStringNumber).success).toBe(false);
  });

  it('rejects missing numeric fields', () => {
    const { voltage_v, ...missingField } = validSample;
    const result = validateTelemetry(missingField);
    expect(result.success).toBe(false);
  });

  it('flags sensor error when valid is false', () => {
    const payload = { ...validSample, valid: false };
    const result = validateTelemetry(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.isSensorError).toBe(true);
      expect(result.error).toContain('Hardware reported valid: false');
    }
  });

  it('accepts alert: true as valid telemetry for overload detection', () => {
    const payload = { ...validSample, alert: true };
    const result = validateTelemetry(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.alert).toBe(true);
    }
  });
});
