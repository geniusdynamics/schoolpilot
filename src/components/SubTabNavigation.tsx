// ABOUTME: SubTabNavigation component for secondary navigation within tabs
// ABOUTME: Provides horizontal tab navigation with add functionality and active state management

import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { SubTabNavigationProps, SubTab } from '@/types/hierarchical';

const SubTabNavigation: React.FC<SubTabNavigationProps> = ({
  subTabs,
  activeSubTabId,
  onSubTabClick,
  onAddSubTab,
  canAddSubTab = false,
  className = ''
}) => {
  if (!subTabs || subTabs.length === 0) {
    return null;
  }

  return (
    <div className={`border-b border-surface-border bg-surface-card ${className}`}>
      <div className="flex items-center justify-between px-4 py-2">
        <nav className="flex space-x-1" aria-label="Sub-navigation">
          {subTabs.map((subTab) => (
            <button
              key={subTab.id}
              onClick={() => onSubTabClick(subTab.id)}
              className={`
                relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                flex items-center space-x-2
                ${
                  subTab.isActive
                    ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                    : 'text-surface-muted-fg hover:text-surface-foreground hover:bg-surface-muted border border-transparent'
                }
              `}
              aria-current={subTab.isActive ? 'page' : undefined}
            >
              {/* Icon */}
              {subTab.icon && (
                <span className="flex-shrink-0">
                  {subTab.icon}
                </span>
              )}
              
              {/* Label */}
              <span>{subTab.label}</span>
              
              {/* Badge */}
              {subTab.badge && (
                <span className={`
                  inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full
                  ${
                    subTab.isActive
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-surface-accent text-surface-muted-fg'
                  }
                `}>
                  {subTab.badge}
                </span>
              )}
              
              {/* Active indicator */}
              {subTab.isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />
              )}
            </button>
          ))}
        </nav>
        
        {/* Add button */}
        {canAddSubTab && onAddSubTab && (
          <button
            onClick={onAddSubTab}
            className="
              flex items-center justify-center w-8 h-8 text-surface-muted-fg hover:text-surface-muted-fg
              hover:bg-surface-accent rounded-lg transition-colors duration-200
              border border-dashed border-surface-border hover:border-gray-400
            "
            title="Add new sub-tab"
            aria-label="Add new sub-tab"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// SubTab utility functions
export const createSubTab = (config: Omit<SubTab, 'id'>): SubTab => {
  return {
    id: `subtab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...config
  };
};

export const getActiveSubTab = (subTabs: SubTab[]): SubTab | undefined => {
  return subTabs.find(tab => tab.isActive);
};

export const updateSubTabActive = (subTabs: SubTab[], activeId: string): SubTab[] => {
  return subTabs.map(tab => ({
    ...tab,
    isActive: tab.id === activeId
  }));
};

// Default sub-tabs for common use cases
export const createDefaultTaskSubTabs = (): SubTab[] => [
  {
    id: 'all-tasks',
    label: 'All Tasks',
    isActive: true,
    canAdd: false,
    contentConfig: {
      type: 'table',
      dataSource: 'tasks',
      filters: {},
      columns: [
        { id: 'name', label: 'Name', sortable: true, type: 'text' },
        { id: 'status', label: 'Status', sortable: true, type: 'status' },
        { id: 'teams', label: 'Teams', sortable: false, type: 'text' },
        { id: 'assigned', label: 'Assigned', sortable: true, type: 'user' },
        { id: 'priority', label: 'Priority', sortable: true, type: 'priority' },
        { id: 'approved', label: 'Approved', sortable: true, type: 'text' }
      ]
    }
  },
  {
    id: 'active-tasks',
    label: 'Active Tasks',
    isActive: false,
    canAdd: false,
    contentConfig: {
      type: 'table',
      dataSource: 'tasks',
      filters: { status: 'active' },
      columns: [
        { id: 'name', label: 'Name', sortable: true, type: 'text' },
        { id: 'teams', label: 'Teams', sortable: false, type: 'text' },
        { id: 'assigned', label: 'Assigned', sortable: true, type: 'user' },
        { id: 'priority', label: 'Priority', sortable: true, type: 'priority' }
      ]
    }
  },
  {
    id: 'kanban',
    label: 'Kanban',
    isActive: false,
    canAdd: true,
    contentConfig: {
      type: 'kanban',
      dataSource: 'tasks',
      filters: {},
      columns: [
        { id: 'status', label: 'Status', type: 'status' }
      ]
    }
  }
];

export { SubTabNavigation };
export default SubTabNavigation;