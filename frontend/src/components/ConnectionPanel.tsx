import React from 'react';
import {
  Server,
  Radio,
  Wifi,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Hash,
} from 'lucide-react';
import { MqttConnectionState, SSEConnectionState } from '../types';

interface ConnectionPanelProps {
  mqttStatus: MqttConnectionState;
  mqttBroker: string;
  esp32Status: string;
  sseState: SSEConnectionState;
  lastValidTimestamp: number | null;
  validCount: number;
  rejectedCount: number;
  dataAgeMs: number | null;
  isStale: boolean;
  stalenessTimeoutMs: number;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({
  mqttStatus,
  mqttBroker,
  esp32Status,
  sseState,
  lastValidTimestamp,
  validCount,
  rejectedCount,
  dataAgeMs,
  isStale,
  stalenessTimeoutMs,
}) => {
  const formatTimestamp = (ts: number | null) => {
    if (!ts) return 'None (Awaiting First Telemetry)';
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()} (${d.getMilliseconds()}ms)`;
  };

  const formatAge = (ms: number | null) => {
    if (ms === null) return 'N/A';
    const s = Math.floor(ms / 1000);
    return `${s}s (${ms}ms)`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          Pipeline Diagnostics & Telemetry Statistics
        </h3>
        <span className="text-xs font-mono text-slate-400">
          Timeout Threshold: {stalenessTimeoutMs / 1000}s
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
        {/* 1. EMQX MQTT BROKER STATUS */}
        <div
          className={`p-3.5 rounded-xl border transition ${
            mqttStatus === 'CONNECTED'
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : mqttStatus === 'RECONNECTING' || mqttStatus === 'CONNECTING'
              ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-sans font-semibold uppercase">MQTT Broker</span>
            <Radio className="w-4 h-4" />
          </div>
          <div className="text-sm font-bold tracking-wide mt-1">
            {mqttStatus === 'CONNECTED' && 'CONNECTED (READY)'}
            {mqttStatus === 'CONNECTING' && 'CONNECTING...'}
            {mqttStatus === 'RECONNECTING' && 'RECONNECTING...'}
            {mqttStatus === 'DISCONNECTED' && 'DISCONNECTED'}
            {mqttStatus === 'ERROR' && 'CONNECTION ERROR'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate" title={mqttBroker}>
            Target: {mqttBroker}
          </div>
        </div>

        {/* 2. SSE BROWSER STREAM STATUS */}
        <div
          className={`p-3.5 rounded-xl border transition ${
            sseState.isConnected
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : sseState.isConnecting
              ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-sans font-semibold uppercase">SSE Browser Stream</span>
            <Wifi className="w-4 h-4" />
          </div>
          <div className="text-sm font-bold tracking-wide mt-1">
            {sseState.isConnected ? 'STREAMING ACTIVE' : 'DISCONNECTED'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Transport: Server-Sent Events (/api/stream)
          </div>
        </div>

        {/* 3. ESP32 HARDWARE NODE STATUS */}
        <div
          className={`p-3.5 rounded-xl border transition ${
            esp32Status === 'online'
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : esp32Status === 'sensor_error'
              ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
              : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-sans font-semibold uppercase">ESP32 Node Status</span>
            <Server className="w-4 h-4" />
          </div>
          <div className="text-sm font-bold tracking-wide mt-1 uppercase">
            {esp32Status || 'UNKNOWN'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Via Topic: energy/monitor/status
          </div>
        </div>

        {/* 4. DATA AGE & FRESHNESS */}
        <div
          className={`p-3.5 rounded-xl border transition ${
            isStale
              ? 'bg-yellow-950/30 border-yellow-500/40 text-yellow-300'
              : lastValidTimestamp
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-sans font-semibold uppercase">Data Age</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-sm font-bold tracking-wide mt-1">
            {formatAge(dataAgeMs)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {isStale ? (
              <span className="text-yellow-400 font-semibold">Exceeds 5s timeout</span>
            ) : lastValidTimestamp ? (
              'Telemetry fresh (<5s)'
            ) : (
              'Awaiting stream'
            )}
          </div>
        </div>
      </div>

      {/* Granular Counters and Timestamps */}
      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-slate-400">
        <div className="flex items-center justify-between sm:justify-start gap-3 bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/60">
          <span className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Valid Received:
          </span>
          <span className="font-bold text-white text-sm">{validCount.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between sm:justify-start gap-3 bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/60">
          <span className="flex items-center gap-1.5 text-slate-300">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Rejected Payloads:
          </span>
          <span className="font-bold text-white text-sm">{rejectedCount.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between sm:justify-start gap-3 bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/60 sm:col-span-1">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Hash className="w-4 h-4 text-cyan-400" />
            Last Valid Time:
          </span>
          <span className="text-slate-200 truncate">{formatTimestamp(lastValidTimestamp)}</span>
        </div>
      </div>
    </div>
  );
};
