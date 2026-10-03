// ABOUTME: Sub-tab navigation component for hierarchical tab structure
// ABOUTME: Handles secondary navigation tabs with add buttons and proper styling

import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { SubTab, SubTabNavigationProps } from '@/types/hierarchical';

const SubTabNavigation: React.FC<SubTabNavigationProps> = ({
  subTabs,
  activeSubTabId,
  onSubTabChange,
  onAddSubTab,
  className = '',
  showAddButton = true
}) => {
  if (!subTabs || subTabs.length === 0) {
    return null;
  }

  const handleSubTabClick = (subTab: SubTab) => {
    if (subTab.id !== activeSubTabId && !subTab.disabled) {
      onSubTabChange(subTab.id);
    }
  };

  const handleAddClick = () => {
    if (onAddSubTab) {
      onAddSubTab();
    }
  };

  return (
    <div className={`flex items-center space-x-1 border-b border-surface-border bg-surface-muted px-4 py-2 ${className}`}>
      {/* Sub-tab buttons */}
      <div className="flex items-center space-x-1">
        {subTabs.map((subTab) => {
          const isActive = subTab.id === activeSubTabId;
          const isDisabled = subTab.disabled;
          
          return (
            <button
              key={subTab.id}
              onClick={() => handleSubTabClick(subTab)}
              disabled={isDisabled}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200
                ${isActive 
                  ? 'bg-surface-card text-primary-600 border border-surface-border shadow-sm' 
                  : 'text-surface-muted-fg hover:text-surface-foreground hover:bg-surface-accent'
                }
                ${isDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer'
                }
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
              `}
              title={subTab.tooltip}
            >
              {subTab.icon && (
                <span className="mr-1.5">
                  {subTab.icon}
                </span>
              )}
              {subTab.label}
              {subTab.badge && (
                <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-gray-200 text-surface-foreground rounded-full">
                  {subTab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Add button */}
      {showAddButton && onAddSubTab && (
        <button
          onClick={handleAddClick}
          className="
            ml-2 p-1.5 text-surface-muted-fg hover:text-surface-muted-fg hover:bg-surface-accent 
            rounded-md transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
          "
          title="Add new tab"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SubTabNavigation;
export { SubTabNavigation };