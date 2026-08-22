import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useRBAC } from '../hooks/useRBAC';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { i18nReady } from '../i18n/i18n';
import { logger } from '@/utils/logging';

// Error boundary for PrimarySidebar
class PrimarySidebarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ðŸ”¥ [PrimarySidebar] Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <aside className="flex flex-col items-center min-h-full w-16 sm:w-20 bg-slate-900/95 border-r border-white/10 py-4">
          <div className="text-red-400 text-xs text-center p-4">Sidebar Error</div>
        </aside>
      );
    }
    return this.props.children;
  }
}

// Enhanced module-specific styling with badge/label support
const getModuleStyle = (moduleKey: string, isSelected: boolean) => {
  const colorSchemes = {
    dashboard: {
      base: 'bg-blue-500/20 border-blue-400/30 hover:bg-blue-500/30',
      selected: 'bg-blue-500/40 border-blue-300/50 shadow-blue-500/30',
      iconColor: 'text-blue-400',
      badgeColor: 'bg-blue-500 text-white border-blue-400/50'
    },
    administration: {
      base: 'bg-purple-500/20 border-purple-400/30 hover:bg-purple-500/30',
      selected: 'bg-purple-500/40 border-purple-300/50 shadow-purple-500/30',
      iconColor: 'text-purple-400',
      badgeColor: 'bg-purple-500 text-white border-purple-400/50'
    },
    academics: {
      base: 'bg-green-500/20 border-green-400/30 hover:bg-green-500/30',
      selected: 'bg-green-500/40 border-green-300/50 shadow-green-500/30',
      iconColor: 'text-green-400',
      badgeColor: 'bg-green-500 text-white border-green-400/50'
    },
    finance: {
      base: 'bg-yellow-500/20 border-yellow-400/30 hover:bg-yellow-500/30',
      selected: 'bg-yellow-500/40 border-yellow-300/50 shadow-yellow-500/30',
      iconColor: 'text-yellow-400',
      badgeColor: 'bg-yellow-500 text-white border-yellow-400/50'
    },
    hr: {
      base: 'bg-red-500/20 border-red-400/30 hover:bg-red-500/30',
      selected: 'bg-red-500/40 border-red-300/50 shadow-red-500/30',
      iconColor: 'text-red-400',
      badgeColor: 'bg-red-500 text-white border-red-400/50'
    },
    inventory: {
      base: 'bg-orange-500/20 border-orange-400/30 hover:bg-orange-500/30',
      selected: 'bg-orange-500/40 border-orange-300/50 shadow-orange-500/30',
      iconColor: 'text-orange-400',
      badgeColor: 'bg-orange-500 text-white border-orange-400/50'
    },
    library: {
      base: 'bg-teal-500/20 border-teal-400/30 hover:bg-teal-500/30',
      selected: 'bg-teal-500/40 border-teal-300/50 shadow-teal-500/30',
      iconColor: 'text-teal-400',
      badgeColor: 'bg-teal-500 text-white border-teal-400/50'
    },
    nutrition: {
      base: 'bg-pink-500/20 border-pink-400/30 hover:bg-pink-500/30',
      selected: 'bg-pink-500/40 border-pink-300/50 shadow-pink-500/30',
      iconColor: 'text-pink-400',
      badgeColor: 'bg-pink-500 text-white border-pink-400/50'
    },
    reports: {
      base: 'bg-indigo-500/20 border-indigo-400/30 hover:bg-indigo-500/30',
      selected: 'bg-indigo-500/40 border-indigo-300/50 shadow-indigo-500/30',
      iconColor: 'text-indigo-400',
      badgeColor: 'bg-indigo-500 text-white border-indigo-400/50'
    },
    settings: {
      base: 'bg-gray-500/20 border-gray-400/30 hover:bg-gray-500/30',
      selected: 'bg-gray-500/40 border-gray-300/50 shadow-gray-500/30',
      iconColor: 'text-gray-400',
      badgeColor: 'bg-gray-500 text-white border-gray-400/50'
    }
  };

  const scheme = colorSchemes[moduleKey as keyof typeof colorSchemes] || {
    base: 'bg-slate-500/20 border-slate-400/30 hover:bg-slate-500/30',
    selected: 'bg-slate-500/40 border-slate-300/50 shadow-slate-500/30',
    iconColor: 'text-slate-400',
    badgeColor: 'bg-slate-500 text-white border-slate-400/50'
  };

  return {
    backgroundStyle: isSelected ? scheme.selected : scheme.base,
    iconColor: isSelected ? scheme.iconColor : 'text-white/70 hover:text-white',
    badgeColor: scheme.badgeColor
  };
};

