import React, { useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { XIcon } from './ui/icons';
import { useTranslation } from 'react-i18next';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useEnhancedNavigation } from '../hooks/useEnhancedNavigation';
import { tabbedModeFeatureFlag } from '../services/tabbedModeFeatureFlag';
// Removed unused HookErrorHandler import
import { HookErrorBoundary } from './ErrorBoundary/HookErrorBoundary';
import { SettingsSkeleton } from './ModuleLoadingFallback';

interface SettingsPopupProps {
  open: boolean;
  onClose: () => void;
}

const SettingsPopupContent: React.FC<SettingsPopupProps> = ({ open, onClose }) => {
  const { t } = useTranslation('settings');
  const { navigationItems, isLoading } = useDynamicNavigation();
  const { enhancedNavigate } = useEnhancedNavigation();
  
  // Check if tabbed mode is enabled for settings
  const isTabbedModeEnabled = tabbedModeFeatureFlag.isTabbedModeEnabled('settings');
  
  console.log('🔍 [SettingsPopup] Tabbed mode status:', {
    isTabbedModeEnabled,
    globalEnabled: tabbedModeFeatureFlag.isGloballyEnabled(),
    perModuleControl: tabbedModeFeatureFlag.isPerModuleControlEnabled()
  });
  
  // Memoize settings module and menu to prevent unnecessary recalculations
  const settingsModule = useMemo(() => {
    console.log('🔍 [SettingsPopup] All navigation items:', navigationItems);
    const module = navigationItems.find((item: any) => {
      console.log('🔍 [SettingsPopup] Checking item:', {
        name: item.name,
        path: item.path,
        modulePath: item.modulePath,
        isGroup: item.isGroup,
        matches: item.modulePath === '/settings' && item.isGroup
      });
      return item.modulePath === '/settings' && item.isGroup;
    });
    console.log('🔍 [SettingsPopup] Found settings module:', module);
    return module;
  }, [navigationItems]);
  
  const settingsMenu = useMemo(() => {
    try {
      const menu = settingsModule?.children || [];
      console.log('🔍 [SettingsPopup] Settings menu items:', menu);
      return menu;
    } catch (error) {
      console.error('[SettingsPopup] Error getting settings menu:', error);
      return [];
    }
  }, [settingsModule]);
  
  // Memoize the close handler to prevent unnecessary re-renders
  const handleClose = useCallback(() => {
    try {
      if (onClose && typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      console.error('[SettingsPopup] Error in handleClose:', error);
    }
  }, [onClose]);
  
  const handleLinkClick = useCallback((path: string, title: string) => {
    try {
      if (isTabbedModeEnabled) {
        console.log('🚀 [SettingsPopup] Using enhanced navigation for:', { path, title });
        enhancedNavigate(path, {
          title,
          module: 'settings',
          useTabbedMode: true,
          showFeedback: false
        });
      } else {
        console.log('🚀 [SettingsPopup] Using standard navigation for:', { path, title });
        // For non-tabbed mode, we let the Link component handle navigation naturally
        // Just close the popup - the Link's 'to' prop will handle the navigation
      }
      
      if (onClose && typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      console.error('[SettingsPopup] Error in handleLinkClick:', error);
    }
  }, [onClose, isTabbedModeEnabled, enhancedNavigate]);

  // Conditional return after all hooks are called
  if (!open) return null;
  
  return (
      <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/30 backdrop-blur-sm">
        {/* Drawer */}
        <div className="w-full max-w-xs h-full bg-white shadow-2xl border-l border-slate-200 p-0 relative animate-slide-in flex flex-col">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all" title="Close settings">
          <XIcon className="w-6 h-6" />
        </button>
        <div className="px-6 pt-8 pb-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4">{t('settings.title')}</h2>
          {isLoading || settingsMenu.length === 0 ? (
            <SettingsSkeleton />
          ) : (
            <ul className="space-y-2">
              {settingsMenu.map((item: any) => (
                <li key={item.name}>
                  {isTabbedModeEnabled ? (
                    <button 
                      onClick={() => handleLinkClick(item.path, t(item.name))} 
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-blue-50 transition-all text-left"
                    >
                      {item.icon ? React.createElement(item.icon, { className: 'w-5 h-5' }) : null}
                      <span className="font-medium text-base">{t(item.name)}</span>
                    </button>
                  ) : (
                    <Link to={item.path} className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-blue-50 transition-all" onClick={handleClose}>
                      {item.icon ? React.createElement(item.icon, { className: 'w-5 h-5' }) : null}
                      <span className="font-medium text-base">{t(item.name)}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
        <style>{`
          .animate-slide-in {
            animation: slideInDrawer 0.35s cubic-bezier(0.4,0,0.2,1);
          }
          @keyframes slideInDrawer {
            from { transform: translateX(100%); opacity: 0.7; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
      </div>
  );
};

const SettingsPopup: React.FC<SettingsPopupProps> = ({ open, onClose }) => {
  return (
    <HookErrorBoundary componentName="SettingsPopup">
      <SettingsPopupContent open={open} onClose={onClose} />
    </HookErrorBoundary>
  );
};

export default SettingsPopup;