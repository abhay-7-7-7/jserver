import { createApp } from './app.js';
import { StateManager } from './stateManager.js';
import { SSEManager } from './sseManager.js';
import { EnergyMqttClient } from './mqttClient.js';
import { config } from './config.js';

async function bootstrap() {
  console.log('⚡ Initializing Smart Energy Monitoring Backend...');

  const stateManager = new StateManager();
  const sseManager = new SSEManager(stateManager);
  const mqttClient = new EnergyMqttClient(stateManager);
  const app = createApp(stateManager, sseManager);

  // Start HTTP Server
  const server = app.listen(config.port, config.host, () => {
    console.log(`🚀 HTTP & SSE server running at http://${config.host}:${config.port}`);
    console.log(`   - Status API:  http://${config.host}:${config.port}/api/status`);
    console.log(`   - History API: http://${config.host}:${config.port}/api/history`);
    console.log(`   - Stream API:  http://${config.host}:${config.port}/api/stream`);
    if (config.allowTestInjection) {
      console.log(`   - Test API:    http://${config.host}:${config.port}/api/test/telemetry (ACTIVE for testing)`);
    }
  });

  // Start MQTT client
  mqttClient.start();

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    sseManager.destroy();
    stateManager.destroy();
    await mqttClient.stop();
    server.close(() => {
      console.log('💤 Server stopped.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
