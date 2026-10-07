import { logger } from '@/utils/logging';

/**
 * TabAccessibilityManager - Comprehensive accessibility support for SchoolPilot3 tabs
 * Implements WCAG 2.1 AA compliance for tab navigation and interaction
 */

import React from 'react';

export interface TabAccessibilityConfig {
  tabNavigation: {
    arrowKeyNavigation: boolean;
    homeEndKeys: boolean;
    enterSpaceActivation: boolean;
    deleteKeyClose: boolean;
    escapeKeyExit: boolean;
  };
  tabVisuals: {
    minimumTouchTarget: number;
    focusIndicatorWidth: number;
    colorContrastRatio: number;
    activeTabIndicator: boolean;
    highContrastMode: boolean;
  };
  tabAnnouncements: {
    tabActivation: string;
    tabClosure: string;
    tabAddition: string;
    tabCount: string;
    navigationInstruction: string;
  };
  tabPanelAssociation: {
    useAriaControls: boolean;
    useAriaLabelledBy: boolean;
    hideInactivePanels: boolean;
    announceContentChanges: boolean;
  };
  reducedMotion: {
    respectReducedMotion: boolean;
    disableAnimations: boolean;
    reducedAnimationDuration: number;
  };
}

export interface TabAccessibilityCallbacks {
  selectPreviousTab: () => void;
  selectNextTab: () => void;
  selectFirstTab: () => void;
  selectLastTab: () => void;
  activateTab: () => void;
  closeTab?: () => void;
  focusTabContent: () => void;
}

export interface TabAccessibilityState {
  currentTabIndex: number;
  totalTabs: number;
  tabId: string;
  tabTitle: string;
  canClose: boolean;
  isActive: boolean;
}

export class TabAccessibilityManager {
  private config: TabAccessibilityConfig;
  private announcementTimer: NodeJS.Timeout | null = null;
  private lastAnnouncement: string = '';
  
  constructor(config: TabAccessibilityConfig) {
    this.config = {
      tabNavigation: {
        arrowKeyNavigation: true,
        homeEndKeys: true,
        enterSpaceActivation: true,
        deleteKeyClose: true,
        escapeKeyExit: true
      },
      tabVisuals: {
        minimumTouchTarget: 44,
        focusIndicatorWidth: 2,
        colorContrastRatio: 4.5,
        activeTabIndicator: true,
        highContrastMode: false
      },
      tabAnnouncements: {
        tabActivation: '{{tabName}} tab selected, {{index}} of {{total}}',
        tabClosure: '{{tabName}} tab closed',
        tabAddition: 'New tab created: {{tabName}}',
        tabCount: '{{total}} tabs available',
        navigationInstruction: 'Use arrow keys to navigate tabs, Enter to activate, Delete to close'
      },
      tabPanelAssociation: {
        useAriaControls: true,
        useAriaLabelledBy: true,
        hideInactivePanels: true,
        announceContentChanges: true
      },
      reducedMotion: {
        respectReducedMotion: true,
        disableAnimations: false,
        reducedAnimationDuration: 200
      },
      ...config
    };
    
    // Check for reduced motion preference
    if (this.config.reducedMotion.respectReducedMotion) {
      this.detectReducedMotionPreference();
    }
    
    // Check for high contrast mode
    this.detectHighContrastMode();
  }
  