// Helper function to get module key from navigation key
const getModuleKey = (navigationKey: string): string => {
  if (!navigationKey || typeof navigationKey !== 'string') return 'unknown';
  return navigationKey
    .replace('navigation:', '')
    .replace('.title', '')
    .split('.')[0] || 'unknown';
};

const getModuleIdFromItem = (item: any): string => {
  const fromModulePath = typeof item?.modulePath === 'string' ? item.modulePath : '';
  const fromPath = typeof item?.path === 'string' ? item.path : '';
  const rawName = typeof item?.name === 'string' ? item.name : '';

  const modulePath = fromModulePath || fromPath;
  if (modulePath.startsWith('/')) {
    const segment = modulePath.replace(/^\/+/, '').split('/')[0];
    if (segment) {
      return segment;
    }
  }

  return getModuleKey(rawName);
};

const handleModuleClick = (moduleId: string, onModuleSelect: (key: string) => void) => {
  try {
    onModuleSelect(moduleId);
  } catch (error) {
    logger.error('ðŸ”¥ [PrimarySidebar] Error selecting module:', error);
  }
};

// Main component with fixed hook order
const PrimarySidebarContent: React.FC<{ 
  selectedModuleKey: string; 
  onModuleSelect: (key: string) => void; 
  collapsed?: boolean;
}> = ({ selectedModuleKey, onModuleSelect, collapsed }) => {
  // CRITICAL: All hooks MUST be called in the exact same order every render
  // No conditional hooks, no early returns before all hooks are called
  
  // 1. Custom hooks (always called first)
  const { navigationItems = [], isLoading = true } = useDynamicNavigation(true) || {};
  const { accessibleModules = [] } = useRBAC() || {};
  const { user = null } = useAuth() || {};
  const { t, i18n } = useTranslation('navigation', { useSuspense: false });
  
  // 2. State hooks (always called in same order)
  const [isMouseNearSidebar, setIsMouseNearSidebar] = useState(false);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(1024); // SSR-safe default
  const [isClient, setIsClient] = useState(false);
  
  // 3. Memoized values (always called in same order)
  const safeNavigationItems = useMemo(() => {
    return Array.isArray(navigationItems) ? navigationItems : [];
  }, [navigationItems]);
  
  const mainModules = useMemo(() => {
    return safeNavigationItems.filter(item => 
      item && 
      typeof item === 'object' && 
      item.isGroup && 
      item.name
    );
  }, [safeNavigationItems]);
  
  const isTranslationReady = useMemo(() => {
    return Boolean(i18nReady) && typeof t === 'function';
  }, [t]);
  
  // 4. Callback functions (always called in same order)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isClient) return;
    const isNear = e.clientX <= 300;
    setIsMouseNearSidebar(isNear);
  }, [isClient]);
  
  const handleWindowResize = useCallback(() => {
    if (!isClient) return;
    setWindowWidth(window.innerWidth);
  }, [isClient]);
  
  const handleModuleMouseEnter = useCallback((moduleKey: string) => {
    setHoveredModule(moduleKey);
  }, []);
  
  const handleModuleMouseLeave = useCallback(() => {
    setHoveredModule(null);
  }, []);
  
  const handleModuleSelection = useCallback((moduleId: string) => {
    if (typeof moduleId === 'string' && moduleId.length > 0 && typeof onModuleSelect === 'function') {
      handleModuleClick(moduleId, onModuleSelect);
    }
  }, [onModuleSelect]);
  
  // 5. Effects (always called in same order)
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
    }
  }, []);
  
  useEffect(() => {
    if (!isClient) return;
    
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove, isClient]);
  
  useEffect(() => {
    if (!isClient) return;
    
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [handleWindowResize, isClient]);
  
  // 6. Render functions (always called in same order)
  const renderModuleItem = useCallback((item: any, index: number) => {
    // Safe property access with null checks
    const itemName = item?.name || `unknown-${index}`;
    const moduleId = getModuleIdFromItem(item);
    const isSelected = selectedModuleKey === moduleId;
    const isHovered = hoveredModule === moduleId;
    
    const fallbackName = moduleId.charAt(0).toUpperCase() + moduleId.slice(1);
    
    let displayName = fallbackName;
    if (isTranslationReady) {
      try {
        const translated = t(`${moduleId}.title`, { defaultValue: fallbackName });
        displayName = translated || fallbackName;
      } catch (error) {
        logger.warn('Translation error for:', moduleId, error);
        displayName = fallbackName;
      }
    }
    
    const { backgroundStyle, iconColor, badgeColor } = getModuleStyle(moduleId, isSelected);
    
    // Badge visibility logic (simplified)
    const badgeVisible = isSelected || (isHovered && isMouseNearSidebar) || (windowWidth < 1024 && isHovered);
    const badgeClasses = badgeVisible 
      ? 'opacity-100 translate-y-0 scale-100' 
      : 'opacity-0 translate-y-1 scale-95';
    
    // Border color logic (simplified)
    const getBorderColor = () => {
      const colorMap: Record<string, string> = {
        'bg-blue': 'border-t-blue-500',
        'bg-purple': 'border-t-purple-500',
        'bg-green': 'border-t-green-500',
        'bg-yellow': 'border-t-yellow-500',
        'bg-red': 'border-t-red-500',
        'bg-orange': 'border-t-orange-500',
        'bg-teal': 'border-t-teal-500',
        'bg-pink': 'border-t-pink-500',
        'bg-indigo': 'border-t-indigo-500',
        'bg-gray': 'border-t-gray-500',
        'bg-slate': 'border-t-slate-500'
      };
      
      for (const [key, value] of Object.entries(colorMap)) {
        if (badgeColor.includes(key)) return value;
      }
      return 'border-t-gray-500';
    };

    return (
      <div
        key={itemName}
        className="relative group/item flex-shrink-0"
        onMouseEnter={() => handleModuleMouseEnter(moduleId)}
        onMouseLeave={handleModuleMouseLeave}
      >
        {/* Badge/Label - responsive positioning and mobile-friendly */}
        <div className={`
          absolute bottom-10 sm:bottom-12 left-1/2 transform -translate-x-1/2 -translate-y-2
          px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-xs font-medium whitespace-nowrap
          backdrop-blur-md border
          shadow-lg shadow-black/20
          transition-all duration-500 ease-out
          pointer-events-none z-30
          max-w-[120px] sm:max-w-none truncate
          ${badgeColor}
          ${badgeClasses}
        `}>
          {displayName}

          {/* Arrow pointing down to the icon - adjusted for new position */}
          <div className={`
            absolute top-full left-1/2 transform -translate-x-1/2 translate-y-1
            w-0 h-0 border-l-3 border-r-3 border-t-3
            border-l-transparent border-r-transparent
            transition-opacity duration-500
            ${getBorderColor()}
          `} style={{
            borderLeftWidth: '3px',
            borderRightWidth: '3px',
            borderTopWidth: '3px'
          }} />
        </div>

        <button
          onClick={() => handleModuleSelection(moduleId)}
          onTouchStart={() => handleModuleMouseEnter(moduleId)}
          onTouchEnd={() => handleModuleMouseLeave()}
          className={`
            group relative flex items-center justify-center
            w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl
            backdrop-blur-md
            ${backgroundStyle}
            border
            shadow-lg shadow-black/10
            hover:shadow-xl hover:shadow-black/20
            active:scale-95 sm:active:scale-100
            transition-all duration-300 ease-out
            focus:outline-none focus:ring-2 focus:ring-white/30
            touch-manipulation
            ${isSelected ? 'shadow-xl scale-105' : 'hover:scale-105'}
          `}
          title={displayName}
          aria-label={displayName}
          type="button"
        >
          {/* Enhanced glass overlay for selected state */}
          {isSelected && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
          )}

          {/* Selection indicator - subtle glow ring */}
          {isSelected && (
            <div className="absolute inset-0 rounded-2xl ring-2 ring-white/30 ring-offset-2 ring-offset-transparent pointer-events-none" />
          )}

          {/* Icon with dynamic coloring - responsive sizing */}
          <span className={`
            relative z-10 transition-all duration-300
            group-hover:scale-110 group-active:scale-95 ${iconColor || 'text-white/70'}
            ${isSelected ? 'drop-shadow-lg' : 'drop-shadow-sm'}
          `}>
            {item.icon && typeof item.icon === 'function'
              ? React.createElement(item.icon, {
                  className: `w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${
                    isSelected ? 'filter brightness-110' : 'group-hover:text-white'
                  }`
                })
              : <span className="w-5 h-5 sm:w-7 sm:h-7 bg-gray-500 rounded-full" />
            }
          </span>

          <span className="sr-only">{displayName}</span>
        </button>
      </div>
    );
  }, [selectedModuleKey, hoveredModule, handleModuleMouseEnter, handleModuleMouseLeave, handleModuleSelection, windowWidth, isMouseNearSidebar, isTranslationReady]);
  
  const sidebarClassName = useMemo(() => {
    return `
      fixed top-0 left-0 z-50
      flex flex-col items-center
      h-screen
      bg-gradient-to-b from-slate-900/95 via-slate-800/90 to-slate-900/95
      lg:backdrop-blur-xl md:backdrop-blur-sm
      border-r border-white/10
      shadow-2xl shadow-black/20
      pt-4 pb-4 sm:pt-4 sm:pb-6
      transition-all duration-300 ease-out
      ${isMouseNearSidebar ? 'sidebar-active' : 'sidebar-inactive'}
      ${collapsed ? 'w-0 overflow-hidden opacity-0' : 'w-16 sm:w-20'}
    `;
  }, [isMouseNearSidebar, collapsed]);

  // Loading state (no early return before all hooks)
  if (isLoading || !isClient) {
    return (
      <aside className={sidebarClassName}>
        <div className="flex flex-col gap-2 sm:gap-3 w-full items-center animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className={sidebarClassName}>
      {/* Content container - hidden when collapsed (fullwidth mode); pt-8 pushes first icon below floating TopOverflowMenu */}
      {!collapsed && (
        <div className="flex flex-col gap-2 sm:gap-3 w-full items-center overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 pt-8">
          {Array.isArray(mainModules) && mainModules.length > 0
            ? mainModules.map((module, index) => renderModuleItem(module, index))
            : <div className="text-white/50 text-xs text-center p-4">Loading modules...</div>
          }
        </div>
      )}

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </aside>
  );
};

// Main component with error boundary
const PrimarySidebar: React.FC<{ 
  selectedModuleKey: string; 
  onModuleSelect: (key: string) => void; 
  collapsed?: boolean;
}> = (props) => {
  return (
    <PrimarySidebarErrorBoundary>
      <PrimarySidebarContent {...props} />
    </PrimarySidebarErrorBoundary>
  );
};

export default PrimarySidebar;
