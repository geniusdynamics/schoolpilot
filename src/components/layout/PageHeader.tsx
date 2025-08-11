// ABOUTME: PageHeader component for displaying page titles, descriptions and actions
// ABOUTME: Standardized header layout used across all module pages

import * as React from 'react';
import { ReactNode } from 'react';

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
            <a href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Home
            </a>
            {breadcrumbs.map((crumb, index) => (
              <span key={index}>
                <span className="mx-2">/</span>
                {crumb.active ? (
                  <span className="text-sm text-gray-900">{crumb.label}</span>
                ) : (
                  <a href={crumb.href} className="text-sm text-gray-600 hover:text-gray-900">
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
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {title}
            </h1>
            {description && (
              <p className="text-gray-600 mt-1">
                {description}
              </p>
            )}
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
