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

// The hook moved from hooks/useAppData to the AppDataContext module — mock
// the module the component actually imports from.
vi.mock('@/contexts/AppDataContext', () => ({
  useAppData: () => ({
    isOnline: true,
    backendAvailable: true,
    syncStatus: { state: 'idle' },
    pendingSyncCount: 0,
    conflicts: [],
    resolveConflict: vi.fn(),
    resolveAllConflicts: vi.fn(),
    getQueueStatus: () => ({ api: { pending: 0, completed: 0 }, sync: { pending: 0, errors: 0 } }),
    forceSync: vi.fn(),
    clearSyncQueue: vi.fn(),
  })
}));

describe('FeatureSettings', () => {
  it('renders tabs and overview content', () => {
    render(<FeatureSettings />);
    expect(screen.getByText('Feature Settings')).toBeInTheDocument();
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('Sync Management')).toBeInTheDocument();
  });

  it('renders the Feature Flags tab with Application Mode and known flags', () => {
    render(<FeatureSettings />);
    fireEvent.click(screen.getByText('Feature Flags'));
    expect(screen.getByText('Application Mode')).toBeInTheDocument();
    // "Feature Flags" appears both as the tab label and the card title
    expect(screen.getAllByText('Feature Flags').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Enhanced Data Layer/i)).toBeInTheDocument();
  });

  it('toggling a feature flag routes through unified updateConfig', () => {
    render(<FeatureSettings />);
    fireEvent.click(screen.getByText('Feature Flags'));
    const flagToggles = screen.getAllByRole('checkbox');
    expect(flagToggles.length).toBeGreaterThan(0);
    fireEvent.click(flagToggles[0]);
    expect(mockFns.updateConfig).toHaveBeenCalled();
  });

  it('reflects system status from the app data layer', () => {
    render(<FeatureSettings />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
});
