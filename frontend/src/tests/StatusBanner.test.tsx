import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBanner } from '../components/StatusBanner';

describe('StatusBanner Component', () => {
  it('displays NORMAL when system is healthy', () => {
    render(
      <StatusBanner
        systemStatus="NORMAL"
        mqttStatus="CONNECTED"
        isOverload={false}
        isStale={false}
        isSensorError={false}
        dataAgeMs={500}
        stalenessTimeoutMs={5000}
      />
    );

    expect(screen.getByText('SYSTEM OPERATING NORMALLY')).toBeInTheDocument();
    expect(screen.getByText('NORMAL')).toBeInTheDocument();
  });

  it('displays prominent OVERLOAD banner when hardware alarm is active', () => {
    render(
      <StatusBanner
        systemStatus="OVERLOAD"
        mqttStatus="CONNECTED"
        isOverload={true}
        isStale={false}
        isSensorError={false}
        dataAgeMs={200}
        stalenessTimeoutMs={5000}
      />
    );

    expect(screen.getByText(/HARDWARE OVERLOAD ALERT DETECTED/i)).toBeInTheDocument();
    expect(screen.getByText(/CRITICAL HARDWARE ALARM: OVERLOAD TRIGGERED/i)).toBeInTheDocument();
  });

  it('displays STALE DATA warning when timeout is exceeded', () => {
    render(
      <StatusBanner
        systemStatus="STALE_DATA"
        mqttStatus="CONNECTED"
        isOverload={false}
        isStale={true}
        isSensorError={false}
        dataAgeMs={8000}
        stalenessTimeoutMs={5000}
      />
    );

    expect(screen.getByText(/TELEMETRY STREAM STALE/i)).toBeInTheDocument();
    expect(screen.getByText('STALE DATA')).toBeInTheDocument();
  });

  it('displays SENSOR ERROR when validation fault is reported', () => {
    render(
      <StatusBanner
        systemStatus="SENSOR_ERROR"
        mqttStatus="CONNECTED"
        isOverload={false}
        isStale={false}
        isSensorError={true}
        dataAgeMs={1000}
        stalenessTimeoutMs={5000}
      />
    );

    expect(screen.getByText(/SENSOR VALIDATION FAULT/i)).toBeInTheDocument();
    expect(screen.getByText('SENSOR ERROR')).toBeInTheDocument();
  });

  it('displays DISCONNECTED when MQTT drops', () => {
    render(
      <StatusBanner
        systemStatus="DISCONNECTED"
        mqttStatus="DISCONNECTED"
        isOverload={false}
        isStale={false}
        isSensorError={false}
        dataAgeMs={null}
        stalenessTimeoutMs={5000}
      />
    );

    expect(screen.getByText(/EMQX MQTT BROKER DISCONNECTED/i)).toBeInTheDocument();
  });
});
