// ABOUTME: Performance summary card for forms/classes showing exam statistics
// ABOUTME: Displays mean points, marks, and grades with trend indicators

import React from 'react';
import { cn } from '@/utils/cn';
import { HomeIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/outline';

export interface PerformanceMetric {
  label: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
    positive?: boolean;
  };
}

interface PerformanceCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  meanPoints: number;
  meanMarks: number;
  meanGrade: string;
  pointsTrend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  marksTrend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  className?: string;
  onClick?: () => void;
}

const getGradeColor = (grade: string): string => {
  const firstChar = grade.charAt(0);
  switch (firstChar) {
    case 'A':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'B':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'C':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'D':
    case 'E':
      return 'text-rose-600 bg-rose-50 border-rose-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const TrendIndicator: React.FC<{ trend: { direction: 'up' | 'down' | 'neutral'; value: string }; inverse?: boolean }> = ({
  trend,
  inverse = false,
}) => {
  const isPositive = inverse 
    ? trend.direction === 'down' 
    : trend.direction === 'up';
  
  const colorClass = isPositive 
    ? 'text-emerald-600 bg-emerald-50' 
    : trend.direction === 'neutral'
    ? 'text-gray-600 bg-gray-50'
    : 'text-rose-600 bg-rose-50';

  const Icon = trend.direction === 'up' 
    ? ArrowUpIcon 
    : trend.direction === 'down' 
    ? ArrowDownIcon 
    : MinusIcon;

  return (
    <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium', colorClass)}>
      <Icon className="h-3 w-3" />
      {trend.value}
    </span>
  );
};

export const PerformanceCard: React.FC<PerformanceCardProps> = ({
  title,
  subtitle,
  icon,
  meanPoints,
  meanMarks,
  meanGrade,
  pointsTrend,
  marksTrend,
  className = '',
  onClick,
}) => {
  const gradeStyle = getGradeColor(meanGrade);

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden',
        'hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          {icon || (
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-600">
              <HomeIcon className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500 truncate">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-4 space-y-4">
        {/* Mean Points */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Mean Points</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              {meanPoints.toFixed(4)}
            </span>
            {pointsTrend && <TrendIndicator trend={pointsTrend} />}
          </div>
        </div>

        {/* Mean Marks */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Mean Marks</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              {meanMarks.toFixed(1)}%
            </span>
            {marksTrend && <TrendIndicator trend={marksTrend} inverse />}
          </div>
        </div>

        {/* Mean Grade */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-600">Mean Grade</span>
          <span className={cn('px-3 py-1 rounded-lg text-lg font-bold border', gradeStyle)}>
            {meanGrade}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceCard;
