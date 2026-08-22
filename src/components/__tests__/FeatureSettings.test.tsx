// ABOUTME: Tests for FeatureSettings component feature toggles and actions
// ABOUTME: Ensures unified config updates without direct localStorage usage

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeatureSettings from '@/components/FeatureSettings';

const mockNavigate = vi.fn();

const mockFns = {
  updateConfig: vi.fn(),
  resetConfig: vi.fn(),
  applyPreset: vi.fn(),
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../hooks/useUnifiedConfig', async () => {
  const actual = await vi.importActual<any>('../../hooks/useUnifiedConfig');
  return {
    ...actual,
    useUnifiedConfig: () => ({
      config: {
        backend: { url: '', environment: 'unknown', available: true },
        features: {
          enhancedDataLayer: true,
          networkStatusIndicator: false,
          moduleHealthIndicator: false,
          syncStatusComponent: false,
          globalNotifications: false,
          performanceOptimizations: true,
          advancedErrorBoundaries: true,
          // performanceMonitorWidget intentionally omitted to simulate missing flag
          enableOfflineMode: true,
        },
      },
      updateConfig: mockFns.updateConfig,
      resetConfig: mockFns.resetConfig,
      applyPreset: mockFns.applyPreset,
    }),
    useEnvironment: () => ({ current: 'development', config: {}, update: vi.fn() }),
  };
});

vi.mock('../../hooks/useAppData', () => ({
  useAppData: () => ({
    isOnline: true,
    backendAvailable: true,
    syncStatus: { state: 'idle' },
    pendingSyncCount: 0,
    conflicts: [],
    getQueueStatus: () => ({ api: { pending: 0, completed: 0 }, sync: { pending: 0, errors: 0 } })
  })
}));

describe('FeatureSettings', () => {
  it('renders tabs and overview content', () => {
    render(<FeatureSettings />);
    expect(screen.getByText('Feature Settings')).toBeInTheDocument();
    expect(screen.getByText('System Status')).toBeInTheDocument();
  });

  it('Fix Missing Flags adds performanceMonitorWidget via unified config', () => {
    render(<FeatureSettings />);
    fireEvent.click(screen.getByText('Feature Flags'));
    const fixBtn = screen.getByText('Fix Missing Flags');
    fireEvent.click(fixBtn);
    expect(mockFns.updateConfig).toHaveBeenCalled();
  });

  it('Reset Config uses unified resetConfig (no localStorage)', () => {
    render(<FeatureSettings />);
    fireEvent.click(screen.getByText('Feature Flags'));
    const resetBtn = screen.getByText('Reset Config');
    fireEvent.click(resetBtn);
    expect(mockFns.resetConfig).toHaveBeenCalled();
  });

  it('Restore Defaults applies environment preset', () => {
    render(<FeatureSettings />);
    fireEvent.click(screen.getByText('Feature Flags'));
    const restoreBtn = screen.getByText('Restore Defaults');
    fireEvent.click(restoreBtn);
    expect(mockFns.applyPreset).toHaveBeenCalledWith('development');
  });

  it('shows a data layer handoff instead of duplicate mode and backend controls', () => {
    render(<FeatureSettings />);
    fireEvent.click(screen.getByText('Feature Flags'));
    expect(screen.getByText('Data Layer Controls')).toBeInTheDocument();
    expect(screen.queryByText('Application Mode')).not.toBeInTheDocument();
    expect(screen.queryByText('Backend Configuration')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /open data layer settings/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/settings/data-layer');
  });
});
