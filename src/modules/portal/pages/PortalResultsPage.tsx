// ABOUTME: Portal results page showing exam result summaries with expandable subject breakdown
// ABOUTME: Displays per-exam statistics including total marks, mean grade, and class rank

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { usePortalData } from '../data/usePortalData';
import type { PortalResultSummary } from '../data/types';
import {
  ChartBarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@/components/ui/icons';

interface SubjectRow {
  subjectName: string;
  marks: string;
  grade: string;
  points: string;
  comment: string;
}

const PortalResultsPage: React.FC = () => {
  const { t } = useTranslation('portal');
  const {
    results,
    loading,
    loadResults,
  } = usePortalData();

  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadResults('STU001');
  }, [loadResults]);

  const toggleExam = useCallback((examId: string) => {
    setExpandedExams(prev => {
      const next = new Set(prev);
      if (next.has(examId)) {
        next.delete(examId);
      } else {
        next.add(examId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedExams(new Set(results.map(r => r.examSessionId)));
  }, [results]);

  const collapseAll = useCallback(() => {
    setExpandedExams(new Set());
  }, []);

  const subjectColumns: DataGridColumn<SubjectRow>[] = [
    {
      key: 'subjectName',
      header: t('results.subject'),
      sortable: true,
      filterable: true,
      render: (value: string) => <span className="font-medium text-gray-900">{value}</span>,
    },
    {
      key: 'marks',
      header: t('results.marks'),
      sortable: true,
      filterable: true,
      align: 'center',
      render: (value: string, row) => {
        const marks = parseFloat(row.marks);
        const color = marks >= 80 ? 'text-emerald-600' : marks >= 60 ? 'text-blue-600' : marks >= 40 ? 'text-amber-600' : 'text-rose-600';
        return <span className={`font-mono font-semibold ${color}`}>{value}</span>;
      },
    },
    {
      key: 'grade',
      header: t('results.grade'),
      sortable: true,
      filterable: true,
      align: 'center',
      render: (value: string) => {
        const gradeColor = value.startsWith('A') ? 'text-emerald-700 bg-emerald-50' :
          value.startsWith('B') ? 'text-blue-700 bg-blue-50' :
          value.startsWith('C') ? 'text-amber-700 bg-amber-50' :
          value.startsWith('D') ? 'text-orange-700 bg-orange-50' : 'text-rose-700 bg-rose-50';
        return (
          <span className={`inline-flex items-center px-2.5 py-1 text-sm font-semibold rounded-full ${gradeColor}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'points',
      header: t('results.points'),
      sortable: true,
      filterable: true,
      align: 'center',
      render: (value: string) => <span className="font-mono text-gray-700">{value}</span>,
    },
    {
      key: 'comment',
      header: t('results.comment'),
      sortable: false,
      filterable: true,
      render: (value: string) => <span className="text-gray-600 text-sm">{value}</span>,
    },
  ];

  if (loading && results.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('results.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {results.length} exam session{results.length !== 1 ? 's' : ''} available
          </p>
        </div>
        {results.length > 1 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <div className="text-center py-12">
            <ChartBarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900">{t('results.noResults')}</h3>
            <p className="text-sm text-gray-500 mt-2">Results will appear here once exams have been graded.</p>
          </div>
        </Card>
      ) : (
        results.map((exam: PortalResultSummary) => {
          const isExpanded = expandedExams.has(exam.examSessionId);
          const subjectRows: SubjectRow[] = exam.subjects.map(s => ({
            subjectName: s.subjectName,
            marks: s.marks != null ? `${s.marks}/${s.marksOutOf ?? 100}` : '-',
            grade: s.grade ?? '-',
            points: s.points != null ? String(s.points) : '-',
            comment: s.comment ?? '-',
          }));

          return (
            <Card key={exam.examSessionId} className="border-slate-200 bg-white shadow-sm">
              {/* Exam Header */}
              <button
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors rounded-t-xl text-left"
                onClick={() => toggleExam(exam.examSessionId)}
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-blue-50 p-2.5">
                    <ChartBarIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{exam.examSessionName}</h3>
                    <p className="text-sm text-gray-500">{exam.academicPeriodName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {/* Quick Stats */}
                  <div className="hidden sm:flex items-center gap-6 text-sm">
                    {exam.totalMarks != null && (
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">{exam.totalMarks}</p>
                        <p className="text-xs text-gray-500">{t('results.totalMarks')}</p>
                      </div>
                    )}
                    {exam.meanGrade && (
                      <div className="text-center">
                        <p className="font-semibold text-emerald-600">{exam.meanGrade}</p>
                        <p className="text-xs text-gray-500">{t('results.meanGrade')}</p>
                      </div>
                    )}
                    {exam.classRank != null && (
                      <div className="text-center">
                        <p className="font-semibold text-violet-600">#{exam.classRank}</p>
                        <p className="text-xs text-gray-500">{t('results.classRank')}</p>
                      </div>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Subject Breakdown */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  {/* Mobile Stats */}
                  <div className="sm:hidden grid grid-cols-3 gap-3 p-4 bg-gray-50">
                    {exam.totalMarks != null && (
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">{exam.totalMarks}</p>
                        <p className="text-xs text-gray-500">{t('results.totalMarks')}</p>
                      </div>
                    )}
                    {exam.meanGrade && (
                      <div className="text-center">
                        <p className="font-semibold text-emerald-600">{exam.meanGrade}</p>
                        <p className="text-xs text-gray-500">{t('results.meanGrade')}</p>
                      </div>
                    )}
                    {exam.classRank != null && (
                      <div className="text-center">
                        <p className="font-semibold text-violet-600">#{exam.classRank}</p>
                        <p className="text-xs text-gray-500">{t('results.classRank')}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <DataGrid
                      columns={subjectColumns}
                      data={subjectRows}
                      sortable
                      filterable
                      emptyState={{
                        icon: <ChartBarIcon className="w-12 h-12 text-gray-300" />,
                        title: 'No subject data',
                        description: 'Subject results are not available for this exam.',
                      }}
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
};

export default PortalResultsPage;
