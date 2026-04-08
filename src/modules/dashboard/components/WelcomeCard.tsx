// ABOUTME: Welcome card component with user profile, greeting, and subtitle
// ABOUTME: Displays user information with decorative background elements

import React from 'react';
import { cn } from '@/utils/cn';
import { UserCircleIcon } from '@heroicons/react/24/outline';

interface WelcomeCardProps {
  userName: string;
  subtitle?: string;
  avatarUrl?: string;
  className?: string;
  backgroundGradient?: boolean;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  userName,
  subtitle = 'Manage your school operations efficiently',
  avatarUrl,
  className = '',
  backgroundGradient = true,
}) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-6',
        backgroundGradient 
          ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50' 
          : 'bg-white',
        'border border-gray-100 shadow-sm',
        className
      )}
    >
      {/* Decorative background elements */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/40 blur-2xl" />
      <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-orange-200/30 blur-xl" />

      <div className="relative flex items-center gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-md"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white border-2 border-white shadow-md">
              <UserCircleIcon className="h-10 w-10 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900">
            Welcome <span className="text-blue-600">{userName}</span>,
          </h2>
          <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCard;
