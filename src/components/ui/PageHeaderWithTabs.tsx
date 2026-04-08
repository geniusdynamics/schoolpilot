// ABOUTME: Compact page header with integrated tabs, title and actions
// ABOUTME: Minimizes vertical space between navigation and content

import React from 'react';
import { TabNavigation } from './TabNavigation';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface PageHeaderWithTabsProps {
  title?: string;
  subtitle?: string;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  variant?: 'default' | 'compact' | 'minimal';
  colorScheme?: 'blue' | 'emerald' | 'indigo' | 'violet' | 'amber' | 'rose';
}

const colorSchemes = {
  blue: {
    activeBg: 'bg-blue-50',
    activeText: 'text-blue-700',
    activeBorder: 'border-blue-500',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    hover: 'hover:bg-blue-50',
  },
  emerald: {
    activeBg: 'bg-emerald-50',
    activeText: 'text-emerald-700',
    activeBorder: 'border-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    hover: 'hover:bg-emerald-50',
  },
  indigo: {
    activeBg: 'bg-indigo-50',
    activeText: 'text-indigo-700',
    activeBorder: 'border-indigo-500',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-700',
    hover: 'hover:bg-indigo-50',
  },
  violet: {
    activeBg: 'bg-violet-50',
    activeText: 'text-violet-700',
    activeBorder: 'border-violet-500',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-700',
    hover: 'hover:bg-violet-50',
  },
  amber: {
    activeBg: 'bg-amber-50',
    activeText: 'text-amber-700',
    activeBorder: 'border-amber-500',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    hover: 'hover:bg-amber-50',
  },
  rose: {
    activeBg: 'bg-rose-50',
    activeText: 'text-rose-700',
    activeBorder: 'border-rose-500',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
    hover: 'hover:bg-rose-50',
  },
};

export const PageHeaderWithTabs: React.FC<PageHeaderWithTabsProps> = ({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  action,
  secondaryAction,
  variant = 'compact',
  colorScheme = 'blue',
}) => {
  const colors = colorSchemes[colorScheme];

  const renderCustomTabs = () => {
    if (!tabs || tabs.length === 0) return null;

    return (
      <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-lg">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md
                transition-all duration-200
                ${isActive 
                  ? `${colors.activeBg} ${colors.activeText} shadow-sm` 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                }
              `}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`
                  ml-1 px-1.5 py-0.5 text-xs rounded-full
                  ${isActive ? colors.badgeBg + ' ' + colors.badgeText : 'bg-gray-200 text-gray-600'}
                `}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  if (variant === 'minimal') {
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-200 mb-3">
        <div className="flex items-center gap-4">
          {renderCustomTabs()}
        </div>
        <div className="flex items-center gap-2">
          {secondaryAction}
          {action}
        </div>
      </div>
    );
  }

  return (
    <div className={`${variant === 'compact' ? 'mb-3' : 'mb-4'}`}>
      {/* Top row: Title and actions */}
      {(title || action || secondaryAction) && (
        <div className="flex items-center justify-between mb-2">
          <div>
            {title && (
              <h1 className={`font-semibold text-gray-900 ${variant === 'compact' ? 'text-lg' : 'text-xl'}`}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {secondaryAction}
            {action}
          </div>
        </div>
      )}
      
      {/* Tabs row */}
      {tabs && tabs.length > 0 && (
        <div className="flex items-center">
          {renderCustomTabs()}
        </div>
      )}
    </div>
  );
};

export default PageHeaderWithTabs;
