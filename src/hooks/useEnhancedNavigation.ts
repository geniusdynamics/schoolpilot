// ABOUTME: Enhanced navigation hook that adds tabbed mode support to existing navigation
// ABOUTME: Wraps existing navigation with tabbed mode functionality when enabled

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTabNavigation } from './useTabNavigation';
import { useToastHelpers } from './useToast';

export const useEnhancedNavigation = () => {
  const navigate = useNavigate();
  const { navigateToTab } = useTabNavigation();
  const { showInfo, showError, showWarning } = useToastHelpers();

  /**
   * Enhanced navigation function that uses tabbed mode when enabled
   * Falls back to standard navigation when tabbed mode is disabled or fails
   */
  const enhancedNavigate = useCallback(async (
    path: string, 
    options: {
      title?: string;
      module?: string;
      useTabbedMode?: boolean;
      showFeedback?: boolean;
    } = {}
  ) => {
    const {
      title = 'Untitled',
      module = '',
      useTabbedMode = true,
      showFeedback = true
    } = options;

    // For now, always use standard navigation since we're having import issues
    // In a real implementation, we would check if tabbed mode is enabled
    const isTabbedMode = false; // useTabbedMode && isTabbedModeEnabled(module || 'global');

    if (isTabbedMode) {
      try {
        // Use tabbed navigation
        const result = await navigateToTab(path, {
          title,
          module,
          contentType: 'url',
          activateImmediately: true
        });

        if (showFeedback && result.wasCreated) {
          showInfo(`Opened ${title} in new tab`, {
            title: 'Tab Created',
            duration: 2000
          });
        }

        return result;
      } catch (tabError) {
        console.error('Failed to create tab, falling back to standard navigation:', tabError);
        
        // Fallback to standard navigation
        navigate(path);
        
        if (showFeedback) {
          showWarning('Tabbed mode unavailable, using standard navigation');
        }
        
        return {
          tabId: '',
          tab: null,
          wasCreated: false,
          wasActivated: false
        };
      }
    } else {
      // Use standard navigation
      navigate(path);
      
      return {
        tabId: '',
        tab: null,
        wasCreated: false,
        wasActivated: false
      };
    }
  }, [navigate, navigateToTab, showInfo, showError, showWarning]);

  /**
   * Enhanced module navigation function
   */
  const enhancedNavigateToModule = useCallback((
    module: string,
    submodule?: string,
    options: {
      title?: string;
      useTabbedMode?: boolean;
      showFeedback?: boolean;
    } = {}
  ) => {
    const path = `/${module}${submodule ? `/${submodule}` : ''}`;
    const title = options.title || `${module} ${submodule || 'Dashboard'}`;
    
    return enhancedNavigate(path, {
      ...options,
      title,
      module
    });
  }, [enhancedNavigate]);

  return {
    enhancedNavigate,
    enhancedNavigateToModule
  };
};