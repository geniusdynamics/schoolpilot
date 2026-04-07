import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  UsersIcon,
  CheckIcon,
} from '@/components/ui/icons';
import { useAssignmentsData } from '../../data/useAssignmentsData';
import type { AssignmentSubmission } from '../../data/types';
import { SubmissionStatus } from '../../data/types';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';

const submissionStatusColors: Record<SubmissionStatus, string> = {
  [SubmissionStatus.NOT_SUBMITTED]: 'bg-gray-100 text-gray-800',
  [SubmissionStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
  [SubmissionStatus.LATE]: 'bg-orange-100 text-orange-800',
  [SubmissionStatus.GRADED]: 'bg-green-100 text-green-800',
  [SubmissionStatus.RETURNED]: 'bg-purple-100 text-purple-800',
};

interface GradingState {
  score: string;
  grade: string;
  feedback: string;
}

const AssignmentGradingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('assignments');
  const { assignments, submissions, gradeSubmission } = useAssignmentsData();
  const { showToast } = useToast();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkGrading, setBulkGrading] = useState(false);
  const [bulkScore, setBulkScore] = useState('');
  const [bulkGrade, setBulkGrade] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState('');

  // Inline grading state: key is submission id
  const [gradingState, setGradingState] = useState<Record<string, GradingState>>({});

  const assignment = useMemo(() => {
    return assignments.find(a => a.id === id);
  }, [assignments, id]);

  // Only show submissions that need grading
  const submissionsToGrade = useMemo(() => {
    return submissions.filter(
      s => s.assignmentId === id && (s.status === SubmissionStatus.SUBMITTED || s.status === SubmissionStatus.LATE)
    );
  }, [submissions, id]);

  // Already graded submissions
  const gradedSubmissions = useMemo(() => {
    return submissions.filter(
      s => s.assignmentId === id && (s.status === SubmissionStatus.GRADED || s.status === SubmissionStatus.RETURNED)
    );
  }, [submissions, id]);

  const totalToGrade = submissionsToGrade.length;
  const alreadyGraded = gradedSubmissions.length;
  const progressPercentage = totalToGrade + alreadyGraded > 0
    ? Math.round((alreadyGraded / (totalToGrade + alreadyGraded)) * 100)
    : 0;

  // Initialize grading state for new submissions
  useEffect(() => {
    const newGradingState: Record<string, GradingState> = {};
    submissionsToGrade.forEach(sub => {
      if (!gradingState[sub.id]) {
        newGradingState[sub.id] = {
          score: '',
          grade: '',
          feedback: '',
        };
      }
    });
    if (Object.keys(newGradingState).length > 0) {
      setGradingState(prev => ({ ...prev, ...newGradingState }));
    }
  }, [submissionsToGrade]);

  // Update grading state
  const updateGradingState = useCallback((submissionId: string, field: keyof GradingState, value: string) => {
    setGradingState(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value,
      },
    }));
  }, []);

  // Auto-save on blur
  const handleBlur = useCallback(async (submission: AssignmentSubmission) => {
    const state = gradingState[submission.id];
    if (!state || !state.score) return;

    const score = parseFloat(state.score);
    if (isNaN(score) || score < 0) return;

    try {
      await gradeSubmission(submission.id, {
        score,
        maxScore: submission.maxScore || assignment?.maxScore || 100,
        grade: state.grade || '',
        feedback: state.feedback || undefined,
        gradedBy: 'current-user',
        gradedByName: 'Current User',
      });
      showToast({
        type: 'success',
        message: `Saved grade for ${submission.studentName || 'student'}.`,
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to save grade.',
      });
    }
  }, [gradingState, assignment, gradeSubmission, showToast]);

  // Save single submission
  const handleSaveGrade = useCallback(async (submission: AssignmentSubmission) => {
    const state = gradingState[submission.id];
    if (!state) return;

    const score = parseFloat(state.score);
    if (isNaN(score) || score < 0) {
      showToast({
        type: 'error',
        message: 'Please enter a valid score.',
      });
      return;
    }

    try {
      await gradeSubmission(submission.id, {
        score,
        maxScore: submission.maxScore || assignment?.maxScore || 100,
        grade: state.grade || '',
        feedback: state.feedback || undefined,
        gradedBy: 'current-user',
        gradedByName: 'Current User',
      });
      showToast({
        type: 'success',
        message: `Grade saved for ${submission.studentName || 'student'}.`,
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to save grade.',
      });
    }
  }, [gradingState, assignment, gradeSubmission, showToast]);

  // Bulk selection
  const handleSelectionChange = useCallback((selected: AssignmentSubmission[]) => {
    setSelectedIds(new Set(selected.map(s => s.id)));
  }, []);

  // Bulk grade action
  const handleBulkGrade = useCallback(async () => {
    if (selectedIds.size === 0) {
      showToast({ type: 'warning', message: 'No submissions selected.' });
      return;
    }

    const score = parseFloat(bulkScore);
    if (isNaN(score) || score < 0) {
      showToast({ type: 'error', message: 'Please enter a valid score for bulk grading.' });
      return;
    }

    setBulkGrading(true);
    let successCount = 0;

    for (const subId of selectedIds) {
      const submission = submissionsToGrade.find(s => s.id === subId);
      if (!submission) continue;

      try {
        await gradeSubmission(subId, {
          score,
          maxScore: submission.maxScore || assignment?.maxScore || 100,
          grade: bulkGrade || '',
          feedback: bulkFeedback || undefined,
          gradedBy: 'current-user',
          gradedByName: 'Current User',
        });
        successCount++;
      } catch (error) {
        console.error('Failed to grade submission:', subId);
      }
    }

    setBulkGrading(false);
    setSelectedIds(new Set());
    setBulkScore('');
    setBulkGrade('');
    setBulkFeedback('');

    showToast({
      type: successCount > 0 ? 'success' : 'error',
      message: `Successfully graded ${successCount} of ${selectedIds.size} submissions.`,
    });
  }, [selectedIds, bulkScore, bulkGrade, bulkFeedback, submissionsToGrade, assignment, gradeSubmission, showToast]);

  // Columns for submissions to grade
  const gradingColumns: DataGridColumn<AssignmentSubmission>[] = [
    {
      key: 'studentName',
      header: t('submission.fields.student'),
      sortable: true,
      width: 180,
      render: (value, item) => (
        <div>
          <span className="font-medium">{value || 'Unknown'}</span>
          {item.isLate && (
            <span className="ml-1 text-xs text-orange-600">(Late)</span>
          )}
        </div>
      ),
    },
    {
      key: 'submissionDate',
      header: t('submission.fields.submissionDate'),
      sortable: true,
      width: 150,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      key: 'score',
      header: `${t('submission.fields.score')} (/${assignment?.maxScore || 100})`,
      sortable: false,
      width: 140,
      render: (_, item) => (
        <Input
          type="number"
          min="0"
          max={assignment?.maxScore || 100}
          value={gradingState[item.id]?.score || ''}
          onChange={(e) => updateGradingState(item.id, 'score', e.target.value)}
          onBlur={() => handleBlur(item)}
          placeholder="Score"
          className="w-20"
        />
      ),
    },
    {
      key: 'grade',
      header: t('submission.fields.grade'),
      sortable: false,
      width: 100,
      render: (_, item) => (
        <Input
          value={gradingState[item.id]?.grade || ''}
          onChange={(e) => updateGradingState(item.id, 'grade', e.target.value)}
          onBlur={() => handleBlur(item)}
          placeholder="A, B+, etc."
          className="w-16"
        />
      ),
    },
    {
      key: 'feedback',
      header: t('submission.fields.feedback'),
      sortable: false,
      width: 280,
      render: (_, item) => (
        <Textarea
          value={gradingState[item.id]?.feedback || ''}
          onChange={(e) => updateGradingState(item.id, 'feedback', e.target.value)}
          onBlur={() => handleBlur(item)}
          placeholder="Enter feedback..."
          className="w-full text-sm"
          rows={1}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Save',
      sortable: false,
      filterable: false,
      width: 100,
      render: (_, item) => (
        <Button
          size="sm"
          variant="primary"
          onClick={() => handleSaveGrade(item)}
          leftIcon={<CheckIcon className="w-4 h-4" />}
          disabled={!gradingState[item.id]?.score}
        >
          Save
        </Button>
      ),
    },
  ];

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Assignment not found</h3>
        <Button className="mt-4" onClick={() => navigate('/assignments/all')}>
          Back to Assignments
        </Button>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">
              Grade Submissions
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {assignment.title} - {assignment.subjectName}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <Card variant="compact">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <UsersIcon className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">
                {alreadyGraded} of {totalToGrade + alreadyGraded} graded
              </span>
            </div>
          </div>
          <span className="text-sm font-medium text-gray-900">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              progressPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </Card>

      {/* Bulk Actions */}
      {submissionsToGrade.length > 0 && (
        <Card title="Bulk Grading" subtitle="Select submissions and grade them all at once">
          <DataGrid
            columns={[
              {
                key: 'studentName',
                header: t('submission.fields.student'),
                sortable: true,
                width: 180,
                render: (value, item) => (
                  <span>
                    {value || 'Unknown'}
                    {item.isLate && <span className="ml-1 text-xs text-orange-600">(Late)</span>}
                  </span>
                ),
              },
              {
                key: 'submissionDate',
                header: t('submission.fields.submissionDate'),
                sortable: true,
                width: 150,
                render: (value) => value ? new Date(value).toLocaleDateString() : '-',
              },
              {
                key: 'status',
                header: t('submission.fields.status'),
                sortable: true,
                width: 120,
                render: (value: SubmissionStatus) => (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${submissionStatusColors[value]}`}>
                    {t(`submission.status.${value}`)}
                  </span>
                ),
              },
            ]}
            data={submissionsToGrade}
            sortable
            selectable
            onSelectionChange={handleSelectionChange}
            filterable={false}
          />

          {selectedIds.size > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <p className="text-sm font-medium text-gray-900">
                Grading {selectedIds.size} submission(s)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Score *</label>
                  <Input
                    type="number"
                    value={bulkScore}
                    onChange={(e) => setBulkScore(e.target.value)}
                    placeholder="Score"
                    min="0"
                    max={assignment.maxScore || 100}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Grade</label>
                  <Input
                    value={bulkGrade}
                    onChange={(e) => setBulkGrade(e.target.value)}
                    placeholder="A, B+, etc."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Feedback</label>
                  <Input
                    value={bulkFeedback}
                    onChange={(e) => setBulkFeedback(e.target.value)}
                    placeholder="Optional feedback"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedIds(new Set());
                    setBulkScore('');
                    setBulkGrade('');
                    setBulkFeedback('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleBulkGrade}
                  disabled={bulkGrading || !bulkScore}
                  leftIcon={<CheckCircleIcon className="w-4 h-4" />}
                >
                  {bulkGrading ? 'Grading...' : `Mark ${selectedIds.size} as Graded`}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Inline Grading */}
      <Card
        title="Inline Grading"
        subtitle="Enter scores and feedback directly. Grades auto-save when you leave a field."
      >
        {submissionsToGrade.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              All submissions have been graded!
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no pending submissions to grade.
            </p>
          </div>
        ) : (
          <DataGrid
            columns={gradingColumns}
            data={submissionsToGrade}
            sortable={false}
            filterable={false}
          />
        )}
      </Card>

      {/* Already Graded */}
      {gradedSubmissions.length > 0 && (
        <Card title="Already Graded" subtitle={`${gradedSubmissions.length} submissions already graded`}>
          <DataGrid
            columns={[
              {
                key: 'studentName',
                header: t('submission.fields.student'),
                sortable: true,
                width: 180,
                render: (value) => value || 'Unknown',
              },
              {
                key: 'score',
                header: t('submission.fields.score'),
                sortable: true,
                width: 120,
                render: (value, item) => value !== null && value !== undefined
                  ? `${value} / ${item.maxScore || assignment.maxScore}`
                  : '-',
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
              {
                key: 'gradedByName',
                header: 'Graded By',
                sortable: true,
                width: 140,
                render: (value) => value || '-',
              },
            ]}
            data={gradedSubmissions}
            sortable
            filterable={false}
          />
        </Card>
      )}
    </div>
  );
};

export default AssignmentGradingPage;
