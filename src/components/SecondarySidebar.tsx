import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useRBAC } from '../hooks/useRBAC';
import { useAuth } from '../contexts/AuthContext';
import { FolderIcon, ChevronLeftIcon, ChevronRightIcon, BookOpenIcon, DocumentReportIcon, XIcon, InformationCircleIcon } from './ui/icons';
import { useTranslation } from 'react-i18next';

function getFallbackIcon(moduleKey: string) {
  switch (moduleKey) {
    case 'library':
      return <BookOpenIcon className="w-4 h-4" />;
    case 'reports':
      return <DocumentReportIcon className="w-4 h-4" />;
    default:
      return <FolderIcon className="w-4 h-4" />;
  }
}

// Optimized icon wrapper component for better visual balance
const IconWrapper: React.FC<{ 
  icon?: React.ComponentType<any>; 
  moduleKey: string; 
  className?: string;
  isMinimized?: boolean;
}> = ({ icon, moduleKey, className = "", isMinimized = false }) => {
  // Reduced icon sizing for better visual balance
  const iconSize = "w-4 h-4";
  const wrapperSize = isMinimized ? "w-5 h-5" : "w-5 h-5";
  
  return (
    <div className={`
      ${wrapperSize} 
      flex items-center justify-center 
      flex-shrink-0
      ${className}
    `}>
      {icon 
        ? React.createElement(icon, { 
            className: `${iconSize} transition-all duration-200` 
          })
        : React.cloneElement(getFallbackIcon(moduleKey), {
            className: `${iconSize} transition-all duration-200`
          })
      }
    </div>
  );
};

