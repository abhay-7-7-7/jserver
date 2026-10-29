import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { LineChart as ChartIcon, Zap, Gauge, Cpu, BatteryCharging } from 'lucide-react';
import { ValidatedTelemetry } from '../types';

interface ChartsSectionProps {
  history: ValidatedTelemetry[];
}

type MetricType = 'all' | 'voltage' | 'current' | 'power' | 'energy';

export const ChartsSection: React.FC<ChartsSectionProps> = ({ history }) => {
  const [activeTab, setActiveTab] = useState<MetricType>('all');
  const [dataPointsLimit, setDataPointsLimit] = useState<number>(50);

  // Transform and slice history for charting
  const chartData = useMemo(() => {
    const sliced = history.slice(-dataPointsLimit);
    return sliced.map((item) => {
      const d = new Date(item.receivedTimestamp);
      const timeStr = d.toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return {
        time: timeStr,
        timestamp: item.receivedTimestamp,
        voltage: item.voltage_v,
        current: item.current_a,
        power: item.power_w,
        energy: item.energy_wh,
        alert: item.alert,
      };
    });
  }, [history, dataPointsLimit]);

  // Custom Dark Tooltip
  const renderCustomTooltip = ({ active, payload, label }: any, unit: string) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-750 p-2.5 rounded-xl shadow-xl text-xs backdrop-blur-md font-mono">
          <div className="text-slate-400 text-[10px] mb-1">{label}</div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: payload[0].color || payload[0].stroke }}
            />
            <span className="font-bold text-white text-sm">
              {typeof val === 'number' ? val.toFixed(2) : val} {unit}
            </span>
          </div>
          {dataPoint?.alert && (
            <div className="mt-1 text-[10px] text-rose-400 font-bold uppercase tracking-wider">
              ⚠️ Hardware Alert Triggered
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Empty State when no history exists
  if (history.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center shadow-lg">
        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-500 mb-3">
          <ChartIcon className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-200">No Historical Telemetry Recorded Yet</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
          Historical data points will populate automatically when the Node.js backend receives real-time telemetry from the ESP32 node via EMQX.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Controls & Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ChartIcon className="w-4 h-4 text-cyan-400" />
            Live Telemetry Time-Series
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real historical readings recorded by backend ({chartData.length} active data points shown)
          </p>
        </div>

        {/* View filters and point limit */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Tab Selector */}
          <div className="bg-slate-800/80 p-1 rounded-xl flex items-center gap-1 border border-slate-700/60">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                activeTab === 'all'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All (Grid)
            </button>
            <button
              onClick={() => setActiveTab('voltage')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                activeTab === 'voltage'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Voltage
            </button>
            <button
              onClick={() => setActiveTab('current')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                activeTab === 'current'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setActiveTab('power')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                activeTab === 'power'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Power
            </button>
            <button
              onClick={() => setActiveTab('energy')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                activeTab === 'energy'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Energy
            </button>
          </div>

          {/* Points limit selector */}
          <select
            value={dataPointsLimit}
            onChange={(e) => setDataPointsLimit(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value={20}>Last 20 pts</option>
            <option value={50}>Last 50 pts</option>
            <option value={100}>Last 100 pts</option>
            <option value={200}>All (Max 200)</option>
          </select>
        </div>
      </div>

      {/* Charts Display */}
      <div
        className={`grid gap-5 ${
          activeTab === 'all'
            ? 'grid-cols-1 lg:grid-cols-2'
            : 'grid-cols-1'
        }`}
      >
        {/* 1. VOLTAGE CHART */}
        {(activeTab === 'all' || activeTab === 'voltage') && (
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Voltage [V]
              </span>
              <span className="font-mono text-cyan-400 font-bold">
                {chartData[chartData.length - 1]?.voltage.toFixed(1)} V
              </span>
            </div>
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="voltageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
                  <Tooltip content={(props) => renderCustomTooltip(props, 'V')} />
                  <Area
                    type="monotone"
                    dataKey="voltage"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#voltageGradient)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 2. CURRENT CHART */}
        {(activeTab === 'all' || activeTab === 'current') && (
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                Current [A]
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {chartData[chartData.length - 1]?.current.toFixed(2)} A
              </span>
            </div>
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
                  <Tooltip content={(props) => renderCustomTooltip(props, 'A')} />
                  <Area
                    type="monotone"
                    dataKey="current"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#currentGradient)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 3. ACTIVE POWER CHART */}
        {(activeTab === 'all' || activeTab === 'power') && (
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                Active Power [W]
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {chartData[chartData.length - 1]?.power.toFixed(1)} W
              </span>
            </div>
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
                  <Tooltip content={(props) => renderCustomTooltip(props, 'W')} />
                  <Area
                    type="monotone"
                    dataKey="power"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#powerGradient)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 4. ACCUMULATED ENERGY CHART */}
        {(activeTab === 'all' || activeTab === 'energy') && (
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <BatteryCharging className="w-3.5 h-3.5 text-purple-400" />
                Accumulated Energy [Wh]
              </span>
              <span className="font-mono text-purple-400 font-bold">
                {chartData[chartData.length - 1]?.energy.toFixed(2)} Wh
              </span>
            </div>
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
                  <Tooltip content={(props) => renderCustomTooltip(props, 'Wh')} />
                  <Area
                    type="monotone"
                    dataKey="energy"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#energyGradient)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
