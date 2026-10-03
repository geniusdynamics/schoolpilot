// ABOUTME: Reusable widget card container for portal dashboard
// ABOUTME: Provides consistent styling with tabs, actions, and header

import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from '@/components/ui/icons';
import Button from '@/components/ui/Button';

export interface WidgetAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export interface PortalWidgetCardProps {
  title: string;
  subtitle?: string;
  date?: string;
  onDateChange?: (direction: 'prev' | 'next') => void;
  tabs?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  actions?: WidgetAction[];
  children: React.ReactNode;
  className?: string;
  showMoreOptions?: boolean;
  onMoreOptions?: () => void;
}

export const PortalWidgetCard: React.FC<PortalWidgetCardProps> = ({
  title,
  subtitle,
  date,
  onDateChange,
  tabs,
  activeTab,
  onTabChange,
  actions,
  children,
  className = '',
  showMoreOptions = true,
  onMoreOptions,
}) => {
  return (
    <div className={`bg-surface-card rounded-lg border border-surface-border shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-surface-foreground">{title}</h3>
            {date && (
              <div className="flex items-center gap-1 text-sm text-surface-muted-fg">
                <button
                  onClick={() => onDateChange?.('prev')}
                  className="p-0.5 hover:bg-surface-accent rounded transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <span className="text-surface-muted-fg">{date}</span>
                <button
                  onClick={() => onDateChange?.('next')}
                  className="p-0.5 hover:bg-surface-accent rounded transition-colors"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* More Options */}
          {showMoreOptions && (
            <button
              onClick={onMoreOptions}
              className="p-1 hover:bg-surface-accent rounded transition-colors text-surface-muted-fg hover:text-surface-muted-fg"
            >
              <MoreHorizontalIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tabs */}
        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange?.(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-surface-muted-fg hover:text-surface-foreground hover:bg-surface-muted'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Subtitle */}
        {subtitle && <p className="text-xs text-surface-muted-fg mt-2">{subtitle}</p>}
      </div>

      {/* Content */}
      <div className="p-4">{children}</div>

      {/* Actions Footer */}
      {actions && actions.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 flex-wrap">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'ghost'}
                size="sm"
                onClick={action.onClick}
                leftIcon={action.icon}
                className="text-xs"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalWidgetCard;
