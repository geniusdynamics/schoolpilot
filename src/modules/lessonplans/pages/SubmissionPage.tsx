import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormActions from '@/components/ui/forms/FormActions';
import {
  PaperAirplaneIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  BookOpenIcon,
  ClockIcon,
  UserCircleIcon,
} from '@/components/ui/icons';
import { useLessonPlansData } from '../data/useLessonPlansData';
import { WeeklyPlan, PlanStatus } from '../data/types';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';

const statusColors: Record<PlanStatus, string> = {
  [PlanStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [PlanStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
  [PlanStatus.APPROVED]: 'bg-green-100 text-green-800',
  [PlanStatus.REJECTED]: 'bg-red-100 text-red-800',
};

const SubmissionPage: React.FC = () => {
  const { t } = useTranslation('lessonplans');
  const { weeklyPlans, loading, submitPlan, getPlansByStatus } = useLessonPlansData();
  const { showToast } = useToast();

  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmittedList, setShowSubmittedList] = useState(false);

  const draftPlans = useMemo(() => {
    return getPlansByStatus(PlanStatus.DRAFT);
  }, [getPlansByStatus]);

  const submittedPlans = useMemo(() => {
    return getPlansByStatus(PlanStatus.SUBMITTED);
  }, [getPlansByStatus]);

  const handleSelectAll = () => {
    if (selectedPlans.size === draftPlans.length) {
      setSelectedPlans(new Set());
    } else {
      setSelectedPlans(new Set(draftPlans.map(p => p.id)));
    }
  };

  const handleSelectPlan = (planId: string) => {
    const newSelected = new Set(selectedPlans);
    if (newSelected.has(planId)) {
      newSelected.delete(planId);
    } else {
      newSelected.add(planId);
    }
    setSelectedPlans(newSelected);
  };

  const handleSubmitClick = () => {
    if (selectedPlans.size === 0) {
      showToast({
        type: 'warning',
        message: 'Please select at least one plan to submit.',
      });
      return;
    }
    setConfirmModalOpen(true);
  };

  const confirmSubmission = async () => {
    if (selectedPlans.size === 0) return;

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const planId of selectedPlans) {
      try {
        const plan = weeklyPlans.find(p => p.id === planId);
        await submitPlan(planId, plan?.teacherName || 'Teacher');
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    if (successCount > 0) {
      showToast({
        type: 'success',
        message: `${successCount} plan(s) submitted successfully.`,
      });
    }

    if (errorCount > 0) {
      showToast({
        type: 'error',
        message: `${errorCount} plan(s) failed to submit.`,
      });
    }

    setSelectedPlans(new Set());
    setConfirmModalOpen(false);
    setIsSubmitting(false);
    setShowSubmittedList(true);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const stats = [
    {
      label: 'Draft Plans',
      value: draftPlans.length,
      color: 'bg-gray-100 text-gray-800',
      icon: <CalendarDaysIcon className="w-6 h-6" />,
    },
    {
      label: 'Selected',
      value: selectedPlans.size,
      color: 'bg-blue-100 text-blue-800',
      icon: <CheckCircleIcon className="w-6 h-6" />,
    },
    {
      label: 'Submitted (This Session)',
      value: isSubmitting ? '...' : '0',
      color: 'bg-green-100 text-green-800',
      icon: <PaperAirplaneIcon className="w-6 h-6" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('submission.title', 'Submit Plans for Approval')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Select draft plans to submit for approval review.
          </p>
        </div>
        <Button
          onClick={handleSubmitClick}
          disabled={selectedPlans.size === 0 || isSubmitting}
          leftIcon={<PaperAirplaneIcon className="w-5 h-5" />}
        >
          {isSubmitting ? 'Submitting...' : `Submit ${selectedPlans.size} Plan(s)`}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="p-4 flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Draft Plans Selection */}
      <Card
        title="Draft Plans"
        subtitle={`Select plans to submit for approval (${draftPlans.length} available)`}
        actions={
          draftPlans.length > 0 ? (
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedPlans.size === draftPlans.length && draftPlans.length > 0}
                onChange={handleSelectAll}
                label="Select All"
              />
            </div>
          ) : null
        }
      >
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading plans...</div>
        ) : draftPlans.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No draft plans</h3>
            <p className="mt-1 text-sm text-gray-500">
              All plans have been submitted or there are no plans yet.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {draftPlans.map((plan) => (
              <div
                key={plan.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedPlans.has(plan.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => handleSelectPlan(plan.id)}
              >
                <div className="flex items-start space-x-4">
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedPlans.has(plan.id)}
                      onChange={() => handleSelectPlan(plan.id)}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{plan.id}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[plan.status]}`}>
                          Draft
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Created: {formatDate(plan.createdAt)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center space-x-1">
                        <BookOpenIcon className="w-4 h-4 text-gray-400" />
                        <span>{plan.subjectName || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <UserCircleIcon className="w-4 h-4 text-gray-400" />
                        <span>{plan.teacherName || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                        <span>{plan.classStreamName || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(plan.weekStartDate)} - {formatDate(plan.weekEndDate)}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-1">
                      {plan.overallObjectives}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Submitted Plans List (shown after submission) */}
      {showSubmittedList && submittedPlans.length > 0 && (
        <Card
          title="Recently Submitted Plans"
          subtitle="Plans that have been submitted for approval"
        >
          <div className="divide-y">
            {submittedPlans.map((plan) => (
              <div key={plan.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{plan.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[plan.status]}`}>
                      {plan.status}
                    </span>
                  </div>
                  {plan.submittedAt && (
                    <span className="text-sm text-gray-500">
                      Submitted: {formatDate(plan.submittedAt)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Subject:</span> {plan.subjectName || 'N/A'}
                  </div>
                  <div>
                    <span className="text-gray-600">Teacher:</span> {plan.teacherName || 'N/A'}
                  </div>
                  <div>
                    <span className="text-gray-600">Class:</span> {plan.classStreamName || 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <DialogForm
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Submission"
        size="md"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={() => setConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmSubmission}
              disabled={isSubmitting}
              leftIcon={<PaperAirplaneIcon className="w-4 h-4" />}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Plans'}
            </Button>
          </FormActions>
        }
      >
        <FormSection>
          <p className="text-gray-700 mb-4">
            You are about to submit <strong>{selectedPlans.size} plan(s)</strong> for approval.
            Once submitted, they will be reviewed by the Head of Department.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Selected Plans:</h4>
            <ul className="space-y-1">
              {Array.from(selectedPlans).map(planId => {
                const plan = weeklyPlans.find(p => p.id === planId);
                return plan ? (
                  <li key={planId} className="text-sm text-blue-800">
                    {plan.id} - {plan.subjectName} ({plan.classStreamName})
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        </FormSection>
      </DialogForm>
    </div>
  );
};

export default SubmissionPage;
