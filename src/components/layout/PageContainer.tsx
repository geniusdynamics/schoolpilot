// ABOUTME: PageContainer component for wrapping page content with consistent layout
// ABOUTME: Provides responsive padding and max-width constraints for all pages

import * as React from 'react';
import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  className?: string;
  fluid?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = 'xl',
  className = '',
  fluid = false
}) => {
  if (fluid) {
    return (
      <div className={`p-6 min-h-screen bg-gray-50 ${className}`}>
        {children}
      </div>
    );
  }

  const maxWidthClass = maxWidth === false ? 'max-w-none' : {
    xs: 'max-w-xs',
    sm: 'max-w-sm', 
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-7xl'
  }[maxWidth];

  return (
    <div className={`py-6 px-4 sm:px-6 lg:px-8 min-h-screen mx-auto ${maxWidthClass} ${className}`}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        {children}
      </div>
    </div>
  );
};
