import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import DialogForm from '@/components/ui/forms/DialogForm';
import { ArrowLeftIcon, EyeIcon, DocumentTextIcon } from '@/components/ui/icons';
import { useAssignmentsData } from '../../data/useAssignmentsData';
import type { AssignmentSubmission } from '../../data/types';
import { SubmissionStatus } from '../../data/types';
import { useTranslation } from 'react-i18next';

const submissionStatusColors: Record<SubmissionStatus, string> = {
  [SubmissionStatus.PENDING_REVIEW]: 'bg-surface-accent text-surface-foreground',
  [SubmissionStatus.SUBMITTED]: 'bg-primary-100 text-primary-800',
  [SubmissionStatus.LATE]: 'bg-orange-100 text-orange-800',
  [SubmissionStatus.GRADED]: 'bg-green-100 text-green-800',
  [SubmissionStatus.RETURNED]: 'bg-purple-100 text-purple-800',
};

const AssignmentSubmissionsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('assignments');
  const { assignments, submissions, loading } = useAssignmentsData();

  const [filterStatus, setFilterStatus] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);

  const assignment = useMemo(() => {
    return assignments.find(a => a.id === id);
  }, [assignments, id]);

  const assignmentSubmissions = useMemo(() => {
    const subs = submissions.filter(s => s.assignmentId === id);
    if (filterStatus) {
      return subs.filter(s => s.status === filterStatus);
    }
    return subs;
  }, [submissions, id, filterStatus]);

  // Stats summary
  const stats = useMemo(() => {
    const allSubs = submissions.filter(s => s.assignmentId === id);
    return {
      total: allSubs.length,
      notSubmitted: allSubs.filter(s => s.status === SubmissionStatus.PENDING_REVIEW).length,
      submitted: allSubs.filter(s => s.status === SubmissionStatus.SUBMITTED).length,
      late: allSubs.filter(s => s.status === SubmissionStatus.LATE).length,
      graded: allSubs.filter(s => s.status === SubmissionStatus.GRADED || s.status === SubmissionStatus.RETURNED).length,
    };
  }, [submissions, id]);

  const handleViewSubmission = useCallback((submission: AssignmentSubmission) => {
    setSelectedSubmission(submission);
  }, []);

  const columns: DataGridColumn<AssignmentSubmission>[] = [
    {
      key: 'studentName',
      header: t('submission.fields.student'),
      sortable: true,
      filterable: true,
      width: 180,
      render: (value) => value || 'Unknown Student',
    },
    {
      key: 'status',
      header: t('submission.fields.status'),
      sortable: true,
      filterable: true,
      width: 150,
      render: (value: SubmissionStatus) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${submissionStatusColors[value]}`}>
          {t(`submission.status.${value}`)}
        </span>
      ),
    },
    {
      key: 'submissionDate',
      header: t('submission.fields.submissionDate'),
      sortable: true,
      width: 160,
      render: (value) => value ? new Date(value).toLocaleDateString() : 'Not submitted',
    },
    {
      key: 'score',
      header: t('submission.fields.score'),
      sortable: true,
      width: 120,
      render: (value, item) => {
        if (value === null || value === undefined) return '-';
        return (
          <span className="font-medium">
            {value} / {item.maxScore || assignment?.maxScore || 100}
            {item.isLate && (
              <span className="ml-1 text-xs text-orange-600">(Late)</span>
            )}
          </span>
        );
      },
    },
    {
      key: 'grade',
      header: t('submission.fields.grade'),
      sortable: true,
      width: 80,
      render: (value) => value || '-',
    },
    {
      key: 'feedback',
      header: t('submission.fields.feedback'),
      sortable: false,
      render: (value) => (
        <span className="text-sm text-surface-muted-fg truncate block max-w-xs" title={value || ''}>
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'gradedByName',
      header: 'Graded By',
      sortable: true,
      width: 140,
      render: (value) => value || '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 100,
      sticky: 'right',
      render: (_, item) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleViewSubmission(item)}
          leftIcon={<EyeIcon className="w-4 h-4" />}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/assignments/${id}`)}
            leftIcon={<ArrowLeftIcon className="w-5 h-5" />}
          >
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-surface-foreground">
              {assignment?.title || 'Assignment Submissions'}
            </h1>
            <p className="text-sm text-surface-muted-fg mt-1">
              {assignment?.subjectName} - {assignment?.classStreamName}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/assignments/${id}/grading`)}
        >
          Go to Grading
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card variant="compact">
          <div className="text-center">
            <p className="text-2xl font-bold text-surface-foreground">{stats.total}</p>
            <p className="text-xs text-surface-muted-fg">Total</p>
          </div>
        </Card>
        <Card variant="compact">
          <div className="text-center">
            <p className="text-2xl font-bold text-surface-muted-fg">{stats.notSubmitted}</p>
            <p className="text-xs text-surface-muted-fg">Not Submitted</p>
          </div>
        </Card>
        <Card variant="compact">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{stats.submitted}</p>
            <p className="text-xs text-surface-muted-fg">Submitted</p>
          </div>
        </Card>
        <Card variant="compact">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.late}</p>
            <p className="text-xs text-surface-muted-fg">Late</p>
          </div>
        </Card>
        <Card variant="compact">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.graded}</p>
            <p className="text-xs text-surface-muted-fg">Graded</p>
          </div>
        </Card>
      </div>

      {/* Submissions Grid */}
      <Card
        title={t('submission.plural')}
        subtitle={`${assignmentSubmissions.length} of ${stats.total} submissions`}
        actions={
          <div className="flex items-center space-x-4">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-48"
            >
              <option value="">All Statuses</option>
              {Object.values(SubmissionStatus).map((status) => (
                <option key={status} value={status}>
                  {t(`submission.status.${status}`)}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        <DataGrid
          columns={columns}
          data={assignmentSubmissions}
          sortable
          filterable={false}
          loading={loading}
          emptyState={
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-surface-muted-fg" />
              <h3 className="mt-2 text-sm font-medium text-surface-foreground">
                No submissions found
              </h3>
              <p className="mt-1 text-sm text-surface-muted-fg">
                {filterStatus ? 'Try adjusting the filter.' : 'Students have not submitted their work yet.'}
              </p>
            </div>
          }
        />
      </Card>

      {/* Submission Detail Dialog */}
      <DialogForm
        open={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        title="Submission Details"
        size="lg"
      >
        {selectedSubmission && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-muted-fg uppercase tracking-wide mb-1">
                  {t('submission.fields.student')}
                </label>
                <p className="text-sm font-medium text-surface-foreground">
                  {selectedSubmission.studentName || 'Unknown'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-muted-fg uppercase tracking-wide mb-1">
                  {t('submission.fields.status')}
                </label>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${submissionStatusColors[selectedSubmission.status]}`}>
                  {t(`submission.status.${selectedSubmission.status}`)}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-muted-fg uppercase tracking-wide mb-1">
                  {t('submission.fields.submissionDate')}
                </label>
                <p className="text-sm text-surface-foreground">
                  {selectedSubmission.submissionDate
                    ? new Date(selectedSubmission.submissionDate).toLocaleString()
                    : 'Not submitted'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-muted-fg uppercase tracking-wide mb-1">
                  {t('submission.fields.isLate')}
                </label>
                <p className="text-sm text-surface-foreground">
                  {selectedSubmission.isLate ? 'Yes' : 'No'}
                </p>
              </div>
              {selectedSubmission.score !== null && selectedSubmission.score !== undefined && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-surface-muted-fg uppercase tracking-wide mb-1">
                      {t('submission.fields.score')}
                    </label>
                    <p className="text-sm font-medium text-surface-foreground">
                      {selectedSubmission.score} / {selectedSubmission.maxScore || assignment?.maxScore || 100}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-muted-fg uppercase tracking-wide mb-1">
                      {t('submission.fields.grade')}
                    </label>
                    <p className="text-sm text-surface-foreground">{selectedSubmission.grade || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-muted-fg uppercase tracking-wide mb-1">
                      Graded By
                    </label>
                    <p className="text-sm text-surface-foreground">{selectedSubmission.gradedByName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-muted-fg uppercase tracking-wide mb-1">
                      Graded At
                    </label>
                    <p className="text-sm text-surface-foreground">
                      {selectedSubmission.gradedAt
                        ? new Date(selectedSubmission.gradedAt).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                </>
              )}
            </div>
            {selectedSubmission.feedback && (
              <div>
                <label className="block text-xs font-medium text-surface-muted-fg uppercase tracking-wide mb-1">
                  {t('submission.fields.feedback')}
                </label>
                <p className="text-sm text-surface-foreground bg-surface-muted p-3 rounded-md whitespace-pre-wrap">
                  {selectedSubmission.feedback}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogForm>
    </div>
  );
};

export default AssignmentSubmissionsPage;
