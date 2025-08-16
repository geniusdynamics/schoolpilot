import React, { useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { XIcon } from './ui/icons';
import { useTranslation } from 'react-i18next';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { safeDeps, HookErrorHandler } from '../utils/hookUtils';
import { HookErrorBoundary } from './ErrorBoundary/HookErrorBoundary';
import { SettingsSkeleton } from './ModuleLoadingFallback';

interface SettingsPopupProps {
  open: boolean;
  onClose: () => void;
}

const SettingsPopupContent: React.FC<SettingsPopupProps> = ({ open, onClose }) => {
  // All hooks must be called before any conditional returns
  const { t } = useTranslation(['navigation', 'common']);
  const { navigationItems, isLoading } = useDynamicNavigation();
  
  // Memoize settings module and menu to prevent unnecessary recalculations
  const settingsModule = useMemo(() => {
    try {
      if (!navigationItems || !Array.isArray(navigationItems)) {
        console.warn('[SettingsPopup] navigationItems not available or not an array');
        return null;
      }
      return navigationItems.find(item => item && item.modulePath === '/settings' && item.isGroup);
    } catch (error) {
      console.error('[SettingsPopup] Error finding settings module:', error);
      return null;
    }
  }, safeDeps([navigationItems]));
  
  const settingsMenu = useMemo(() => {
    try {
      return settingsModule?.children || [];
    } catch (error) {
      console.error('[SettingsPopup] Error getting settings menu:', error);
      return [];
    }
  }, safeDeps([settingsModule]));
  
  // Memoize the close handler to prevent unnecessary re-renders
  const handleClose = useCallback(() => {
    try {
      if (onClose && typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      console.error('[SettingsPopup] Error in handleClose:', error);
    }
  }, safeDeps([onClose]));
  
  const handleLinkClick = useCallback(() => {
    try {
      if (onClose && typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      console.error('[SettingsPopup] Error in handleLinkClick:', error);
    }
  }, safeDeps([onClose]));

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
                  <Link to={item.path} className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-blue-50 transition-all" onClick={handleLinkClick}>
                    {item.icon ? React.createElement(item.icon, { className: 'w-5 h-5' }) : null}
                    <span className="font-medium text-base">{t(item.name)}</span>
                  </Link>
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