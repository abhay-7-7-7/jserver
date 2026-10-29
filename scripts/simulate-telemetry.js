#!/usr/bin/env node

/**
 * Smart Energy Monitoring System - Telemetry Simulator & Test Utility
 * 
 * Usage:
 *   node scripts/simulate-telemetry.js
 *   node scripts/simulate-telemetry.js --overload
 *   node scripts/simulate-telemetry.js --sensor-fault
 *   node scripts/simulate-telemetry.js --once
 *   node scripts/simulate-telemetry.js --interval 1000
 *   node scripts/simulate-telemetry.js --mqtt
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser to avoid external dependency requirement in root
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const args = process.argv.slice(2);
const isOverload = args.includes('--overload');
const isFault = args.includes('--sensor-fault');
const isOnce = args.includes('--once');
const useMqtt = args.includes('--mqtt');

const intervalArgIndex = args.indexOf('--interval');
const intervalMs = intervalArgIndex !== -1 && args[intervalArgIndex + 1]
  ? parseInt(args[intervalArgIndex + 1], 10)
  : 2000;

const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000/api/test/telemetry';

// MQTT options
const mqttHost = process.env.MQTT_HOST || 'mqtt.dev.geotechs.in';
const mqttPort = process.env.MQTT_PORT || 1883;
const mqttUsername = process.env.MQTT_USERNAME || '';
const mqttPassword = process.env.MQTT_PASSWORD || '';
const telemetryTopic = process.env.TELEMETRY_TOPIC || 'energy/monitor/telemetry';

console.log('⚡ Smart Energy Telemetry Simulator');
console.log(`   Mode: ${isOverload ? '🔥 OVERLOAD (alert: true)' : isFault ? '⚠️ SENSOR FAULT (valid: false)' : '✅ NOMINAL TELEMETRY'}`);
console.log(`   Delivery: ${useMqtt ? `MQTT (${mqttHost}:${mqttPort} -> ${telemetryTopic})` : `HTTP Test API (${backendUrl})`}`);
console.log(`   Pacing: ${isOnce ? 'Single Shot' : `Continuous every ${intervalMs}ms`}\n`);

let uptimeMs = 0;
let energyWh = 12.5;

function generatePayload() {
  uptimeMs += intervalMs;

  if (isFault) {
    return {
      device: 'SMART_ENERGY_ESP32',
      voltage_v: 0.0,
      current_a: 0.0,
      power_w: 0.0,
      energy_wh: Number(energyWh.toFixed(2)),
      energy_kwh: Number((energyWh / 1000).toFixed(4)),
      alert: false,
      valid: false, // Invalid sensor reading
      uptimeMs,
    };
  }

  if (isOverload) {
    const voltage = Number((242 + Math.random() * 4).toFixed(1));
    const current = Number((16.5 + Math.random() * 2).toFixed(2));
    const power = Number((voltage * current).toFixed(1));
    energyWh += (power * (intervalMs / 3600000));

    return {
      device: 'SMART_ENERGY_ESP32',
      voltage_v: voltage,
      current_a: current,
      power_w: power,
      energy_wh: Number(energyWh.toFixed(2)),
      energy_kwh: Number((energyWh / 1000).toFixed(4)),
      alert: true, // Hardware overload alert active
      valid: true,
      uptimeMs,
    };
  }

  // Nominal random variation
  const voltage = Number((228 + (Math.random() * 4 - 2)).toFixed(1)); // 226 - 230 V
  const current = Number((2.0 + (Math.random() * 0.4 - 0.2)).toFixed(2)); // 1.8 - 2.2 A
  const power = Number((voltage * current).toFixed(1));
  energyWh += (power * (intervalMs / 3600000));

  return {
    device: 'SMART_ENERGY_ESP32',
    voltage_v: voltage,
    current_a: current,
    power_w: power,
    energy_wh: Number(energyWh.toFixed(2)),
    energy_kwh: Number((energyWh / 1000).toFixed(4)),
    alert: false,
    valid: true,
    uptimeMs,
  };
}

async function sendViaHttp(payload) {
  try {
    const res = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    if (res.ok) {
      console.log(`[HTTP ${res.status}] Sent: ${payload.voltage_v}V | ${payload.current_a}A | ${payload.power_w}W | alert=${payload.alert} | valid=${payload.valid}`);
    } else {
      console.error(`[HTTP ${res.status}] Error:`, body);
    }
  } catch (err) {
    console.error(`[HTTP Error] Failed to connect to ${backendUrl}:`, err.message);
  }
}

async function start() {
  if (useMqtt) {
    let mqttModule;
    try {
      mqttModule = await import('../backend/node_modules/mqtt/dist/mqtt.esm.js');
    } catch {
      try {
        mqttModule = await import('mqtt');
      } catch (err) {
        console.error('❌ MQTT package not found. Run `npm install` in backend directory first.');
        process.exit(1);
      }
    }
    const mqtt = mqttModule.default || mqttModule;
    const client = mqtt.connect(`mqtt://${mqttHost}:${mqttPort}`, {
      username: mqttUsername,
      password: mqttPassword,
      clientId: `simulator_${Math.random().toString(16).slice(2, 8)}`,
    });

    client.on('connect', () => {
      console.log(`✅ Connected to MQTT broker at ${mqttHost}:${mqttPort}`);
      const sendMqtt = () => {
        const payload = generatePayload();
        client.publish(telemetryTopic, JSON.stringify(payload), { qos: 0 }, (err) => {
          if (err) {
            console.error('[MQTT Publish Error]', err);
          } else {
            console.log(`[MQTT] Published: ${payload.voltage_v}V | ${payload.current_a}A | ${payload.power_w}W | alert=${payload.alert} | valid=${payload.valid}`);
          }
          if (isOnce) {
            client.end();
            process.exit(0);
          }
        });
      };

      sendMqtt();
      if (!isOnce) setInterval(sendMqtt, intervalMs);
    });

    client.on('error', (err) => {
      console.error('❌ MQTT Connection Error:', err.message);
    });
  } else {
    // HTTP mode
    const sendHttp = async () => {
      const payload = generatePayload();
      await sendViaHttp(payload);
      if (isOnce) {
        setTimeout(() => process.exit(0), 50);
      }
    };

    await sendHttp();
    if (!isOnce) setInterval(sendHttp, intervalMs);
  }
}

start();
