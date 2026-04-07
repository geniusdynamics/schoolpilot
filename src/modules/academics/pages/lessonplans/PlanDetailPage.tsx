import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import Textarea from '@/components/ui/Textarea';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Spinner from '@/components/ui/Spinner';
import {
  ArrowLeftIcon,
  EditIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  BookOpenIcon,
  ClockIcon,
  UserCircleIcon,
} from '@/components/ui/icons';
import { useLessonPlansData } from '../../data/lessonplans/useLessonPlansData';
import { WeeklyPlan, PlanStatus, DayPlan } from '../../data/types';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';

const statusColors: Record<PlanStatus, string> = {
  [PlanStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [PlanStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
  [PlanStatus.APPROVED]: 'bg-green-100 text-green-800',
  [PlanStatus.REJECTED]: 'bg-red-100 text-red-800',
};

const statusLabels: Record<PlanStatus, string> = {
  [PlanStatus.DRAFT]: 'Draft',
  [PlanStatus.SUBMITTED]: 'Submitted',
  [PlanStatus.APPROVED]: 'Approved',
  [PlanStatus.REJECTED]: 'Rejected',
};

const PlanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('lessonplans');
  const { weeklyPlans, loading, updateWeeklyPlan, submitPlan, reviewPlan } = useLessonPlansData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const plan = useMemo(() => {
    return weeklyPlans.find(p => p.id === id) || null;
  }, [weeklyPlans, id]);

  useEffect(() => {
    if (!loading && !plan && id) {
      showToast({
        type: 'error',
        message: 'Weekly plan not found.',
      });
    }
  }, [plan, loading, id, showToast]);

  const handleBack = () => {
    navigate('/lessonplans/weekly');
  };

  const handleEdit = () => {
    navigate(`/lessonplans/weekly/${id}/edit`);
  };

  const handleSubmitForApproval = async () => {
    if (!plan) return;
    setIsSubmitting(true);
    try {
      await submitPlan(plan.id, plan.teacherName || 'Teacher');
      showToast({
        type: 'success',
        message: 'Plan submitted for approval successfully.',
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to submit plan for approval.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!plan) return;
    setIsSubmitting(true);
    try {
      await reviewPlan(plan.id, true, 'CURRENT_USER', 'Current User');
      showToast({
        type: 'success',
        message: 'Plan approved successfully.',
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to approve plan.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!plan || !rejectionReason.trim()) {
      showToast({
        type: 'warning',
        message: 'Please provide a reason for rejection.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await reviewPlan(plan.id, false, 'CURRENT_USER', 'Current User', rejectionReason);
      showToast({
        type: 'success',
        message: 'Plan rejected with feedback.',
      });
      setRejectModalOpen(false);
      setRejectionReason('');
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to reject plan.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Plan not found</h3>
        <p className="mt-1 text-sm text-gray-500">The weekly plan you're looking for doesn't exist.</p>
        <Button onClick={handleBack} className="mt-4">
          Back to Weekly Plans
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'days', label: `Day Plans (${plan.dayPlans?.length || 0})` },
    { id: 'history', label: 'Approval History' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleBack} leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Weekly Plan #{plan.id}
            </h1>
            <p className="text-sm text-gray-500">
              {plan.subjectName} - {plan.classStreamName}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {plan.status === PlanStatus.DRAFT && (
            <>
              <Button variant="outline" onClick={handleEdit} leftIcon={<EditIcon className="w-4 h-4" />}>
                Edit
              </Button>
              <Button
                onClick={handleSubmitForApproval}
                disabled={isSubmitting}
                leftIcon={<PaperAirplaneIcon className="w-4 h-4" />}
              >
                {isSubmitting ? 'Submitting...' : t('weeklyPlan.actions.submit')}
              </Button>
            </>
          )}
          {plan.status === PlanStatus.SUBMITTED && (
            <>
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={isSubmitting}
                leftIcon={<CheckCircleIcon className="w-4 h-4" />}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
              <Button
                variant="danger"
                onClick={() => setRejectModalOpen(true)}
                disabled={isSubmitting}
                leftIcon={<XCircleIcon className="w-4 h-4" />}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg ${statusColors[plan.status]}`}>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Status: {statusLabels[plan.status]}</span>
          <span className="text-sm">
            {plan.weekStartDate && plan.weekEndDate && (
              <>Week: {new Date(plan.weekStartDate).toLocaleDateString()} - {new Date(plan.weekEndDate).toLocaleDateString()}</>
            )}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plan Header Card */}
            <Card title="Plan Information">
              <div className="p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-600">Week:</span>
                    <p className="font-medium">
                      {new Date(plan.weekStartDate).toLocaleDateString()} - {new Date(plan.weekEndDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpenIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-600">Subject:</span>
                    <p className="font-medium">{plan.subjectName || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <UserCircleIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-600">Teacher:</span>
                    <p className="font-medium">{plan.teacherName || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-600">Class:</span>
                    <p className="font-medium">{plan.classStreamName || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Objectives Card */}
            <Card title="Overall Objectives">
              <div className="p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{plan.overallObjectives}</p>
              </div>
            </Card>

            {/* Teaching Aids */}
            <Card title="Teaching Aids">
              <div className="p-4">
                <p className="text-gray-700">{plan.teachingAids || 'No teaching aids specified.'}</p>
              </div>
            </Card>

            {/* References */}
            <Card title="References">
              <div className="p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{plan.references || 'No references specified.'}</p>
              </div>
            </Card>

            {/* Summary Stats */}
            <Card title="Summary" className="lg:col-span-2">
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{plan.dayPlans?.length || 0}</p>
                  <p className="text-sm text-gray-500">Day Plans</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {plan.dayPlans?.reduce((acc, day) => {
                      const periods = day.periodPlans?.length || 0;
                      return acc + periods;
                    }, 0) || 0}
                  </p>
                  <p className="text-sm text-gray-500">Periods</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {plan.dayPlans?.reduce((acc, day) => {
                      const topics = day.topics ? day.topics.split(',').length : 0;
                      return acc + topics;
                    }, 0) || 0}
                  </p>
                  <p className="text-sm text-gray-500">Topics</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {plan.submittedAt ? new Date(plan.submittedAt).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">Submitted</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'days' && (
          <div className="space-y-4">
            {!plan.dayPlans || plan.dayPlans.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No day plans yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add day plans to this weekly plan.
                  </p>
                </div>
              </Card>
            ) : (
              plan.dayPlans.map((day: DayPlan) => (
                <Card key={day.id} title={`${day.dayOfWeek} - ${new Date(day.date).toLocaleDateString()}`}>
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Topics</h4>
                      <p className="text-gray-600">{day.topics || 'No topics specified.'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Objectives</h4>
                      <p className="text-gray-600">{day.objectives || 'No objectives specified.'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Activities</h4>
                      <p className="text-gray-600">{day.activities || 'No activities specified.'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Assessment</h4>
                      <p className="text-gray-600">{day.assessment || 'No assessment specified.'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Homework</h4>
                      <p className="text-gray-600">{day.homework || 'No homework assigned.'}</p>
                    </div>

                    {/* Period Plans */}
                    {day.periodPlans && day.periodPlans.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Period Plans</h4>
                        <div className="space-y-2">
                          {day.periodPlans.map((period) => (
                            <div key={period.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{period.periodName || `Period ${period.periodId}`}</span>
                                <span className="text-xs text-gray-500">
                                  {period.periodStartTime} - {period.periodEndTime} ({period.duration} min)
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{period.topicDetail}</p>
                              {period.teachingMethod && (
                                <p className="text-xs text-gray-500 mt-1">Method: {period.teachingMethod}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <Card title="Approval History">
            <div className="p-4">
              <div className="border-l-2 border-gray-200 ml-3 space-y-6">
                {/* Created */}
                <div className="relative pl-8">
                  <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-gray-400" />
                  <p className="font-medium">Plan Created</p>
                  <p className="text-sm text-gray-500">{formatDate(plan.createdAt)}</p>
                </div>

                {/* Submitted */}
                {plan.submittedAt && (
                  <div className="relative pl-8">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500" />
                    <p className="font-medium">Submitted for Review</p>
                    <p className="text-sm text-gray-500">{formatDate(plan.submittedAt)}</p>
                    {plan.submittedByName && (
                      <p className="text-sm text-gray-600">By: {plan.submittedByName}</p>
                    )}
                  </div>
                )}

                {/* Reviewed */}
                {plan.reviewedAt && (
                  <div className="relative pl-8">
                    <div className={`absolute -left-2 top-0 w-4 h-4 rounded-full ${
                      plan.status === PlanStatus.APPROVED ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <p className="font-medium">
                      {plan.status === PlanStatus.APPROVED ? 'Approved' : 'Rejected'}
                    </p>
                    <p className="text-sm text-gray-500">{formatDate(plan.reviewedAt)}</p>
                    {plan.reviewedByName && (
                      <p className="text-sm text-gray-600">By: {plan.reviewedByName}</p>
                    )}
                    {plan.reviewComments && (
                      <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Comments:</span> {plan.reviewComments}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Updated */}
                {plan.updatedAt !== plan.createdAt && (
                  <div className="relative pl-8">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-yellow-500" />
                    <p className="font-medium">Last Updated</p>
                    <p className="text-sm text-gray-500">{formatDate(plan.updatedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </Tabs>

      {/* Reject Dialog */}
      <DialogForm
        open={rejectModalOpen}
        onClose={() => { setRejectModalOpen(false); setRejectionReason(''); }}
        title="Reject Plan"
        size="md"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={() => { setRejectModalOpen(false); setRejectionReason(''); }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Confirm Reject'}
            </Button>
          </FormActions>
        }
      >
        <FormSection>
          <FormField label="Rejection Reason" required>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide detailed feedback for the teacher..."
              rows={4}
            />
          </FormField>
        </FormSection>
      </DialogForm>
    </div>
  );
};

export default PlanDetailPage;