  /**
   * Enhanced keyboard navigation handler
   */
  handleTabKeyDown(
    e: React.KeyboardEvent, 
    state: TabAccessibilityState, 
    callbacks: TabAccessibilityCallbacks
  ): void {
    const { currentTabIndex, totalTabs, canClose } = state;
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        if (this.config.tabNavigation.arrowKeyNavigation) {
          e.preventDefault();
          callbacks.selectPreviousTab();
          this.announceTabNavigation(state, 'previous');
        }
        break;
        
      case 'ArrowRight':
      case 'ArrowDown':
        if (this.config.tabNavigation.arrowKeyNavigation) {
          e.preventDefault();
          callbacks.selectNextTab();
          this.announceTabNavigation(state, 'next');
        }
        break;
        
      case 'Home':
        if (this.config.tabNavigation.homeEndKeys) {
          e.preventDefault();
          callbacks.selectFirstTab();
          this.announceTabNavigation(state, 'first');
        }
        break;
        
      case 'End':
        if (this.config.tabNavigation.homeEndKeys) {
          e.preventDefault();
          callbacks.selectLastTab();
          this.announceTabNavigation(state, 'last');
        }
        break;
        
      case 'Enter':
      case ' ':
        if (this.config.tabNavigation.enterSpaceActivation) {
          e.preventDefault();
          callbacks.activateTab();
          this.announceTabActivation(state);
        }
        break;
        
      case 'Delete':
      case 'Backspace':
        if (this.config.tabNavigation.deleteKeyClose && canClose && callbacks.closeTab) {
          e.preventDefault();
          callbacks.closeTab();
          this.announceTabClosure(state);
        }
        break;
        
      case 'Escape':
        if (this.config.tabNavigation.escapeKeyExit) {
          e.preventDefault();
          callbacks.focusTabContent();
          this.announceToScreenReader('Focus moved to tab content');
        }
        break;
        
      case 'Tab':
        // Allow default tab behavior, but announce instructions
        if (!e.shiftKey) {
          this.announceNavigationInstructions();
        }
        break;
    }
  }
  
  /**
   * Generate ARIA attributes for tab button
   */
  getTabButtonAttributes(state: TabAccessibilityState): Record<string, any> {
    const { tabId, tabTitle, isActive, currentTabIndex, totalTabs } = state;
    
    const attributes: Record<string, any> = {
      role: 'tab',
      id: `tab-${tabId}`,
      tabIndex: isActive ? 0 : -1,
      'aria-selected': isActive,
      'aria-label': `${tabTitle}, tab ${currentTabIndex + 1} of ${totalTabs}`,
    };
    
    if (this.config.tabPanelAssociation.useAriaControls) {
      attributes['aria-controls'] = `tabpanel-${tabId}`;
    }
    
    // Add description for keyboard navigation
    attributes['aria-describedby'] = 'tab-navigation-instructions';
    
    return attributes;
  }
  
  /**
   * Generate ARIA attributes for tab panel
   */
  getTabPanelAttributes(state: TabAccessibilityState): Record<string, any> {
    const { tabId, tabTitle, isActive } = state;
    
    const attributes: Record<string, any> = {
      role: 'tabpanel',
      id: `tabpanel-${tabId}`,
      tabIndex: 0,
    };
    
    if (this.config.tabPanelAssociation.useAriaLabelledBy) {
      attributes['aria-labelledby'] = `tab-${tabId}`;
    } else {
      attributes['aria-label'] = `${tabTitle} content`;
    }
    
    if (this.config.tabPanelAssociation.hideInactivePanels && !isActive) {
      attributes['aria-hidden'] = 'true';
      attributes.hidden = true;
    }
    
    return attributes;
  }
  
  /**
   * Generate ARIA attributes for tab list container
   */
  getTabListAttributes(totalTabs: number): Record<string, any> {
    return {
      role: 'tablist',
      'aria-label': `Navigation tabs, ${totalTabs} available`,
      'aria-orientation': 'horizontal'
    };
  }
  
  /**
   * Screen reader announcements for tab changes
   */
  announceTabActivation(state: TabAccessibilityState): void {
    const { tabTitle, currentTabIndex, totalTabs } = state;
    const message = this.config.tabAnnouncements.tabActivation
      .replace('{{tabName}}', tabTitle)
      .replace('{{index}}', (currentTabIndex + 1).toString())
      .replace('{{total}}', totalTabs.toString());
      
    this.announceToScreenReader(message);
  }
  
  /**
   * Announce tab closure
   */
  announceTabClosure(state: TabAccessibilityState): void {
    const { tabTitle } = state;
    const message = this.config.tabAnnouncements.tabClosure
      .replace('{{tabName}}', tabTitle);
      
    this.announceToScreenReader(message);
  }
  
  /**
   * Announce new tab creation
   */
  announceTabAddition(tabTitle: string): void {
    const message = this.config.tabAnnouncements.tabAddition
      .replace('{{tabName}}', tabTitle);
      
    this.announceToScreenReader(message);
  }
  
  /**
   * Announce tab navigation
   */
  private announceTabNavigation(state: TabAccessibilityState, direction: 'previous' | 'next' | 'first' | 'last'): void {
    const { tabTitle, currentTabIndex, totalTabs } = state;
    let message = '';
    
    switch (direction) {
      case 'previous':
        message = `Previous tab: ${tabTitle}`;
        break;
      case 'next':
        message = `Next tab: ${tabTitle}`;
        break;
      case 'first':
        message = `First tab: ${tabTitle}`;
        break;
      case 'last':
        message = `Last tab: ${tabTitle}`;
        break;
    }
    
    this.announceToScreenReader(message, 'assertive');
  }
  
  /**
   * Announce navigation instructions
   */
  private announceNavigationInstructions(): void {
    this.announceToScreenReader(this.config.tabAnnouncements.navigationInstruction, 'polite');
  }
  
  /**
   * Core screen reader announcement function
   */
  private announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    // Prevent duplicate announcements
    if (message === this.lastAnnouncement) {
      return;
    }
    
    this.lastAnnouncement = message;
    
    // Clear existing timer
    if (this.announcementTimer) {
      clearTimeout(this.announcementTimer);
    }
    
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only absolute -left-10000px w-1 h-1 overflow-hidden';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove announcement after it's been read
    this.announcementTimer = setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
      this.lastAnnouncement = '';
    }, 1000);
  }
  
  /**
   * Generate CSS classes for accessible tab styling
   */
  getTabButtonClasses(state: TabAccessibilityState): string {
    const { isActive, canClose } = state;
    const { minimumTouchTarget, focusIndicatorWidth, highContrastMode } = this.config.tabVisuals;
    
    const baseClasses = [
      `min-h-[${minimumTouchTarget}px]`,
      `min-w-[${minimumTouchTarget}px]`,
      'px-4 py-2',
      'border-0',
      'bg-transparent',
      'cursor-pointer',
      'transition-all duration-200',
      'relative',
      'outline-none'
    ];
    
    // Focus indicator
    baseClasses.push(
      `focus:ring-${focusIndicatorWidth}`,
      'focus:ring-primary-500',
      'focus:ring-offset-2'
    );
    
    // Active state
    if (isActive) {
      baseClasses.push(
        'bg-surface-card',
        'border-b-2',
        'border-primary-500',
        'text-primary-700',
        'font-medium'
      );
    } else {
      baseClasses.push(
        'text-surface-muted-fg',
        'hover:text-surface-foreground',
        'hover:bg-surface-muted'
      );
    }
    
    // High contrast mode
    if (highContrastMode) {
      baseClasses.push('border-2 border-current');
    }
    
    // Reduced motion
    if (this.config.reducedMotion.disableAnimations) {
      baseClasses.push('transition-none');
    }
    
    return baseClasses.join(' ');
  }
  
  /**
   * Create hidden navigation instructions element
   */
  createNavigationInstructions(): HTMLElement {
    const instructions = document.createElement('div');
    instructions.id = 'tab-navigation-instructions';
    instructions.className = 'sr-only';
    instructions.textContent = this.config.tabAnnouncements.navigationInstruction;
    
    return instructions;
  }
  
  /**
   * Detect user's reduced motion preference
   */
  private detectReducedMotionPreference(): void {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (mediaQuery.matches) {
      this.config.reducedMotion.disableAnimations = true;
      logger.info('🎯 [TabAccessibilityManager] Reduced motion preference detected');
    }
    
    // Listen for changes
    mediaQuery.addEventListener('change', (e) => {
      this.config.reducedMotion.disableAnimations = e.matches;
      logger.info('🎯 [TabAccessibilityManager] Reduced motion preference changed:', e.matches);
    });
  }
  
  /**
   * Detect high contrast mode
   */
  private detectHighContrastMode(): void {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    if (mediaQuery.matches) {
      this.config.tabVisuals.highContrastMode = true;
      logger.info('🎯 [TabAccessibilityManager] High contrast mode detected');
    }
    
    // Listen for changes
    mediaQuery.addEventListener('change', (e) => {
      this.config.tabVisuals.highContrastMode = e.matches;
      logger.info('🎯 [TabAccessibilityManager] High contrast mode changed:', e.matches);
    });
  }
  
  /**
   * Validate accessibility configuration
   */
  validateConfiguration(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check touch target size
    if (this.config.tabVisuals.minimumTouchTarget < 44) {
      errors.push('Minimum touch target size should be at least 44px for WCAG AA compliance');
    }
    
    // Check color contrast
    if (this.config.tabVisuals.colorContrastRatio < 4.5) {
      errors.push('Color contrast ratio should be at least 4.5:1 for WCAG AA compliance');
    }
    
    // Check focus indicator
    if (this.config.tabVisuals.focusIndicatorWidth < 2) {
      warnings.push('Focus indicator width should be at least 2px for better visibility');
    }
    
    // Check announcement messages
    const announcements = this.config.tabAnnouncements;
    if (!announcements.tabActivation.includes('{{tabName}}')) {
      warnings.push('Tab activation announcement should include tab name placeholder');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): TabAccessibilityConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(updates: Partial<TabAccessibilityConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('🎯 [TabAccessibilityManager] Configuration updated:', updates);
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.announcementTimer) {
      clearTimeout(this.announcementTimer);
      this.announcementTimer = null;
    }
  }
}

// Default accessibility configuration
export const defaultTabAccessibilityConfig: TabAccessibilityConfig = {
  tabNavigation: {
    arrowKeyNavigation: true,
    homeEndKeys: true,
    enterSpaceActivation: true,
    deleteKeyClose: true,
    escapeKeyExit: true
  },
  tabVisuals: {
    minimumTouchTarget: 44,
    focusIndicatorWidth: 2,
    colorContrastRatio: 4.5,
    activeTabIndicator: true,
    highContrastMode: false
  },
  tabAnnouncements: {
    tabActivation: '{{tabName}} tab selected, {{index}} of {{total}}',
    tabClosure: '{{tabName}} tab closed',
    tabAddition: 'New tab created: {{tabName}}',
    tabCount: '{{total}} tabs available',
    navigationInstruction: 'Use arrow keys to navigate tabs, Enter to activate, Delete to close'
  },
  tabPanelAssociation: {
    useAriaControls: true,
    useAriaLabelledBy: true,
    hideInactivePanels: true,
    announceContentChanges: true
  },
  reducedMotion: {
    respectReducedMotion: true,
    disableAnimations: false,
    reducedAnimationDuration: 200
  }
};