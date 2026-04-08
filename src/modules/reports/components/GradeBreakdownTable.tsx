// ABOUTME: Grade breakdown table showing grade distribution across forms/streams
// ABOUTME: Displays detailed grade statistics with mean calculations

import React from 'react';
import { cn } from '@/utils/cn';

export interface GradeBreakdownRow {
  form: string;
  stream?: string;
  grades: {
    A?: number;
    'A-'?: number;
    'B+'?: number;
    B?: number;
    'B-'?: number;
    'C+'?: number;
    C?: number;
    'C-'?: number;
    'D+'?: number;
    D?: number;
    'D-'?: number;
    E?: number;
    X?: number;
    Y?: number;
  };
  entries: number;
  meanMarks: number;
  meanMarksDeviation: number;
  meanPoints: number;
  meanPointsDeviation: number;
  grade: string;
  subjectTeacher?: string;
  tscNo?: string;
  isSummary?: boolean;
}

interface GradeBreakdownTableProps {
  rows: GradeBreakdownRow[];
  className?: string;
  showTeacher?: boolean;
}

const gradeColumns = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E', 'X', 'Y'];

const getGradeCellColor = (count: number, total: number): string => {
  if (total === 0) return 'text-gray-400';
  const percentage = (count / total) * 100;
  if (percentage >= 20) return 'text-emerald-600 font-medium';
  if (percentage >= 10) return 'text-blue-600';
  if (count > 0) return 'text-gray-600';
  return 'text-gray-300';
};

const getDeviationColor = (value: number): string => {
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-rose-600';
  return 'text-gray-600';
};

const getGradeColor = (grade: string): string => {
  const firstChar = grade.charAt(0);
  switch (firstChar) {
    case 'A':
      return 'text-emerald-600 font-bold';
    case 'B':
      return 'text-blue-600 font-bold';
    case 'C':
      return 'text-amber-600 font-bold';
    case 'D':
    case 'E':
      return 'text-rose-600 font-bold';
    default:
      return 'text-gray-600';
  }
};

export const GradeBreakdownTable: React.FC<GradeBreakdownTableProps> = ({
  rows,
  className = '',
  showTeacher = false,
}) => {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-gray-600 border-b border-gray-200 sticky left-0 bg-gray-50 z-10">
                Form
              </th>
              {gradeColumns.map((grade) => (
                <th key={grade} className="px-2 py-3 text-center font-medium text-gray-600 border-b border-gray-200 min-w-[36px]">
                  {grade}
                </th>
              ))}
              <th className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200">
                Entries
              </th>
              <th className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200">
                Mean Marks
              </th>
              <th className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200">
                Deviation
              </th>
              <th className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200">
                Mean Points
              </th>
              <th className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200">
                Deviation
              </th>
              <th className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200">
                Grade
              </th>
              {showTeacher && (
                <>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 border-b border-gray-200">
                    Subject Teacher
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 border-b border-gray-200">
                    TSC No
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, index) => (
              <tr
                key={`${row.form}-${row.stream || index}`}
                className={cn(
                  'hover:bg-gray-50/50 transition-colors',
                  row.isSummary && 'bg-emerald-50/50 font-medium'
                )}
              >
                <td className={cn(
                  'px-3 py-3 border-b border-gray-100 sticky left-0 z-10',
                  row.isSummary ? 'bg-emerald-50/50 text-emerald-700 font-medium' : 'bg-white text-gray-900'
                )}>
                  {row.stream ? `${row.form} ${row.stream}` : row.form}
                </td>
                {gradeColumns.map((grade) => {
                  const count = row.grades[grade as keyof typeof row.grades] || 0;
                  return (
                    <td
                      key={grade}
                      className={cn(
                        'px-2 py-3 text-center border-b border-gray-100',
                        getGradeCellColor(count, row.entries)
                      )}
                    >
                      {count || 0}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-center text-gray-900 border-b border-gray-100">
                  {row.entries}
                </td>
                <td className="px-3 py-3 text-center text-gray-900 font-medium border-b border-gray-100">
                  {row.meanMarks.toFixed(1)}
                </td>
                <td className={cn(
                  'px-3 py-3 text-center border-b border-gray-100',
                  getDeviationColor(row.meanMarksDeviation)
                )}>
                  {row.meanMarksDeviation.toFixed(4)}
                </td>
                <td className="px-3 py-3 text-center text-gray-900 font-medium border-b border-gray-100">
                  {row.meanPoints.toFixed(4)}
                </td>
                <td className={cn(
                  'px-3 py-3 text-center border-b border-gray-100',
                  getDeviationColor(row.meanPointsDeviation)
                )}>
                  {row.meanPointsDeviation.toFixed(4)}
                </td>
                <td className={cn('px-3 py-3 text-center border-b border-gray-100', getGradeColor(row.grade))}>
                  {row.grade}
                </td>
                {showTeacher && (
                  <>
                    <td className="px-3 py-3 text-gray-700 border-b border-gray-100">
                      {row.subjectTeacher || '-'}
                    </td>
                    <td className="px-3 py-3 text-gray-700 border-b border-gray-100">
                      {row.tscNo || '-'}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500">
          No grade data available
        </div>
      )}
    </div>
  );
};

export default GradeBreakdownTable;
