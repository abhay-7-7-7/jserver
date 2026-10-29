import React, { useState, useEffect } from 'react';
import { Activity, Radio, Cpu, Clock, RefreshCw } from 'lucide-react';
import { MqttConnectionState } from '../types';

interface HeaderProps {
  device: string | null;
  mqttStatus: MqttConnectionState;
  lastValidTimestamp: number | null;
  isStale: boolean;
  dataAgeMs: number | null;
  onRefreshClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  device,
  mqttStatus,
  lastValidTimestamp,
  isStale,
  dataAgeMs,
  onRefreshClick,
}) => {
  const [localTime, setLocalTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLocalTime(
        now.toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }) +
          ' ' +
          now.toLocaleTimeString(undefined, {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format data age
  const formatDataAge = () => {
    if (dataAgeMs === null || lastValidTimestamp === null) {
      return 'No readings yet';
    }
    const seconds = Math.floor(dataAgeMs / 1000);
    if (seconds < 1) return 'Just now (<1s)';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s ago`;
  };

  const getMqttBadge = () => {
    switch (mqttStatus) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            MQTT Connected
          </span>
        );
      case 'RECONNECTING':
      case 'CONNECTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            MQTT {mqttStatus === 'RECONNECTING' ? 'Reconnecting' : 'Connecting'}
          </span>
        );
      case 'DISCONNECTED':
      case 'ERROR':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            MQTT {mqttStatus === 'ERROR' ? 'Broker Error' : 'Disconnected'}
          </span>
        );
    }
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 sm:px-6 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Title and Device Identifier */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white flex-shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Smart Energy Monitoring System
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                STM32 + ESP32 IoT
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Device ID:
              </span>
              <span className="font-mono font-medium text-slate-200">
                {device || 'Awaiting Device Telemetry...'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Clock & Connection States */}
        <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap text-xs">
          {/* Live Clock */}
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{localTime || 'Synchronizing...'}</span>
          </div>

          {/* MQTT Connection Badge */}
          {getMqttBadge()}

          {/* Last Update Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono transition-colors ${
              isStale
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : lastValidTimestamp
                ? 'bg-slate-800/80 text-slate-300 border-slate-700/60'
                : 'bg-slate-800/40 text-slate-500 border-slate-800'
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                isStale ? 'text-amber-400' : lastValidTimestamp ? 'text-cyan-400 animate-pulse' : 'text-slate-500'
              }`}
            />
            <span>
              {isStale && <span className="font-semibold text-amber-400 mr-1">[STALE]</span>}
              {formatDataAge()}
            </span>
          </div>

          {onRefreshClick && (
            <button
              onClick={onRefreshClick}
              title="Reconnect Stream"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
