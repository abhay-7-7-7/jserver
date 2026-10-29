import mqtt, { MqttClient as IMqttClient, IClientOptions } from 'mqtt';
import { config } from './config.js';
import { StateManager } from './stateManager.js';
import { validateTelemetry } from './telemetryValidator.js';

export class EnergyMqttClient {
  private client: IMqttClient | null = null;
  private stateManager: StateManager;
  private shouldConnect: boolean = true;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  public start(): void {
    const { host, port, protocol, username, password, clientIdPrefix } = config.mqtt;

    // Check if credentials are placeholders or missing
    if (!config.mqtt.hasValidCredentials) {
      console.warn(
        '⚠️ [MQTT] Missing or placeholder MQTT credentials in .env. MQTT client starting in DISCONNECTED state.'
      );
      console.warn(
        'ℹ️ [MQTT] To connect to EMQX, update MQTT_USERNAME and MQTT_PASSWORD in your .env file.'
      );
      this.stateManager.setMqttStatus('DISCONNECTED');
      return;
    }

    const clientId = `${clientIdPrefix}_${Math.random().toString(16).substring(2, 8)}`;
    const brokerUrl = `${protocol}://${host}:${port}`;

    console.log(`🔌 [MQTT] Connecting to broker at ${brokerUrl} with clientId "${clientId}"...`);
    this.stateManager.setMqttStatus('CONNECTING');

    const options: IClientOptions = {
      clientId,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 4000, // Try reconnecting every 4 seconds
    };

    if (username) options.username = username;
    if (password) options.password = password;

    try {
      this.client = mqtt.connect(brokerUrl, options);

      this.client.on('connect', () => {
        console.log(`✅ [MQTT] Connected to EMQX broker at ${brokerUrl}`);
        this.stateManager.setMqttStatus('CONNECTED');
        this.subscribeTopics();
      });

      this.client.on('reconnect', () => {
        console.warn(`🔄 [MQTT] Attempting to reconnect to EMQX broker...`);
        this.stateManager.setMqttStatus('RECONNECTING');
      });

      this.client.on('close', () => {
        console.warn(`⚠️ [MQTT] Connection closed.`);
        if (this.shouldConnect) {
          this.stateManager.setMqttStatus('DISCONNECTED');
        }
      });

      this.client.on('offline', () => {
        console.warn(`⚠️ [MQTT] Client is offline.`);
        this.stateManager.setMqttStatus('DISCONNECTED');
      });

      this.client.on('error', (err) => {
        console.error(`❌ [MQTT] Connection error:`, err.message);
        this.stateManager.setMqttStatus('ERROR');
      });

      this.client.on('message', (topic, message) => {
        this.handleIncomingMessage(topic, message);
      });
    } catch (err) {
      console.error('❌ [MQTT] Failed to initialize MQTT client:', err);
      this.stateManager.setMqttStatus('ERROR');
    }
  }

  private subscribeTopics(): void {
    if (!this.client) return;

    const topics = [
      config.mqtt.topics.telemetry,
      config.mqtt.topics.status,
      config.mqtt.topics.alerts,
    ];

    topics.forEach((topic) => {
      this.client?.subscribe(topic, { qos: 0 }, (err) => {
        if (err) {
          console.error(`❌ [MQTT] Failed to subscribe to topic "${topic}":`, err.message);
        } else {
          console.log(`📡 [MQTT] Subscribed to topic: "${topic}"`);
        }
      });
    });
  }

  private handleIncomingMessage(topic: string, message: Buffer): void {
    const receiveTime = Date.now();
    const rawString = message.toString();

    // 1. Telemetry topic
    if (topic === config.mqtt.topics.telemetry) {
      const validation = validateTelemetry(rawString, receiveTime);
      if (validation.success) {
        this.stateManager.recordTelemetry(validation.data);
      } else {
        console.warn(`⚠️ [MQTT] Rejected invalid telemetry: ${validation.error}`);
        this.stateManager.recordRejectedMessage(validation.error, validation.isSensorError);
      }
      return;
    }

    // 2. Status topic
    if (topic === config.mqtt.topics.status) {
      let statusValue = rawString.trim();
      try {
        const parsed = JSON.parse(rawString);
        if (parsed && typeof parsed === 'object' && 'status' in parsed) {
          statusValue = String(parsed.status);
        }
      } catch {
        // use rawString as plain text status
      }
      this.stateManager.setEsp32Status(statusValue);
      return;
    }

    // 3. Alerts topic
    if (topic === config.mqtt.topics.alerts) {
      let isAlert = false;
      try {
        const parsed = JSON.parse(rawString);
        if (parsed && typeof parsed === 'object' && 'alert' in parsed) {
          isAlert = Boolean(parsed.alert);
        } else if (typeof parsed === 'boolean') {
          isAlert = parsed;
        }
      } catch {
        isAlert = rawString.toLowerCase().includes('alert') || rawString.toLowerCase().includes('true');
      }
      this.stateManager.setAlertStatus(isAlert);
      return;
    }
  }

  public stop(): Promise<void> {
    this.shouldConnect = false;
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(false, () => {
          this.stateManager.setMqttStatus('DISCONNECTED');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
