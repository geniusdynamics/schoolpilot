import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useRBAC } from '../hooks/useRBAC';
import { useAuth } from '../contexts/AuthContext';
import { FolderIcon, ChevronLeftIcon, ChevronRightIcon, BookOpenIcon, DocumentReportIcon, XIcon } from './ui/icons';
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

// Consistent icon wrapper component for standardized sizing
const IconWrapper: React.FC<{ 
  icon?: React.ComponentType<any>; 
  moduleKey: string; 
  className?: string;
  isMinimized?: boolean;
}> = ({ icon, moduleKey, className = "", isMinimized = false }) => {
  // Standardized icon size - consistent across all states
  const iconSize = isMinimized ? "w-5 h-5" : "w-5 h-5";
  const wrapperSize = isMinimized ? "w-8 h-8" : "w-6 h-6";
  
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
      background: 'bg-gradient-to-br from-teal-500/10 via-teal-400/8 to-teal-600/12',
      border: 'border-teal-400/20',
      accent: 'text-teal-600',
      hover: 'hover:bg-teal-500/15',
      activeLink: 'border-teal-400 text-teal-600 bg-teal-50/80',
      hoverLink: 'hover:bg-teal-100/60 hover:text-teal-800'
    },
    nutrition: {
      background: 'bg-gradient-to-br from-pink-500/10 via-pink-400/8 to-pink-600/12',
      border: 'border-pink-400/20',
      accent: 'text-pink-600',
      hover: 'hover:bg-pink-500/15',
      activeLink: 'border-pink-400 text-pink-600 bg-pink-50/80',
      hoverLink: 'hover:bg-pink-100/60 hover:text-pink-800'
    },
    reports: {
      background: 'bg-gradient-to-br from-indigo-500/10 via-indigo-400/8 to-indigo-600/12',
      border: 'border-indigo-400/20',
      accent: 'text-indigo-600',
      hover: 'hover:bg-indigo-500/15',
      activeLink: 'border-indigo-400 text-indigo-600 bg-indigo-50/80',
      hoverLink: 'hover:bg-indigo-100/60 hover:text-indigo-800'
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

  return colorSchemes[moduleKey as keyof typeof colorSchemes] || {
    background: 'bg-gradient-to-br from-slate-500/10 via-slate-400/8 to-slate-600/12',
    border: 'border-slate-400/20',
    accent: 'text-slate-600',
    hover: 'hover:bg-slate-500/15',
    activeLink: 'border-slate-400 text-slate-600 bg-slate-50/80',
    hoverLink: 'hover:bg-slate-100/60 hover:text-slate-800'
  };
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

  // Responsive behavior: auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024); // lg breakpoint
      
      // Auto-minimize on medium screens (768-1024px)
      if (width >= 768 && width < 1024) {
        setIsMinimized(true);
      } else if (width >= 1024) {
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

  // Determine sidebar width and behavior based on state
  const sidebarWidth = isMinimized ? 'w-16' : 'w-48';
  const sidebarClasses = isMobile
    ? 'w-48 fixed inset-y-0 left-0 z-30 shadow-2xl' // Mobile: fixed overlay positioning
    : `${sidebarWidth} relative transition-all duration-300`; // Desktop: responsive width

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20"
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
          ${isMobile ? 'bg-white/95 backdrop-blur-md' : 'lg:backdrop-blur-lg backdrop-blur-sm'}
          h-screen
          max-h-screen
          ${!isMobile ? 'before:absolute before:inset-0 before:bg-white/40 before:backdrop-blur-sm before:rounded-l-lg before:pointer-events-none' : ''}
        `}
      >
        {/* Control buttons - positioned to avoid search bar overlap */}
        <div className="absolute top-4 right-2 z-20 flex flex-col gap-1">
          {!isMobile && (
            <button
              className={`
                text-slate-600 hover:text-slate-800
                bg-white/90 hover:bg-white
                backdrop-blur-sm
                border border-slate-200/50 hover:border-slate-300
                shadow-sm hover:shadow-md
                p-2 rounded-lg
                transition-all duration-200
                hover:scale-105
                focus:outline-none focus:ring-2 focus:ring-slate-400/50
              `}
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? "Expand menu" : "Minimize menu"}
            >
              {isMinimized ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
            </button>
          )}
        </div>
        
        {/* Close button - Distinctive red X floating at the tip */}
        <button
          className="absolute -top-1 -right-1 z-30 text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-full bg-white shadow-lg border border-red-200 transition-all duration-200 hover:scale-110 hover:shadow-xl"
          onClick={onClose}
          title="Close sidebar"
        >
          <XIcon className="w-4 h-4" />
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
                w-full rounded-lg bg-white/80 backdrop-blur-sm 
                border ${moduleStyle.border} 
                ${moduleStyle.accent} 
                px-3 py-1.5 
                focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50
                placeholder-slate-500
                shadow-sm
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
                  <div>
                    <button
                      onClick={() => !isMinimized && toggleGroup(item.name)}
                      className={`
                        flex items-center ${isMinimized ? 'justify-center w-full px-1 py-2' : 'justify-between w-full px-2 py-1'} 
                        text-xs uppercase tracking-wider 
                        ${moduleStyle.accent} font-bold 
                        focus:outline-none ${moduleStyle.hover} 
                        rounded transition-colors
                        backdrop-blur-sm bg-white/10
                        ${isMinimized ? 'min-h-[2.5rem]' : ''}
                      `}
                      title={isMinimized ? t(item.name) : undefined}
                    >
                      <span className={`flex items-center ${isMinimized ? 'justify-center' : 'gap-2'}`}>
                        <IconWrapper 
                          icon={item.icon} 
                          moduleKey={moduleKey} 
                          isMinimized={isMinimized}
                        />
                        {!isMinimized && <span className="truncate">{t(item.name)}</span>}
                      </span>
                      {!isMinimized && <span className="flex-shrink-0">{openGroups[item.name] ? '\u25be' : '\u25b8'}</span>}
                    </button>
                    {openGroups[item.name] && !isMinimized && (
                      <ul className="space-y-1 mt-1">
                        {item.children.map((child: any) => (
                          <li key={child.name}>
                            <NavLink
                              to={child.path}
                              className={({ isActive, isPending }) =>
                                `flex items-center gap-3 px-3 py-2 border border-transparent transition-all duration-200 rounded-lg backdrop-blur-sm ${
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
                  <NavLink
                    to={item.path}
                    className={({ isActive, isPending }) =>
                      `flex items-center ${isMinimized ? 'justify-center px-1 py-2 min-h-[2.5rem]' : 'gap-3 px-3 py-2'} border border-transparent transition-all duration-200 rounded-lg backdrop-blur-sm ${
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
                )}
              </li>
            ))}
          </ul>
        </div>
        
        <style>{`
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(100, 116, 139, 0.8) rgba(241, 245, 249, 0.2);
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 10px;
            background: rgba(241, 245, 249, 0.2);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.3);
            border-radius: 10px;
            margin: 4px 0;
            border: 1px solid rgba(148, 163, 184, 0.2);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg,
              rgba(100, 116, 139, 0.7) 0%,
              rgba(71, 85, 105, 0.8) 50%,
              rgba(51, 65, 85, 0.9) 100%
            );
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg,
              rgba(71, 85, 105, 0.8) 0%,
              rgba(51, 65, 85, 0.9) 50%,
              rgba(30, 41, 59, 1) 100%
            );
            border-color: rgba(255, 255, 255, 0.4);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
            transform: scaleX(1.2);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:active {
            background: linear-gradient(135deg,
              rgba(51, 65, 85, 0.9) 0%,
              rgba(30, 41, 59, 1) 50%,
              rgba(15, 23, 42, 1) 100%
            );
            transform: scaleX(1.3);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
          }
          .custom-scrollbar::-webkit-scrollbar-corner {
            background: transparent;
          }
        `}</style>
      </aside>
    </>
  );
};

export default SecondarySidebar;