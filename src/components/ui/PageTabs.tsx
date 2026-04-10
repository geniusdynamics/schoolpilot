import React, { useState, useCallback } from 'react';
import { TabNavigation, TabItem } from './TabNavigation';
import { FilterBar, FilterField } from './FilterBar';

export interface PageTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
  badgeColor?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  disabled?: boolean;
  // Optional filter configuration for this tab
  filters?: FilterField[];
  // Whether this tab has a search/clear action
  hasActions?: boolean;
}

interface PageTabsProps {
  tabs: PageTab[];
  defaultTabId?: string;
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline' | 'buttons' | 'sidebar';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  // Global filters shown for all tabs
  globalFilters?: FilterField[];
  // Tab-specific content render function
  renderContent: (activeTabId: string) => React.ReactNode;
  // Optional search action handler
  onSearch?: (activeTabId: string, filterValues: Record<string, any>) => void;
  onClear?: (activeTabId: string) => void;
  searchLabel?: string;
  clearLabel?: string;
  // Container for content
  contentClassName?: string;
  // Show filters below tabs
  showFilters?: boolean;
}

/**
 * PageTabs Component
 * 
 * Follows the ClassListsPage pattern:
 * - Tabs at top with consistent styling
 * - FilterBar below tabs (optional)
 * - Content area that switches based on active tab
 * 
 * Usage (like ClassListsPage):
 * ```tsx
 * <PageTabs
 *   tabs={[
 *     { id: 'class-lists', label: 'Class Lists', icon: <Icon /> },
 *     { id: 'analysis', label: 'Analysis Report', icon: <Icon /> },
 *   ]}
 *   filters={[...]}
 *   renderContent={(tabId) => {
 *     if (tabId === 'class-lists') return <ClassLists />;
 *     if (tabId === 'analysis') return <Analysis />;
 *     return null;
 *   }}
 * />
 * ```
 */
export const PageTabs: React.FC<PageTabsProps> = ({
  tabs,
  defaultTabId,
  activeTabId: controlledActiveTabId,
  onTabChange,
  variant = 'sidebar',
  size = 'md',
  className = '',
  globalFilters,
  renderContent,
  onSearch,
  onClear,
  searchLabel = 'Search',
  clearLabel = 'Clear',
  contentClassName = 'mt-6',
  showFilters = true,
}) => {
  // Internal state for uncontrolled mode
  const [internalActiveTabId, setInternalActiveTabId] = useState<string>(
    defaultTabId || tabs[0]?.id || ''
  );
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  // Use controlled or uncontrolled active tab
  const activeTabId = controlledActiveTabId ?? internalActiveTabId;

  const handleTabChange = useCallback((tabId: string) => {
    if (controlledActiveTabId === undefined) {
      setInternalActiveTabId(tabId);
    }
    onTabChange?.(tabId);
  }, [controlledActiveTabId, onTabChange]);

  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [filterId]: value }));
  }, []);

  const handleSearch = useCallback(() => {
    onSearch?.(activeTabId, filterValues);
  }, [onSearch, activeTabId, filterValues]);

  const handleClear = useCallback(() => {
    setFilterValues({});
    onClear?.(activeTabId);
  }, [onClear, activeTabId]);

  // Get current tab configuration
  const currentTab = tabs.find(t => t.id === activeTabId);
  
  // Build tab items for TabNavigation
  const tabItems: TabItem[] = tabs.map(tab => ({
    id: tab.id,
    label: tab.label,
    icon: tab.icon,
    badge: tab.badge,
    badgeColor: tab.badgeColor,
    disabled: tab.disabled,
  }));

  // Determine which filters to show
  const filtersToShow = currentTab?.filters || globalFilters;

  // Apply filter values
  const filtersWithValues = filtersToShow?.map(filter => ({
    ...filter,
    value: filterValues[filter.id] ?? filter.value ?? '',
    onChange: (value: any) => handleFilterChange(filter.id, value),
  }));

  return (
    <div className={`space-y-6 pb-8 ${className}`}>
      {/* Tab Navigation */}
      <TabNavigation
        tabs={tabItems}
        variant={variant}
        size={size}
        activeTabId={activeTabId}
        onTabChange={handleTabChange}
      />

      {/* Filter Bar */}
      {showFilters && filtersWithValues && filtersWithValues.length > 0 && (
        <FilterBar
          filters={filtersWithValues}
          onClear={handleClear}
          onSearch={handleSearch}
          searchLabel={searchLabel}
          clearLabel={clearLabel}
        />
      )}

      {/* Tab Content */}
      <div className={contentClassName}>
        {renderContent(activeTabId)}
      </div>
    </div>
  );
};

/**
 * Simplified PageTabs for pages without filters
 * Just tabs + content switching
 */
export const SimplePageTabs: React.FC<Omit<PageTabsProps, 'globalFilters' | 'onSearch' | 'onClear' | 'searchLabel' | 'clearLabel' | 'showFilters'>> = (props) => {
  return <PageTabs {...props} showFilters={false} />;
};

export default PageTabs;
