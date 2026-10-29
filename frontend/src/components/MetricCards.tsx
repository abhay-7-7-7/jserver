import React from 'react';
import { Zap, Gauge, Cpu, BatteryCharging, Info, AlertTriangle } from 'lucide-react';
import { ValidatedTelemetry } from '../types';

interface MetricCardsProps {
  telemetry: ValidatedTelemetry | null;
  isStale: boolean;
  isOverload: boolean;
  dataAgeMs: number | null;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  telemetry,
  isStale,
  isOverload,
  dataAgeMs,
}) => {
  // Precision helpers
  const formatVoltage = (v: number | undefined) =>
    typeof v === 'number' ? v.toFixed(1) : '--.-';

  const formatCurrent = (a: number | undefined) =>
    typeof a === 'number' ? a.toFixed(2) : '-.--';

  const formatPower = (w: number | undefined) =>
    typeof w === 'number' ? w.toFixed(1) : '--.-';

  const formatWh = (wh: number | undefined) =>
    typeof wh === 'number' ? wh.toFixed(2) : '--.--';

  const formatKwh = (kwh: number | undefined) =>
    typeof kwh === 'number' ? kwh.toFixed(4) : '-.----';

  const formatAge = () => {
    if (dataAgeMs === null) return 'No data';
    const s = Math.floor(dataAgeMs / 1000);
    return s < 1 ? '<1s ago' : `${s}s ago`;
  };

  // Card Skeleton when waiting for initial data
  const renderCardSkeleton = (title: string, unit: string, icon: React.ReactNode) => (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg animate-pulse">
      <div className="flex items-center justify-between text-slate-400 mb-3">
        <span className="text-xs font-semibold tracking-wider uppercase">{title}</span>
        <div className="p-2 rounded-xl bg-slate-800 text-slate-500">{icon}</div>
      </div>
      <div className="space-y-2 mt-2">
        <div className="h-8 bg-slate-800 rounded w-28"></div>
        <div className="h-4 bg-slate-800/60 rounded w-20"></div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <span>Awaiting initial telemetry...</span>
        <span className="font-mono text-slate-600">[{unit}]</span>
      </div>
    </div>
  );

  if (!telemetry) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderCardSkeleton('Voltage', 'V', <Zap className="w-5 h-5" />)}
        {renderCardSkeleton('Current', 'A', <Gauge className="w-5 h-5" />)}
        {renderCardSkeleton('Active Power', 'W', <Cpu className="w-5 h-5" />)}
        {renderCardSkeleton('Energy Accumulated', 'Wh / kWh', <BatteryCharging className="w-5 h-5" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. VOLTAGE CARD */}
      <div
        className={`bg-slate-900/90 rounded-2xl p-5 border transition-all duration-300 relative shadow-lg ${
          isStale
            ? 'border-yellow-600/40 bg-slate-900/60'
            : 'border-slate-800 hover:border-cyan-500/40 hover:shadow-cyan-950/20'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5">
            Voltage
            {isStale && (
              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">
                Stale ({formatAge()})
              </span>
            )}
          </span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
            {formatVoltage(telemetry.voltage_v)}
          </span>
          <span className="text-sm font-semibold text-cyan-400">V</span>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Grid/Supply Potential</span>
          <span className="font-mono text-slate-300">
            {telemetry.voltage_v >= 210 && telemetry.voltage_v <= 250 ? (
              <span className="text-emerald-400">Nominal AC</span>
            ) : (
              <span className="text-amber-400">Off-Nominal</span>
            )}
          </span>
        </div>
      </div>

      {/* 2. CURRENT CARD */}
      <div
        className={`bg-slate-900/90 rounded-2xl p-5 border transition-all duration-300 relative shadow-lg ${
          isStale
            ? 'border-yellow-600/40 bg-slate-900/60'
            : isOverload
            ? 'border-rose-500/80 bg-rose-950/20'
            : 'border-slate-800 hover:border-emerald-500/40 hover:shadow-emerald-950/20'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5">
            Current
            {isStale && (
              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">
                Stale ({formatAge()})
              </span>
            )}
          </span>
          <div
            className={`p-2 rounded-xl border ${
              isOverload
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span
            className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
              isOverload ? 'text-rose-400' : 'text-white'
            }`}
          >
            {formatCurrent(telemetry.current_a)}
          </span>
          <span
            className={`text-sm font-semibold ${
              isOverload ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            A
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Circuit Load</span>
          <span className="font-mono text-slate-300">
            {isOverload ? (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> High Current
              </span>
            ) : (
              'Normal Flow'
            )}
          </span>
        </div>
      </div>

      {/* 3. ACTIVE POWER CARD */}
      <div
        className={`bg-slate-900/90 rounded-2xl p-5 border transition-all duration-300 relative shadow-lg ${
          isStale
            ? 'border-yellow-600/40 bg-slate-900/60'
            : isOverload
            ? 'border-rose-500/80 bg-rose-950/20'
            : 'border-slate-800 hover:border-amber-500/40 hover:shadow-amber-950/20'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5">
            Active Power
            {isStale && (
              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">
                Stale ({formatAge()})
              </span>
            )}
          </span>
          <div
            className={`p-2 rounded-xl border ${
              isOverload
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span
            className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
              isOverload ? 'text-rose-400' : 'text-white'
            }`}
          >
            {formatPower(telemetry.power_w)}
          </span>
          <span
            className={`text-sm font-semibold ${
              isOverload ? 'text-rose-400' : 'text-amber-400'
            }`}
          >
            W
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Real Dissipation</span>
          <span className="font-mono text-slate-300">
            {(telemetry.power_w / 1000).toFixed(3)} kW
          </span>
        </div>
      </div>

      {/* 4. ACCUMULATED ENERGY CARD */}
      <div
        className={`bg-slate-900/90 rounded-2xl p-5 border transition-all duration-300 relative shadow-lg ${
          isStale
            ? 'border-yellow-600/40 bg-slate-900/60'
            : 'border-slate-800 hover:border-purple-500/40 hover:shadow-purple-950/20'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5">
            Accumulated Energy
            {isStale && (
              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">
                Stale
              </span>
            )}
          </span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <BatteryCharging className="w-5 h-5" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
            {formatWh(telemetry.energy_wh)}
          </span>
          <span className="text-sm font-semibold text-purple-400">Wh</span>
        </div>

        <div className="mt-2 text-xs font-mono text-slate-400 flex items-center justify-between">
          <span>Equivalent:</span>
          <span className="font-bold text-slate-200">
            {formatKwh(telemetry.energy_kwh)} kWh
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-start gap-1.5 text-[10px] text-slate-500 leading-tight">
          <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
          <span>Calculated by STM32 from simulated V & I; not actual mains.</span>
        </div>
      </div>
    </div>
  );
};
