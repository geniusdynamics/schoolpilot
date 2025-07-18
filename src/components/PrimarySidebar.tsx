import React, { useState, useEffect } from 'react';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useRBAC } from '../hooks/useRBAC';
import { useAuth } from '../contexts/AuthContext';

// Enhanced module-specific styling with badge/label support
const getModuleStyle = (moduleKey: string, isSelected: boolean) => {
  const colorSchemes = {
    'navigation:dashboard': {
      base: 'bg-blue-500/20 border-blue-400/30 hover:bg-blue-500/30',
      selected: 'bg-blue-500/40 border-blue-300/50 shadow-blue-500/30',
      iconColor: 'text-blue-400',
      badgeColor: 'bg-blue-500 text-white border-blue-400/50'
    },
    'navigation:administration.title': {
      base: 'bg-purple-500/20 border-purple-400/30 hover:bg-purple-500/30',
      selected: 'bg-purple-500/40 border-purple-300/50 shadow-purple-500/30',
      iconColor: 'text-purple-400',
      badgeColor: 'bg-purple-500 text-white border-purple-400/50'
    },
    'navigation:academics.title': {
      base: 'bg-green-500/20 border-green-400/30 hover:bg-green-500/30',
      selected: 'bg-green-500/40 border-green-300/50 shadow-green-500/30',
      iconColor: 'text-green-400',
      badgeColor: 'bg-green-500 text-white border-green-400/50'
    },
    'navigation:finance.title': {
      base: 'bg-yellow-500/20 border-yellow-400/30 hover:bg-yellow-500/30',
      selected: 'bg-yellow-500/40 border-yellow-300/50 shadow-yellow-500/30',
      iconColor: 'text-yellow-400',
      badgeColor: 'bg-yellow-500 text-white border-yellow-400/50'
    },
    'navigation:hr.title': {
      base: 'bg-red-500/20 border-red-400/30 hover:bg-red-500/30',
      selected: 'bg-red-500/40 border-red-300/50 shadow-red-500/30',
      iconColor: 'text-red-400',
      badgeColor: 'bg-red-500 text-white border-red-400/50'
    },
    'navigation:inventory.title': {
      base: 'bg-orange-500/20 border-orange-400/30 hover:bg-orange-500/30',
      selected: 'bg-orange-500/40 border-orange-300/50 shadow-orange-500/30',
      iconColor: 'text-orange-400',
      badgeColor: 'bg-orange-500 text-white border-orange-400/50'
    },
    'navigation:library.title': {
      base: 'bg-teal-500/20 border-teal-400/30 hover:bg-teal-500/30',
      selected: 'bg-teal-500/40 border-teal-300/50 shadow-teal-500/30',
      iconColor: 'text-teal-400',
      badgeColor: 'bg-teal-500 text-white border-teal-400/50'
    },
    'navigation:nutrition.title': {
      base: 'bg-pink-500/20 border-pink-400/30 hover:bg-pink-500/30',
      selected: 'bg-pink-500/40 border-pink-300/50 shadow-pink-500/30',
      iconColor: 'text-pink-400',
      badgeColor: 'bg-pink-500 text-white border-pink-400/50'
    },
    'navigation:reports.title': {
      base: 'bg-indigo-500/20 border-indigo-400/30 hover:bg-indigo-500/30',
      selected: 'bg-indigo-500/40 border-indigo-300/50 shadow-indigo-500/30',
      iconColor: 'text-indigo-400',
      badgeColor: 'bg-indigo-500 text-white border-indigo-400/50'
    },
    'navigation:settings.title': {
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

// Helper function to extract display name from navigation key
const getDisplayName = (navigationKey: string): string => {
  // Remove 'navigation:' prefix and '.title' suffix, then format
  return navigationKey
    .replace('navigation:', '')
    .replace('.title', '')
    .split('.')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const PrimarySidebar: React.FC<{ selectedModuleKey: string; onModuleSelect: (key: string) => void }> = ({ selectedModuleKey, onModuleSelect }) => {
  const { navigationItems, isLoading } = useDynamicNavigation(true);
  const { /* accessibleModules */ } = useRBAC();
  const { /* user */ } = useAuth();
  const [isMouseNearSidebar, setIsMouseNearSidebar] = useState(false);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const mainModules = navigationItems.filter(item => item.isGroup);

  useEffect(() => {
    if (isLoading) return;

    if (navigationItems.length === 0) {
      console.warn('⚠️ [PrimarySidebar] No navigation items found');
    }
  }, [isLoading, navigationItems.length]);


  // Track mouse position to determine if user is near sidebar area
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Consider mouse "near sidebar" if within 300px from left edge
      const isNearSidebar = e.clientX <= 300;
      setIsMouseNearSidebar(isNearSidebar);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Handle module hover states
  const handleModuleMouseEnter = (moduleKey: string) => {
    setHoveredModule(moduleKey);
  };

  const handleModuleMouseLeave = () => {
    setHoveredModule(null);
  };

  return (
    <aside className={`
      flex flex-col items-center min-h-full w-20
      bg-gradient-to-b from-slate-900/80 via-slate-800/70 to-slate-900/80
      backdrop-blur-xl
      border-r border-white/10
      shadow-2xl shadow-black/20
      rounded-r-3xl
      py-6
      relative
      before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:to-transparent before:rounded-r-3xl before:pointer-events-none
      ${isMouseNearSidebar ? 'sidebar-active' : 'sidebar-inactive'}
    `}>
      {/* Content container - no internal scrolling */}
      <div className="flex flex-col gap-3 w-full items-center relative z-10 px-2">
        {mainModules.map(item => {
          const isSelected = selectedModuleKey === item.name;
          const isHovered = hoveredModule === item.name;
          const isAnotherModuleHovered = hoveredModule && hoveredModule !== item.name;
          const { backgroundStyle, iconColor, badgeColor } = getModuleStyle(item.name, isSelected);
          const displayName = getDisplayName(item.name);

          return (
            <div
              key={item.name}
              className="relative group/item flex-shrink-0"
              onMouseEnter={() => handleModuleMouseEnter(item.name)}
              onMouseLeave={handleModuleMouseLeave}
            >
              {/* Badge/Label - with smart visibility based on mouse proximity */}
              <div className={`
                absolute bottom-12 left-1/2 transform -translate-x-1/2 -translate-y-2
                px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap
                backdrop-blur-md border
                shadow-lg shadow-black/20
                transition-all duration-500 ease-out
                pointer-events-none z-30
                ${badgeColor}
                ${(() => {
                  if (isSelected) {
                    // Selected badge: hide when another module is hovered
                    if (isAnotherModuleHovered) {
                      return 'opacity-0 translate-y-1 scale-95';
                    }
                    // Normal selected state based on mouse proximity
                    return `opacity-100 translate-y-0 scale-100 ${isMouseNearSidebar ? '' : 'opacity-30'}`;
                  } else {
                    // Non-selected badge: show only when this specific module is hovered
                    if (isHovered && isMouseNearSidebar) {
                      return 'opacity-100 -translate-y-2 scale-100';
                    }
                    return 'opacity-0 translate-y-1 scale-95';
                  }
                })()}
              `}>
                {displayName}

                {/* Arrow pointing down to the icon - adjusted for new position */}
                <div className={`
                  absolute top-full left-1/2 transform -translate-x-1/2 translate-y-1
                  w-0 h-0 border-l-3 border-r-3 border-t-3
                  border-l-transparent border-r-transparent
                  transition-opacity duration-500
                  ${badgeColor.includes('bg-blue') ? 'border-t-blue-500' : ''}
                  ${badgeColor.includes('bg-purple') ? 'border-t-purple-500' : ''}
                  ${badgeColor.includes('bg-green') ? 'border-t-green-500' : ''}
                  ${badgeColor.includes('bg-yellow') ? 'border-t-yellow-500' : ''}
                  ${badgeColor.includes('bg-red') ? 'border-t-red-500' : ''}
                  ${badgeColor.includes('bg-orange') ? 'border-t-orange-500' : ''}
                  ${badgeColor.includes('bg-teal') ? 'border-t-teal-500' : ''}
                  ${badgeColor.includes('bg-pink') ? 'border-t-pink-500' : ''}
                  ${badgeColor.includes('bg-indigo') ? 'border-t-indigo-500' : ''}
                  ${badgeColor.includes('bg-gray') ? 'border-t-gray-500' : ''}
                  ${badgeColor.includes('bg-slate') ? 'border-t-slate-500' : ''}
                `} style={{
                  borderLeftWidth: '3px',
                  borderRightWidth: '3px',
                  borderTopWidth: '3px'
                }} />
              </div>

              <button
                onClick={() => onModuleSelect(item.name)}
                className={`
                  group relative flex items-center justify-center
                  w-14 h-14 rounded-2xl
                  backdrop-blur-md
                  ${backgroundStyle}
                  border
                  shadow-lg shadow-black/10
                  hover:shadow-xl hover:shadow-black/20
                  transition-all duration-300 ease-out
                  focus:outline-none focus:ring-2 focus:ring-white/30
                  ${isSelected ? 'shadow-xl scale-105' : 'hover:scale-105'}
                `}
                title={displayName}
              >
                {/* Enhanced glass overlay for selected state */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
                )}

                {/* Selection indicator - subtle glow ring */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-white/30 ring-offset-2 ring-offset-transparent pointer-events-none" />
                )}

                {/* Icon with dynamic coloring */}
                <span className={`
                  relative z-10 transition-all duration-300
                  group-hover:scale-110 ${iconColor}
                  ${isSelected ? 'drop-shadow-lg' : 'drop-shadow-sm'}
                `}>
                  {item.icon
                    ? React.createElement(item.icon, {
                        className: `w-7 h-7 transition-all duration-300 ${
                          isSelected ? 'filter brightness-110' : 'group-hover:text-white'
                        }`
                      })
                    : <span className="w-7 h-7 bg-gray-500 rounded-full" />
                  }
                </span>

                <span className="sr-only">{displayName}</span>
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default PrimarySidebar;