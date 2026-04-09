// ABOUTME: Newsletter card component with document icon, metadata, and action buttons
// ABOUTME: Displays newsletter information in a clean list format

import React from 'react';
import { cn } from '@/utils/cn';
import { DocumentTextIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export interface Newsletter {
  id: string;
  title: string;
  createdBy: string;
  createdOn: string;
  documentType?: 'word' | 'pdf' | 'other';
}

interface NewsletterCardProps {
  newsletter: Newsletter;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

const DocumentIcon: React.FC<{ type?: string }> = ({ type }) => {
  return (
    <div className={cn(
      'flex items-center justify-center w-12 h-12 rounded-lg flex-shrink-0',
      type === 'word' ? 'bg-blue-100 text-blue-600' :
      type === 'pdf' ? 'bg-rose-100 text-rose-600' :
      'bg-cyan-100 text-cyan-600'
    )}>
      <DocumentTextIcon className="h-6 w-6" />
    </div>
  );
};

export const NewsletterCard: React.FC<NewsletterCardProps> = ({
  newsletter,
  onView,
  onEdit,
  onDelete,
  className = '',
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200',
        'hover:shadow-md hover:border-gray-300 transition-all',
        className
      )}
    >
      {/* Document Icon */}
      <DocumentIcon type={newsletter.documentType} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-semibold text-gray-900 truncate">
          {newsletter.title}
        </h4>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
          <span>
            Created By : <span className="text-gray-700 font-medium">{newsletter.createdBy}</span>
          </span>
          <span>
            Created On : <span className="text-gray-700 font-medium">{newsletter.createdOn}</span>
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onView && (
          <button
            onClick={onView}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            View
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default NewsletterCard;
