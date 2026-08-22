// ABOUTME: Tests for useDataMode React hook
// ABOUTME: Tests hook state management, event handling, and integration with DataModeManager

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useDataMode } from '@/hooks/useDataMode';
import * as DataModeManagerModule from '@/services/data/dataModeManager';

// Mock DataModeManager
vi.mock('../services/DataModeManager');

const mockGetDataModeManager = vi.mocked(DataModeManagerModule.getDataModeManager);

describe('useDataMode', () => {
  let mockManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock manager instance
    mockManager = {
      switchMode: vi.fn(),
      clearAllData: vi.fn(),
      seedDemoData: vi.fn(),
      getStatus: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    };

    mockGetDataModeManager.mockReturnValue(mockManager);

    // Default status
    mockManager.getStatus.mockResolvedValue({
      currentMode: 'development',
      activeProvider: 'SQLiteFile',
      isTransitioning: false,
      dataCount: 0,
      lastSwitched: new Date('2024-01-01')
    });
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useDataMode());
      
      expect(result.current.status).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.switchMode).toBe('function');
      expect(typeof result.current.clearData).toBe('function');
      expect(typeof result.current.seedData).toBe('function');
      expect(typeof result.current.refreshStatus).toBe('function');
    });

    it('should load initial status on mount', async () => {
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      
      expect(mockManager.getStatus).toHaveBeenCalled();
      expect(result.current.status).toEqual({
        currentMode: 'development',
        activeProvider: 'SQLiteFile',
        isTransitioning: false,
        dataCount: 0,
        lastSwitched: new Date('2024-01-01')
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle initial status loading error', async () => {
      mockManager.getStatus.mockRejectedValue(new Error('Status load failed'));
      
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.error).toBe('Status load failed'));
      
      expect(result.current.error).toBe('Status load failed');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.status).toBeNull();
    });
  });

  describe('Event Listeners', () => {
    it('should register event listeners on mount', () => {
      renderHook(() => useDataMode());
      
      expect(mockManager.on).toHaveBeenCalledWith('modeChanged', expect.any(Function));
      expect(mockManager.on).toHaveBeenCalledWith('dataCleared', expect.any(Function));
      expect(mockManager.on).toHaveBeenCalledWith('dataSeeded', expect.any(Function));
      expect(mockManager.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should unregister event listeners on unmount', () => {
      const { unmount } = renderHook(() => useDataMode());
      
      unmount();
      
      expect(mockManager.off).toHaveBeenCalledWith('modeChanged', expect.any(Function));
      expect(mockManager.off).toHaveBeenCalledWith('dataCleared', expect.any(Function));
      expect(mockManager.off).toHaveBeenCalledWith('dataSeeded', expect.any(Function));
      expect(mockManager.off).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle mode changed events', async () => {
      let modeChangedCallback: Function;
      mockManager.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'modeChanged') {
          modeChangedCallback = callback;
        }
      });
      
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      // Simulate mode changed event
      act(() => {
        modeChangedCallback!({
          previousMode: 'development',
          currentMode: 'demo',
          timestamp: new Date()
        });
      });
      
      expect(mockManager.getStatus).toHaveBeenCalledTimes(2); // Initial + after event
    });

    it('should handle error events', async () => {
      let errorCallback: Function;
      mockManager.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          errorCallback = callback;
        }
      });
      
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      // Simulate error event
      act(() => {
        errorCallback!({
          operation: 'switchMode',
          error: new Error('Test error'),
          timestamp: new Date()
        });
      });
      
      expect(result.current.error).toBe('Test error');
    });
  });

  describe('switchMode', () => {
    it('should call manager switchMode and update state', async () => {
      mockManager.switchMode.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      await act(async () => {
        await result.current.switchMode('demo', {
          preserveData: false,
          seedData: true
        });
      });
      
      expect(mockManager.switchMode).toHaveBeenCalledWith('demo', {
        preserveData: false,
        seedData: true
      });
      expect(mockManager.getStatus).toHaveBeenCalledTimes(2); // Initial + after switch
    });

    it('should handle switchMode errors', async () => {
      mockManager.switchMode.mockRejectedValue(new Error('Switch failed'));
      
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      await act(async () => {
        try {
          await result.current.switchMode('demo');
        } catch (error) {
          // Expected to throw
        }
      });
      
      expect(result.current.error).toBe('Switch failed');
    });

    it('should set loading state during switch', async () => {
      let resolveSwitch: Function;
      mockManager.switchMode.mockReturnValue(
        new Promise(resolve => {
          resolveSwitch = resolve;
        })
      );
      
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      act(() => {
        result.current.switchMode('demo');
      });
      
      expect(result.current.isLoading).toBe(true);
      
      await act(async () => {
        resolveSwitch(undefined);
      });
      
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('clearData', () => {
    it('should call manager clearAllData and update state', async () => {
      mockManager.clearAllData.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      await act(async () => {
        await result.current.clearData();
      });
      
      expect(mockManager.clearAllData).toHaveBeenCalled();
      expect(mockManager.getStatus).toHaveBeenCalledTimes(2); // Initial + after clear
    });

    it('should handle clearData errors', async () => {
      mockManager.clearAllData.mockRejectedValue(new Error('Clear failed'));
      
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      await act(async () => {
        try {
          await result.current.clearData();
        } catch (error) {
          // Expected to throw
        }
      });
      
      expect(result.current.error).toBe('Clear failed');
    });
  });

  describe('seedData', () => {
    it('should call manager seedData and update state', async () => {
      mockManager.seedDemoData.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      await act(async () => {
        await result.current.seedData();
      });
      
      expect(mockManager.seedDemoData).toHaveBeenCalled();
      expect(mockManager.getStatus).toHaveBeenCalledTimes(2); // Initial + after seed
    });

    it('should handle seedData errors', async () => {
      mockManager.seedDemoData.mockRejectedValue(new Error('Seed failed'));
      
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      await act(async () => {
        try {
          await result.current.seedData();
        } catch (error) {
          // Expected to throw
        }
      });
      
      expect(result.current.error).toBe('Seed failed');
    });
  });

  describe('refreshStatus', () => {
    it('should refresh status and update state', async () => {
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      const updatedStatus = {
        currentMode: 'demo' as const,
        activeProvider: 'SQLiteOPFS',
        isTransitioning: false,
        dataCount: 5,
        lastSwitched: new Date('2024-01-02')
      };
      
      mockManager.getStatus.mockResolvedValue(updatedStatus);
      
      await act(async () => {
        await result.current.refreshStatus();
      });
      
      expect(result.current.status).toEqual(updatedStatus);
      expect(mockManager.getStatus).toHaveBeenCalledTimes(2); // Initial + refresh
    });

    it('should handle refresh status errors', async () => {
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      mockManager.getStatus.mockRejectedValue(new Error('Refresh failed'));
      
      await act(async () => {
        await result.current.refreshStatus();
      });
      
      expect(result.current.error).toBe('Refresh failed');
    });

    it('should clear previous errors on successful refresh', async () => {
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      // Set an error first by making a failing operation
      mockManager.getStatus.mockRejectedValueOnce(new Error('Previous error'));
      
      await act(async () => {
        await result.current.refreshStatus();
      });
      
      expect(result.current.error).toBe('Previous error');
      
      // Reset mock for successful refresh
      mockManager.getStatus.mockResolvedValue({
        currentMode: 'development' as const,
        activeProvider: 'SQLiteFile',
        isReady: true,
        dataCount: 0,
        lastSwitched: new Date('2024-01-01')
      });
      
      // Then refresh successfully
      await act(async () => {
        await result.current.refreshStatus();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('should manage loading state correctly for multiple operations', async () => {
      let resolveSwitchMode: Function;
      let resolveClearData: Function;
      
      mockManager.switchMode.mockReturnValue(
        new Promise(resolve => {
          resolveSwitchMode = resolve;
        })
      );
      
      mockManager.clearAllData.mockReturnValue(
        new Promise(resolve => {
          resolveClearData = resolve;
        })
      );
      
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      // Start switch mode
      act(() => {
        result.current.switchMode('demo').catch(() => {});
      });
      
      // Check loading state after starting operation
      await waitFor(() => expect(result.current.isLoading).toBe(true));
      
      // Start clear data while switch is still pending
      act(() => {
        result.current.clearData().catch(() => {});
      });
      
      expect(result.current.isLoading).toBe(true);
      
      // Resolve switch mode
      await act(async () => {
        resolveSwitchMode();
      });
      
      expect(result.current.isLoading).toBe(true); // Still loading due to clearData
      
      // Resolve clear data
      await act(async () => {
        resolveClearData();
      });
      
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  describe('Error Handling', () => {
    it('should clear errors when operations succeed', async () => {
      const { result } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      // Set an error by making switchMode fail
      mockManager.switchMode.mockRejectedValueOnce(new Error('Switch failed'));
      
      await act(async () => {
        try {
          await result.current.switchMode('demo');
        } catch (error) {
          // Expected to throw
        }
      });
      
      expect(result.current.error).toBe('Switch failed');
      
      // Successful operation should clear error
      mockManager.switchMode.mockResolvedValueOnce(undefined);
      
      await act(async () => {
        await result.current.switchMode('demo');
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('Memory Leaks', () => {
    it('should not update state after unmount', async () => {
      let modeChangedCallback: Function;
      mockManager.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'modeChanged') {
          modeChangedCallback = callback;
        }
      });
      
      const { result, unmount } = renderHook(() => useDataMode());
      
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load
      
      unmount();
      
      // Try to trigger callback after unmount
      act(() => {
        modeChangedCallback!({
          previousMode: 'development',
          currentMode: 'demo',
          timestamp: new Date()
        });
      });
      
      // Should not cause any errors or state updates
      expect(mockManager.off).toHaveBeenCalled();
    });
  });
});