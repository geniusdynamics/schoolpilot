// ABOUTME: PageContainer component for wrapping page content with consistent layout
// ABOUTME: Provides responsive padding and max-width constraints for all pages

import * as React from 'react';
import { ReactNode } from 'react';
import { useContentWidth } from '@/hooks/useContentWidth';

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  className?: string;
  fluid?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth,
  className = '',
  fluid = false
}) => {
  const { isFullWidth } = useContentWidth();

  if (fluid) {
    return (
      <div className={`p-6 min-h-screen bg-surface-muted ${className}`}>
        {children}
      </div>
    );
  }

  // When no explicit maxWidth is given, use the hook to determine full-width vs constrained mode
  const effectiveMaxWidth = maxWidth ?? (isFullWidth ? false : 'xl');

  const maxWidthClass = effectiveMaxWidth === false ? 'w-full' : {
    xs: 'max-w-xs',
    sm: 'max-w-sm', 
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-7xl'
  }[effectiveMaxWidth];

  return (
    <div className={`py-6 px-4 sm:px-6 lg:px-8 min-h-screen mx-auto ${maxWidthClass} ${className}`}>
      <div className="bg-surface-card rounded-lg shadow-sm p-6">
        {children}
      </div>
    </div>
  );
};
