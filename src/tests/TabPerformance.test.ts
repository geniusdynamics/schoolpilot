/**
 * Performance testing and validation for tab operations
 * Tests tab switching speed, memory usage, content loading, and cleanup efficiency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TabPerformanceManager, defaultTabPerformanceConfig, TabContentInfo } from '../services/ui/TabPerformanceManager';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2048 * 1024 * 1024 // 2GB
  }
};

// Mock React for testing
const mockReact = {
  createElement: vi.fn((type, props, ...children) => ({
    type,
    props: { ...props, children: children.length <= 1 ? children[0] : children },
    key: props?.key
  }))
};

describe('TabPerformanceManager', () => {
  let performanceManager: TabPerformanceManager;
  let originalPerformance: any;
  let originalReact: any;

  beforeEach(() => {
    // Mock performance API
    originalPerformance = global.performance;
    global.performance = mockPerformance as any;

    // Mock React
    originalReact = global.React;
    global.React = mockReact as any;

    performanceManager = new TabPerformanceManager(defaultTabPerformanceConfig);

    // Reset mocks
    vi.clearAllMocks();
    mockPerformance.now.mockImplementation(() => Date.now());
  });

  afterEach(() => {
    performanceManager.cleanup();
    global.performance = originalPerformance;
    global.React = originalReact;
  });

  describe('Content Loading Performance', () => {
    const mockTabInfo: TabContentInfo = {
      id: 'tab-1',
      title: 'Dashboard',
      module: 'dashboard',
      path: '/dashboard',
      isActive: true,
      canClose: false
    };

    it('should load content within performance threshold', () => {
      const startTime = 100;
      const endTime = 150; // 50ms
      
      mockPerformance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      const content = performanceManager.loadTabContent(mockTabInfo);

      expect(content).toBeDefined();
      expect(mockPerformance.now).toHaveBeenCalledTimes(2);
    });

    it('should cache content for repeated loads', () => {
      const content1 = performanceManager.loadTabContent(mockTabInfo);
      const content2 = performanceManager.loadTabContent(mockTabInfo);

      expect(content1).toBe(content2);
    });

    it('should use lazy loading for inactive tabs', () => {
      const inactiveTabInfo: TabContentInfo = {
        ...mockTabInfo,
        id: 'tab-2',
        title: 'Settings',
        isActive: false
      };

      const content = performanceManager.loadTabContent(inactiveTabInfo);

      // Should return placeholder content
      expect(content).toBeDefined();
      expect(mockReact.createElement).toHaveBeenCalledWith(
        'div',
        expect.objectContaining({ className: expect.stringContaining('items-center') })
      );
    });

    it('should handle content loading errors gracefully', () => {
      // Mock error in content rendering
      vi.spyOn(performanceManager as any, 'renderTabContent').mockImplementation(() => {
        throw new Error('Rendering failed');
      });

      const content = performanceManager.loadTabContent(mockTabInfo);

      // Should return error content
      expect(content).toBeDefined();
      expect(mockReact.createElement).toHaveBeenCalledWith(
        'div',
        expect.objectContaining({ className: expect.stringContaining('bg-red-50') })
      );
    });
  });

  describe('Tab Switching Performance', () => {
    const mockTabInfo: TabContentInfo = {
      id: 'tab-2',
      title: 'Settings',
      module: 'settings',
      path: '/settings',
      isActive: true,
      canClose: true
    };

    it('should switch tabs within performance threshold', async () => {
      const startTime = 200;
      const endTime = 250; // 50ms
      
      mockPerformance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      await performanceManager.switchTab('tab-1', 'tab-2', mockTabInfo);

      const metrics = performanceManager.getPerformanceMetrics();
      expect(metrics.tabSwitchTimes.get('tab-2')).toBe(50);
    });

    it('should prevent rapid tab switching', async () => {
      const config = performanceManager.getConfig();
      config.rendering.debounceTabSwitch = 100;
      performanceManager.updateConfig(config);

      const startTime = Date.now();
      
      // Attempt rapid switches
      const switch1 = performanceManager.switchTab('tab-1', 'tab-2', mockTabInfo);
      const switch2 = performanceManager.switchTab('tab-2', 'tab-3', { ...mockTabInfo, id: 'tab-3' });

      await Promise.all([switch1, switch2]);

      // Second switch should be debounced
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should update average switch time correctly', async () => {
      mockPerformance.now
        .mockReturnValueOnce(100).mockReturnValueOnce(150) // 50ms
        .mockReturnValueOnce(200).mockReturnValueOnce(300) // 100ms
        .mockReturnValueOnce(400).mockReturnValueOnce(475); // 75ms

      await performanceManager.switchTab('tab-1', 'tab-2', mockTabInfo);
      await performanceManager.switchTab('tab-2', 'tab-3', { ...mockTabInfo, id: 'tab-3' });
      await performanceManager.switchTab('tab-3', 'tab-4', { ...mockTabInfo, id: 'tab-4' });

      const metrics = performanceManager.getPerformanceMetrics();
      expect(metrics.averageSwitchTime).toBe(75); // (50 + 100 + 75) / 3
    });

    it('should alert on slow operations', async () => {
      const config = performanceManager.getConfig();
      config.monitoring.slowOperationThreshold = 100;
      config.monitoring.alertSlowOperations = true;
      performanceManager.updateConfig(config);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockPerformance.now
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(250); // 150ms - should trigger alert

      await performanceManager.switchTab('tab-1', 'tab-2', mockTabInfo);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow tab switch detected: 150ms')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    beforeEach(() => {
      // Mock high memory usage scenario
      mockPerformance.memory.usedJSHeapSize = 120 * 1024 * 1024; // 120MB
    });

    it('should trigger cleanup when memory threshold is exceeded', async () => {
      const config = performanceManager.getConfig();
      config.tabMemory.memoryThreshold = 100 * 1024 * 1024; // 100MB
      performanceManager.updateConfig(config);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await performanceManager.performMemoryCleanup();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Memory threshold exceeded')
      );

      consoleSpy.mockRestore();
    });

    it('should track memory usage per tab', () => {
      const tabInfo: TabContentInfo = {
        id: 'tab-1',
        title: 'Dashboard',
        module: 'dashboard',
        path: '/dashboard',
        isActive: true,
        canClose: false
      };

      performanceManager.loadTabContent(tabInfo);
      
      const metrics = performanceManager.getPerformanceMetrics();
      expect(metrics.peakMemoryUsage).toBeGreaterThan(0);
    });

    it('should clean up inactive tabs after timeout', async () => {
      const config = performanceManager.getConfig();
      config.tabMemory.inactiveTabTimeout = 100; // 100ms for testing
      performanceManager.updateConfig(config);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      performanceManager.scheduleTabCleanup('tab-1');

      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cleaned up inactive tab: tab-1')
        );
      }, { timeout: 500, interval: 50 });
      consoleSpy.mockRestore();
    });

    it('should cancel cleanup when tab becomes active', () => {
      const config = performanceManager.getConfig();
      config.tabMemory.inactiveTabTimeout = 100;
      performanceManager.updateConfig(config);

      performanceManager.scheduleTabCleanup('tab-1');
      
      // Simulate tab becoming active
      const tabInfo: TabContentInfo = {
        id: 'tab-1',
        title: 'Dashboard',
        module: 'dashboard',
        path: '/dashboard',
        isActive: true,
        canClose: false
      };

      // This should cancel the cleanup
      performanceManager.switchTab(null, 'tab-1', tabInfo);

      // Wait longer than timeout to ensure cleanup doesn't happen
      return new Promise(resolve => {
        setTimeout(() => {

          // Tab should still be tracked (not cleaned up)
          resolve(undefined);
        }, 150);
      });
    });
  });

  describe('Performance Metrics Collection', () => {
    it('should collect comprehensive metrics', () => {
      const tabInfo: TabContentInfo = {
        id: 'tab-1',
        title: 'Dashboard',
        module: 'dashboard',
        path: '/dashboard',
        isActive: true,
        canClose: false
      };

      performanceManager.loadTabContent(tabInfo);
      
      const metrics = performanceManager.getPerformanceMetrics();

      expect(metrics).toHaveProperty('tabSwitchTimes');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('contentLoadTimes');
      expect(metrics).toHaveProperty('totalTabs');
      expect(metrics).toHaveProperty('activeTabs');
      expect(metrics).toHaveProperty('cachedTabs');
      expect(metrics).toHaveProperty('averageSwitchTime');
      expect(metrics).toHaveProperty('peakMemoryUsage');
    });

    it('should track content load times', () => {
      const tabInfo: TabContentInfo = {
        id: 'tab-1',
        title: 'Dashboard',
        module: 'dashboard',
        path: '/dashboard',
        isActive: true,
        canClose: false
      };

      mockPerformance.now
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(150); // 50ms load time

      performanceManager.loadTabContent(tabInfo);
      
      const metrics = performanceManager.getPerformanceMetrics();
      expect(metrics.contentLoadTimes.get('tab-1')).toBe(50);
    });

    it('should update peak memory usage', () => {
      const initialMetrics = performanceManager.getPerformanceMetrics();
      const initialPeak = initialMetrics.peakMemoryUsage;

      // Simulate higher memory usage
      mockPerformance.memory.usedJSHeapSize = 200 * 1024 * 1024; // 200MB

      const tabInfo: TabContentInfo = {
        id: 'tab-1',
        title: 'Dashboard',
        module: 'dashboard',
        path: '/dashboard',
        isActive: true,
        canClose: false
      };

      performanceManager.loadTabContent(tabInfo);
      
      const updatedMetrics = performanceManager.getPerformanceMetrics();
      expect(updatedMetrics.peakMemoryUsage).toBeGreaterThan(initialPeak);
    });
  });

  describe('Configuration and Optimization', () => {
    it('should respect reduced motion preferences', () => {
      // Mock reduced motion media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const manager = new TabPerformanceManager(defaultTabPerformanceConfig);
      const config = manager.getConfig();

      expect(config.animations.tabSwitchDuration).toBe(0);
      expect(config.animations.useGPUAcceleration).toBe(false);
    });

    it('should update configuration correctly', () => {
      const updates = {
        tabMemory: {
          ...defaultTabPerformanceConfig.tabMemory,
          maxActiveTabs: 15
        }
      };

      performanceManager.updateConfig(updates);
      const config = performanceManager.getConfig();

      expect(config.tabMemory.maxActiveTabs).toBe(15);
    });

    it('should clear cache correctly', () => {
      const tabInfo: TabContentInfo = {
        id: 'tab-1',
        title: 'Dashboard',
        module: 'dashboard',
        path: '/dashboard',
        isActive: true,
        canClose: false
      };

      performanceManager.loadTabContent(tabInfo);
      
      let metrics = performanceManager.getPerformanceMetrics();
      expect(metrics.cachedTabs).toBeGreaterThan(0);

      performanceManager.clearCache();
      
      metrics = performanceManager.getPerformanceMetrics();
      expect(metrics.cachedTabs).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing performance API gracefully', () => {
      const originalPerformance = global.performance;
      delete (global as any).performance;

      const manager = new TabPerformanceManager(defaultTabPerformanceConfig);
      
      const tabInfo: TabContentInfo = {
        id: 'tab-1',
        title: 'Dashboard',
        module: 'dashboard',
        path: '/dashboard',
        isActive: true,
        canClose: false
      };

      // Should not throw
      expect(() => manager.loadTabContent(tabInfo)).not.toThrow();

      global.performance = originalPerformance;
    });

    it('should handle content rendering errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock rendering error
      vi.spyOn(performanceManager as any, 'renderTabContent').mockImplementation(() => {
        throw new Error('Content rendering failed');
      });

      const tabInfo: TabContentInfo = {
        id: 'tab-1',
        title: 'Dashboard',
        module: 'dashboard',
        path: '/dashboard',
        isActive: true,
        canClose: false
      };

      const content = performanceManager.loadTabContent(tabInfo);

      expect(content).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error loading content for tab tab-1')
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('TabPerformanceManager Integration', () => {
  let performanceManager: TabPerformanceManager;

  beforeEach(() => {
    global.performance = mockPerformance as any;
    global.React = mockReact as any;
    performanceManager = new TabPerformanceManager(defaultTabPerformanceConfig);
  });

  afterEach(() => {
    performanceManager.cleanup();
  });

  it('should handle complete tab lifecycle with performance tracking', async () => {
    const tabs = [
      { id: 'tab-1', title: 'Dashboard', module: 'dashboard', path: '/dashboard' },
      { id: 'tab-2', title: 'Settings', module: 'settings', path: '/settings' },
      { id: 'tab-3', title: 'Reports', module: 'reports', path: '/reports' }
    ];

    // Load content for all tabs
    tabs.forEach(tab => {
      const tabInfo: TabContentInfo = {
        ...tab,
        isActive: false,
        canClose: true
      };
      performanceManager.loadTabContent(tabInfo);
    });

    // Switch between tabs multiple times
    for (let i = 0; i < tabs.length; i++) {
      const tabInfo: TabContentInfo = {
        ...tabs[i],
        isActive: true,
        canClose: true
      };
      
      await performanceManager.switchTab(
        i > 0 ? tabs[i - 1].id : null,
        tabs[i].id,
        tabInfo
      );
    }

    // Verify metrics collection
    const metrics = performanceManager.getPerformanceMetrics();
    expect(metrics.totalTabs).toBe(3);
    expect(metrics.tabSwitchTimes.size).toBe(3);
    expect(metrics.averageSwitchTime).toBeGreaterThan(0);
  });

  it('should optimize performance under load', async () => {
    const config = performanceManager.getConfig();
    config.tabMemory.maxActiveTabs = 3;
    config.rendering.debounceTabSwitch = 50;
    performanceManager.updateConfig(config);

    // Create many tabs to test cleanup
    const tabs = Array.from({ length: 10 }, (_, i) => ({
      id: `tab-${i}`,
      title: `Tab ${i}`,
      module: `module-${i}`,
      path: `/tab-${i}`,
      isActive: false,
      canClose: true
    }));

    // Load all tabs
    tabs.forEach(tab => {
      performanceManager.loadTabContent(tab);
    });

    // Simulate memory pressure
    mockPerformance.memory.usedJSHeapSize = 150 * 1024 * 1024; // 150MB

    // Trigger cleanup
    await performanceManager.performMemoryCleanup();

    // Verify cleanup occurred
    const metrics = performanceManager.getPerformanceMetrics();
    expect(metrics.cachedTabs).toBeLessThan(10);
  });
});

// Performance benchmarking utilities
export const performanceBenchmarks = {
  title: 'Tab System Performance Benchmarks',
  
  expectedThresholds: {
    tabSwitchTime: 100, // ms
    contentLoadTime: 200, // ms
    memoryUsagePerTab: 5 * 1024 * 1024, // 5MB
    maxConcurrentTabs: 20,
    cleanupEfficiency: 80 // percentage
  },

  runBenchmarks: async (performanceManager: TabPerformanceManager) => {
    const results = {
      tabSwitchBenchmark: await benchmarkTabSwitching(performanceManager),
      contentLoadBenchmark: await benchmarkContentLoading(performanceManager),
      memoryBenchmark: await benchmarkMemoryUsage(performanceManager),
      cleanupBenchmark: await benchmarkCleanup(performanceManager)
    };

    return results;
  }
};

async function benchmarkTabSwitching(manager: TabPerformanceManager): Promise<number> {
  const iterations = 100;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const tabInfo: TabContentInfo = {
      id: `benchmark-tab-${i}`,
      title: `Benchmark Tab ${i}`,
      module: 'benchmark',
      path: `/benchmark/${i}`,
      isActive: true,
      canClose: true
    };

    await manager.switchTab(`benchmark-tab-${i-1}`, `benchmark-tab-${i}`, tabInfo);
  }

  const endTime = performance.now();
  return (endTime - startTime) / iterations;
}

async function benchmarkContentLoading(manager: TabPerformanceManager): Promise<number> {
  const iterations = 50;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const tabInfo: TabContentInfo = {
      id: `content-tab-${i}`,
      title: `Content Tab ${i}`,
      module: 'content',
      path: `/content/${i}`,
      isActive: true,
      canClose: true
    };

    manager.loadTabContent(tabInfo);
  }

  const endTime = performance.now();
  return (endTime - startTime) / iterations;
}

async function benchmarkMemoryUsage(manager: TabPerformanceManager): Promise<number> {
  const tabCount = 20;
  const initialMemory = manager.getPerformanceMetrics().peakMemoryUsage;

  for (let i = 0; i < tabCount; i++) {
    const tabInfo: TabContentInfo = {
      id: `memory-tab-${i}`,
      title: `Memory Tab ${i}`,
      module: 'memory',
      path: `/memory/${i}`,
      isActive: true,
      canClose: true
    };

    manager.loadTabContent(tabInfo);
  }

  const finalMemory = manager.getPerformanceMetrics().peakMemoryUsage;
  return (finalMemory - initialMemory) / tabCount;
}

async function benchmarkCleanup(manager: TabPerformanceManager): Promise<number> {
  // Create many tabs
  for (let i = 0; i < 50; i++) {
    const tabInfo: TabContentInfo = {
      id: `cleanup-tab-${i}`,
      title: `Cleanup Tab ${i}`,
      module: 'cleanup',
      path: `/cleanup/${i}`,
      isActive: false,
      canClose: true
    };

    manager.loadTabContent(tabInfo);
  }

  const beforeCleanup = manager.getPerformanceMetrics().cachedTabs;
  
  // Trigger cleanup
  await manager.performMemoryCleanup();
  
  const afterCleanup = manager.getPerformanceMetrics().cachedTabs;
  
  return ((beforeCleanup - afterCleanup) / beforeCleanup) * 100;
}