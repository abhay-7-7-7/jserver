import React, { useState } from 'react';
import { Play, Flame, AlertTriangle, Send, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export const TestControlModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const defaultSample = {
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

  const [jsonText, setJsonText] = useState(JSON.stringify(defaultSample, null, 2));

  const sendPayload = async (payloadObj: any) => {
    setStatusMessage('Transmitting payload to backend...');
    setIsError(false);

    try {
      const res = await fetch('/api/test/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadObj),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsError(true);
        setStatusMessage(`Rejected (${res.status}): ${data.error || 'Failed to inject payload'}`);
      } else {
        setIsError(false);
        setStatusMessage(`✅ Valid telemetry accepted! Dashboard updated instantly via SSE.`);
      }
    } catch (err: any) {
      setIsError(true);
      setStatusMessage(`Network error: ${err.message}`);
    }

    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const handleSendCustom = () => {
    try {
      const parsed = JSON.parse(jsonText);
      sendPayload(parsed);
    } catch (err: any) {
      setIsError(true);
      setStatusMessage(`JSON Parse Error: ${err.message}`);
    }
  };

  const handleInjectNormal = () => {
    const payload = {
      device: 'SMART_ENERGY_ESP32',
      voltage_v: Number((228 + Math.random() * 5).toFixed(1)),
      current_a: Number((1.8 + Math.random() * 0.5).toFixed(2)),
      power_w: Number((410 + Math.random() * 100).toFixed(1)),
      energy_wh: Number((14.2 + Math.random() * 2).toFixed(2)),
      energy_kwh: Number((0.0142 + Math.random() * 0.002).toFixed(4)),
      alert: false,
      valid: true,
      uptimeMs: Math.floor(Math.random() * 500000),
    };
    setJsonText(JSON.stringify(payload, null, 2));
    sendPayload(payload);
  };

  const handleInjectOverload = () => {
    const payload = {
      device: 'SMART_ENERGY_ESP32',
      voltage_v: 242.5,
      current_a: 16.8,
      power_w: 4074.0,
      energy_wh: 28.5,
      energy_kwh: 0.0285,
      alert: true,
      valid: true,
      uptimeMs: 145000,
    };
    setJsonText(JSON.stringify(payload, null, 2));
    sendPayload(payload);
  };

  const handleInjectSensorFault = () => {
    const payload = {
      device: 'SMART_ENERGY_ESP32',
      voltage_v: 0.0,
      current_a: 0.0,
      power_w: 0.0,
      energy_wh: 12.5,
      energy_kwh: 0.0125,
      alert: false,
      valid: false, // sensor failure flag
      uptimeMs: 150000,
    };
    setJsonText(JSON.stringify(payload, null, 2));
    sendPayload(payload);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition"
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-sm font-bold text-white">
            Developer Verification & Message Injection Utility
          </span>
          <span className="text-[10px] bg-cyan-950/80 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800/60 font-mono">
            DEV ONLY
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{isOpen ? 'Collapse Tools' : 'Test Pipeline'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-slate-800 space-y-4 bg-slate-950/40">
          <p className="text-xs text-slate-400 leading-relaxed">
            Use this panel to simulate incoming ESP32 MQTT telemetry packets locally through the backend pipeline (<code>POST /api/test/telemetry</code>). Verified against the strict validation schema.
          </p>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleInjectNormal}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Play className="w-3.5 h-3.5" />
              Inject Nominal Telemetry
            </button>
            <button
              onClick={handleInjectOverload}
              className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Flame className="w-3.5 h-3.5" />
              Inject Hardware Overload (alert: true)
            </button>
            <button
              onClick={handleInjectSensorFault}
              className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Inject Sensor Fault (valid: false)
            </button>
          </div>

          {/* Custom payload editor */}
          <div className="relative">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Payload JSON (matches Section 3 specification):</span>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {isCopied ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={9}
              className="w-full bg-slate-900 border border-slate-750 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={handleSendCustom}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Payload to Pipeline
            </button>

            {statusMessage && (
              <span
                className={`text-xs font-mono px-3 py-1.5 rounded-lg border ${
                  isError
                    ? 'bg-rose-950/40 text-rose-300 border-rose-800'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                }`}
              >
                {statusMessage}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
