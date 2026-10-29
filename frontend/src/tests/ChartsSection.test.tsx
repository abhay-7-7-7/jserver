import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartsSection } from '../components/ChartsSection';
import { ValidatedTelemetry } from '../types';

describe('ChartsSection Component', () => {
  it('renders helpful empty state when history is empty', () => {
    render(<ChartsSection history={[]} />);

    expect(screen.getByText('No Historical Telemetry Recorded Yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Historical data points will populate automatically/i)
    ).toBeInTheDocument();
  });

  it('renders chart controls when historical telemetry is present', () => {
    const mockHistory: ValidatedTelemetry[] = [
      {
        device: 'SMART_ENERGY_ESP32',
        voltage_v: 230.0,
        current_a: 2.0,
        power_w: 460.0,
        energy_wh: 12.5,
        energy_kwh: 0.0125,
        alert: false,
        valid: true,
        uptimeMs: 1000,
        receivedAt: new Date().toISOString(),
        receivedTimestamp: Date.now() - 2000,
      },
      {
        device: 'SMART_ENERGY_ESP32',
        voltage_v: 231.0,
        current_a: 2.1,
        power_w: 485.1,
        energy_wh: 12.6,
        energy_kwh: 0.0126,
        alert: false,
        valid: true,
        uptimeMs: 2000,
        receivedAt: new Date().toISOString(),
        receivedTimestamp: Date.now() - 1000,
      },
    ];

    render(<ChartsSection history={mockHistory} />);

    expect(screen.getByText('Live Telemetry Time-Series')).toBeInTheDocument();
    expect(screen.getByText(/2 active data points shown/i)).toBeInTheDocument();
    expect(screen.getByText('All (Grid)')).toBeInTheDocument();
    expect(screen.getByText('Voltage')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Power')).toBeInTheDocument();
    expect(screen.getByText('Energy')).toBeInTheDocument();
  });
});