// Enhanced glassmorphism color schemes matching primary sidebar
const getModuleStyle = (moduleKey: string) => {
  const colorSchemes = {
    dashboard: {
      background: 'bg-gradient-to-br from-blue-500/10 via-blue-400/8 to-blue-600/12',
      border: 'border-blue-400/20',
      accent: 'text-blue-600',
      hover: 'hover:bg-blue-500/15',
      activeLink: 'border-blue-400 text-blue-600 bg-blue-50/80',
      hoverLink: 'hover:bg-blue-100/60 hover:text-blue-800'
    },
    administration: {
      background: 'bg-gradient-to-br from-purple-500/10 via-purple-400/8 to-purple-600/12',
      border: 'border-purple-400/20',
      accent: 'text-purple-600',
      hover: 'hover:bg-purple-500/15',
      activeLink: 'border-purple-400 text-purple-600 bg-purple-50/80',
      hoverLink: 'hover:bg-purple-100/60 hover:text-purple-800'
    },
    academics: {
      background: 'bg-gradient-to-br from-green-500/10 via-green-400/8 to-green-600/12',
      border: 'border-green-400/20',
      accent: 'text-green-600',
      hover: 'hover:bg-green-500/15',
      activeLink: 'border-green-400 text-green-600 bg-green-50/80',
      hoverLink: 'hover:bg-green-100/60 hover:text-green-800'
    },
    finance: {
      background: 'bg-gradient-to-br from-yellow-500/10 via-yellow-400/8 to-yellow-600/12',
      border: 'border-yellow-400/20',
      accent: 'text-yellow-600',
      hover: 'hover:bg-yellow-500/15',
      activeLink: 'border-yellow-400 text-yellow-600 bg-yellow-50/80',
      hoverLink: 'hover:bg-yellow-100/60 hover:text-yellow-800'
    },
    hr: {
      background: 'bg-gradient-to-br from-red-500/10 via-red-400/8 to-red-600/12',
      border: 'border-red-400/20',
      accent: 'text-red-600',
      hover: 'hover:bg-red-500/15',
      activeLink: 'border-red-400 text-red-600 bg-red-50/80',
      hoverLink: 'hover:bg-red-100/60 hover:text-red-800'
    },
    inventory: {
      background: 'bg-gradient-to-br from-orange-500/10 via-orange-400/8 to-orange-600/12',
      border: 'border-orange-400/20',
      accent: 'text-orange-600',
      hover: 'hover:bg-orange-500/15',
      activeLink: 'border-orange-400 text-orange-600 bg-orange-50/80',
      hoverLink: 'hover:bg-orange-100/60 hover:text-orange-800'
    },
    library: {
      background: 'bg-gradient-to-br from-indigo-500/10 via-indigo-400/8 to-indigo-600/12',
      border: 'border-indigo-400/20',
      accent: 'text-indigo-600',
      hover: 'hover:bg-indigo-500/15',
      activeLink: 'border-indigo-400 text-indigo-600 bg-indigo-50/80',
      hoverLink: 'hover:bg-indigo-100/60 hover:text-indigo-800'
    },
    reports: {
      background: 'bg-gradient-to-br from-teal-500/10 via-teal-400/8 to-teal-600/12',
      border: 'border-teal-400/20',
      accent: 'text-teal-600',
      hover: 'hover:bg-teal-500/15',
      activeLink: 'border-teal-400 text-teal-600 bg-teal-50/80',
      hoverLink: 'hover:bg-teal-100/60 hover:text-teal-800'
    },
    audit: {
      background: 'bg-gradient-to-br from-pink-500/10 via-pink-400/8 to-pink-600/12',
      border: 'border-pink-400/20',
      accent: 'text-pink-600',
      hover: 'hover:bg-pink-500/15',
      activeLink: 'border-pink-400 text-pink-600 bg-pink-50/80',
      hoverLink: 'hover:bg-pink-100/60 hover:text-pink-800'
    },
    nutrition: {
      background: 'bg-gradient-to-br from-lime-500/10 via-lime-400/8 to-lime-600/12',
      border: 'border-lime-400/20',
      accent: 'text-lime-600',
      hover: 'hover:bg-lime-500/15',
      activeLink: 'border-lime-400 text-lime-600 bg-lime-50/80',
      hoverLink: 'hover:bg-lime-100/60 hover:text-lime-800'
    },
    admissions: {
      background: 'bg-gradient-to-br from-cyan-500/10 via-cyan-400/8 to-cyan-600/12',
      border: 'border-cyan-400/20',
      accent: 'text-cyan-600',
      hover: 'hover:bg-cyan-500/15',
      activeLink: 'border-cyan-400 text-cyan-600 bg-cyan-50/80',
      hoverLink: 'hover:bg-cyan-100/60 hover:text-cyan-800'
    },
    settings: {
      background: 'bg-gradient-to-br from-gray-500/10 via-gray-400/8 to-gray-600/12',
      border: 'border-gray-400/20',
      accent: 'text-gray-600',
      hover: 'hover:bg-gray-500/15',
      activeLink: 'border-gray-400 text-gray-600 bg-gray-50/80',
      hoverLink: 'hover:bg-gray-100/60 hover:text-gray-800'
    }
  };

  return colorSchemes[moduleKey as keyof typeof colorSchemes] || colorSchemes.settings;
};

