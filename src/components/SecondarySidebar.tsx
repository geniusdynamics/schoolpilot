import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useRBAC } from '../hooks/useRBAC';
import { useAuth } from '../contexts/AuthContext';
import { useTabNavigation } from '../hooks/useTabNavigation';
import { useToastHelpers } from '../hooks/useToast';
import { FolderIcon, ChevronLeftIcon, ChevronRightIcon, BookOpenIcon, DocumentReportIcon, XIcon, InformationCircleIcon } from './ui/icons';
import { useTranslation } from 'react-i18next';
import HookErrorBoundary from './HookErrorBoundary';
import { SidebarSkeleton } from './ModuleLoadingFallback';

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

// Enhanced icon wrapper component with improved mobile sizing and background blur for better visibility
const IconWrapper: React.FC<{ 
  icon?: React.ComponentType<any>; 
  moduleKey: string; 
  className?: string;
  isMinimized?: boolean;
  isMobile?: boolean;
}> = ({ icon, moduleKey, className = "", isMinimized = false, isMobile = false }) => {
  // Enhanced icon sizing for better mobile readability
  const iconSize = isMobile ? "w-5 h-5" : "w-4 h-4";
  const wrapperSize = isMinimized ? "w-5 h-5" : isMobile ? "w-6 h-6" : "w-5 h-5";
  
  return (
    <div className={`
      ${wrapperSize} 
      flex items-center justify-center 
      flex-shrink-0
      backdrop-blur-sm bg-white/20 rounded-md
      border border-white/10 shadow-sm
      transition-all duration-200
      ${className}
    `}>
      {icon 
        ? React.createElement(icon, { 
            className: `${iconSize} transition-all duration-200 relative z-10` 
          })
        : React.cloneElement(getFallbackIcon(moduleKey), {
            className: `${iconSize} transition-all duration-200 relative z-10`
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
  const { navigationItems, isLoading } = useDynamicNavigation(true); // Use dynamic navigation
  const { accessibleModules, hasModuleAccess } = useRBAC();
  const { user } = useAuth();
  const { navigateToTab } = useTabNavigation();
  const { showInfo, showError, showWarning } = useToastHelpers();
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const toggleGroup = useCallback((key: string) => {
    setOpenGroups(g => ({ ...g, [key]: !g[key] }));
  }, []); // No dependencies needed for state setter function

  // Pre-translate error messages to avoid hook violations
  const errorMessages = useMemo(() => ({
    tabLimit: 'Tab limit reached. Please close some tabs before opening new ones.',
    accessDenied: 'Access denied. You do not have permission to view this section.',
    notInitialized: 'System is still initializing. Please try again in a moment.',
    generalError: 'Failed to open tab. Please try again or contact support.',
    missingPath: 'Missing navigation path. Please report this issue.'
  }), []);

  // Handle navigation click with enhanced validation and error handling
  const handleNavigationClick = useCallback(async (item: any, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (!item.path) {
      showWarning(errorMessages.missingPath);
      return;
    }

    // Pre-translate item name to avoid hook violation in try-catch
    const itemTitle = t(item.name);

    try {
      // Extract module info from path
      const pathSegments = item.path.split('/');
      const pathModule = pathSegments[1] || '';
      const submodule = pathSegments[2] || undefined;

      // Basic path validation
      if (!pathModule) {
        throw new Error('Invalid navigation path structure');
      }

      // Check if the user has permission for this module
      const canAccessModule = hasModuleAccess(pathModule);
      if (!canAccessModule) {
        throw new Error(`You don't have permission to access ${pathModule}`);
      }

      // Try to create and navigate to tab
      const result = await navigateToTab(item.path, {
        title: itemTitle,
        icon: item.icon,
        module: pathModule,
        submodule,
        metadata: {
          source: 'secondary-sidebar',
          moduleKey: selectedModuleKey,
          userId: user?.id,
          timestamp: new Date().toISOString()
        },
        forceCreate: true
      });

      // Log successful navigation
      console.info('Tab navigation successful:', {
        path: item.path,
        module: pathModule,
        submodule,
        tabId: result.tabId,
        wasCreated: result.wasCreated
      });
      
      // Close sidebar on mobile after successful navigation
      if (isMobile) {
        onClose();
      }
      
      // Show success feedback if a new tab was created
      if (result.wasCreated) {
        showInfo(`Opened ${itemTitle} in new tab`);
      }
      
    } catch (error) {
      // Handle specific error types
      console.error('Navigation failed:', error);
      
      if (error.message.includes('Maximum tab limit')) {
        showError(errorMessages.tabLimit);
      } else if (error.message.includes('permission')) {
        showError(errorMessages.accessDenied);
      } else if (error.message.includes('not initialized')) {
        showError(errorMessages.notInitialized);
      } else {
        showError(errorMessages.generalError);
      }
      
      // Log detailed error for debugging
      console.error('Detailed navigation error:', {
        error,
        context: {
          path: item.path,
          module: pathModule,
          user: user?.id,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [hasModuleAccess, navigateToTab, t, user?.id, isMobile, onClose, showWarning, showInfo, showError, errorMessages]); // Stable dependencies

  // Memoize selected module and related data to prevent unnecessary recalculations
  const selectedModule = useMemo(() => {
    return navigationItems?.find(item => item.name === selectedModuleKey && item.isGroup);
  }, [navigationItems, selectedModuleKey]);
  
  const subMenus = useMemo(() => {
    return selectedModule && selectedModule.children ? selectedModule.children : [];
  }, [selectedModule]);
  
  const moduleKey = useMemo(() => {
    return selectedModuleKey.split(':')[1]?.split('.')[0] || '';
  }, [selectedModuleKey]);
  
  const moduleStyle = useMemo(() => {
    return getModuleStyle(moduleKey);
  }, [moduleKey]);

  // Enhanced responsive behavior with improved mobile breakpoints
  const handleResize = useCallback(() => {
    const width = window.innerWidth;
      const height = window.innerHeight;
      
      // More granular mobile detection for better UX
      setIsMobile(width < 1024); // lg breakpoint
      
      // Auto-minimize on medium screens (768-1200px) for better space utilization
      // Also consider device orientation and screen height for mobile devices
      if (width >= 768 && width < 1200) {
        setIsMinimized(true);
      } else if (width >= 1200) {
        setIsMinimized(false);
      }
      
      // For very small screens or landscape mobile, force minimize
      if (width < 640 || (width < 900 && height < 600)) {
        setIsMinimized(true);
      }
  }, []);

  useEffect(() => {
    handleResize(); // Check initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array - handleResize is stable

  // Enhanced keyboard navigation for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    const items = filterItems(subMenus);
    const maxIndex = items.length - 1;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => prev < maxIndex ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : maxIndex);
        break;
      case 'Escape':
        e.preventDefault();
        if (isMobile) {
          onClose();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex <= maxIndex) {
          const item = items[focusedIndex];
          if (item.children) {
            toggleGroup(item.name);
          }
        }
        break;
    }
  }, [isOpen, subMenus, isMobile, onClose, toggleGroup]); // Removed focusedIndex from dependencies

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

  // Filtered navigation based on search - memoized to prevent hook dependency issues
  const filterItems = useCallback((items: any[]) =>
    items.filter(item => {
      const itemName = typeof item.name === 'string' ? item.name : '';
      const itemLabel = t(itemName);
      const searchLower = search.toLowerCase();
      
      return (typeof itemLabel === 'string' && itemLabel.toLowerCase().includes(searchLower)) ||
        (item.children && item.children.some((child: any) => {
          const childName = typeof child.name === 'string' ? child.name : '';
          const childLabel = t(childName);
          return typeof childLabel === 'string' && childLabel.toLowerCase().includes(searchLower);
        }));
    }), [search]); // Removed unstable 't' dependency

  if (!selectedModule || !isOpen) {
    return null;
  }

  // Enhanced sidebar width and positioning for mobile optimization
  const sidebarWidth = isMinimized ? 'w-14' : 'w-52';
  const sidebarClasses = isMobile
    ? 'w-44 sm:w-24 fixed inset-y-0 left-14 sm:left-16 md:left-20 z-40 shadow-2xl' // Mobile: compact responsive positioning
    : `${sidebarWidth} relative transition-all duration-300 ease-in-out`; // Desktop: smoother transitions

  // Show loading fallback if modules are still loading
  if (isLoading || !navigationItems.length) {
    return <SidebarSkeleton />;
  }

  return (
    <HookErrorBoundary>
      {/* Mobile backdrop for click-to-close functionality without screen dimming */}
      {isMobile && (
        <div 
          className={`
            fixed inset-0 left-14 sm:left-16 md:left-20 z-30 transition-all duration-300 ease-in-out
            ${isOpen 
              ? 'bg-transparent opacity-100 pointer-events-auto mobile-fade-in' 
              : 'bg-transparent opacity-0 pointer-events-none mobile-fade-out'
            }
          `}
          onClick={isOpen ? onClose : undefined}
          onTouchStart={(e) => {
            if (isOpen) {
              e.preventDefault();
              onClose();
            }
          }}
          role={isOpen ? "button" : undefined}
          aria-label={isOpen ? "Close sidebar" : undefined}
          tabIndex={isOpen ? 0 : -1}
          onKeyDown={(e) => {
            if (isOpen && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) {
              e.preventDefault();
              onClose();
            }
          }}
        />
      )}

      <aside
        id="secondary-sidebar"
        className={`
          ${sidebarClasses}
          ${isOpen ? 'block transform translate-x-0 mobile-slide-in' : 'hidden transform -translate-x-full mobile-slide-out'}
          flex flex-col shadow-xl border-l ${moduleStyle.border}
          px-2 py-4
          ${moduleStyle.background}
          ${isMobile ? 'bg-white/98' : 'bg-white/95'}
          h-screen
          max-h-screen
          transition-transform duration-300 ease-in-out
        `}
        style={{
          willChange: isMobile ? 'transform' : 'auto'
        }}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
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
        
        {/* Enhanced close button with better mobile touch targets */}
        <button
          className={`
            absolute ${isMobile ? '-top-2 -right-2 w-10 h-10 p-2' : '-top-1 -right-1 w-8 h-8 p-1.5'} 
            z-40 text-red-600 hover:text-red-800 active:text-red-900
            hover:bg-red-100 active:bg-red-200
            rounded-full bg-white shadow-lg border border-red-200 
            transition-all duration-200 hover:scale-110 hover:shadow-xl
            focus:outline-none focus:ring-2 focus:ring-red-400/50
            touch-manipulation
          `}
          onClick={onClose}
          onTouchEnd={(e) => {
            e.preventDefault();
            onClose();
          }}
          title="Close sidebar"
          aria-label="Close sidebar"
        >
          <XIcon className={`${isMobile ? 'w-5 h-5' : 'w-3 h-3'}`} />
        </button>
        
        {/* Enhanced search bar with better mobile hierarchy */}
        {!isMinimized && (
          <div className="mb-3 sm:mb-4 flex-shrink-0 relative z-10">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('common:search')}
              className={`
                w-full rounded-lg bg-white/80
                border ${moduleStyle.border} 
                ${moduleStyle.accent} 
                ${isMobile ? 'px-4 py-4 text-base font-medium' : 'px-3 py-1.5 text-sm'}
                focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50
                focus:bg-white/90 focus:placeholder-slate-600
                placeholder-slate-500
                ${isMobile ? 'shadow-lg' : 'shadow-sm'}
                transition-all duration-200
                touch-manipulation
              `}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>
        )}
        
        {/* Enhanced navigation content with mobile-optimized scrolling */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 sm:pr-2 relative z-10 min-h-0">
          <ul className={`${isMobile ? 'space-y-2' : 'space-y-1'} ${isMinimized ? 'items-center' : ''} pb-4 sm:pb-6`}>
            {filterItems(subMenus).map(item => (
              <li key={item.name}>
                {item.isGroup && item.children ? (
                  <div className="relative group">
                    <button
                      onClick={() => !isMinimized && toggleGroup(item.name)}
                      onFocus={() => setFocusedIndex(filterItems(subMenus).indexOf(item))}
                      className={`
                        flex items-center ${isMinimized ? 'justify-center w-full px-1 py-2' : 'justify-between w-full px-3 py-2'} 
                        ${isMobile ? 'min-h-[3rem] text-sm' : 'text-xs'} uppercase tracking-wider 
                        ${moduleStyle.accent} font-bold 
                        focus:outline-none ${moduleStyle.hover} 
                        rounded transition-all duration-200
                        bg-white/10 hover:bg-white/20
                        ${isMinimized ? 'min-h-[2.5rem]' : ''}
                        touch-manipulation
                        focus:ring-2 focus:ring-current focus:ring-opacity-50
                        focus:bg-white/25 focus:scale-105
                        ${focusedIndex === filterItems(subMenus).indexOf(item) ? 'bg-white/25 ring-2 ring-current ring-opacity-50' : ''}
                      `}
                      title={isMinimized ? t(item.name) : undefined}
                      tabIndex={0}
                    >
                      <span className={`flex items-center ${isMinimized ? 'justify-center' : 'gap-2'}`}>
                        <IconWrapper 
                          icon={item.icon} 
                          moduleKey={moduleKey} 
                          isMinimized={isMinimized}
                          isMobile={isMobile}
                        />
                        {!isMinimized && <span className="truncate text-xs">{t(item.name)}</span>}
                      </span>
                      {!isMinimized && <span className="flex-shrink-0 text-xs">{openGroups[item.name] ? '▼' : '▶'}</span>}
                    </button>
                    {/* Enhanced tooltip for group items - hidden on mobile to avoid touch conflicts */}
                    {isMinimized && !isMobile && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50">
                          {t(item.name)}
                          <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-b-[4px] border-r-[6px] border-t-transparent border-b-transparent border-r-slate-800"></div>
                        </div>
                      )}
                    {openGroups[item.name] && !isMinimized && (
                      <ul className="space-y-1 mt-1">
                        {item.children.map((child: any) => (
                          <li key={child.name}>
                            <button
                              onClick={(e) => handleNavigationClick(child, e)}
                              onFocus={() => setFocusedIndex(filterItems(subMenus).findIndex(parentItem => parentItem.children?.includes(child)))}
                              className={`flex items-center gap-3 ${isMobile ? 'px-4 py-4 min-h-[3.5rem]' : 'px-3 py-2'} border border-transparent transition-all duration-200 rounded-lg text-slate-700 ${moduleStyle.hoverLink} hover:shadow-md bg-white/5 hover:bg-white/20 touch-manipulation focus:ring-2 focus:ring-current focus:ring-opacity-50 focus:bg-white/25 focus:scale-105 w-full text-left`}
                              tabIndex={0}
                            >
                              <IconWrapper 
                                icon={child.icon} 
                                moduleKey={moduleKey}
                                isMobile={isMobile}
                              />
                              <span className={`font-medium ${isMobile ? 'text-base leading-relaxed' : 'text-sm'} truncate`}>{t(child.name)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="relative group">
                    <button
                      onClick={(e) => handleNavigationClick(item, e)}
                      onFocus={() => setFocusedIndex(filterItems(subMenus).indexOf(item))}
                      className={`flex items-center ${isMinimized ? 'justify-center px-1 py-2 min-h-[2.5rem]' : isMobile ? 'gap-3 px-4 py-4 min-h-[3.5rem]' : 'gap-2 px-3 py-2'} border border-transparent transition-all duration-200 rounded-lg text-slate-700 ${moduleStyle.hoverLink} hover:shadow-md bg-white/5 hover:bg-white/20 touch-manipulation focus:ring-2 focus:ring-current focus:ring-opacity-50 focus:bg-white/25 focus:scale-105 ${focusedIndex === filterItems(subMenus).indexOf(item) ? 'bg-white/25 ring-2 ring-current ring-opacity-50' : ''} w-full text-left`}
                      title={isMinimized ? t(item.name) : undefined}
                      tabIndex={0}
                    >
                      <IconWrapper 
                        icon={item.icon} 
                        moduleKey={moduleKey} 
                        isMinimized={isMinimized}
                        isMobile={isMobile}
                      />
                      {!isMinimized && <span className={`font-medium ${isMobile ? 'text-base leading-relaxed' : 'text-sm'} truncate`}>{t(item.name)}</span>}
                    </button>
                    {/* Enhanced tooltip for standalone items - hidden on mobile */}
                    {isMinimized && !isMobile && (
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
            width: ${isMobile ? '8px' : '6px'};
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(156, 163, 175, ${isMobile ? '0.6' : '0.5'});
            border-radius: ${isMobile ? '4px' : '3px'};
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(156, 163, 175, 0.7);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:active {
            background-color: rgba(156, 163, 175, 0.8);
          }
          
          /* Enhanced touch scrolling and animations for mobile */
          @media (max-width: 1024px) {
            .custom-scrollbar {
              -webkit-overflow-scrolling: touch;
              scroll-behavior: smooth;
            }
            
            /* Mobile-optimized animations */
            .mobile-slide-in {
              animation: slideInFromLeft 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            
            .mobile-slide-out {
              animation: slideOutToLeft 0.25s cubic-bezier(0.55, 0.06, 0.68, 0.19);
            }
            
            .mobile-fade-in {
              animation: fadeIn 0.2s ease-out;
            }
            
            .mobile-fade-out {
              animation: fadeOut 0.15s ease-in;
            }
          }
          
          /* Keyframes for mobile animations */
          @keyframes slideInFromLeft {
            from {
              transform: translateX(-100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes slideOutToLeft {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(-100%);
              opacity: 0;
            }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          
          /* Reduce motion for users who prefer it */
          @media (prefers-reduced-motion: reduce) {
            .custom-scrollbar,
            .mobile-slide-in,
            .mobile-slide-out,
            .mobile-fade-in,
            .mobile-fade-out {
              animation: none !important;
              transition: none !important;
            }
          }
        `}</style>
      </aside>
    </HookErrorBoundary>
  );
};

export default SecondarySidebar;