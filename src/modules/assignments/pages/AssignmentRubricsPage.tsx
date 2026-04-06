import React, { useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import {
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  ChartBarIcon,
} from '@/components/ui/icons';
import { useAssignmentsData } from '../data/useAssignmentsData';
import type { RubricCriterion } from '../data/types';
import { useTranslation } from 'react-i18next';

interface RubricDisplayData {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  subjectName: string | null | undefined;
  criteriaCount: number;
  maxPoints: number;
  criteria: RubricCriterion[];
}

const AssignmentRubricsPage: React.FC = () => {
  const { t } = useTranslation('assignments');
  const { assignments, loading } = useAssignmentsData();

  // Collect rubric data from assignments that have rubrics
  const rubricData: RubricDisplayData[] = useMemo(() => {
    return assignments
      .filter(a => a.rubric && a.rubric.length > 0)
      .map(assignment => {
        const rubrics = assignment.rubric as RubricCriterion[];
        const totalMaxPoints = rubrics.reduce((sum, c) => sum + (c.maxPoints || 0), 0);
        return {
          id: assignment.rubricId || `rubric-${assignment.id}`,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          subjectName: assignment.subjectName,
          criteriaCount: rubrics.length,
          maxPoints: totalMaxPoints,
          criteria: rubrics,
        };
      });
  }, [assignments]);

  // All rubric criteria flattened
  const allCriteria = useMemo(() => {
    return rubricData.flatMap(rd =>
      rd.criteria.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        maxPoints: c.maxPoints,
        weightPercentage: c.weightPercentage,
        levelsCount: c.levels ? c.levels.length : 0,
        assignmentTitle: rd.assignmentTitle,
        subjectName: rd.subjectName,
      }))
    );
  }, [rubricData]);

  const criteriaColumns: DataGridColumn<typeof allCriteria[0]>[] = [
    {
      key: 'name',
      header: t('rubric.criterion'),
      sortable: true,
      filterable: true,
      width: 200,
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: 'description',
      header: t('rubric.title'),
      sortable: false,
      render: (value) => (
        <span className="text-sm text-gray-600 truncate block max-w-xs" title={value || ''}>
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'maxPoints',
      header: t('rubric.maxPoints'),
      sortable: true,
      width: 120,
      render: (value) => <span className="text-sm">{value} pts</span>,
    },
    {
      key: 'weightPercentage',
      header: t('rubric.weight'),
      sortable: true,
      width: 100,
      render: (value) => value !== null && value !== undefined ? `${value}%` : '-',
    },
    {
      key: 'levelsCount',
      header: t('rubric.levels'),
      sortable: true,
      width: 100,
      render: (value) => <span className="text-sm">{value} levels</span>,
    },
    {
      key: 'assignmentTitle',
      header: 'Assignment',
      sortable: true,
      width: 200,
      render: (value, item) => (
        <div>
          <span className="text-sm text-gray-900">{value}</span>
          {item.subjectName && (
            <p className="text-xs text-gray-500">{item.subjectName}</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('rubric.title')} Management</h1>
          <p className="text-sm text-gray-500 mt-1">Define and manage grading rubrics for assignments</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<PlusIcon className="w-5 h-5" />}
          disabled
          title="Coming soon"
        >
          Create Rubric
        </Button>
      </div>

      {/* Coming Soon Banner */}
      <Card variant="filled">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
            <ClipboardDocumentListIcon className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Rubrics Feature Coming Soon
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              The rubrics management system is currently under development. Soon you will be able to:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Create custom rubrics</span> with multiple criteria and performance levels
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Assign rubrics</span> to assignments for consistent grading
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Score using rubric levels</span> directly in the grading interface
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Reuse rubrics</span> across multiple assignments and subjects
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span>Full rubric support will be available in a future update.</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Current Rubric Data */}
      {rubricData.length > 0 ? (
        <>
          {/* Rubric Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="compact">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{rubricData.length}</p>
                <p className="text-xs text-gray-500">Assignments with Rubrics</p>
              </div>
            </Card>
            <Card variant="compact">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{allCriteria.length}</p>
                <p className="text-xs text-gray-500">Total Criteria</p>
              </div>
            </Card>
            <Card variant="compact">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {allCriteria.length > 0
                    ? Math.round(allCriteria.reduce((sum, c) => sum + (c.weightPercentage || 0), 0) / allCriteria.length)
                    : 0}%
                </p>
                <p className="text-xs text-gray-500">Avg Weight per Criterion</p>
              </div>
            </Card>
          </div>

          {/* Assignment Rubrics */}
          <Card title="Assignment Rubrics" subtitle="Rubrics currently assigned to assignments">
            <DataGrid
              columns={[
                {
                  key: 'assignmentTitle',
                  header: 'Assignment',
                  sortable: true,
                  filterable: true,
                  width: 250,
                  render: (value, item) => (
                    <div>
                      <span className="font-medium text-gray-900">{value}</span>
                      {item.subjectName && (
                        <p className="text-xs text-gray-500">{item.subjectName}</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'criteriaCount',
                  header: t('rubric.criteria'),
                  sortable: true,
                  width: 120,
                  render: (value) => (
                    <span className="text-sm">{value} criteria</span>
                  ),
                },
                {
                  key: 'maxPoints',
                  header: t('rubric.maxPoints'),
                  sortable: true,
                  width: 120,
                  render: (value) => <span className="text-sm">{value} pts</span>,
                },
              ]}
              data={rubricData}
              sortable
              filterable
              emptyState={
                <div className="text-center py-8">
                  <ClipboardDocumentListIcon className="mx-auto h-10 w-10 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No rubrics assigned</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No assignments have rubrics configured yet.
                  </p>
                </div>
              }
            />
          </Card>

          {/* Rubric Criteria Detail */}
          <Card title="Rubric Criteria Detail" subtitle="Individual grading criteria from all assignments">
            <DataGrid
              columns={criteriaColumns}
              data={allCriteria}
              sortable
              filterable
              loading={loading}
              emptyState={
                <div className="text-center py-8">
                  <ChartBarIcon className="mx-auto h-10 w-10 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No criteria found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No rubric criteria are currently defined.
                  </p>
                </div>
              }
            />
          </Card>
        </>
      ) : (
        /* No rubrics yet */
        <Card>
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No rubrics configured yet</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Once assignments are created with rubric criteria, they will appear here.
              Rubrics help standardize grading across assignments and provide clear expectations for students.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AssignmentRubricsPage;
