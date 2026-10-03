// ABOUTME: Exam performance header with form icon, exam name, and key metrics
// ABOUTME: Displays mean points, marks, and grade with trend indicators

import React from 'react';
import { cn } from '@/utils/cn';
import { HomeIcon, AcademicCapIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/outline';

export interface TrendData {
  direction: 'up' | 'down' | 'neutral';
  value: string;
}

interface ExamPerformanceHeaderProps {
  formName: string;
  examName: string;
  termName?: string;
  meanPoints: number;
  meanMarks: number;
  meanGrade: string;
  pointsTrend?: TrendData;
  marksTrend?: TrendData;
  studentCount?: number;
  className?: string;
}

const TrendBadge: React.FC<{ trend: TrendData; inverse?: boolean }> = ({ trend, inverse = false }) => {
  const isPositive = inverse 
    ? trend.direction === 'down' 
    : trend.direction === 'up';
  
  const colorClass = isPositive 
    ? 'text-emerald-600' 
    : trend.direction === 'neutral'
    ? 'text-surface-muted-fg'
    : 'text-rose-600';

  const Icon = trend.direction === 'up' 
    ? ArrowUpIcon 
    : trend.direction === 'down' 
    ? ArrowDownIcon 
    : MinusIcon;

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', colorClass)}>
      <Icon className="h-3 w-3" />
      {trend.value}
    </span>
  );
};

const getGradeColor = (grade: string): string => {
  const firstChar = grade.charAt(0);
  switch (firstChar) {
    case 'A':
      return 'text-emerald-600';
    case 'B':
      return 'text-primary-600';
    case 'C':
      return 'text-amber-600';
    case 'D':
    case 'E':
      return 'text-rose-600';
    default:
      return 'text-surface-muted-fg';
  }
};

export const ExamPerformanceHeader: React.FC<ExamPerformanceHeaderProps> = ({
  formName,
  examName,
  termName,
  meanPoints,
  meanMarks,
  meanGrade,
  pointsTrend,
  marksTrend,
  studentCount,
  className = '',
}) => {
  const gradeColor = getGradeColor(meanGrade);

  return (
    <div className={cn('bg-surface-card rounded-xl border border-surface-border p-6', className)}>
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Left: Form Icon and Info */}
        <div className="flex items-start gap-4 flex-1">
          <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-surface-accent text-surface-foreground flex-shrink-0">
            <HomeIcon className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-surface-foreground">{formName}</h2>
            <p className="text-sm text-surface-muted-fg mt-1">
              {examName}
              {termName && ` - (${termName})`}
            </p>
          </div>
        </div>

        {/* Right: Metrics Grid */}
        <div className="grid grid-cols-2 gap-6 lg:gap-8">
          {/* Mean Points */}
          <div className="text-center">
            <p className="text-sm text-surface-muted-fg mb-1">Mean Points</p>
            <p className="text-3xl font-bold text-emerald-600">{meanPoints.toFixed(4)}</p>
            {pointsTrend && (
              <div className="mt-1">
                <TrendBadge trend={pointsTrend} />
              </div>
            )}
          </div>

          {/* Mean Marks */}
          <div className="text-center">
            <p className="text-sm text-surface-muted-fg mb-1">Mean Marks</p>
            <p className="text-3xl font-bold text-emerald-600">{meanMarks.toFixed(1)}%</p>
            {marksTrend && (
              <div className="mt-1">
                <TrendBadge trend={marksTrend} inverse />
              </div>
            )}
          </div>

          {/* Mean Grade */}
          <div className="text-center col-span-2 lg:col-span-2">
            <p className="text-sm text-surface-muted-fg mb-1">Mean Grade</p>
            <p className={cn('text-3xl font-bold', gradeColor)}>{meanGrade}</p>
          </div>
        </div>

        {/* Student Count */}
        {studentCount && (
          <div className="flex flex-col items-center justify-center px-6 py-4 bg-surface-muted rounded-xl">
            <AcademicCapIcon className="h-8 w-8 text-surface-muted-fg mb-2" />
            <p className="text-2xl font-bold text-surface-foreground">{studentCount}</p>
            <p className="text-xs text-surface-muted-fg text-center">Students who sat<br />for the exam</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamPerformanceHeader;
