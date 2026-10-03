// ABOUTME: Recently viewed applicants panel with avatars and status info
// ABOUTME: Quick access to recently accessed applicant records

import React from 'react';
import {
  UserIcon,
  ArrowRightIcon,
} from '@/components/ui/icons';

interface RecentApplicant {
  id: string;
  name: string;
  grade: string;
  status: string;
  statusColor: string;
  avatarUrl?: string;
}

interface RecentlyViewedApplicantsProps {
  applicants: RecentApplicant[];
  onViewApplicant?: (id: string) => void;
}

const RecentlyViewedApplicants: React.FC<RecentlyViewedApplicantsProps> = ({
  applicants,
  onViewApplicant,
}) => {
  if (applicants.length === 0) {
    return (
      <div className="p-4 text-center text-surface-muted-fg text-sm">
        No recently viewed applicants
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applicants.map((applicant) => (
        <button
          key={applicant.id}
          onClick={() => onViewApplicant?.(applicant.id)}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-muted transition-colors text-left group"
        >
          {applicant.avatarUrl ? (
            <img
              src={applicant.avatarUrl}
              alt={applicant.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-surface-muted-fg" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-foreground truncate">
              {applicant.name}
            </p>
            <p className="text-xs text-surface-muted-fg">
              {applicant.grade}, <span className={applicant.statusColor}>{applicant.status}</span>
            </p>
          </div>
          <ArrowRightIcon className="w-4 h-4 text-surface-muted-fg opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
    </div>
  );
};

export default RecentlyViewedApplicants;
