# Smart Energy Monitoring Web Dashboard

A full-stack, real-time, responsive industrial IoT energy monitoring dashboard built with **React**, **TypeScript**, **Tailwind CSS**, **Recharts**, **Node.js**, **Express**, **MQTT.js**, and **Server-Sent Events (SSE)**.

Designed to receive live telemetry from **STM32 + ESP32** hardware nodes via an **EMQX MQTT Broker** and broadcast updates to client browsers without exposing broker credentials.

---

## 1. System Architecture

```
┌────────────────┐      UART      ┌───────────────┐     MQTT (TCP/TLS)     ┌────────────────┐
│   STM32 MCU    │ ─────────────> │ ESP32 Gateway │ ─────────────────────> │  EMQX Broker   │
│ (Simulated V&I)│                │  (Publisher)  │                        │ (1883 or 8883) │
└────────────────┘                └───────────────┘                        └───────┬────────┘
                                                                                   │ MQTT.js
                                                                                   │ Subscription
                                                                                   ▼
┌─────────────────────────┐           SSE Stream (HTTP)            ┌────────────────────────┐
│     React Dashboard     │ <───────────────────────────────────── │     Node.js Backend    │
│  (Tailwind + Recharts)  │    (Initial Snapshot + Real-time Push) │   (Express + Validator)│
└─────────────────────────┘                                        └────────────────────────┘
```

### Key Security & Privacy Guarantees
- **Zero Client Credentials:** The browser client connects *only* to the Node.js backend via SSE (`/api/stream`). MQTT credentials (`MQTT_USERNAME`, `MQTT_PASSWORD`) exist exclusively in backend server memory.
- **Strict Payload Validation:** Rejects malformed JSON, missing fields, `NaN`, non-finite values, and negative inputs.
- **Hardware-Authoritative Overload:** The hardware alert bit (`alert: true`) triggers the authoritative overload alarm.
- **Independent Staleness Tracking:** Detects telemetry loss independently of broker socket status. If no new valid reading arrives within 5 seconds (`STALENESS_TIMEOUT_MS`), data is labeled `STALE_DATA` while preserving historical values for reference.

---

## 2. Prerequisites & Environment

- **Node.js:** v18.0.0 or later (tested on v20+ and v25+)
- **npm:** v9.0.0 or later

---

## 3. Installation

Clone or open the repository root:

```bash
# 1. Install root, backend, and frontend dependencies
npm run install:all

# Or install manually:
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

---

## 4. Environment Configuration (`.env`)

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Edit `.env` to supply your configuration:

```ini
# Backend Server Configuration
PORT=4000
HOST=0.0.0.0
NODE_ENV=development

# EMQX MQTT Broker Configuration
MQTT_HOST=mqtt.dev.geotechs.in
MQTT_PORT=1883
MQTT_USERNAME=YOUR_MQTT_USERNAME
MQTT_PASSWORD=YOUR_MQTT_PASSWORD
MQTT_PROTOCOL=mqtt
MQTT_CLIENT_ID_PREFIX=smart_energy_dashboard

# MQTT Subscription Topics
TELEMETRY_TOPIC=energy/monitor/telemetry
STATUS_TOPIC=energy/monitor/status
ALERT_TOPIC=energy/monitor/alerts

# Telemetry Limits
STALENESS_TIMEOUT_MS=5000
MAX_HISTORY_POINTS=200

