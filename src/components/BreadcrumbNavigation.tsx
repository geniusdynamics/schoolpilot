// ABOUTME: Breadcrumb navigation component with error state handling
// ABOUTME: Provides navigation context and recovery options when routes fail

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon, HomeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';

interface BreadcrumbItem {
  label: string;
  path: string;
  isActive: boolean;
  isAccessible: boolean;
  hasError?: boolean;
}

interface BreadcrumbNavigationProps {
  className?: string;
  showHome?: boolean;
  maxItems?: number;
  onNavigationError?: (path: string, error: Error) => void;
}

const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  className = '',
  showHome = true,
  maxItems = 5,
  onNavigationError
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['navigation', 'common']);
  const { navigationItems, isLoading } = useDynamicNavigation(true);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [navigationErrors, setNavigationErrors] = useState<Set<string>>(new Set());

  // Build breadcrumb items from current path
  useEffect(() => {
    if (isLoading || navigationItems.length === 0) return;

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];

    // Add home breadcrumb
    if (showHome) {
      items.push({
        label: t('common:dashboard', 'Dashboard'),
        path: '/dashboard',
        isActive: location.pathname === '/dashboard',
        isAccessible: true,
        hasError: navigationErrors.has('/dashboard')
      });
    }

    // Build breadcrumbs from path segments
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Find matching navigation item
      const navItem = findNavigationItem(navigationItems, currentPath);
      const isLast = index === pathSegments.length - 1;
      
      // Translate the navigation item name if it's a translation key
      let label = navItem?.name || formatSegmentLabel(segment);
      if (navItem?.name && navItem.name.includes(':')) {
        // This is a translation key like "navigation:settings.features"
        try {
          const translated = t(navItem.name, { defaultValue: formatSegmentLabel(segment) });
          // Make sure we got a string, not an object
          if (typeof translated === 'string') {
            label = translated;
          } else {
            console.warn('Translation returned non-string for key:', navItem.name, translated);
            label = formatSegmentLabel(segment);
          }
        } catch (error) {
          console.warn('Translation error for key:', navItem.name, error);
          label = formatSegmentLabel(segment);
        }
      }
      
      items.push({
        label,
        path: currentPath,
        isActive: isLast,
        isAccessible: !!navItem,
        hasError: navigationErrors.has(currentPath)
      });
    });

    // Limit number of items if specified
    if (maxItems && items.length > maxItems) {
      const startItems = items.slice(0, 1); // Keep home
      const endItems = items.slice(-(maxItems - 2)); // Keep last items
      const ellipsisItem: BreadcrumbItem = {
        label: '...',
        path: '',
        isActive: false,
        isAccessible: false
      };
      setBreadcrumbs([...startItems, ellipsisItem, ...endItems]);
    } else {
      setBreadcrumbs(items);
    }
  }, [location.pathname, navigationItems, isLoading, showHome, maxItems, navigationErrors, t]);

  // Find navigation item by path
  const findNavigationItem = (items: any[], targetPath: string): any => {
    for (const item of items) {
      if (item.path === targetPath) {
        return item;
      }
      if (item.children) {
        const found = findNavigationItem(item.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  // Format segment label for display
  const formatSegmentLabel = (segment: string): string => {
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Handle breadcrumb navigation with error handling
  const handleNavigate = async (path: string) => {
    if (!path || path === location.pathname) return;

    try {
      // Clear any previous error for this path
      setNavigationErrors(prev => {
        const newErrors = new Set(prev);
        newErrors.delete(path);
        return newErrors;
      });

      navigate(path);
    } catch (error) {
      const navError = error as Error;
      console.error(`🧭 [BreadcrumbNavigation] Navigation failed for path: ${path}`, navError);
      
      // Mark path as having an error
      setNavigationErrors(prev => new Set(prev).add(path));
      
      // Call error handler if provided
      if (onNavigationError) {
        onNavigationError(path, navError);
      }
    }
  };

  // Handle retry navigation for failed paths
  const handleRetryNavigation = (path: string) => {
    setNavigationErrors(prev => {
      const newErrors = new Set(prev);
      newErrors.delete(path);
      return newErrors;
    });
    handleNavigate(path);
  };

  if (isLoading || breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className={`flex items-center space-x-1 text-sm text-gray-500 ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {breadcrumbs.map((item, index) => (
          <li key={`${item.path}-${index}`} className="flex items-center">
            {index > 0 && (
              <ChevronRightIcon className="w-4 h-4 mx-1 text-gray-400" />
            )}
            
            {item.label === '...' ? (
              <span className="px-2 py-1 text-gray-400">...</span>
            ) : item.isActive ? (
              <span className="font-medium text-gray-900 flex items-center">
                {item.hasError && (
                  <ExclamationTriangleIcon className="w-4 h-4 mr-1 text-orange-500" />
                )}
                {index === 0 && showHome && <HomeIcon className="w-4 h-4 mr-1" />}
                {item.label}
              </span>
            ) : (
              <div className="flex items-center">
                <button
                  onClick={() => handleNavigate(item.path)}
                  className={`
                    flex items-center px-2 py-1 rounded hover:bg-gray-100 transition-colors
                    ${item.isAccessible 
                      ? 'text-blue-600 hover:text-blue-800' 
                      : 'text-gray-400 cursor-not-allowed'
                    }
                    ${item.hasError ? 'text-orange-600' : ''}
                  `}
                  disabled={!item.isAccessible}
                  title={
                    item.hasError 
                      ? 'This page had an error. Click to retry.' 
                      : item.isAccessible 
                        ? `Navigate to ${item.label}` 
                        : 'Page not accessible'
                  }
                >
                  {item.hasError && (
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1 text-orange-500" />
                  )}
                  {index === 0 && showHome && <HomeIcon className="w-4 h-4 mr-1" />}
                  {item.label}
                </button>
                
                {/* Retry button for failed navigation */}
                {item.hasError && (
                  <button
                    onClick={() => handleRetryNavigation(item.path)}
                    className="ml-1 p-1 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors"
                    title="Retry navigation"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export { BreadcrumbNavigation };
export default BreadcrumbNavigation;