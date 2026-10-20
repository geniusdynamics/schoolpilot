import React from 'react';
import Card from '@/components/ui/Card';
import { ArrowPathIcon } from '@/components/ui/icons';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  action?: React.ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
  icon?: React.ReactNode;
  subtitle?: string;
  headerRight?: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  action,
  onRefresh,
  loading = false,
  icon,
  subtitle,
  headerRight,
}) => {
  return (
    <Card
      className={`border-surface-border shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}
      headerClassName={`bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 ${headerClassName}`}
      bodyClassName={`p-4 ${bodyClassName}`}
      title={
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-primary-600">
              {icon}
            </span>
          )}
          <div>
            <h3 className="text-base font-semibold text-surface-foreground">{title}</h3>
            {subtitle && (
              <p className="text-xs text-surface-muted-fg font-normal">{subtitle}</p>
            )}
          </div>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className={`
                p-1.5 rounded-lg text-surface-muted-fg hover:text-primary-600 hover:bg-primary-50
                transition-all duration-200
                ${loading ? 'animate-spin' : ''}
              `}
              title="Refresh"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}
          {action && (
            <div className="relative">
              {action}
            </div>
          )}
          {headerRight}
        </div>
      }
    >
      <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
        {children}
      </div>
    </Card>
  );
};

export default ChartCard;