const SecondarySidebar: React.FC<{ selectedModuleKey: string; isOpen: boolean; onClose: () => void }> = ({ selectedModuleKey, isOpen, onClose }) => {
  const { t } = useTranslation(['navigation', 'common']);
  const { navigationItems } = useDynamicNavigation(true); // Use dynamic navigation
  const { accessibleModules } = useRBAC();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const toggleGroup = (key: string) => setOpenGroups(g => ({ ...g, [key]: !g[key] }));

  // Find the selected main module from dynamic navigation items
  const selectedModule = navigationItems.find(item => item.name === selectedModuleKey && item.isGroup);
  const subMenus = selectedModule && selectedModule.children ? selectedModule.children : [];
  const moduleKey = selectedModuleKey.split(':')[1]?.split('.')[0] || '';
  const moduleStyle = getModuleStyle(moduleKey);

  // Improved responsive behavior with better breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024); // lg breakpoint
      
      // Auto-minimize on medium screens (768-1200px) for better space utilization
      if (width >= 768 && width < 1200) {
        setIsMinimized(true);
      } else if (width >= 1200) {
        setIsMinimized(false);
      }
    };

    handleResize(); // Check initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-close on mobile when clicking outside or on route change
  useEffect(() => {
    if (isMobile && isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        const sidebar = document.getElementById('secondary-sidebar');
        if (sidebar && !sidebar.contains(event.target as Node)) {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobile, isOpen, onClose]);

  // Only log once when component mounts or when there's an error
  useEffect(() => {
    if (!isOpen) return;
    
    if (!selectedModule) {
      console.warn('⚠️ [SecondarySidebar] No selected module found for:', selectedModuleKey);
    }
  }, [isOpen, selectedModule, selectedModuleKey]);

  // Filtered navigation based on search
  const filterItems = (items: any[]) =>
    items.filter(item =>
      t(item.name).toLowerCase().includes(search.toLowerCase()) ||
      (item.children && item.children.some((child: any) => t(child.name).toLowerCase().includes(search.toLowerCase())))
    );

  if (!selectedModule || !isOpen) {
    return null;
  }

  // Optimized sidebar width for better visual balance
  const sidebarWidth = isMinimized ? 'w-12' : 'w-48';
  const sidebarClasses = isMobile
    ? 'w-48 fixed inset-y-0 left-16 sm:left-20 z-30 shadow-2xl' // Mobile: fixed overlay positioning with offset for primary sidebar
    : `${sidebarWidth} relative transition-all duration-300`; // Desktop: responsive width

  return (
    <>
      {/* Mobile backdrop - reduced blur for better performance */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 left-16 sm:left-20 bg-black/20 z-20"
          onClick={onClose}
        />
      )}

      <aside
        id="secondary-sidebar"
        className={`
          ${sidebarClasses}
          ${isOpen ? 'block' : 'hidden'}
          flex flex-col shadow-xl border-l ${moduleStyle.border}
          px-2 py-4
          ${moduleStyle.background}
          ${isMobile ? 'bg-white/98' : 'bg-white/95'}
          h-screen
          max-h-screen
        `}
      >
        {/* Control buttons - positioned to avoid search bar overlap */}
        <div className="absolute top-4 right-2 z-20 flex flex-col gap-1">
          {!isMobile && (
            <button
              className={`
                text-slate-600 hover:text-slate-800
                bg-white/90 hover:bg-white
                border border-slate-200/50 hover:border-slate-300
                shadow-sm hover:shadow-md
                p-1.5 rounded-lg
                transition-all duration-200
                hover:scale-105
                focus:outline-none focus:ring-2 focus:ring-slate-400/50
              `}
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? "Expand menu" : "Minimize menu"}
            >
              {isMinimized ? <ChevronRightIcon className="w-3 h-3" /> : <ChevronLeftIcon className="w-3 h-3" />}
            </button>
          )}
        </div>
        
        {/* Close button - Distinctive red X floating at the tip */}
        <button
          className="absolute -top-1 -right-1 z-30 text-red-600 hover:text-red-800 hover:bg-red-100 p-1.5 rounded-full bg-white shadow-lg border border-red-200 transition-all duration-200 hover:scale-110 hover:shadow-xl"
          onClick={onClose}
          title="Close sidebar"
        >
          <XIcon className="w-3 h-3" />
        </button>
        
        {/* Search bar - hidden when minimized */}
        {!isMinimized && (
          <div className="mb-4 flex-shrink-0 relative z-10">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('common:search')}
              className={`
                w-full rounded-lg bg-white/80
                border ${moduleStyle.border} 
                ${moduleStyle.accent} 
                px-3 py-1.5 
                focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50
                placeholder-slate-500
                shadow-sm
                text-sm
              `}
            />
          </div>
        )}
        
        {/* Navigation content - Scrollable area for menu items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 relative z-10 min-h-0">
          <ul className={`space-y-1 ${isMinimized ? 'items-center' : ''} pb-4`}>
            {filterItems(subMenus).map(item => (
              <li key={item.name}>
                {item.isGroup && item.children ? (
                  <div className="relative group">
                    <button
                      onClick={() => !isMinimized && toggleGroup(item.name)}
                      className={`
                        flex items-center ${isMinimized ? 'justify-center w-full px-1 py-2' : 'justify-between w-full px-2 py-1'} 
                        text-xs uppercase tracking-wider 
                        ${moduleStyle.accent} font-bold 
                        focus:outline-none ${moduleStyle.hover} 
                        rounded transition-colors
                        bg-white/10
                        ${isMinimized ? 'min-h-[2rem]' : ''}
                      `}
                      title={isMinimized ? t(item.name) : undefined}
                    >
                      <span className={`flex items-center ${isMinimized ? 'justify-center' : 'gap-2'}`}>
                        <IconWrapper 
                          icon={item.icon} 
                          moduleKey={moduleKey} 
                          isMinimized={isMinimized}
                        />
                        {!isMinimized && <span className="truncate text-xs">{t(item.name)}</span>}
                      </span>
                      {!isMinimized && <span className="flex-shrink-0 text-xs">{openGroups[item.name] ? '▼' : '▶'}</span>}
                    </button>
                    {/* Tooltip for group items */}
                    {isMinimized && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50">
                        {t(item.name)}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-b-[4px] border-r-[6px] border-t-transparent border-b-transparent border-r-slate-800"></div>
                      </div>
                    )}
                    {openGroups[item.name] && !isMinimized && (
                      <ul className="space-y-1 mt-1">
                        {item.children.map((child: any) => (
                          <li key={child.name}>
                            <NavLink
                              to={child.path}
                              className={({ isActive, isPending }) =>
                                `flex items-center gap-2 px-3 py-1.5 border border-transparent transition-all duration-200 rounded-lg ${
                                  isActive
                                    ? `${moduleStyle.activeLink} font-semibold shadow-sm`
                                    : isPending
                                      ? `${moduleStyle.hoverLink} bg-white/20`
                                      : `text-slate-700 ${moduleStyle.hoverLink} hover:shadow-md bg-white/5 hover:bg-white/20`
                                }`
                              }
                            >
                              <IconWrapper 
                                icon={child.icon} 
                                moduleKey={moduleKey}
                              />
                              <span className="font-medium text-sm truncate">{t(child.name)}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="relative group">
                    <NavLink
                      to={item.path}
                      className={({ isActive, isPending }) =>
                        `flex items-center ${isMinimized ? 'justify-center px-1 py-2 min-h-[2rem]' : 'gap-2 px-3 py-1.5'} border border-transparent transition-all duration-200 rounded-lg ${
                          isActive
                            ? `${moduleStyle.activeLink} font-semibold shadow-sm`
                            : isPending
                              ? `${moduleStyle.hoverLink} bg-white/20`
                              : `text-slate-700 ${moduleStyle.hoverLink} hover:shadow-md bg-white/5 hover:bg-white/20`
                        }`
                      }
                      title={isMinimized ? t(item.name) : undefined}
                    >
                      <IconWrapper 
                        icon={item.icon} 
                        moduleKey={moduleKey} 
                        isMinimized={isMinimized}
                      />
                      {!isMinimized && <span className="font-medium text-sm truncate">{t(item.name)}</span>}
                    </NavLink>
                    {isMinimized && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50">
                          {t(item.name)}
                          <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-b-[4px] border-r-[6px] border-t-transparent border-b-transparent border-r-slate-800"></div>
                        </div>
                      )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        <style>{`
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(156, 163, 175, 0.5);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(156, 163, 175, 0.7);
          }
        `}</style>
      </aside>
    </>
  );
};

export default SecondarySidebar;