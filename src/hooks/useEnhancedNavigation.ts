// ABOUTME: Enhanced navigation hook that adds tabbed mode support to existing navigation
// ABOUTME: Wraps existing navigation with tabbed mode functionality when enabled

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTabNavigation } from './useTabNavigation';
import { useToastHelpers } from './useToast';
import { tabbedModeFeatureFlag } from '../services/ui/tabbedModeFeatureFlag';

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

    // Check if tabbed mode is enabled for this module
    const isTabbedMode = useTabbedMode && tabbedModeFeatureFlag.isTabbedModeEnabled(module || 'global');
    
    console.log('🔍 [useEnhancedNavigation] Navigation decision:', {
      path,
      module: module || 'global',
      useTabbedMode,
      isTabbedModeEnabled: tabbedModeFeatureFlag.isTabbedModeEnabled(module || 'global'),
      finalDecision: isTabbedMode
    });

    if (isTabbedMode) {
      try {
        console.log('🚀 [useEnhancedNavigation] Attempting tabbed navigation:', { path, title, module });
        
        // Use tabbed navigation
        const result = await navigateToTab(path, {
          title,
          module,
          contentType: 'url',
          activateImmediately: true
        });

        console.log('✅ [useEnhancedNavigation] Tabbed navigation successful:', result);

        if (showFeedback && result.wasCreated) {
          showInfo(`Opened ${title} in new tab`, {
            title: 'Tab Created',
            duration: 2000,
            size: 'compact'
          });
        }

        return result;
      } catch (tabError) {
        console.error('❌ [useEnhancedNavigation] Tabbed navigation failed, falling back to standard navigation:', tabError);
        
        // Fallback to standard navigation
        try {
          navigate(path);
          console.log('✅ [useEnhancedNavigation] Standard navigation fallback successful:', path);
        } catch (navError) {
          console.error('❌ [useEnhancedNavigation] Standard navigation also failed:', navError);
          throw new Error(`Navigation failed for path: ${path}`);
        }
        
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
      console.log('🚀 [useEnhancedNavigation] Using standard navigation (tabbed mode disabled):', path);
      
      // Use standard navigation
      try {
        navigate(path);
        console.log('✅ [useEnhancedNavigation] Standard navigation successful:', path);
      } catch (navError) {
        console.error('❌ [useEnhancedNavigation] Standard navigation failed:', navError);
        throw new Error(`Navigation failed for path: ${path}`);
      }
      
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