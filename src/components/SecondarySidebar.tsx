import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { FolderIcon, ChevronLeftIcon, ChevronRightIcon, BookOpenIcon, DocumentReportIcon } from './ui/icons';
import { useTranslation } from 'react-i18next';

function getFallbackIcon(moduleKey: string) {
  switch (moduleKey) {
    case 'library':
      return <BookOpenIcon className="w-5 h-5" />;
    case 'reports':
      return <DocumentReportIcon className="w-5 h-5" />;
    default:
      return <FolderIcon className="w-5 h-5" />;
  }
}

// Subtle color backgrounds for each module
const moduleBg: Record<string, string> = {
  administration: 'bg-blue-50',
  academics: 'bg-green-50',
  finance: 'bg-yellow-50',
  hr: 'bg-purple-50',
  inventory: 'bg-slate-50',
  library: 'bg-pink-50',
  nutrition: 'bg-orange-50',
  reports: 'bg-cyan-50',
};

const SecondarySidebar: React.FC<{ selectedModuleKey: string; isOpen: boolean; onClose: () => void }> = ({ selectedModuleKey, isOpen, onClose }) => {
  const { t } = useTranslation(['navigation', 'common']);
  const { navigationItems } = useDynamicNavigation(true); // Use dynamic navigation
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const toggleGroup = (key: string) => setOpenGroups(g => ({ ...g, [key]: !g[key] }));

  // Find the selected main module from dynamic navigation items
  const selectedModule = navigationItems.find(item => item.name === selectedModuleKey && item.isGroup);
  const subMenus = selectedModule && selectedModule.children ? selectedModule.children : [];
  const moduleKey = selectedModuleKey.split(':')[1]?.split('.')[0] || '';

  // Debug log to see what's happening
  console.log('🔍 [SecondarySidebar] Debug Info:', {
    selectedModuleKey,
    isOpen,
    navigationItemsCount: navigationItems.length,
    selectedModule: selectedModule,
    subMenusCount: subMenus.length,
    subMenus: subMenus
  });

  // Filtered navigation based on search
  const filterItems = (items: any[]) =>
    items.filter(item =>
      t(item.name).toLowerCase().includes(search.toLowerCase()) ||
      (item.children && item.children.some((child: any) => t(child.name).toLowerCase().includes(search.toLowerCase())))
    );

  if (!selectedModule || !isOpen) {
    return null;
  }

  return (
    <aside className={`w-56 transition-all duration-300 h-full flex flex-col shadow-xl border-l border-slate-100 px-2 py-4 custom-scrollbar relative bg-white/60 backdrop-blur-lg ${moduleBg[moduleKey] || ''}`}>
      <button
        className="absolute top-4 left-0 z-10 text-slate-400 hover:text-slate-700 p-1"
        onClick={onClose}
        title="Collapse menu"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('common:search')}
          className="w-full rounded bg-white border border-slate-200 text-slate-700 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400"
        />
      </div>
      <div className="mb-2 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {filterItems(subMenus).map(item => (
            <li key={item.name}>
              {item.isGroup && item.children ? (
                <div>
                  <button onClick={() => toggleGroup(item.name)} className="flex items-center justify-between w-full px-2 py-1 text-xs uppercase tracking-wider text-slate-700 font-bold focus:outline-none">
                    <span className="flex items-center gap-2">
                      {item.icon ? React.createElement(item.icon, { className: 'w-5 h-5' }) : getFallbackIcon(moduleKey)} {t(item.name).split(' ').slice(1).join(' ')}
                    </span>
                    <span>{openGroups[item.name] ? '\u25be' : '\u25b8'}</span>
                  </button>
                  {openGroups[item.name] && (
                    <ul className="space-y-1 mt-1">
                      {item.children.map((child: any) => (
                        <li key={child.name}>
                          <NavLink
                            to={child.path}
                            className={({ isActive, isPending }) =>
                              `flex items-center gap-3 px-3 py-2 border border-transparent transition-all duration-200 rounded-lg ${
                                isActive
                                  ? 'border-pink-400 text-pink-500 bg-white font-semibold'
                                  : isPending
                                    ? 'bg-blue-100/80 text-blue-900'
                                    : 'text-slate-700 hover:bg-blue-100/80 hover:text-blue-900 hover:shadow-md'
                              }`
                            }
                          >
                            {child.icon ? React.createElement(child.icon, { className: 'w-5 h-5' }) : getFallbackIcon(moduleKey)}
                            <span className="font-medium text-sm">{t(child.name).split(' ').slice(1).join(' ')}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <NavLink
                  to={item.path}
                  className={({ isActive, isPending }) =>
                    `flex items-center gap-3 px-3 py-2 border border-transparent transition-all duration-200 rounded-lg ${
                      isActive
                        ? 'border-pink-400 text-pink-500 bg-white font-semibold'
                        : isPending
                          ? 'bg-blue-100/80 text-blue-900'
                          : 'text-slate-700 hover:bg-blue-100/80 hover:text-blue-900 hover:shadow-md'
                    }`
                  }
                >
                  {item.icon ? React.createElement(item.icon, { className: 'w-5 h-5' }) : getFallbackIcon(moduleKey)}
                  <span className="font-medium text-sm">{t(item.name).split(' ').slice(1).join(' ')}</span>
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #334155 #1e293b;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 7px;
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(120deg, #334155 40%, #64748b 100%);
          border-radius: 8px;
          opacity: 0.5;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          opacity: 0.8;
        }
      `}</style>
    </aside>
  );
};

export default SecondarySidebar; 