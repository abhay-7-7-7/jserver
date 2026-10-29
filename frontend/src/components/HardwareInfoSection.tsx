import React from 'react';
import { Layers, ArrowRight, ShieldCheck, Cpu, Radio, Server, Monitor } from 'lucide-react';

export const HardwareInfoSection: React.FC = () => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Hardware Architecture & End-to-End Pipeline
        </h3>
        <span className="text-xs text-slate-400 font-mono">Isolated Full-Stack Pipeline</span>
      </div>

      {/* Pipeline Diagram Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
        {/* Node 1: STM32 */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
              <Cpu className="w-4 h-4" />
              1. STM32 MCU
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Generates simulated voltage & current values, accumulates Wh energy, and computes hardware overload alarm.
            </p>
          </div>
          <div className="mt-3 text-[10px] text-cyan-300 font-mono bg-cyan-950/40 p-1.5 rounded border border-cyan-800/40 flex items-center justify-between">
            <span>UART TX</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Node 2: ESP32 */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
              <Radio className="w-4 h-4" />
              2. ESP32 Gateway
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Receives UART packets from STM32, serializes telemetry JSON, and publishes to EMQX broker via WiFi.
            </p>
          </div>
          <div className="mt-3 text-[10px] text-emerald-300 font-mono bg-emerald-950/40 p-1.5 rounded border border-emerald-800/40 flex items-center justify-between">
            <span>MQTT (TCP:1883)</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Node 3: EMQX */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
              <Radio className="w-4 h-4" />
              3. EMQX Broker
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              High-throughput enterprise MQTT broker. Manages topics: telemetry, status, and alerts.
            </p>
          </div>
          <div className="mt-3 text-[10px] text-amber-300 font-mono bg-amber-950/40 p-1.5 rounded border border-amber-800/40 flex items-center justify-between">
            <span>MQTT.js Sub</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Node 4: Node.js Backend */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-400 font-bold mb-1">
              <Server className="w-4 h-4" />
              4. Node.js Backend
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Validates schema & finite numbers, holds credential secrets, guards history, and monitors 5s staleness.
            </p>
          </div>
          <div className="mt-3 text-[10px] text-purple-300 font-mono bg-purple-950/40 p-1.5 rounded border border-purple-800/40 flex items-center justify-between">
            <span>Server-Sent Events</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Node 5: React Dashboard */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-bold mb-1">
              <Monitor className="w-4 h-4" />
              5. React UI
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Receives instantaneous SSE snapshots & deltas. Renders live Recharts curves without page reloads.
            </p>
          </div>
          <div className="mt-3 text-[10px] text-blue-300 font-mono bg-blue-950/40 p-1.5 rounded border border-blue-800/40 flex items-center justify-center">
            <span>Zero Broker Credentials In Browser</span>
          </div>
        </div>
      </div>

      {/* Disclaimers & Security Guarantees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-slate-400 text-[11px] leading-relaxed">
            <strong className="text-slate-200">Zero Trust Credential Architecture:</strong> MQTT username, password, and private connection credentials reside strictly within the backend process memory. The browser establishes an SSE connection only with the Node.js server.
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-2.5">
          <Cpu className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-slate-400 text-[11px] leading-relaxed">
            <strong className="text-slate-200">Simulated Sensing Disclaimer:</strong> Accumulated energy (Wh / kWh) is calculated algorithmically by the STM32 firmware from simulated voltage and current values. This system does not measure real mains high-voltage energy.
          </div>
        </div>
      </div>
    </div>
  );
};
