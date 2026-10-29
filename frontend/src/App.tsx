import React from 'react';
import { useEnergySSE } from './hooks/useEnergySSE';
import { Header } from './components/Header';
import { StatusBanner } from './components/StatusBanner';
import { MetricCards } from './components/MetricCards';
import { ChartsSection } from './components/ChartsSection';
import { ConnectionPanel } from './components/ConnectionPanel';
import { HardwareInfoSection } from './components/HardwareInfoSection';
import { TestControlModal } from './components/TestControlModal';

export const App: React.FC = () => {
  const {
    telemetry,
    history,
    systemStatus,
    mqttStatus,
    esp32Status,
    mqttBroker,
    lastValidTimestamp,
    dataAgeMs,
    isStale,
    isOverload,
    isSensorError,
    metrics,
    stalenessTimeoutMs,
    sseState,
    reconnect,
  } = useEnergySSE();

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        device={telemetry?.device || null}
        mqttStatus={mqttStatus}
        lastValidTimestamp={lastValidTimestamp}
        isStale={isStale}
        dataAgeMs={dataAgeMs}
        onRefreshClick={reconnect}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Status & Overload Banner */}
        <StatusBanner
          systemStatus={systemStatus}
          mqttStatus={mqttStatus}
          isOverload={isOverload}
          isStale={isStale}
          isSensorError={isSensorError}
          dataAgeMs={dataAgeMs}
          stalenessTimeoutMs={stalenessTimeoutMs}
        />

        {/* 4 Primary Metric Cards */}
        <MetricCards
          telemetry={telemetry}
          isStale={isStale}
          isOverload={isOverload}
          dataAgeMs={dataAgeMs}
        />

        {/* Real-time Time Series Charts */}
        <ChartsSection history={history} />

        {/* Diagnostic & Connection Panel */}
        <ConnectionPanel
          mqttStatus={mqttStatus}
          mqttBroker={mqttBroker}
          esp32Status={esp32Status}
          sseState={sseState}
          lastValidTimestamp={lastValidTimestamp}
          validCount={metrics.validMessagesCount}
          rejectedCount={metrics.rejectedMessagesCount}
          dataAgeMs={dataAgeMs}
          isStale={isStale}
          stalenessTimeoutMs={stalenessTimeoutMs}
        />

        {/* Hardware & Data Flow Documentation */}
        <HardwareInfoSection />

        {/* Interactive Developer Verification Tool */}
        <TestControlModal />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-850 bg-slate-950/60 py-6 px-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Smart Energy Monitoring System v1.0.0 &bull; Industrial IoT Telemetry</span>
          <span>Zero Client Credentials &bull; Server-Sent Events Real-Time Pipeline</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
