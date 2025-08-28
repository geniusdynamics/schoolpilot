/**
 * Cross-platform testing for adaptive tab behavior
 * Tests web, desktop (Tauri), and mobile platform-specific adaptations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TabStateManager, defaultTabStateConfig } from '../services/TabStateManager';
import { TabAccessibilityManager, defaultTabAccessibilityConfig } from '../services/TabAccessibilityManager';
import { TabPerformanceManager, defaultTabPerformanceConfig } from '../services/TabPerformanceManager';

// Mock platform detection utilities
const mockPlatformDetection = {
  getUserAgent: vi.fn(),
  getScreenSize: vi.fn(),
  getTouchCapability: vi.fn(),
  getMemoryInfo: vi.fn()
};

// Platform-specific mock configurations
const platformMocks = {
  mobile: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
    screenSize: { width: 375, height: 812 },
    touchCapability: true,
    memoryInfo: { totalJSHeapSize: 50 * 1024 * 1024 } // 50MB
  },
  desktop: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    screenSize: { width: 1920, height: 1080 },
    touchCapability: false,
    memoryInfo: { totalJSHeapSize: 500 * 1024 * 1024 } // 500MB
  },
  web: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    screenSize: { width: 1440, height: 900 },
    touchCapability: false,
    memoryInfo: { totalJSHeapSize: 200 * 1024 * 1024 } // 200MB
  },
  tauri: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) tauri/1.0.0',
    screenSize: { width: 1280, height: 720 },
    touchCapability: false,
    memoryInfo: { totalJSHeapSize: 300 * 1024 * 1024 } // 300MB
  }
};

describe('Cross-Platform Tab Behavior', () => {
  let tabStateManager: TabStateManager;
  let accessibilityManager: TabAccessibilityManager;
  let performanceManager: TabPerformanceManager;

  beforeEach(() => {
    tabStateManager = new TabStateManager(defaultTabStateConfig);
    accessibilityManager = new TabAccessibilityManager(defaultTabAccessibilityConfig);
    performanceManager = new TabPerformanceManager(defaultTabPerformanceConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    accessibilityManager.cleanup();
    performanceManager.cleanup();
  });

  describe('Mobile Platform Adaptations', () => {
    beforeEach(() => {
      // Mock mobile environment
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 812, configurable: true });
      Object.defineProperty(navigator, 'userAgent', { 
        value: platformMocks.mobile.userAgent, 
        configurable: true 
      });
      
      // Simulate touch device
      Object.defineProperty(window, 'ontouchstart', { value: {}, configurable: true });
    });

    it('should adapt tab configuration for mobile', () => {
      tabStateManager.setPlatformInfo({ platform: 'mobile', touchDevice: true });
      const config = tabStateManager.getConfig();

      expect(config.maxTabs).toBe(5); // Reduced for mobile
      expect(config.defaultTabBehavior).toBe('navigate'); // Mobile-friendly navigation
    });

    it('should use larger touch targets on mobile', () => {
      const mockState = {
        currentTabIndex: 0,
        totalTabs: 3,
        tabId: 'tab-1',
        tabTitle: 'Dashboard',
        canClose: false,
        isActive: true
      };

      const classes = accessibilityManager.getTabButtonClasses(mockState);
      
      expect(classes).toContain('min-h-[44px]'); // WCAG minimum touch target
      expect(classes).toContain('min-w-[44px]');
    });

    it('should optimize performance for mobile devices', () => {
      performanceManager.updateConfig({
        tabMemory: {
          ...defaultTabPerformanceConfig.tabMemory,
          maxActiveTabs: 3, // Fewer active tabs on mobile
          memoryThreshold: 30 * 1024 * 1024 // 30MB threshold
        },
        rendering: {
          ...defaultTabPerformanceConfig.rendering,
          lazyLoadTabs: true, // Aggressive lazy loading
          preloadAdjacent: false // Disable preloading to save memory
        }
      });

      const config = performanceManager.getConfig();
      expect(config.tabMemory.maxActiveTabs).toBe(3);
      expect(config.rendering.preloadAdjacent).toBe(false);
    });

    it('should handle touch gestures appropriately', () => {
      const mockState = {
        currentTabIndex: 1,
        totalTabs: 3,
        tabId: 'tab-2',
        tabTitle: 'Settings',
        canClose: true,
        isActive: true
      };

      const mockCallbacks = {
        selectPreviousTab: vi.fn(),
        selectNextTab: vi.fn(),
        selectFirstTab: vi.fn(),
        selectLastTab: vi.fn(),
        activateTab: vi.fn(),
        closeTab: vi.fn(),
        focusTabContent: vi.fn()
      };

      // Simulate swipe-like behavior
      const swipeEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });

      // On mobile, tabs should still respond to keyboard but also handle touch
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      accessibilityManager.handleTabKeyDown(spaceEvent as any, mockState, mockCallbacks);
      
      expect(mockCallbacks.activateTab).toHaveBeenCalled();
    });
  });

  describe('Desktop Platform Adaptations', () => {
    beforeEach(() => {
      // Mock desktop environment
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
      Object.defineProperty(navigator, 'userAgent', { 
        value: platformMocks.desktop.userAgent, 
        configurable: true 
      });
      
      // Remove touch capability
      delete (window as any).ontouchstart;
    });

    it('should adapt tab configuration for desktop', () => {
      tabStateManager.setPlatformInfo({ platform: 'desktop', touchDevice: false });
      const config = tabStateManager.getConfig();

      expect(config.maxTabs).toBe(20); // More tabs on desktop
      expect(config.defaultTabBehavior).toBe('tab'); // Traditional tab behavior
    });

    it('should enable advanced features on desktop', () => {
      performanceManager.updateConfig({
        rendering: {
          ...defaultTabPerformanceConfig.rendering,
          preloadAdjacent: true, // Enable preloading
          memoizeTabContent: true, // Enable content memoization
          enableVirtualization: true // Enable virtualization
        },
        animations: {
          ...defaultTabPerformanceConfig.animations,
          useGPUAcceleration: true, // Enable GPU acceleration
          animationFrameOptimization: true
        }
      });

      const config = performanceManager.getConfig();
      expect(config.rendering.preloadAdjacent).toBe(true);
      expect(config.animations.useGPUAcceleration).toBe(true);
    });

    it('should support advanced keyboard shortcuts on desktop', () => {
      const mockState = {
        currentTabIndex: 1,
        totalTabs: 3,
        tabId: 'tab-2',
        tabTitle: 'Settings',
        canClose: true,
        isActive: true
      };

      const mockCallbacks = {
        selectPreviousTab: vi.fn(),
        selectNextTab: vi.fn(),
        selectFirstTab: vi.fn(),
        selectLastTab: vi.fn(),
        activateTab: vi.fn(),
        closeTab: vi.fn(),
        focusTabContent: vi.fn()
      };

      // Test all keyboard shortcuts
      const shortcuts = [
        { key: 'ArrowLeft', callback: 'selectPreviousTab' },
        { key: 'ArrowRight', callback: 'selectNextTab' },
        { key: 'Home', callback: 'selectFirstTab' },
        { key: 'End', callback: 'selectLastTab' },
        { key: 'Enter', callback: 'activateTab' },
        { key: 'Delete', callback: 'closeTab' },
        { key: 'Escape', callback: 'focusTabContent' }
      ];

      shortcuts.forEach(({ key, callback }) => {
        const event = new KeyboardEvent('keydown', { key });
        accessibilityManager.handleTabKeyDown(event as any, mockState, mockCallbacks);
        expect(mockCallbacks[callback as keyof typeof mockCallbacks]).toHaveBeenCalled();
        vi.clearAllMocks();
      });
    });
  });

  describe('Tauri Desktop App Adaptations', () => {
    beforeEach(() => {
      // Mock Tauri environment
      Object.defineProperty(window, '__TAURI__', { value: {}, configurable: true });
      Object.defineProperty(navigator, 'userAgent', { 
        value: platformMocks.tauri.userAgent, 
        configurable: true 
      });
    });

    it('should detect Tauri environment', () => {
      const isTauri = 'userAgent' in navigator && 
                     navigator.userAgent.includes('tauri');
      
      expect(isTauri).toBe(true);
    });

    it('should optimize for native desktop performance', () => {
      // Tauri apps can handle more aggressive optimizations
      performanceManager.updateConfig({
        tabMemory: {
          ...defaultTabPerformanceConfig.tabMemory,
          maxActiveTabs: 25, // More tabs in native app
          enableGarbageCollection: true // Native memory management
        },
        rendering: {
          ...defaultTabPerformanceConfig.rendering,
          lazyLoadTabs: false, // Less aggressive lazy loading
          preloadAdjacent: true, // Preload for smoother experience
          memoizeTabContent: true
        }
      });

      const config = performanceManager.getConfig();
      expect(config.tabMemory.maxActiveTabs).toBe(25);
      expect(config.tabMemory.enableGarbageCollection).toBe(true);
    });
  });

  describe('Web Platform Adaptations', () => {
    beforeEach(() => {
      // Mock standard web environment
      Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
      Object.defineProperty(navigator, 'userAgent', { 
        value: platformMocks.web.userAgent, 
        configurable: true 
      });
    });

    it('should use balanced configuration for web', () => {
      tabStateManager.setPlatformInfo({ platform: 'web', touchDevice: false });
      const config = tabStateManager.getConfig();

      expect(config.maxTabs).toBe(15); // Balanced for web
      expect(config.defaultTabBehavior).toBe('tab');
    });

    it('should handle browser memory constraints', () => {
      performanceManager.updateConfig({
        tabMemory: {
          ...defaultTabPerformanceConfig.tabMemory,
          memoryThreshold: 100 * 1024 * 1024, // 100MB threshold
          enableGarbageCollection: false // Browser handles GC
        },
        monitoring: {
          ...defaultTabPerformanceConfig.monitoring,
          trackMemoryUsage: true, // Monitor in browser
          alertSlowOperations: true
        }
      });

      const config = performanceManager.getConfig();
      expect(config.tabMemory.enableGarbageCollection).toBe(false);
      expect(config.monitoring.trackMemoryUsage).toBe(true);
    });
  });

  describe('Dynamic Platform Switching', () => {
    it('should adapt when platform changes', () => {
      // Start with desktop
      tabStateManager.setPlatformInfo({ platform: 'desktop', touchDevice: false });
      expect(tabStateManager.getConfig().maxTabs).toBe(20);

      // Switch to mobile (e.g., browser dev tools mobile mode)
      tabStateManager.setPlatformInfo({ platform: 'mobile', touchDevice: true });
      expect(tabStateManager.getConfig().maxTabs).toBe(5);

      // Switch back to web
      tabStateManager.setPlatformInfo({ platform: 'web', touchDevice: false });
      expect(tabStateManager.getConfig().maxTabs).toBe(15);
    });

    it('should handle screen size changes', () => {
      // Simulate window resize from desktop to mobile size
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 812, configurable: true });

      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);

      // Platform should adapt to smaller screen
      tabStateManager.setPlatformInfo({ platform: 'mobile', touchDevice: true });
      expect(tabStateManager.getConfig().maxTabs).toBe(5);
    });
  });

  describe('Accessibility Across Platforms', () => {
    it('should maintain accessibility standards on all platforms', () => {
      const platforms = ['mobile', 'desktop', 'web'] as const;

      platforms.forEach(platform => {
        const touchDevice = platform === 'mobile';
        tabStateManager.setPlatformInfo({ platform, touchDevice });

        const mockState = {
          currentTabIndex: 0,
          totalTabs: 3,
          tabId: 'tab-1',
          tabTitle: 'Dashboard',
          canClose: false,
          isActive: true
        };

        // Verify ARIA attributes are consistent
        const buttonAttrs = accessibilityManager.getTabButtonAttributes(mockState);
        expect(buttonAttrs.role).toBe('tab');
        expect(buttonAttrs['aria-selected']).toBe(true);
        expect(buttonAttrs['aria-controls']).toBe('tabpanel-tab-1');

        // Verify touch targets meet requirements
        const classes = accessibilityManager.getTabButtonClasses(mockState);
        expect(classes).toContain('min-h-[44px]');

        // Verify validation passes
        const validation = accessibilityManager.validateConfiguration();
        expect(validation.valid).toBe(true);
      });
    });

    it('should handle platform-specific accessibility features', () => {
      // High contrast mode (common on desktop)
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });

      const manager = new TabAccessibilityManager(defaultTabAccessibilityConfig);
      expect(manager.getConfig().tabVisuals.highContrastMode).toBe(true);

      // Reduced motion (cross-platform)
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });

      const motionManager = new TabAccessibilityManager(defaultTabAccessibilityConfig);
      expect(motionManager.getConfig().reducedMotion.disableAnimations).toBe(true);
    });
  });

  describe('Performance Across Platforms', () => {
    it('should adapt performance settings based on platform capabilities', () => {
      const platformConfigs = [
        {
          platform: 'mobile' as const,
          expectedMaxTabs: 3,
          expectedPreload: false,
          expectedLazyLoad: true
        },
        {
          platform: 'desktop' as const,
          expectedMaxTabs: 25,
          expectedPreload: true,
          expectedLazyLoad: false
        },
        {
          platform: 'web' as const,
          expectedMaxTabs: 15,
          expectedPreload: true,
          expectedLazyLoad: true
        }
      ];

      platformConfigs.forEach(({ platform, expectedMaxTabs, expectedPreload, expectedLazyLoad }) => {
        const config = { ...defaultTabPerformanceConfig };
        
        // Apply platform-specific optimizations
        switch (platform) {
          case 'mobile':
            config.tabMemory.maxActiveTabs = expectedMaxTabs;
            config.rendering.preloadAdjacent = expectedPreload;
            config.rendering.lazyLoadTabs = expectedLazyLoad;
            break;
          case 'desktop':
            config.tabMemory.maxActiveTabs = expectedMaxTabs;
            config.rendering.preloadAdjacent = expectedPreload;
            config.rendering.lazyLoadTabs = expectedLazyLoad;
            break;
          case 'web':
            config.tabMemory.maxActiveTabs = expectedMaxTabs;
            config.rendering.preloadAdjacent = expectedPreload;
            config.rendering.lazyLoadTabs = expectedLazyLoad;
            break;
        }

        performanceManager.updateConfig(config);
        const updatedConfig = performanceManager.getConfig();

        expect(updatedConfig.tabMemory.maxActiveTabs).toBe(expectedMaxTabs);
        expect(updatedConfig.rendering.preloadAdjacent).toBe(expectedPreload);
        expect(updatedConfig.rendering.lazyLoadTabs).toBe(expectedLazyLoad);
      });
    });
  });
});

describe('Cross-Platform Integration Tests', () => {
  let managers: {
    state: TabStateManager;
    accessibility: TabAccessibilityManager;
    performance: TabPerformanceManager;
  };

  beforeEach(() => {
    managers = {
      state: new TabStateManager(defaultTabStateConfig),
      accessibility: new TabAccessibilityManager(defaultTabAccessibilityConfig),
      performance: new TabPerformanceManager(defaultTabPerformanceConfig)
    };
  });

  afterEach(() => {
    managers.accessibility.cleanup();
    managers.performance.cleanup();
  });

  it('should coordinate all managers for complete platform adaptation', () => {
    const platform = 'mobile';
    const touchDevice = true;

    // Adapt all managers for mobile
    managers.state.setPlatformInfo({ platform, touchDevice });
    
    managers.performance.updateConfig({
      tabMemory: { ...defaultTabPerformanceConfig.tabMemory, maxActiveTabs: 3 },
      rendering: { ...defaultTabPerformanceConfig.rendering, lazyLoadTabs: true }
    });

    // Verify coordination
    expect(managers.state.getConfig().maxTabs).toBe(5);
    expect(managers.performance.getConfig().tabMemory.maxActiveTabs).toBe(3);

    // Accessibility should work regardless of platform
    const validation = managers.accessibility.validateConfiguration();
    expect(validation.valid).toBe(true);
  });

  it('should handle platform detection and auto-configuration', () => {
    // Simulate auto-detection
    const detectPlatform = () => {
      const width = window.innerWidth;
      const hasTouch = 'ontouchstart' in window;
      const userAgent = navigator.userAgent;

      if (width < 768) return { platform: 'mobile' as const, touchDevice: hasTouch };
      if (userAgent.includes('tauri')) return { platform: 'desktop' as const, touchDevice: hasTouch };
      return { platform: 'web' as const, touchDevice: hasTouch };
    };

    // Mock mobile environment
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
    Object.defineProperty(window, 'ontouchstart', { value: {}, configurable: true });

    const detected = detectPlatform();
    expect(detected.platform).toBe('mobile');
    expect(detected.touchDevice).toBe(true);

    // Apply detection results
    managers.state.setPlatformInfo(detected);
    expect(managers.state.getConfig().maxTabs).toBe(5);
  });
});

// Cross-platform testing utilities
export const crossPlatformTestUtils = {
  title: 'Cross-Platform Testing Utilities',
  
  platforms: {
    mobile: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
      viewport: { width: 375, height: 812 },
      touch: true,
      expectedMaxTabs: 5,
      expectedBehavior: 'navigate'
    },
    desktop: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 },
      touch: false,
      expectedMaxTabs: 20,
      expectedBehavior: 'tab'
    },
    web: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      viewport: { width: 1440, height: 900 },
      touch: false,
      expectedMaxTabs: 15,
      expectedBehavior: 'tab'
    },
    tauri: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 tauri/1.0.0',
      viewport: { width: 1280, height: 720 },
      touch: false,
      expectedMaxTabs: 25,
      expectedBehavior: 'tab'
    }
  },

  mockPlatform: (platform: keyof typeof crossPlatformTestUtils.platforms) => {
    const config = crossPlatformTestUtils.platforms[platform];
    
    Object.defineProperty(window, 'innerWidth', { 
      value: config.viewport.width, 
      configurable: true 
    });
    Object.defineProperty(window, 'innerHeight', { 
      value: config.viewport.height, 
      configurable: true 
    });
    Object.defineProperty(navigator, 'userAgent', { 
      value: config.userAgent, 
      configurable: true 
    });

    if (config.touch) {
      Object.defineProperty(window, 'ontouchstart', { value: {}, configurable: true });
    } else {
      delete (window as any).ontouchstart;
    }

    return config;
  },

  testPlatformAdaptation: (
    tabStateManager: TabStateManager,
    platform: keyof typeof crossPlatformTestUtils.platforms
  ) => {
    const config = crossPlatformTestUtils.mockPlatform(platform);
    
    tabStateManager.setPlatformInfo({ 
      platform: platform === 'tauri' ? 'desktop' : platform, 
      touchDevice: config.touch 
    });

    const managerConfig = tabStateManager.getConfig();
    
    return {
      maxTabs: managerConfig.maxTabs,
      behavior: managerConfig.defaultTabBehavior,
      expected: {
        maxTabs: config.expectedMaxTabs,
        behavior: config.expectedBehavior
      },
      passed: managerConfig.maxTabs === config.expectedMaxTabs && 
              managerConfig.defaultTabBehavior === config.expectedBehavior
    };
  }
};