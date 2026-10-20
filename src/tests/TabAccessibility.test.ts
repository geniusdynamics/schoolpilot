/**
 * Comprehensive accessibility compliance tests for the tab system
 * Tests WCAG 2.1 AA compliance, keyboard navigation, and screen reader support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TabAccessibilityManager, defaultTabAccessibilityConfig, TabAccessibilityState, TabAccessibilityCallbacks } from '../services/ui/TabAccessibilityManager';

// Mock DOM elements for testing

const createMockTabElement = (attributes: Record<string, any> = {}) => {
  const element = document.createElement('button');
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

const createMockTabPanel = (attributes: Record<string, any> = {}) => {
  const element = document.createElement('div');
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

// Mock keyboard event
const createKeyboardEvent = (key: string, options: Partial<KeyboardEvent> = {}) => {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options
  }) as KeyboardEvent & { preventDefault: () => void };
};

describe('TabAccessibilityManager', () => {
  let accessibilityManager: TabAccessibilityManager;
  let mockCallbacks: TabAccessibilityCallbacks;

  beforeEach(() => {
    accessibilityManager = new TabAccessibilityManager(defaultTabAccessibilityConfig);
    mockCallbacks = {
      selectPreviousTab: vi.fn(),
      selectNextTab: vi.fn(),
      selectFirstTab: vi.fn(),
      selectLastTab: vi.fn(),
      activateTab: vi.fn(),
      closeTab: vi.fn(),
      focusTabContent: vi.fn()
    };

    // Clear DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
    accessibilityManager.cleanup();
  });

  describe('Keyboard Navigation', () => {
    const mockState: TabAccessibilityState = {
      currentTabIndex: 1,
      totalTabs: 3,
      tabId: 'tab-2',
      tabTitle: 'Settings',
      canClose: true,
      isActive: true
    };

    it('should handle arrow key navigation', () => {
      const leftEvent = createKeyboardEvent('ArrowLeft');
      const rightEvent = createKeyboardEvent('ArrowRight');

      accessibilityManager.handleTabKeyDown(leftEvent as any, mockState, mockCallbacks);
      expect(mockCallbacks.selectPreviousTab).toHaveBeenCalled();

      accessibilityManager.handleTabKeyDown(rightEvent as any, mockState, mockCallbacks);
      expect(mockCallbacks.selectNextTab).toHaveBeenCalled();
    });

    it('should handle Home and End keys', () => {
      const homeEvent = createKeyboardEvent('Home');
      const endEvent = createKeyboardEvent('End');

      accessibilityManager.handleTabKeyDown(homeEvent as any, mockState, mockCallbacks);
      expect(mockCallbacks.selectFirstTab).toHaveBeenCalled();

      accessibilityManager.handleTabKeyDown(endEvent as any, mockState, mockCallbacks);
      expect(mockCallbacks.selectLastTab).toHaveBeenCalled();
    });

    it('should handle Enter and Space for activation', () => {
      const enterEvent = createKeyboardEvent('Enter');
      const spaceEvent = createKeyboardEvent(' ');

      accessibilityManager.handleTabKeyDown(enterEvent as any, mockState, mockCallbacks);
      expect(mockCallbacks.activateTab).toHaveBeenCalled();

      accessibilityManager.handleTabKeyDown(spaceEvent as any, mockState, mockCallbacks);
      expect(mockCallbacks.activateTab).toHaveBeenCalledTimes(2);
    });

    it('should handle Delete key for closeable tabs', () => {
      const deleteEvent = createKeyboardEvent('Delete');

      accessibilityManager.handleTabKeyDown(deleteEvent as any, mockState, mockCallbacks);
      expect(mockCallbacks.closeTab).toHaveBeenCalled();
    });

    it('should not close tabs when canClose is false', () => {
      const deleteEvent = createKeyboardEvent('Delete');
      const nonCloseableState = { ...mockState, canClose: false };

      accessibilityManager.handleTabKeyDown(deleteEvent as any, nonCloseableState, mockCallbacks);
      expect(mockCallbacks.closeTab).not.toHaveBeenCalled();
    });

    it('should handle Escape key to focus content', () => {
      const escapeEvent = createKeyboardEvent('Escape');

      accessibilityManager.handleTabKeyDown(escapeEvent as any, mockState, mockCallbacks);
      expect(mockCallbacks.focusTabContent).toHaveBeenCalled();
    });
  });

  describe('ARIA Attributes', () => {
    const mockState: TabAccessibilityState = {
      currentTabIndex: 0,
      totalTabs: 3,
      tabId: 'tab-1',
      tabTitle: 'Dashboard',
      canClose: false,
      isActive: true
    };

    it('should generate correct tab button attributes', () => {
      const attributes = accessibilityManager.getTabButtonAttributes(mockState);

      expect(attributes.role).toBe('tab');
      expect(attributes.id).toBe('tab-tab-1');
      expect(attributes.tabIndex).toBe(0);
      expect(attributes['aria-selected']).toBe(true);
      expect(attributes['aria-label']).toBe('Dashboard, tab 1 of 3');
      expect(attributes['aria-controls']).toBe('tabpanel-tab-1');
      expect(attributes['aria-describedby']).toBe('tab-navigation-instructions');
    });

    it('should generate correct attributes for inactive tabs', () => {
      const inactiveState = { ...mockState, isActive: false, currentTabIndex: 1 };
      const attributes = accessibilityManager.getTabButtonAttributes(inactiveState);

      expect(attributes.tabIndex).toBe(-1);
      expect(attributes['aria-selected']).toBe(false);
      expect(attributes['aria-label']).toBe('Dashboard, tab 2 of 3');
    });

    it('should generate correct tab panel attributes', () => {
      const attributes = accessibilityManager.getTabPanelAttributes(mockState);

      expect(attributes.role).toBe('tabpanel');
      expect(attributes.id).toBe('tabpanel-tab-1');
      expect(attributes.tabIndex).toBe(0);
      expect(attributes['aria-labelledby']).toBe('tab-tab-1');
      expect(attributes['aria-hidden']).toBeUndefined();
    });

    it('should hide inactive tab panels', () => {
      const inactiveState = { ...mockState, isActive: false };
      const attributes = accessibilityManager.getTabPanelAttributes(inactiveState);

      expect(attributes['aria-hidden']).toBe('true');
      expect(attributes.hidden).toBe(true);
    });

    it('should generate correct tab list attributes', () => {
      const attributes = accessibilityManager.getTabListAttributes(5);

      expect(attributes.role).toBe('tablist');
      expect(attributes['aria-label']).toBe('Navigation tabs, 5 available');
      expect(attributes['aria-orientation']).toBe('horizontal');
    });
  });

  describe('Screen Reader Announcements', () => {
    const mockState: TabAccessibilityState = {
      currentTabIndex: 1,
      totalTabs: 3,
      tabId: 'tab-2',
      tabTitle: 'Settings',
      canClose: true,
      isActive: true
    };

    beforeEach(() => {
      // Mock document.body.appendChild and removeChild
      vi.spyOn(document.body, 'appendChild');
      vi.spyOn(document.body, 'removeChild');
    });

    it('should announce tab activation', () => {
      accessibilityManager.announceTabActivation(mockState);

      expect(document.body.appendChild).toHaveBeenCalled();
      const addedElement = (document.body.appendChild as any).mock.calls[0][0];
      
      expect(addedElement.getAttribute('aria-live')).toBe('polite');
      expect(addedElement.getAttribute('aria-atomic')).toBe('true');
      expect(addedElement.textContent).toBe('Settings tab selected, 2 of 3');
    });

    it('should announce tab closure', () => {
      accessibilityManager.announceTabClosure(mockState);

      const addedElement = (document.body.appendChild as any).mock.calls[0][0];
      expect(addedElement.textContent).toBe('Settings tab closed');
    });

    it('should announce new tab creation', () => {
      accessibilityManager.announceTabAddition('New Tab');

      const addedElement = (document.body.appendChild as any).mock.calls[0][0];
      expect(addedElement.textContent).toBe('New tab created: New Tab');
    });

    it('should prevent duplicate announcements', () => {
      // Make the same announcement twice
      accessibilityManager.announceTabActivation(mockState);
      accessibilityManager.announceTabActivation(mockState);

      // Should only be called once
      expect(document.body.appendChild).toHaveBeenCalledTimes(1);
    });
  });

  describe('Touch Target Accessibility', () => {
    const mockState: TabAccessibilityState = {
      currentTabIndex: 0,
      totalTabs: 2,
      tabId: 'tab-1',
      tabTitle: 'Dashboard',
      canClose: false,
      isActive: true
    };

    it('should generate classes with minimum touch targets', () => {
      const classes = accessibilityManager.getTabButtonClasses(mockState);
      
      expect(classes).toContain('min-h-[44px]');
      expect(classes).toContain('min-w-[44px]');
    });

    it('should include proper focus indicators', () => {
      const classes = accessibilityManager.getTabButtonClasses(mockState);
      
      expect(classes).toContain('focus:ring-2');
      expect(classes).toContain('focus:ring-primary-500');
      expect(classes).toContain('focus:ring-offset-2');
    });

    it('should handle active and inactive states properly', () => {
      const activeClasses = accessibilityManager.getTabButtonClasses(mockState);
      const inactiveState = { ...mockState, isActive: false };
      const inactiveClasses = accessibilityManager.getTabButtonClasses(inactiveState);

      expect(activeClasses).toContain('bg-surface-card');
      expect(activeClasses).toContain('border-primary-500');
      expect(inactiveClasses).toContain('text-surface-muted-fg');
    });
  });

  describe('High Contrast and Reduced Motion', () => {
    it('should detect and handle high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const manager = new TabAccessibilityManager(defaultTabAccessibilityConfig);
      const config = manager.getConfig();

      expect(config.tabVisuals.highContrastMode).toBe(true);
    });

    it('should detect and handle reduced motion preference', () => {
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

      const manager = new TabAccessibilityManager(defaultTabAccessibilityConfig);
      const config = manager.getConfig();

      expect(config.reducedMotion.disableAnimations).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct accessibility configuration', () => {
      const validation = accessibilityManager.validateConfiguration();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should identify configuration issues', () => {
      const invalidConfig = {
        ...defaultTabAccessibilityConfig,
        tabVisuals: {
          ...defaultTabAccessibilityConfig.tabVisuals,
          minimumTouchTarget: 30, // Too small
          colorContrastRatio: 3.0, // Too low
          focusIndicatorWidth: 1 // Too small
        }
      };

      const manager = new TabAccessibilityManager(invalidConfig);
      const validation = manager.validateConfiguration();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should provide helpful validation messages', () => {
      const invalidConfig = {
        ...defaultTabAccessibilityConfig,
        tabVisuals: {
          ...defaultTabAccessibilityConfig.tabVisuals,
          minimumTouchTarget: 30,
          colorContrastRatio: 3.0
        }
      };

      const manager = new TabAccessibilityManager(invalidConfig);
      const validation = manager.validateConfiguration();

      expect(validation.errors).toContain('Minimum touch target size should be at least 44px for WCAG AA compliance');
      expect(validation.errors).toContain('Color contrast ratio should be at least 4.5:1 for WCAG AA compliance');
    });
  });

  describe('Navigation Instructions', () => {
    it('should create navigation instructions element', () => {
      const instructions = accessibilityManager.createNavigationInstructions();

      expect(instructions.id).toBe('tab-navigation-instructions');
      expect(instructions.className).toBe('sr-only');
      expect(instructions.textContent).toContain('Use arrow keys to navigate tabs');
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const updates = {
        tabVisuals: {
          ...defaultTabAccessibilityConfig.tabVisuals,
          minimumTouchTarget: 48
        }
      };

      accessibilityManager.updateConfig(updates);
      const config = accessibilityManager.getConfig();

      expect(config.tabVisuals.minimumTouchTarget).toBe(48);
    });
  });
});

describe('TabAccessibility Integration Tests', () => {
  let accessibilityManager: TabAccessibilityManager;
  let container: HTMLElement;

  beforeEach(() => {
    accessibilityManager = new TabAccessibilityManager(defaultTabAccessibilityConfig);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    accessibilityManager.cleanup();
  });

  it('should create fully accessible tab structure', () => {
    // Create tab list
    const tabList = document.createElement('div');
    const tabListAttrs = accessibilityManager.getTabListAttributes(3);
    Object.entries(tabListAttrs).forEach(([key, value]) => {
      tabList.setAttribute(key, String(value));
    });

    // Create tabs
    const tabs = [
      { id: 'tab-1', title: 'Dashboard', isActive: true, canClose: false },
      { id: 'tab-2', title: 'Settings', isActive: false, canClose: true },
      { id: 'tab-3', title: 'Reports', isActive: false, canClose: true }
    ];

    tabs.forEach((tab, index) => {
      const state: TabAccessibilityState = {
        currentTabIndex: index,
        totalTabs: tabs.length,
        tabId: tab.id,
        tabTitle: tab.title,
        canClose: tab.canClose,
        isActive: tab.isActive
      };

      // Create tab button
      const tabButton = document.createElement('button');
      const buttonAttrs = accessibilityManager.getTabButtonAttributes(state);
      Object.entries(buttonAttrs).forEach(([key, value]) => {
        tabButton.setAttribute(key, String(value));
      });
      tabButton.textContent = tab.title;

      // Create tab panel
      const tabPanel = document.createElement('div');
      const panelAttrs = accessibilityManager.getTabPanelAttributes(state);
      Object.entries(panelAttrs).forEach(([key, value]) => {
        tabPanel.setAttribute(key, String(value));
      });
      tabPanel.textContent = `Content for ${tab.title}`;

      tabList.appendChild(tabButton);
      container.appendChild(tabPanel);
    });

    container.appendChild(tabList);

    // Verify structure
    expect(tabList.getAttribute('role')).toBe('tablist');
    expect(tabList.querySelectorAll('[role="tab"]')).toHaveLength(3);
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(3);

    // Verify active tab
    const activeTab = tabList.querySelector('[aria-selected="true"]');
    expect(activeTab).toBeTruthy();
    expect(activeTab?.getAttribute('tabindex')).toBe('0');

    // Verify inactive tabs
    const inactiveTabs = tabList.querySelectorAll('[aria-selected="false"]');
    expect(inactiveTabs).toHaveLength(2);
    inactiveTabs.forEach(tab => {
      expect(tab.getAttribute('tabindex')).toBe('-1');
    });

    // Verify tab-panel associations
    const tabs_buttons = tabList.querySelectorAll('[role="tab"]');
    tabs_buttons.forEach(tab => {
      const controls = tab.getAttribute('aria-controls');
      const panel = container.querySelector(`#${controls}`);
      expect(panel).toBeTruthy();
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab.id);
    });
  });
});

// Manual testing guidelines
export const manualAccessibilityTestGuidelines = {
  title: 'Manual Accessibility Testing Guidelines for Tab System',
  
  screenReaderTesting: {
    title: 'Screen Reader Testing',
    instructions: [
      '1. Use NVDA, JAWS, or VoiceOver to navigate the tab system',
      '2. Verify that tab roles and states are announced correctly',
      '3. Check that tab count and position are announced',
      '4. Ensure tab content changes are announced',
      '5. Verify that keyboard navigation instructions are available'
    ],
    expectedBehavior: [
      'Tabs should be announced as "tab X of Y"',
      'Active tab should be clearly identified',
      'Tab content changes should be announced',
      'Navigation instructions should be available via screen reader'
    ]
  },

  keyboardTesting: {
    title: 'Keyboard Navigation Testing',
    instructions: [
      '1. Tab to the tab list using the Tab key',
      '2. Use arrow keys to navigate between tabs',
      '3. Use Home/End keys to jump to first/last tabs',
      '4. Use Enter/Space to activate tabs',
      '5. Use Delete key to close closeable tabs',
      '6. Use Escape to focus tab content'
    ],
    expectedBehavior: [
      'Arrow keys should move focus between tabs',
      'Only active tab should have tabindex="0"',
      'Enter/Space should activate focused tab',
      'Delete should only work on closeable tabs',
      'Focus should be clearly visible'
    ]
  },

  visualTesting: {
    title: 'Visual Accessibility Testing',
    instructions: [
      '1. Test with high contrast mode enabled',
      '2. Verify color contrast ratios meet WCAG standards',
      '3. Check touch target sizes on mobile devices',
      '4. Test with zoom levels up to 200%',
      '5. Verify focus indicators are clearly visible'
    ],
    expectedBehavior: [
      'All text should have contrast ratio ≥ 4.5:1',
      'Touch targets should be ≥ 44px on mobile',
      'Focus indicators should be clearly visible',
      'Interface should work at 200% zoom'
    ]
  },

  reducedMotionTesting: {
    title: 'Reduced Motion Testing',
    instructions: [
      '1. Enable "Reduce motion" in OS accessibility settings',
      '2. Navigate between tabs and observe animations',
      '3. Verify that transitions are disabled or minimal'
    ],
    expectedBehavior: [
      'Tab switching animations should be disabled',
      'Focus transitions should be immediate',
      'No spinning or moving elements'
    ]
  }
};