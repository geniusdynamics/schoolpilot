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
  if (total === 0) return 'text-surface-muted-fg';
  const percentage = (count / total) * 100;
  if (percentage >= 20) return 'text-emerald-600 font-medium';
  if (percentage >= 10) return 'text-primary-600';
  if (count > 0) return 'text-surface-muted-fg';
  return 'text-gray-300';
};

const getDeviationColor = (value: number): string => {
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-rose-600';
  return 'text-surface-muted-fg';
};

const getGradeColor = (grade: string): string => {
  const firstChar = grade.charAt(0);
  switch (firstChar) {
    case 'A':
      return 'text-emerald-600 font-bold';
    case 'B':
      return 'text-primary-600 font-bold';
    case 'C':
      return 'text-amber-600 font-bold';
    case 'D':
    case 'E':
      return 'text-rose-600 font-bold';
    default:
      return 'text-surface-muted-fg';
  }
};

export const GradeBreakdownTable: React.FC<GradeBreakdownTableProps> = ({
  rows,
  className = '',
  showTeacher = false,
}) => {
  return (
    <div className={cn('bg-surface-card rounded-xl border border-surface-border overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-surface-muted-fg border-b border-surface-border sticky left-0 bg-surface-muted z-10">
                Form
              </th>
              {gradeColumns.map((grade) => (
                <th key={grade} className="px-2 py-3 text-center font-medium text-surface-muted-fg border-b border-surface-border min-w-[36px]">
                  {grade}
                </th>
              ))}
              <th className="px-3 py-3 text-center font-medium text-surface-muted-fg border-b border-surface-border">
                Entries
              </th>
              <th className="px-3 py-3 text-center font-medium text-surface-muted-fg border-b border-surface-border">
                Mean Marks
              </th>
              <th className="px-3 py-3 text-center font-medium text-surface-muted-fg border-b border-surface-border">
                Deviation
              </th>
              <th className="px-3 py-3 text-center font-medium text-surface-muted-fg border-b border-surface-border">
                Mean Points
              </th>
              <th className="px-3 py-3 text-center font-medium text-surface-muted-fg border-b border-surface-border">
                Deviation
              </th>
              <th className="px-3 py-3 text-center font-medium text-surface-muted-fg border-b border-surface-border">
                Grade
              </th>
              {showTeacher && (
                <>
                  <th className="px-3 py-3 text-left font-medium text-surface-muted-fg border-b border-surface-border">
                    Subject Teacher
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-surface-muted-fg border-b border-surface-border">
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
                  'hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors',
                  row.isSummary && 'bg-emerald-50/50 font-medium'
                )}
              >
                <td className={cn(
                  'px-3 py-3 border-b border-gray-100 sticky left-0 z-10',
                  row.isSummary ? 'bg-emerald-50/50 text-emerald-700 font-medium' : 'bg-surface-card text-surface-foreground'
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
                <td className="px-3 py-3 text-center text-surface-foreground border-b border-gray-100">
                  {row.entries}
                </td>
                <td className="px-3 py-3 text-center text-surface-foreground font-medium border-b border-gray-100">
                  {row.meanMarks.toFixed(1)}
                </td>
                <td className={cn(
                  'px-3 py-3 text-center border-b border-gray-100',
                  getDeviationColor(row.meanMarksDeviation)
                )}>
                  {row.meanMarksDeviation.toFixed(4)}
                </td>
                <td className="px-3 py-3 text-center text-surface-foreground font-medium border-b border-gray-100">
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
                    <td className="px-3 py-3 text-surface-foreground border-b border-gray-100">
                      {row.subjectTeacher || '-'}
                    </td>
                    <td className="px-3 py-3 text-surface-foreground border-b border-gray-100">
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
        <div className="px-4 py-8 text-center text-surface-muted-fg">
          No grade data available
        </div>
      )}
    </div>
  );
};

export default GradeBreakdownTable;
