// ABOUTME: Tests for UnifiedModeSwitch component to verify settings consolidation functionality
// ABOUTME: This test ensures the unified mode switching component works correctly across all settings pages

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UnifiedModeSwitch from '@/components/UnifiedModeSwitch';
import { UnifiedConfigProvider } from '@/contexts/UnifiedConfigContext';

// The component talks to the DataModeManager singleton directly. Mock the
// module (it is also consumed by UnifiedConfigProvider) so the tests are
// deterministic and do not touch the real manager.
vi.mock('@/services/data/dataModeManager', () => {
  const mockManager = {
    getStatus: vi.fn().mockResolvedValue({
      currentMode: 'demo',
      activeProvider: 'SQLiteOPFS',
      isTransitioning: false,
      dataCount: 0,
      lastSwitched: new Date('2024-01-01'),
    }),
    switchMode: vi.fn().mockResolvedValue(undefined),
    getCurrentMode: vi.fn(() => 'demo'),
    clearAllData: vi.fn().mockResolvedValue(undefined),
    seedDemoData: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  };
  return {
    getDataModeManager: vi.fn(() => mockManager),
    markDemoDataCleared: vi.fn(),
    isDemoDataCleared: vi.fn(() => false),
    resetDemoDataCleared: vi.fn(),
    resetDataModeManager: vi.fn(),
  };
});

const { getDataModeManager } = await import('@/services/data/dataModeManager');
const mockManager = getDataModeManager() as unknown as {
  getStatus: ReturnType<typeof vi.fn>;
  switchMode: ReturnType<typeof vi.fn>;
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  // UnifiedConfigProvider outermost, mirroring the production provider order in App.tsx —
  // UnifiedModeSwitch calls useUnifiedConfig which throws without it.
  <UnifiedConfigProvider>{children}</UnifiedConfigProvider>
);

describe('UnifiedModeSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockManager.getStatus.mockResolvedValue({
      currentMode: 'demo',
      activeProvider: 'SQLiteOPFS',
      isTransitioning: false,
      dataCount: 0,
      lastSwitched: new Date('2024-01-01'),
    });
  });

  it('should render without crashing', async () => {
    render(
      <TestWrapper>
        <UnifiedModeSwitch />
      </TestWrapper>
    );

    // The component renders one card per available data mode
    await waitFor(() => expect(screen.getByText('demo')).toBeInTheDocument());
    expect(screen.getByText('development')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
  });

  it('should display mode switch options', async () => {
    render(
      <TestWrapper>
        <UnifiedModeSwitch />
      </TestWrapper>
    );

    await waitFor(() => expect(screen.getByText('demo')).toBeInTheDocument());
    expect(screen.getByText(/Local SQLite file storage/i)).toBeInTheDocument();
    expect(screen.getByText(/Browser-based SQLite with sample data/i)).toBeInTheDocument();
    expect(screen.getByText(/Production-ready database/i)).toBeInTheDocument();
  });

  it('should show current mode status', async () => {
    render(
      <TestWrapper>
        <UnifiedModeSwitch />
      </TestWrapper>
    );

    // The card for the active mode (demo, per the mocked status) is highlighted
    await waitFor(() => {
      const demoCard = screen.getByText('demo').closest('.p-4');
      expect(demoCard).toHaveClass('border-primary-500');
    });
  });

  it('should handle mode switching', async () => {
    render(
      <TestWrapper>
        <UnifiedModeSwitch />
      </TestWrapper>
    );

    // Wait until status has loaded, otherwise the click handler no-ops
    await waitFor(() => expect(screen.getByText('production')).toBeInTheDocument());

    fireEvent.click(screen.getByText('production'));

    await waitFor(() => {
      expect(mockManager.switchMode).toHaveBeenCalledWith('production', {
        preserveData: false,
        seedData: false,
        clearData: false,
        backupData: true,
      });
    });
  });

  it('should display mode descriptions', () => {
    render(
      <TestWrapper>
        <UnifiedModeSwitch />
      </TestWrapper>
    );

    // showDescription defaults to true
    expect(screen.getByText(/sample data for demonstrations/i)).toBeInTheDocument();
  });
});
