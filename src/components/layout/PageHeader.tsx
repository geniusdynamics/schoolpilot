// ABOUTME: PageHeader component for displaying page titles, descriptions and actions
// ABOUTME: Standardized header layout used across all module pages

import * as React from 'react';
import { ReactNode } from 'react';
import { InfoHint } from '@/components/ui/feedback';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
    active?: boolean;
  }>;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  breadcrumbs,
  actions,
  className = '',
  children
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-4">
          <nav aria-label="breadcrumb">
            <a href="/" className="text-sm text-surface-muted-fg hover:text-surface-foreground">
              Home
            </a>
            {breadcrumbs.map((crumb, index) => (
              <span key={index}>
                <span className="mx-2">/</span>
                {crumb.active ? (
                  <span className="text-sm text-surface-foreground">{crumb.label}</span>
                ) : (
                  <a href={crumb.href} className="text-sm text-surface-muted-fg hover:text-surface-foreground">
                    {crumb.label}
                  </a>
                )}
              </span>
            ))}
          </nav>
        </div>
      )}

      {/* Header Content */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {icon && (
            <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-2xl font-bold text-surface-foreground">
                {title}
              </h1>
              {description && <InfoHint text={description} label="About this page" />}
            </div>
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>

      {/* Children content */}
      {children}
    </div>
  );
};