# Development Testing Endpoint (Guarded against production use)
ALLOW_TEST_INJECTION=true
```

> **Note on Missing Credentials:** If `MQTT_USERNAME` or `MQTT_PASSWORD` are not configured, the backend starts in a gracefully labeled **DISCONNECTED** state rather than crashing or inventing simulated data.

---

## 5. Starting the Application

### Development Mode (Both Frontend & Backend)
Run both concurrently from the root directory:
```bash
npm run dev
```

### Or run individually in separate terminal sessions:

**Backend:**
```bash
npm run dev:backend
# Starts Express and MQTT client on http://localhost:4000
```

**Frontend:**
```bash
npm run dev:frontend
# Starts Vite development server on http://localhost:5173
```

### Local URLs
- **Dashboard UI:** [http://localhost:5173](http://localhost:5173)
- **Backend Status API:** [http://localhost:4000/api/status](http://localhost:4000/api/status)
- **Backend History API:** [http://localhost:4000/api/history](http://localhost:4000/api/history)
- **Backend SSE Stream:** [http://localhost:4000/api/stream](http://localhost:4000/api/stream)

---

## 6. Telemetry Format Specification

The ESP32 publishes messages matching this exact schema:

```json
{
  "device": "SMART_ENERGY_ESP32",
  "voltage_v": 230.0,
  "current_a": 2.0,
  "power_w": 460.0,
  "energy_wh": 12.5,
  "energy_kwh": 0.0125,
  "alert": false,
  "valid": true,
  "uptimeMs": 123456
}
```

### Validation Rules
| Field | Type | Validation Rule |
|---|---|---|
| `device` | String | Non-empty string identifier |
| `voltage_v` | Number | Finite, non-negative number |
| `current_a` | Number | Finite, non-negative number |
| `power_w` | Number | Finite, non-negative number |
| `energy_wh` | Number | Finite, non-negative number |
| `energy_kwh` | Number | Finite, non-negative number |
| `alert` | Boolean | Authoritative hardware overload alarm |
| `valid` | Boolean | Must be `true`. If `false`, flagged as `SENSOR_ERROR` |
| `uptimeMs` | Number | Milliseconds since ESP32 booted (not a wall clock) |

---

## 7. Testing & Verification

### Running Automated Test Suites
Both backend and frontend have comprehensive test suites verifying schema validation, rejected payloads, overload alarms, staleness timers, and UI rendering:

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

### Testing the Live Pipeline (Telemetry Simulator)
You can inject simulated readings into the live running application without physical hardware:

```bash
# 1. Nominal telemetry continuous feed (every 2s):
node scripts/simulate-telemetry.js

# 2. Trigger Overload hardware alert (alert: true, high current):
node scripts/simulate-telemetry.js --overload

# 3. Trigger Sensor fault (valid: false):
node scripts/simulate-telemetry.js --sensor-fault

# 4. Single-shot payload injection:
node scripts/simulate-telemetry.js --once

# 5. Direct publish to EMQX MQTT (requires valid credentials in .env):
node scripts/simulate-telemetry.js --mqtt
```

Alternatively, open the **Developer Verification & Message Injection Utility** drawer directly on the web dashboard to trigger test payloads and inspect live chart updates.

---

## 8. Diagnosing Broker Authentication & Connection Failures

If the MQTT status indicator shows **DISCONNECTED** or **ERROR**:

1. **Verify Credentials:**
   Check `.env`. Ensure `MQTT_USERNAME` and `MQTT_PASSWORD` are not default placeholders (`YOUR_MQTT_USERNAME`).
2. **Test Broker Reachability:**
   Verify network reachability using netcat, telnet, or test client:
   ```bash
   # Test port reachability
   powershell -Command "Test-NetConnection -ComputerName mqtt.dev.geotechs.in -Port 1883"
   ```
3. **Inspect Backend Logs:**
   The backend logs exact error codes:
   - `ECONNREFUSED`: Broker host or port unreachable.
   - `Not authorized` (code 4 or 5): Bad username/password.
   - `ENOTFOUND`: DNS resolution failure for `mqtt.dev.geotechs.in`.
4. **Inspect EMQX Client ID Collisions:**
   If multiple dashboards share the same client ID, EMQX terminates older connections. Ensure `MQTT_CLIENT_ID_PREFIX` is set; the backend appends random hex characters to prevent collisions.

---

## 9. Switching to Secure TLS (MQTTS)

To connect via encrypted TLS (port 8883):

1. In `.env`, set:
   ```ini
   MQTT_PORT=8883
   MQTT_PROTOCOL=mqtts
   ```
2. If your broker uses a self-signed or private CA certificate, place the `ca.crt` file in `backend/certs/ca.crt` and configure `rejectUnauthorized: true` in `backend/src/mqttClient.ts`.

---

## 10. Production Deployment

1. **Build Assets:**
   ```bash
   npm run build
   ```
2. **Security Checks:**
   - Set `ALLOW_TEST_INJECTION=false` in production `.env`.
   - Set `NODE_ENV=production`.
   - Ensure `.env` is never committed or published.
3. **Process Supervision:**
   Use a process manager such as **PM2** or **systemd** to run the backend:
   ```bash
   pm2 start backend/dist/server.js --name "smart-energy-backend"
   ```
4. **Reverse Proxy:**
   Deploy Nginx in front of Node.js. For Server-Sent Events (`/api/stream`), ensure proxy buffering is disabled:
   ```nginx
   location /api/stream {
       proxy_pass http://127.0.0.1:4000;
       proxy_set_header Connection '';
       proxy_http_version 1.1;
       chunked_transfer_encoding off;
       proxy_buffering off;
       proxy_cache off;
   }
   ```
