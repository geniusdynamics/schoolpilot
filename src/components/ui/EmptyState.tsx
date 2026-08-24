// ABOUTME: EmptyState — standard empty-data placeholder for list pages and grids.
// ABOUTME: The object form of DataGrid's `emptyState` prop maps onto this component.

import React from 'react';
import { InboxIcon } from '@heroicons/react/24/outline';
import Button from './Button';

export interface EmptyStateProps {
  /** Heroicons icon element; defaults to a generic inbox. */
  icon?: React.ReactNode;
  title: string;
  /** One-line hint explaining why it's empty or what to do. */
  description?: string;
  /** Primary call-to-action. */
  action?: React.ReactNode | { label: string; onClick: () => void; icon?: React.ReactNode };
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  let actionElement: React.ReactNode = null;
  if (action) {
    if (React.isValidElement(action)) {
      actionElement = action;
    } else if (typeof action === 'object' && 'label' in action) {
      const a = action as { label: string; onClick: () => void; icon?: React.ReactNode };
      actionElement = (
        <Button variant="primary" onClick={a.onClick} leftIcon={a.icon}>
          {a.label}
        </Button>
      );
    }
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      <div className="text-gray-300 mb-4">
        {icon ?? <InboxIcon className="h-12 w-12" aria-hidden="true" />}
      </div>
      <p className="text-base font-medium text-gray-900 mb-1">{title}</p>
      {description && <p className="text-sm text-gray-500 max-w-sm">{description}</p>}
      {actionElement && <div className="mt-5">{actionElement}</div>}
    </div>
  );
};

export default EmptyState;
