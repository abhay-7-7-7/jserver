import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from backend directory first, then root directory if needed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export const config = {
  port: parseNumber(process.env.PORT, 4000),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // MQTT Settings
  mqtt: {
    host: process.env.MQTT_HOST || 'mqtt.dev.geotechs.in',
    port: parseNumber(process.env.MQTT_PORT, 1883),
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    protocol: (process.env.MQTT_PROTOCOL as 'mqtt' | 'mqtts' | 'ws' | 'wss') || 'mqtt',
    clientIdPrefix: process.env.MQTT_CLIENT_ID_PREFIX || 'smart_energy_backend',
    topics: {
      telemetry: process.env.TELEMETRY_TOPIC || 'energy/monitor/telemetry',
      status: process.env.STATUS_TOPIC || 'energy/monitor/status',
      alerts: process.env.ALERT_TOPIC || 'energy/monitor/alerts',
    },
    // Safe broker representation to show on frontend (NO passwords/usernames)
    get safeBrokerEndpoint(): string {
      return `${this.protocol}://${this.host}:${this.port}`;
    },
    get hasValidCredentials(): boolean {
      return (
        Boolean(this.username) &&
        this.username !== 'YOUR_MQTT_USERNAME' &&
        Boolean(this.password) &&
        this.password !== 'YOUR_MQTT_PASSWORD'
      );
    }
  },

  // Telemetry Settings
  telemetry: {
    stalenessTimeoutMs: parseNumber(process.env.STALENESS_TIMEOUT_MS, 5000),
    maxHistoryPoints: parseNumber(process.env.MAX_HISTORY_POINTS, 200),
  },

  // Dev / Testing utilities
  allowTestInjection: process.env.ALLOW_TEST_INJECTION === 'true',
};
