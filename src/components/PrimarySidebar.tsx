import React, { useState, useEffect } from 'react';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useRBAC } from '../hooks/useRBAC';
import { useAuth } from '../contexts/AuthContext';

// Module-specific glassmorphism color schemes
const getModuleGlassStyle = (moduleKey: string, isSelected: boolean) => {
  const colorSchemes = {
    'navigation:dashboard': {
      base: 'bg-blue-500/20 border-blue-400/30 hover:bg-blue-500/30',
      selected: 'bg-blue-500/40 border-blue-300/50 shadow-blue-500/30'
    },
    'navigation:administration.title': {
      base: 'bg-purple-500/20 border-purple-400/30 hover:bg-purple-500/30',
      selected: 'bg-purple-500/40 border-purple-300/50 shadow-purple-500/30'
    },
    'navigation:academics.title': {
      base: 'bg-green-500/20 border-green-400/30 hover:bg-green-500/30',
      selected: 'bg-green-500/40 border-green-300/50 shadow-green-500/30'
    },
    'navigation:finance.title': {
      base: 'bg-yellow-500/20 border-yellow-400/30 hover:bg-yellow-500/30',
      selected: 'bg-yellow-500/40 border-yellow-300/50 shadow-yellow-500/30'
    },
    'navigation:hr.title': {
      base: 'bg-red-500/20 border-red-400/30 hover:bg-red-500/30',
      selected: 'bg-red-500/40 border-red-300/50 shadow-red-500/30'
    },
    'navigation:inventory.title': {
      base: 'bg-orange-500/20 border-orange-400/30 hover:bg-orange-500/30',
      selected: 'bg-orange-500/40 border-orange-300/50 shadow-orange-500/30'
    },
    'navigation:library.title': {
      base: 'bg-teal-500/20 border-teal-400/30 hover:bg-teal-500/30',
      selected: 'bg-teal-500/40 border-teal-300/50 shadow-teal-500/30'
    },
    'navigation:nutrition.title': {
      base: 'bg-pink-500/20 border-pink-400/30 hover:bg-pink-500/30',
      selected: 'bg-pink-500/40 border-pink-300/50 shadow-pink-500/30'
    },
    'navigation:reports.title': {
      base: 'bg-indigo-500/20 border-indigo-400/30 hover:bg-indigo-500/30',
      selected: 'bg-indigo-500/40 border-indigo-300/50 shadow-indigo-500/30'
    },
    'navigation:settings.title': {
      base: 'bg-gray-500/20 border-gray-400/30 hover:bg-gray-500/30',
      selected: 'bg-gray-500/40 border-gray-300/50 shadow-gray-500/30'
    }
  };

  const scheme = colorSchemes[moduleKey as keyof typeof colorSchemes] || {
    base: 'bg-slate-500/20 border-slate-400/30 hover:bg-slate-500/30',
    selected: 'bg-slate-500/40 border-slate-300/50 shadow-slate-500/30'
  };

  return isSelected ? scheme.selected : scheme.base;
};

const PrimarySidebar: React.FC<{ selectedModuleKey: string; onModuleSelect: (key: string) => void }> = ({ selectedModuleKey, onModuleSelect }) => {
  const { navigationItems, isLoading } = useDynamicNavigation(true); // Always pass true since modules are already initialized
  const { accessibleModules } = useRBAC();
  const { user } = useAuth();
  const mainModules = navigationItems.filter(item => item.isGroup);
  
  // Debug logs to help identify the issue
  const debugInfo = {
    modulesReady: !isLoading,
    navigationItemsCount: navigationItems.length,
    navigationItems: navigationItems,
    mainModulesCount: mainModules.length,
    mainModules: mainModules,
    selectedModuleKey,
    accessibleModulesCount: accessibleModules.length,
    accessibleModules: accessibleModules,
    user: user?.username,
    filteredItems: navigationItems.filter(item => !item.modulePath || accessibleModules.includes(item.modulePath.replace('/', '')))
  };

  // Only log once when component mounts or when there's an error
  useEffect(() => {
    if (isLoading) return;
    
    if (navigationItems.length === 0) {
      console.warn('⚠️ [PrimarySidebar] No navigation items found');
    }
  }, [isLoading, navigationItems.length]);
  
  return (
    <aside className="
      flex flex-col items-center h-full w-20
      bg-gradient-to-b from-slate-900/80 via-slate-800/70 to-slate-900/80
      backdrop-blur-xl
      border-r border-white/10
      shadow-2xl shadow-black/20
      rounded-r-3xl
      py-6
      relative
      before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:to-transparent before:rounded-r-3xl before:pointer-events-none
    ">
      <div className="flex flex-col gap-3 flex-1 w-full items-center relative z-10">
        {mainModules.map(item => {
          const isSelected = selectedModuleKey === item.name;
          const glassStyle = getModuleGlassStyle(item.name, isSelected);
          
          return (
            <button
              key={item.name}
              onClick={() => onModuleSelect(item.name)}
              className={`
                group relative flex items-center justify-center
                w-14 h-14 rounded-2xl
                backdrop-blur-md
                ${glassStyle}
                border
                shadow-lg shadow-black/10
                hover:shadow-xl hover:shadow-black/20
                transition-all duration-300
                focus:outline-none focus:ring-2 focus:ring-white/30
                ${isSelected ? 'shadow-xl' : ''}
              `}
              title={item.name.replace('navigation:', '').replace('.title', '')}
            >
              {/* Glass overlay for selected state */}
              {isSelected && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              )}
              
              {/* Icon with enhanced styling */}
              <span className="relative z-10 transition-transform duration-300 group-hover:scale-110">
                {item.icon
                  ? React.createElement(item.icon, { className: 'w-7 h-7 text-white drop-shadow-sm' })
                  : <span className="w-7 h-7 bg-gray-500 rounded-full" />
                }
              </span>
              
              <span className="sr-only">{item.name.replace('navigation:', '').replace('.title', '')}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default PrimarySidebar;