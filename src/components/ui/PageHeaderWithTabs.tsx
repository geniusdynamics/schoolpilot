// ABOUTME: Compact page header with integrated tabs, title and actions
// ABOUTME: Minimizes vertical space between navigation and content

import React from 'react';
import PageErrorBoundary from '@/components/PageErrorBoundary';

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
  /**
   * Content of the active tab. When provided it is rendered as the tab panel inside an
   * error boundary keyed on the active tab, so a crashing tab never blanks its siblings.
   */
  children?: React.ReactNode;
  colorScheme?: 'blue' | 'emerald' | 'indigo' | 'violet' | 'amber' | 'rose' | 'green' | 'teal' | 'cyan' | 'purple' | 'orange' | 'slate';
}

const colorSchemes = {
  blue: {
    activeBg: 'bg-primary-50',
    activeText: 'text-primary-700',
    activeBorder: 'border-primary-500',
    badgeBg: 'bg-primary-100',
    badgeText: 'text-primary-700',
    hover: 'hover:bg-primary-50',
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
  green: {
    activeBg: 'bg-green-50',
    activeText: 'text-green-700',
    activeBorder: 'border-green-500',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    hover: 'hover:bg-green-50',
  },
  teal: {
    activeBg: 'bg-teal-50',
    activeText: 'text-teal-700',
    activeBorder: 'border-teal-500',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-700',
    hover: 'hover:bg-teal-50',
  },
  cyan: {
    activeBg: 'bg-cyan-50',
    activeText: 'text-cyan-700',
    activeBorder: 'border-cyan-500',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-700',
    hover: 'hover:bg-cyan-50',
  },
  purple: {
    activeBg: 'bg-purple-50',
    activeText: 'text-purple-700',
    activeBorder: 'border-purple-500',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
    hover: 'hover:bg-purple-50',
  },
  orange: {
    activeBg: 'bg-orange-50',
    activeText: 'text-orange-700',
    activeBorder: 'border-orange-500',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    hover: 'hover:bg-orange-50',
  },
  slate: {
    activeBg: 'bg-slate-50',
    activeText: 'text-slate-700',
    activeBorder: 'border-slate-500',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    hover: 'hover:bg-slate-50',
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
  children,
}) => {
  const colors = colorSchemes[colorScheme];

  const renderTabPanel = () => {
    if (children === undefined || children === null) return null;
    const panelKey = activeTab ?? '';
    return (
      <div
        role="tabpanel"
        id={`tabpanel-${panelKey}`}
        aria-labelledby={`tab-${panelKey}`}
        className="mt-4"
      >
        <PageErrorBoundary pageName={title ? `${title} / ${panelKey}` : panelKey} resetKey={panelKey}>
          {children}
        </PageErrorBoundary>
      </div>
    );
  };

  const renderCustomTabs = () => {
    if (!tabs || tabs.length === 0) return null;

    const handleTabKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
      let newIndex: number | null = null;
      if (e.key === 'ArrowRight') {
        newIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft') {
        newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      }
      if (newIndex !== null) {
        e.preventDefault();
        onTabChange?.(tabs[newIndex].id);
      }
    };

    return (
      <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-slate-800/80 p-1 rounded-lg" role="tablist" aria-label="Tab navigation">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange?.(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md
                transition-all duration-200
                ${isActive 
                  ? `${colors.activeBg} ${colors.activeText} shadow-sm` 
                  : 'text-surface-muted-fg hover:text-surface-foreground hover:bg-gray-200/50'
                }
              `}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`
                  ml-1 px-1.5 py-0.5 text-xs rounded-full
                  ${isActive ? colors.badgeBg + ' ' + colors.badgeText : 'bg-gray-200 text-surface-muted-fg'}
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
      <>
        <div className="flex items-center justify-between py-2 border-b border-surface-border mb-3">
          <div className="flex items-center gap-4">
            {renderCustomTabs()}
          </div>
          <div className="flex items-center gap-2">
            {secondaryAction}
            {action}
          </div>
        </div>
        {renderTabPanel()}
      </>
    );
  }

  return (
    <div className={`${variant === 'compact' ? 'mb-3' : 'mb-4'}`}>
      {/* Top row: Title and actions */}
      {(title || action || secondaryAction) && (
        <div className="flex items-center justify-between mb-2">
          <div>
            {title && (
              <h1 className={`font-semibold text-surface-foreground ${variant === 'compact' ? 'text-lg' : 'text-xl'}`}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-surface-muted-fg mt-0.5">{subtitle}</p>
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

      {renderTabPanel()}
    </div>
  );
};

export default PageHeaderWithTabs;
