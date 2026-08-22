// ABOUTME: Subject performance ranking table with grades, points, and change indicators
// ABOUTME: Displays subject performance with trend arrows and color-coded grades

import React from 'react';
import { cn } from '@/utils/cn';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/outline';

export interface SubjectPerformance {
  rank: number;
  name: string;
  points: number;
  change: number;
  grade: string;
}

interface SubjectPerformanceTableProps {
  subjects: SubjectPerformance[];
  className?: string;
  maxRows?: number;
}

const getGradeColor = (grade: string): string => {
  const firstChar = grade.charAt(0);
  switch (firstChar) {
    case 'A':
      return 'text-emerald-600 bg-emerald-50';
    case 'B':
      return 'text-blue-600 bg-blue-50';
    case 'C':
      return 'text-amber-600 bg-amber-50';
    case 'D':
    case 'E':
      return 'text-rose-600 bg-rose-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const TrendCell: React.FC<{ value: number }> = ({ value }) => {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium">
        <ArrowUpIcon className="h-3.5 w-3.5" />
        {value.toFixed(4)}
      </span>
    );
  } else if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-rose-600 font-medium">
        <ArrowDownIcon className="h-3.5 w-3.5" />
        {Math.abs(value).toFixed(4)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-gray-500">
      <MinusIcon className="h-3.5 w-3.5" />
      0
    </span>
  );
};

export const SubjectPerformanceTable: React.FC<SubjectPerformanceTableProps> = ({
  subjects,
  className = '',
  maxRows = 10,
}) => {
  const displaySubjects = subjects.slice(0, maxRows);

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Subject Performance</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Change
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displaySubjects.map((subject) => (
              <tr key={subject.name} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {subject.rank}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {subject.name}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {subject.points.toFixed(4)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <TrendCell value={subject.change} />
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium',
                    getGradeColor(subject.grade)
                  )}>
                    {subject.grade}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {subjects.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500">
          No subject data available
        </div>
      )}
    </div>
  );
};

export default SubjectPerformanceTable;
