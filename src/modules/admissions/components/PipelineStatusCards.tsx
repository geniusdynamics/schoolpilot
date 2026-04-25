// ABOUTME: Pipeline status cards showing applicant counts at each stage
// ABOUTME: Cards are clickable to filter by status and show trend indicators

import React from 'react';
import {
  UsersIcon,
  MessageIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  ArrowRightIcon,
} from '@/components/ui/icons';
import type { PipelineCounts, TrendData } from '../data/types';

interface PipelineStatusCardsProps {
  counts: PipelineCounts;
  trends: {
    enquiries: TrendData;
    applications: TrendData;
    enrollment: TrendData;
    conversionRate: TrendData;
  };
  onFilterChange?: (status: string) => void;
  activeFilter?: string | null;
}

interface StatusCardProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  textColor: string;
  trend?: TrendData;
  isActive?: boolean;
  onClick?: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({
  label,
  count,
  icon,
  color,
  textColor,
  trend,
  isActive = false,
  onClick,
}) => {
  const TrendIcon = trend?.direction === 'up'
    ? ArrowUpIcon
    : trend?.direction === 'down'
    ? ArrowDownIcon
    : MinusIcon;

  const trendColorClass = trend?.direction === 'up'
    ? 'text-emerald-600 bg-emerald-50'
    : trend?.direction === 'down'
    ? 'text-rose-600 bg-rose-50'
    : 'text-gray-600 bg-gray-50';

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-start p-4 rounded-lg border transition-all duration-200
        ${isActive
          ? 'border-violet-400 bg-violet-50 shadow-md ring-2 ring-violet-200'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
        w-full text-left group
      `}
    >
      <div className="flex items-center justify-between w-full mb-2">
        <span className={`text-sm font-medium ${textColor}`}>{label}</span>
        <ArrowRightIcon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex items-center justify-between w-full">
        <span className="text-2xl font-bold text-gray-900">{count}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${trendColorClass}`}>
            <TrendIcon className="w-3 h-3" />
            {trend.value}
          </span>
        </div>
      )}
    </button>
  );
};

const PipelineStatusCards: React.FC<PipelineStatusCardsProps> = ({
  counts,
  trends,
  onFilterChange,
  activeFilter,
}) => {
  const cards = [
    {
      key: 'contacts',
      label: 'Contacts',
      count: counts.contacts,
      icon: <UsersIcon className="w-5 h-5 text-gray-600" />,
      color: 'bg-gray-100',
      textColor: 'text-gray-700',
      trend: trends.enquiries,
    },
    {
      key: 'enquired',
      label: 'Enquired',
      count: counts.enquired,
      icon: <MessageIcon className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-50',
      textColor: 'text-amber-700',
      trend: trends.enquiries,
    },
    {
      key: 'applied',
      label: 'Applied',
      count: counts.applied,
      icon: <DocumentTextIcon className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-50',
      textColor: 'text-blue-700',
      trend: trends.applications,
    },
    {
      key: 'admitted',
      label: 'Admitted',
      count: counts.admitted,
      icon: <CheckCircleIcon className="w-5 h-5 text-emerald-600" />,
      color: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      trend: trends.conversionRate,
    },
    {
      key: 'enrolled',
      label: 'Enrolled',
      count: counts.enrolled,
      icon: <AcademicCapIcon className="w-5 h-5 text-violet-600" />,
      color: 'bg-violet-50',
      textColor: 'text-violet-700',
      trend: trends.enrollment,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {cards.map((card) => (
        <StatusCard
          key={card.key}
          label={card.label}
          count={card.count}
          icon={card.icon}
          color={card.color}
          textColor={card.textColor}
          trend={card.trend}
          isActive={activeFilter === card.key}
          onClick={() => onFilterChange?.(card.key)}
        />
      ))}
    </div>
  );
};

export default PipelineStatusCards;
