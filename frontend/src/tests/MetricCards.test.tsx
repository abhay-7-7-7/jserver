import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCards } from '../components/MetricCards';
import { ValidatedTelemetry } from '../types';

describe('MetricCards Component', () => {
  it('renders empty skeleton states when telemetry is null', () => {
    render(
      <MetricCards
        telemetry={null}
        isStale={false}
        isOverload={false}
        dataAgeMs={null}
      />
    );

    expect(screen.getAllByText(/Awaiting initial telemetry.../i)).toHaveLength(4);
    expect(screen.getByText('Voltage')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Active Power')).toBeInTheDocument();
    expect(screen.getByText('Energy Accumulated')).toBeInTheDocument();
  });

  it('renders exact metric values and units with proper precision when telemetry is present', () => {
    const mockTelemetry: ValidatedTelemetry = {
      device: 'SMART_ENERGY_ESP32',
      voltage_v: 231.4,
      current_a: 2.15,
      power_w: 497.5,
      energy_wh: 16.82,
      energy_kwh: 0.0168,
      alert: false,
      valid: true,
      uptimeMs: 98765,
      receivedAt: new Date().toISOString(),
      receivedTimestamp: Date.now(),
    };

    render(
      <MetricCards
        telemetry={mockTelemetry}
        isStale={false}
        isOverload={false}
        dataAgeMs={100}
      />
    );

    expect(screen.getByText('231.4')).toBeInTheDocument();
    expect(screen.getByText('2.15')).toBeInTheDocument();
    expect(screen.getByText('497.5')).toBeInTheDocument();
    expect(screen.getByText('16.82')).toBeInTheDocument();
    expect(screen.getByText(/0.0168 kWh/i)).toBeInTheDocument();
  });

  it('labels cards as STALE when updates stop without losing historical values', () => {
    const mockTelemetry: ValidatedTelemetry = {
      device: 'SMART_ENERGY_ESP32',
      voltage_v: 230.0,
      current_a: 2.0,
      power_w: 460.0,
      energy_wh: 12.5,
      energy_kwh: 0.0125,
      alert: false,
      valid: true,
      uptimeMs: 123456,
      receivedAt: new Date().toISOString(),
      receivedTimestamp: Date.now() - 15000,
    };

    render(
      <MetricCards
        telemetry={mockTelemetry}
        isStale={true}
        isOverload={false}
        dataAgeMs={15000}
      />
    );

    // Stale tags appear
    const staleTags = screen.getAllByText(/Stale/i);
    expect(staleTags.length).toBeGreaterThan(0);
    // Historical values are preserved and visible
    expect(screen.getByText('230.0')).toBeInTheDocument();
    expect(screen.getByText('460.0')).toBeInTheDocument();
  });
});
