// ABOUTME: Merit list action buttons for exam analysis
// ABOUTME: Provides quick access to merit lists, improved lists, and report forms

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export interface MeritListAction {
  id: string;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  icon?: React.ReactNode;
}

interface MeritListActionsProps {
  actions: MeritListAction[];
  dropdownActions?: MeritListAction[];
  className?: string;
}

export const MeritListActions: React.FC<MeritListActionsProps> = ({
  actions,
  dropdownActions,
  className = '',
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          className={cn(
            'w-full px-4 py-2.5 rounded-lg font-medium text-sm',
            'transition-colors duration-200',
            'flex items-center justify-center gap-2',
            action.variant === 'secondary' || !action.variant
              ? 'bg-slate-700 text-white hover:bg-slate-800'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          {action.icon}
          {action.label}
        </button>
      ))}

      {dropdownActions && dropdownActions.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg font-medium text-sm',
              'bg-slate-700 text-white hover:bg-slate-800',
              'transition-colors duration-200',
              'flex items-center justify-center gap-2'
            )}
          >
            {dropdownActions[0]?.label}
            <ChevronDownIcon className={cn('h-4 w-4 transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                {dropdownActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.onClick();
                      setDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MeritListActions;
