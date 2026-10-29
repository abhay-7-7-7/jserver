import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  WifiOff,
  Flame,
} from 'lucide-react';
import { SystemOperationalStatus, MqttConnectionState } from '../types';

interface StatusBannerProps {
  systemStatus: SystemOperationalStatus;
  mqttStatus: MqttConnectionState;
  isOverload: boolean;
  isStale: boolean;
  isSensorError: boolean;
  dataAgeMs: number | null;
  stalenessTimeoutMs: number;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  systemStatus,
  mqttStatus,
  isOverload,
  isStale,
  isSensorError,
  dataAgeMs,
  stalenessTimeoutMs,
}) => {
  const getStatusConfig = () => {
    switch (systemStatus) {
      case 'OVERLOAD':
        return {
          title: 'HARDWARE OVERLOAD ALERT DETECTED',
          description:
            'The STM32 microcontroller reported an active hardware overload condition (alert: true). Power dissipation or current draw has exceeded safety boundaries.',
          bg: 'bg-rose-950/40 border-rose-600/60 text-rose-200',
          badgeBg: 'bg-rose-600 text-white animate-pulse',
          icon: <Flame className="w-6 h-6 text-rose-400 animate-bounce" />,
          statusLabel: 'OVERLOAD',
        };
      case 'SENSOR_ERROR':
        return {
          title: 'SENSOR VALIDATION FAULT',
          description:
            'Hardware telemetry indicated invalid measurements (valid: false) or sensor malfunction reported from ESP32/STM32 sensing stage.',
          bg: 'bg-amber-950/40 border-amber-600/60 text-amber-200',
          badgeBg: 'bg-amber-600 text-white',
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          statusLabel: 'SENSOR ERROR',
        };
      case 'STALE_DATA':
        const seconds = dataAgeMs ? Math.floor(dataAgeMs / 1000) : 0;
        return {
          title: 'TELEMETRY STREAM STALE',
          description: `No valid telemetry received in the last ${seconds}s (configured timeout is ${
            stalenessTimeoutMs / 1000
          }s). Displayed readings are preserved historical values and are not guaranteed to reflect active circuit state.`,
          bg: 'bg-yellow-950/30 border-yellow-600/50 text-yellow-200',
          badgeBg: 'bg-yellow-600 text-white',
          icon: <Clock className="w-6 h-6 text-yellow-400" />,
          statusLabel: 'STALE DATA',
        };
      case 'DISCONNECTED':
        return {
          title: 'EMQX MQTT BROKER DISCONNECTED',
          description:
            mqttStatus === 'CONNECTING' || mqttStatus === 'RECONNECTING'
              ? 'Attempting to establish connection to EMQX broker...'
              : 'The backend is currently disconnected from the EMQX MQTT broker. Live telemetry cannot be received until connection is restored.',
          bg: 'bg-slate-900 border-slate-700 text-slate-300',
          badgeBg: 'bg-slate-700 text-slate-200',
          icon: <WifiOff className="w-6 h-6 text-slate-400" />,
          statusLabel: 'DISCONNECTED',
        };
      case 'NORMAL':
      default:
        return {
          title: 'SYSTEM OPERATING NORMALLY',
          description:
            'Live telemetry stream active and validated. STM32 and ESP32 nodes operating within nominal electrical thresholds.',
          bg: 'bg-emerald-950/30 border-emerald-600/40 text-emerald-200',
          badgeBg: 'bg-emerald-600 text-white',
          icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
          statusLabel: 'NORMAL',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="space-y-3">
      {/* Critical Overload Banner if Alert is Active */}
      {isOverload && (
        <div className="p-4 rounded-xl border-2 border-rose-500 bg-rose-950/80 text-rose-100 flex items-center justify-between shadow-lg shadow-rose-950/50 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-600/40 border border-rose-400">
              <AlertOctagon className="w-6 h-6 text-rose-200" />
            </div>
            <div>
              <div className="font-extrabold tracking-wider text-sm uppercase text-rose-200">
                CRITICAL HARDWARE ALARM: OVERLOAD TRIGGERED
              </div>
              <p className="text-xs text-rose-300">
                Authoritative STM32 alert bit is TRUE. Inspect electrical load and sensor input immediately.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg uppercase tracking-wider">
            Hardware Alarm
          </span>
        </div>
      )}

      {/* Primary Operational Status Bar */}
      <div className={`p-4 rounded-xl border ${config.bg} transition-all duration-300`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-black/20 flex-shrink-0">{config.icon}</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">{config.title}</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${config.badgeBg}`}>
                  {config.statusLabel}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{config.description}</p>
            </div>
          </div>

          {/* Quick status indicators on right */}
          <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 text-xs">
            {isStale && (
              <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[11px] font-mono">
                Stale (&gt;{stalenessTimeoutMs / 1000}s)
              </span>
            )}
            {isSensorError && (
              <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono">
                Sensor Fault
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
