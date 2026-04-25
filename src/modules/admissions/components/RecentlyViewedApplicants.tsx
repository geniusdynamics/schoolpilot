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
      <div className="p-4 text-center text-gray-500 text-sm">
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
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
        >
          {applicant.avatarUrl ? (
            <img
              src={applicant.avatarUrl}
              alt={applicant.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-gray-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {applicant.name}
            </p>
            <p className="text-xs text-gray-500">
              {applicant.grade}, <span className={applicant.statusColor}>{applicant.status}</span>
            </p>
          </div>
          <ArrowRightIcon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
    </div>
  );
};

export default RecentlyViewedApplicants;
