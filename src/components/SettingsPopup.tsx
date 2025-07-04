import React from 'react';
import { Link } from 'react-router-dom';
import { XIcon } from './ui/icons';
import { useTranslation } from 'react-i18next';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';

interface SettingsPopupProps {
  open: boolean;
  onClose: () => void;
}

const SettingsPopup: React.FC<SettingsPopupProps> = ({ open, onClose }) => {
  const { t } = useTranslation(['navigation', 'common']);
  const { navigationItems } = useDynamicNavigation(true);
  // Find the settings module group dynamically
  const settingsModule = navigationItems.find(item => item.modulePath === '/settings' && item.isGroup);
  const settingsMenu = settingsModule?.children || [];

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/30 backdrop-blur-sm">
      {/* Drawer */}
      <div className="w-full max-w-xs h-full bg-white shadow-2xl border-l border-slate-200 p-0 relative animate-slide-in flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all" title="Close settings">
          <XIcon className="w-6 h-6" />
        </button>
        <div className="px-6 pt-8 pb-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4">{t('settings.title')}</h2>
          <ul className="space-y-2">
            {settingsMenu.map((item: any) => (
              <li key={item.name}>
                <Link to={item.path} className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-blue-50 transition-all" onClick={onClose}>
                  {item.icon ? React.createElement(item.icon, { className: 'w-5 h-5' }) : null}
                  <span className="font-medium text-base">{t(item.name)}</span>
                </Link>
              </li>
            ))}
          </ul>
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

export default SettingsPopup; 