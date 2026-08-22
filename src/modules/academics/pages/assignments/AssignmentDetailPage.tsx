import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import {
  ArrowLeftIcon,
  EditIcon,
  DeleteIcon,
  ClipboardDocumentCheckIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@/components/ui/icons';
import { useAssignmentsData } from '../../data/useAssignmentsData';
import type { AssignmentSubmission } from '../../data/types';
import { AssignmentStatus, SubmissionStatus } from '../../data/types';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';

const submissionStatusColors: Record<SubmissionStatus, string> = {
  [SubmissionStatus.PENDING_REVIEW]: 'bg-gray-100 text-gray-800',
  [SubmissionStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
  [SubmissionStatus.LATE]: 'bg-orange-100 text-orange-800',
  [SubmissionStatus.GRADED]: 'bg-green-100 text-green-800',
  [SubmissionStatus.RETURNED]: 'bg-purple-100 text-purple-800',
};

const AssignmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('assignments');
  const { assignments, submissions, loading, deleteAssignment } = useAssignmentsData();
  const { showToast } = useToast();

  const assignment = useMemo(() => {
    return assignments.find(a => a.id === id);
  }, [assignments, id]);

  const assignmentSubmissions = useMemo(() => {
    return submissions.filter(s => s.assignmentId === id);
  }, [submissions, id]);

  // Submission stats
  const stats = useMemo(() => {
    const total = assignmentSubmissions.length;
    const submitted = assignmentSubmissions.filter(
      s => s.status === SubmissionStatus.SUBMITTED || s.status === SubmissionStatus.LATE || s.status === SubmissionStatus.GRADED || s.status === SubmissionStatus.RETURNED
    ).length;
    const graded = assignmentSubmissions.filter(
      s => s.status === SubmissionStatus.GRADED || s.status === SubmissionStatus.RETURNED
    ).length;
    const notSubmitted = assignmentSubmissions.filter(
      s => s.status === SubmissionStatus.PENDING_REVIEW
    ).length;
    const late = assignmentSubmissions.filter(
      s => s.status === SubmissionStatus.LATE
    ).length;
    const avgScore = assignmentSubmissions.reduce((acc, s) => {
      if (s.score !== null && s.score !== undefined) {
        return acc + s.score;
      }
      return acc;
    }, 0) / (graded || 1);

    return { total, submitted, graded, notSubmitted, late, avgScore: graded > 0 ? Math.round(avgScore * 10) / 10 : 0 };
  }, [assignmentSubmissions]);

  // Handle delete
  const handleDelete = async () => {
    if (!assignment) return;
    if (!window.confirm(`Are you sure you want to delete "${assignment.title}"?`)) return;

    try {
      await deleteAssignment(assignment.id);
      showToast({
        type: 'success',
        message: 'Assignment deleted successfully.',
      });
      navigate('/assignments/all');
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to delete assignment.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">{t('common.loading')}</span>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Assignment not found</h3>
        <p className="mt-2 text-sm text-gray-500">The assignment you are looking for does not exist.</p>
        <Button className="mt-4" onClick={() => navigate('/assignments/all')}>
          Back to Assignments
        </Button>
      </div>
    );
  }

  const submissionColumns: DataGridColumn<AssignmentSubmission>[] = [
    {
      key: 'studentName',
      header: t('submission.fields.student'),
      sortable: true,
      width: 180,
      render: (value) => value || 'Unknown Student',
    },
    {
      key: 'status',
      header: t('submission.fields.status'),
      sortable: true,
      width: 140,
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
      width: 100,
      render: (value, item) => value !== null && value !== undefined ? `${value} / ${item.maxScore || assignment.maxScore}` : '-',
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
        <span className="text-sm text-gray-600 truncate block max-w-xs" title={value || ''}>
          {value || '-'}
        </span>
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
            onClick={() => navigate('/assignments/all')}
            leftIcon={<ArrowLeftIcon className="w-5 h-5" />}
          >
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{assignment.subjectName} - {assignment.classStreamName}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/assignments/${assignment.id}/edit`)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            {t('assignment.actions.edit')}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/assignments/${assignment.id}/grading`)}
            leftIcon={<ClipboardDocumentCheckIcon className="w-4 h-4" />}
          >
            Grade Submissions
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            {t('assignment.actions.delete')}
          </Button>
        </div>
      </div>

      {/* Assignment Details Card */}
      <Card title="Assignment Details" variant="default">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {t('assignment.fields.description')}
            </label>
            <p className="text-sm text-gray-900">{assignment.description || 'No description provided.'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {t('assignment.fields.instructions')}
            </label>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{assignment.instructions || 'No instructions provided.'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {t('assignment.fields.teacher')}
            </label>
            <p className="text-sm text-gray-900">{assignment.teacherName || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {t('assignment.fields.status')}
            </label>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              assignment.status === AssignmentStatus.DRAFT ? 'bg-gray-100 text-gray-800' :
              assignment.status === AssignmentStatus.PUBLISHED ? 'bg-blue-100 text-blue-800' :
              assignment.status === AssignmentStatus.ARCHIVED ? 'bg-orange-100 text-orange-800' :
              'bg-green-100 text-green-800'
            }`}>
              {t(`assignment.status.${assignment.status}`)}
            </span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {t('assignment.fields.assignedDate')}
            </label>
            <p className="text-sm text-gray-900">
              {new Date(assignment.assignedDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {t('assignment.fields.dueDate')}
            </label>
            <p className="text-sm text-gray-900">
              {new Date(assignment.dueDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {t('assignment.fields.maxScore')}
            </label>
            <p className="text-sm text-gray-900">{assignment.maxScore ? `${assignment.maxScore} points` : 'N/A'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {t('assignment.fields.weightPercentage')}
            </label>
            <p className="text-sm text-gray-900">{assignment.weightPercentage ? `${assignment.weightPercentage}%` : 'N/A'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {t('assignment.fields.allowLateSubmission')}
            </label>
            <p className="text-sm text-gray-900">
              {assignment.allowLateSubmission ? 'Yes' : 'No'}
              {assignment.latePenaltyPercentage ? ` (${assignment.latePenaltyPercentage}% penalty)` : ''}
            </p>
          </div>
        </div>
      </Card>

      {/* Submission Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="compact">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Submissions</p>
            </div>
          </div>
        </Card>
        <Card variant="compact">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.submitted}</p>
              <p className="text-xs text-gray-500">Submitted</p>
            </div>
          </div>
        </Card>
        <Card variant="compact">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.late}</p>
              <p className="text-xs text-gray-500">Late</p>
            </div>
          </div>
        </Card>
        <Card variant="compact">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.graded}</p>
              <p className="text-xs text-gray-500">Graded</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Average Score */}
      {stats.graded > 0 && (
        <Card title="Average Score" variant="compact">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Class Average</span>
                <span className="text-lg font-bold text-gray-900">{stats.avgScore}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    stats.avgScore >= 80 ? 'bg-green-500' :
                    stats.avgScore >= 60 ? 'bg-blue-500' :
                    stats.avgScore >= 40 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(stats.avgScore, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Submissions Table */}
      <Card title={t('submission.plural')} subtitle={`${assignmentSubmissions.length} submissions for this assignment`}>
        <DataGrid
          columns={submissionColumns}
          data={assignmentSubmissions}
          sortable
          filterable={false}
          emptyState={
            <div className="text-center py-8">
              <UsersIcon className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Students have not submitted their work yet.
              </p>
            </div>
          }
        />
      </Card>
    </div>
  );
};

export default AssignmentDetailPage;
