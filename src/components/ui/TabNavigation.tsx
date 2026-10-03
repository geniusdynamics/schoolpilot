// ABOUTME: Modern tab navigation component with icons, badges, and responsive design
// ABOUTME: Supports horizontal scrolling on mobile and active state indicators

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';

export interface TabItem {
  id: string;
  label: string;
  to?: string;
  icon?: React.ReactNode;
  badge?: number | string;
  badgeColor?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  onClick?: () => void;
  disabled?: boolean;
}

interface TabNavigationProps {
  tabs: TabItem[];
  variant?: 'default' | 'pills' | 'underline' | 'buttons' | 'sidebar';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
}

const variantStyles = {
  default: {
    container: 'bg-surface-card border-b border-surface-border',
    tab: 'px-4 py-3 text-sm font-medium text-surface-muted-fg hover:text-surface-foreground hover:bg-surface-muted transition-colors border-b-2 border-transparent',
    active: 'text-primary-600 border-primary-600 bg-primary-50/50',
    disabled: 'opacity-50 cursor-not-allowed hover:text-surface-muted-fg hover:bg-transparent',
  },
  pills: {
    container: 'bg-gray-100/50 dark:bg-slate-800/50 p-1 rounded-xl',
    tab: 'px-4 py-2 text-sm font-medium text-surface-muted-fg hover:text-surface-foreground rounded-lg transition-all',
    active: 'text-surface-foreground bg-surface-card shadow-sm',
    disabled: 'opacity-50 cursor-not-allowed hover:text-surface-muted-fg',
  },
  underline: {
    container: 'border-b border-surface-border',
    tab: 'px-1 py-3 text-sm font-medium text-surface-muted-fg hover:text-surface-foreground transition-colors border-b-2 border-transparent -mb-[2px]',
    active: 'text-primary-600 border-primary-600',
    disabled: 'opacity-50 cursor-not-allowed hover:text-surface-muted-fg',
  },
  buttons: {
    container: 'bg-emerald-500 p-1 rounded-lg gap-1',
    tab: 'px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-all flex items-center gap-2',
    active: 'text-emerald-700 bg-surface-card hover:bg-surface-card hover:text-emerald-700 shadow-sm',
    disabled: 'opacity-50 cursor-not-allowed hover:text-white/80 hover:bg-transparent',
  },
  sidebar: {
    container: 'bg-gray-100/80 dark:bg-slate-800/80 p-1.5 rounded-xl gap-1 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50',
    tab: 'px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white/50 dark:bg-slate-900/50 border border-gray-200/60 dark:border-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-900/80 hover:border-gray-300/60 dark:hover:border-slate-700/60 rounded-lg transition-all flex items-center gap-2 shadow-sm hover:shadow-md',
    active: 'text-slate-900 bg-surface-card border-surface-border shadow-md ring-2 ring-gray-200/50 hover:bg-surface-card',
    disabled: 'opacity-50 cursor-not-allowed hover:text-slate-600 hover:bg-white/50 dark:hover:bg-slate-900/50 hover:border-gray-200/60 dark:hover:border-slate-700/60',
  },
};

const sizeStyles = {
  sm: {
    container: '',
    tab: 'text-xs px-3 py-2',
    icon: 'h-3.5 w-3.5',
  },
  md: {
    container: '',
    tab: 'text-sm px-4 py-3',
    icon: 'h-4 w-4',
  },
  lg: {
    container: '',
    tab: 'text-base px-5 py-4',
    icon: 'h-5 w-5',
  },
};

const badgeColorStyles = {
  blue: 'bg-primary-100 text-primary-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-rose-100 text-rose-700',
  purple: 'bg-purple-100 text-purple-700',
};

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  variant = 'default',
  size = 'md',
  className = '',
  activeTabId,
  onTabChange,
}) => {
  const location = useLocation();
  const styles = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const isActive = (tab: TabItem) => {
    if (activeTabId) return tab.id === activeTabId;
    if (tab.to) return location.pathname === tab.to || location.pathname.startsWith(tab.to);
    return false;
  };

  const handleClick = (tab: TabItem) => {
    if (tab.disabled) return;
    if (tab.onClick) tab.onClick();
    if (onTabChange) onTabChange(tab.id);
  };

  return (
    <div
      className={cn(
        'flex items-center overflow-x-auto scrollbar-hide',
        styles.container,
        sizeStyle.container,
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = isActive(tab);
        const content = (
          <>
            {tab.icon && (
              <span className={cn('flex-shrink-0', sizeStyle.icon)}>{tab.icon}</span>
            )}
            <span className="truncate">{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'flex-shrink-0 ml-1.5 px-2 py-0.5 text-xs font-semibold rounded-full',
                  badgeColorStyles[tab.badgeColor || 'blue']
                )}
              >
                {tab.badge}
              </span>
            )}
          </>
        );

        const tabClassName = cn(
          'flex items-center gap-2 whitespace-nowrap transition-all',
          styles.tab,
          sizeStyle.tab,
          active && styles.active,
          tab.disabled && styles.disabled
        );

        if (tab.to && !tab.disabled) {
          return (
            <Link
              key={tab.id}
              to={tab.to}
              className={tabClassName}
              role="tab"
              aria-selected={active}
              onClick={() => handleClick(tab)}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={tab.id}
            className={tabClassName}
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => handleClick(tab)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
};

export default TabNavigation;
