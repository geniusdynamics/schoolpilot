import { logger } from '@/utils/logging';

// ABOUTME: TabbedForm component for multi-step forms with tab navigation and progress indicators
// ABOUTME: Supports validation state indicators, responsive mobile navigation, and form state preservation

import React, { ReactNode, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTransition } from '../../../utils/animations';
import { designTokens } from '../../../utils/designTokens';
import { generateId, announceToScreenReader } from '../../../utils/accessibility';

export interface FormTab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  validation?: () => boolean;
  required?: boolean;
  disabled?: boolean;
}

export interface TabbedFormProps {
  tabs: FormTab[];
  activeTab?: number;
  onTabChange?: (tabIndex: number, tabId: string) => void;
  validation?: Record<string, boolean>;
  onSubmit?: (data: any) => Promise<void>;
  loading?: boolean;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  allowTabSwitching?: boolean;
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
  preserveTabState?: boolean;
  submitButtonText?: string;
  cancelButtonText?: string;
  onCancel?: () => void;
  children?: ReactNode;
}

const TabbedForm: React.FC<TabbedFormProps> = ({
  tabs,
  activeTab,
  onTabChange,
  validation = {},
  onSubmit,
  loading = false,
  className = '',
  variant = 'default',
  size = 'md',
  showProgress = true,
  allowTabSwitching = true,
  mobileBreakpoint = 'md',
  preserveTabState = true,
  submitButtonText = 'Submit',
  cancelButtonText = 'Cancel',
  onCancel,
  children,
}) => {
  const [currentTab, setCurrentTab] = useState(activeTab ?? 0);
  const [visitedTabs, setVisitedTabs] = useState<Set<number>>(new Set([activeTab ?? 0]));
  const [tabStates, setTabStates] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const tabsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const formId = generateId('tabbed-form');
  
  // Animation styles
  const transitionStyles = useTransition(['all'], designTokens.animations.duration.normal);
  
  // Update current tab when activeTab prop changes
  useEffect(() => {
    // Controlled mode only: sync when the consumer actually provides activeTab.
    // Uncontrolled consumers (no activeTab prop) own their tab state — the old
    // unconditional reset yanked every internal tab change back to the default.
    if (activeTab !== undefined && activeTab !== currentTab) {
      setCurrentTab(activeTab);
      setVisitedTabs(prev => new Set([...prev, activeTab]));
    }
  }, [activeTab, currentTab]);
  
  // Handle tab change
  const handleTabChange = useCallback((tabIndex: number) => {
    if (!allowTabSwitching && tabIndex !== currentTab + 1 && tabIndex !== currentTab - 1) {
      return;
    }
    
    const tab = tabs[tabIndex];
    if (!tab || tab.disabled) {
      return;
    }
    
    // Preserve current tab state if enabled
    if (preserveTabState) {
      const currentTabId = tabs[currentTab]?.id;
      if (currentTabId) {
        // This would typically save form data - implementation depends on form library
        setTabStates(prev => ({
          ...prev,
          [currentTabId]: {
            // Save current form state here
            timestamp: Date.now(),
          },
        }));
      }
    }
    
    setCurrentTab(tabIndex);
    setVisitedTabs(prev => new Set([...prev, tabIndex]));
    
    // Announce tab change to screen readers
    announceToScreenReader(`Switched to ${tab.label} tab`, 'polite');
    
    // Call external handler
    onTabChange?.(tabIndex, tab.id);
    
    // Focus the tab content for accessibility
    setTimeout(() => {
      contentRef.current?.focus();
    }, 100);
  }, [allowTabSwitching, currentTab, tabs, preserveTabState, onTabChange]);
  
  // Get tab validation state
  const getTabValidationState = useCallback((tabIndex: number) => {
    const tab = tabs[tabIndex];
    if (!tab) return 'neutral';
    
    // Check external validation prop
    if (validation[tab.id] === false) return 'error';
    if (validation[tab.id] === true) return 'success';
    
    // Check tab's own validation function
    if (tab.validation) {
      try {
        const isValid = tab.validation();
        return isValid ? 'success' : 'error';
      } catch (error) {
        logger.error(`Validation error for tab ${tab.id}:`, error);
        return 'error';
      }
    }
    
    return 'neutral';
  }, [tabs, validation]);
  
  // Check if tab is accessible (can be clicked)
  const isTabAccessible = useCallback((tabIndex: number) => {
    if (!allowTabSwitching) {
      // Only allow current, previous, and next tabs
      return Math.abs(tabIndex - currentTab) <= 1;
    }
    return !tabs[tabIndex]?.disabled;
  }, [allowTabSwitching, currentTab, tabs]);
  
  // Size variants
  const sizeStyles = {
    sm: {
      tab: 'px-3 py-2 text-sm',
      content: 'p-4',
      icon: 'w-4 h-4',
      gap: 'gap-2',
    },
    md: {
      tab: 'px-4 py-3 text-sm',
      content: 'p-6',
      icon: 'w-5 h-5',
      gap: 'gap-3',
    },
    lg: {
      tab: 'px-6 py-4 text-base',
      content: 'p-8',
      icon: 'w-6 h-6',
      gap: 'gap-4',
    },
  };
  
  // Variant styles
  const variantStyles = {
    default: {
      container: 'border border-surface-border rounded-lg bg-surface-card shadow-sm',
      tabList: 'border-b border-surface-border bg-surface-muted rounded-t-lg',
      tab: 'border-b-2 border-transparent hover:border-surface-border hover:text-surface-foreground',
      activeTab: 'border-primary-500 text-primary-600 bg-surface-card',
      content: 'bg-surface-card rounded-b-lg',
    },
    pills: {
      container: 'bg-surface-card rounded-lg shadow-sm',
      tabList: 'p-2 bg-surface-accent rounded-lg',
      tab: 'rounded-md hover:bg-gray-200 hover:text-surface-foreground',
      activeTab: 'bg-surface-card text-primary-600 shadow-sm',
      content: 'mt-4',
    },
    underline: {
      container: 'bg-surface-card',
      tabList: 'border-b border-surface-border',
      tab: 'border-b-2 border-transparent hover:border-surface-border hover:text-surface-foreground',
      activeTab: 'border-primary-500 text-primary-600',
      content: 'mt-6',
    },
  };
  
  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];
  
  // Get tab state classes
  const getTabStateClasses = useCallback((tabIndex: number, isActive: boolean) => {
    const validationState = getTabValidationState(tabIndex);
    const isAccessible = isTabAccessible(tabIndex);
    const isVisited = visitedTabs.has(tabIndex);
    
    const classes = [
      'relative flex items-center justify-center transition-all duration-200',
      currentSize.tab,
      currentSize.gap,
    ];
    
    if (isActive) {
      classes.push(currentVariant.activeTab);
    } else {
      classes.push(currentVariant.tab);
    }
    
    // Accessibility states
    if (!isAccessible) {
      classes.push('opacity-50 cursor-not-allowed');
    } else {
      classes.push('cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2');
    }
    
    // Validation state indicators
    if (isVisited && validationState === 'error') {
      classes.push('text-red-600 border-red-500');
    } else if (isVisited && validationState === 'success') {
      classes.push('text-green-600');
    }
    
    return classes.join(' ');
  }, [getTabValidationState, isTabAccessible, visitedTabs, currentSize, currentVariant]);
  
  // Progress calculation
  const progress = useMemo(() => {
    if (!showProgress) return 0;
    
    const completedTabs = tabs.filter((_, index) => {
      const validationState = getTabValidationState(index);
      return visitedTabs.has(index) && validationState === 'success';
    }).length;
    
    return (completedTabs / tabs.length) * 100;
  }, [tabs, getTabValidationState, visitedTabs, showProgress]);
  
  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!onSubmit || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Validate all tabs
      const allValid = tabs.every((_, index) => {
        const validationState = getTabValidationState(index);
        return validationState !== 'error';
      });
      
      if (!allValid) {
        // Find first invalid tab and switch to it
        const firstInvalidTab = tabs.findIndex((_, index) => {
          const validationState = getTabValidationState(index);
          return validationState === 'error';
        });
        
        if (firstInvalidTab !== -1) {
          handleTabChange(firstInvalidTab);
          announceToScreenReader('Please correct errors in the form before submitting', 'assertive');
        }
        return;
      }
      
      await onSubmit(tabStates);
      announceToScreenReader('Form submitted successfully', 'polite');
    } catch (error) {
      logger.error('Form submission error:', error);
      announceToScreenReader('An error occurred while submitting the form', 'assertive');
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, isSubmitting, tabs, getTabValidationState, tabStates, handleTabChange]);
  
  // Render validation indicator
  const renderValidationIndicator = useCallback((tabIndex: number) => {
    const validationState = getTabValidationState(tabIndex);
    const isVisited = visitedTabs.has(tabIndex);
    
    if (!isVisited || validationState === 'neutral') return null;
    
    if (validationState === 'success') {
      return (
        <svg className="w-4 h-4 text-green-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    
    if (validationState === 'error') {
      return (
        <svg className="w-4 h-4 text-red-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    
    return null;
  }, [getTabValidationState, visitedTabs]);
  
  // Mobile responsive classes
  const mobileClasses = {
    sm: 'sm:hidden',
    md: 'md:hidden',
    lg: 'lg:hidden',
  };
  
  const desktopClasses = {
    sm: 'hidden sm:flex',
    md: 'hidden md:flex',
    lg: 'hidden lg:flex',
  };
  
  return (
    <div className={`${currentVariant.container} ${className}`} style={transitionStyles}>
      {/* Progress bar */}
      {showProgress && (
        <div className="px-6 pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-surface-foreground">Progress</span>
            <span className="text-sm text-surface-muted-fg">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Desktop Tab Navigation */}
      <div
        ref={tabsRef}
        className={`${desktopClasses[mobileBreakpoint]} ${currentVariant.tabList}`}
        role="tablist"
        aria-label="Form sections"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={index === currentTab}
            aria-controls={`${formId}-panel-${index}`}
            id={`${formId}-tab-${index}`}
            className={getTabStateClasses(index, index === currentTab)}
            onClick={() => handleTabChange(index)}
            disabled={!isTabAccessible(index)}
            style={transitionStyles}
          >
            {tab.icon && (
              <span className={`${currentSize.icon} flex-shrink-0`} aria-hidden="true">
                {tab.icon}
              </span>
            )}
            <span className="font-medium">{tab.label}</span>
            {tab.required && (
              <span className="text-red-500 ml-1" aria-label="required">*</span>
            )}
            {renderValidationIndicator(index)}
          </button>
        ))}
      </div>
      
      {/* Mobile Tab Navigation */}
      <div className={`${mobileClasses[mobileBreakpoint]} p-4 border-b border-surface-border`}>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleTabChange(Math.max(0, currentTab - 1))}
            disabled={currentTab === 0}
            className="p-2 text-surface-muted-fg hover:text-surface-muted-fg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous tab"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex-1 text-center">
            <div className="font-medium text-surface-foreground">{tabs[currentTab]?.label}</div>
            <div className="text-sm text-surface-muted-fg">
              {currentTab + 1} of {tabs.length}
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => handleTabChange(Math.min(tabs.length - 1, currentTab + 1))}
            disabled={currentTab === tabs.length - 1}
            className="p-2 text-surface-muted-fg hover:text-surface-muted-fg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next tab"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div
        ref={contentRef}
        className={`${currentVariant.content} ${currentSize.content}`}
        role="tabpanel"
        aria-labelledby={`${formId}-tab-${currentTab}`}
        id={`${formId}-panel-${currentTab}`}
        tabIndex={-1}
        style={transitionStyles}
      >
        {tabs[currentTab]?.content}
        {children}
      </div>
      
      {/* Form Actions - Right-aligned buttons */}
      {(onSubmit || onCancel) && (
        <div className="flex justify-end items-center gap-3 px-6 py-4 bg-surface-muted border-t border-surface-border rounded-b-lg">
          {currentTab > 0 && (
            <button
              type="button"
              onClick={() => handleTabChange(currentTab - 1)}
              className="px-4 py-2 text-sm font-medium text-surface-foreground bg-surface-card border border-surface-border rounded-md hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Previous
            </button>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-surface-foreground bg-surface-card border border-surface-border rounded-md hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              disabled={isSubmitting}
            >
              {cancelButtonText}
            </button>
          )}

          {currentTab < tabs.length - 1 ? (
            <button
              type="button"
              onClick={() => handleTabChange(currentTab + 1)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Next
            </button>
          ) : onSubmit && (
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {(isSubmitting || loading) && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {submitButtonText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TabbedForm;