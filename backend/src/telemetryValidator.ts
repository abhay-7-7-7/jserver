import { RawTelemetryPayload, ValidatedTelemetry } from './types.js';

export interface ValidationSuccess {
  success: true;
  data: ValidatedTelemetry;
}

export interface ValidationFailure {
  success: false;
  error: string;
  isSensorError?: boolean;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validates raw telemetry payload from ESP32.
 * Strictly checks JSON formatting, property presence, types, and numeric constraints.
 */
export function validateTelemetry(raw: unknown, receiveTime: number = Date.now()): ValidationResult {
  let parsed: unknown = raw;

  // 1. If buffer or string, attempt JSON parse
  if (typeof raw === 'string' || Buffer.isBuffer(raw)) {
    try {
      parsed = JSON.parse(raw.toString());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Malformed JSON payload: ${message}`,
      };
    }
  }

  // 2. Must be a plain object
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      success: false,
      error: 'Telemetry payload must be a non-null object',
    };
  }

  const obj = parsed as Record<string, unknown>;

  // 3. Required string field: device
  if (typeof obj.device !== 'string' || obj.device.trim().length === 0) {
    return {
      success: false,
      error: 'Missing or invalid "device" identifier (must be a non-empty string)',
    };
  }

  // Helper to validate finite non-negative numbers
  function validateFiniteNumber(name: string, val: unknown): { valid: boolean; error?: string } {
    if (typeof val !== 'number') {
      return { valid: false, error: `Field "${name}" must be a number, received ${typeof val}` };
    }
    if (!Number.isFinite(val)) {
      return { valid: false, error: `Field "${name}" must be a finite number (received ${val})` };
    }
    if (val < 0) {
      return { valid: false, error: `Field "${name}" must be non-negative (received ${val})` };
    }
    return { valid: true };
  }

  // 4. Validate numeric fields
  const numericFields = [
    'voltage_v',
    'current_a',
    'power_w',
    'energy_wh',
    'energy_kwh',
    'uptimeMs',
  ] as const;

  for (const field of numericFields) {
    const check = validateFiniteNumber(field, obj[field]);
    if (!check.valid) {
      return {
        success: false,
        error: check.error || `Invalid field: ${field}`,
      };
    }
  }

  // 5. Validate boolean fields: alert and valid
  if (typeof obj.alert !== 'boolean') {
    return {
      success: false,
      error: 'Field "alert" must be a boolean',
    };
  }

  if (typeof obj.valid !== 'boolean') {
    return {
      success: false,
      error: 'Field "valid" must be a boolean',
    };
  }

  // 6. Check sensor validity flag
  // If valid === false, this represents an explicit sensor error or uncalibrated/faulty reading
  if (!obj.valid) {
    return {
      success: false,
      error: 'Hardware reported valid: false (sensor error/fault)',
      isSensorError: true,
    };
  }

  // 7. Success - construct ValidatedTelemetry with backend receive time
  const validatedData: ValidatedTelemetry = {
    device: obj.device.trim(),
    voltage_v: Number(obj.voltage_v),
    current_a: Number(obj.current_a),
    power_w: Number(obj.power_w),
    energy_wh: Number(obj.energy_wh),
    energy_kwh: Number(obj.energy_kwh),
    alert: Boolean(obj.alert),
    valid: true,
    uptimeMs: Number(obj.uptimeMs),
    receivedAt: new Date(receiveTime).toISOString(),
    receivedTimestamp: receiveTime,
  };

  return {
    success: true,
    data: validatedData,
  };
}
