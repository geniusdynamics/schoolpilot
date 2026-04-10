import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  UsersIcon,
  CalendarDaysIcon,
  BookOpenIcon,
  UserCircleIcon,
  EyeIcon,
  ExclamationTriangleIcon,
} from '@/components/ui/icons';
import { useLessonPlansData } from '../../data/lessonplans/useLessonPlansData';
import { WeeklyPlan, PlanStatus } from '../../data/types';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

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

const ApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('lessonplans');
  const { weeklyPlans, loading, reviewPlan, getPlansByStatus } = useLessonPlansData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [planToReject, setPlanToReject] = useState<WeeklyPlan | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<WeeklyPlan | null>(null);

  const submittedPlans = useMemo(() => {
    return getPlansByStatus(PlanStatus.SUBMITTED);
  }, [getPlansByStatus]);

  const approvedPlans = useMemo(() => {
    return getPlansByStatus(PlanStatus.APPROVED);
  }, [getPlansByStatus]);

  const rejectedPlans = useMemo(() => {
    return getPlansByStatus(PlanStatus.REJECTED);
  }, [getPlansByStatus]);

  // Calculate stats for the current week
  const currentWeekStart = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }, []);

  const approvedThisWeek = useMemo(() => {
    return approvedPlans.filter(p => p.reviewedAt && p.reviewedAt >= currentWeekStart);
  }, [approvedPlans, currentWeekStart]);

  const rejectedThisWeek = useMemo(() => {
    return rejectedPlans.filter(p => p.reviewedAt && p.reviewedAt >= currentWeekStart);
  }, [rejectedPlans, currentWeekStart]);

  const handleView = (plan: WeeklyPlan) => {
    setViewingPlan(plan);
    setViewModalOpen(true);
  };

  const handleApprove = async (plan: WeeklyPlan) => {
    setIsSubmitting(true);
    try {
      await reviewPlan(plan.id, true, 'CURRENT_USER', 'Current User');
      showToast({
        type: 'success',
        message: `Plan ${plan.id} approved successfully.`,
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

  const openRejectModal = (plan: WeeklyPlan) => {
    setPlanToReject(plan);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!planToReject || !rejectionReason.trim()) {
      showToast({
        type: 'warning',
        message: 'Please provide a reason for rejection.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await reviewPlan(planToReject.id, false, 'CURRENT_USER', 'Current User', rejectionReason);
      showToast({
        type: 'success',
        message: `Plan ${planToReject.id} rejected with feedback.`,
      });
      setRejectModalOpen(false);
      setPlanToReject(null);
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

  const handleViewDetail = (plan: WeeklyPlan) => {
    navigate(`/lessonplans/weekly/${plan.id}`);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = [
    {
      label: 'Pending Approval',
      value: submittedPlans.length,
      color: 'bg-blue-100 text-blue-800',
      icon: <ClockIcon className="w-6 h-6" />,
    },
    {
      label: 'Approved This Week',
      value: approvedThisWeek.length,
      color: 'bg-green-100 text-green-800',
      icon: <CheckCircleIcon className="w-6 h-6" />,
    },
    {
      label: 'Rejected This Week',
      value: rejectedThisWeek.length,
      color: 'bg-red-100 text-red-800',
      icon: <XCircleIcon className="w-6 h-6" />,
    },
    {
      label: 'Total Plans',
      value: weeklyPlans.length,
      color: 'bg-gray-100 text-gray-800',
      icon: <ChartBarIcon className="w-6 h-6" />,
    },
  ];

  const pendingColumns: DataGridColumn<WeeklyPlan>[] = [
    {
      key: 'id',
      header: 'Plan ID',
      sortable: true,
      width: 100,
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: 'subjectName',
      header: 'Subject',
      sortable: true,
      width: 140,
      render: (value) => value || 'N/A',
    },
    {
      key: 'classStreamName',
      header: 'Class',
      sortable: true,
      width: 120,
      render: (value) => value || 'N/A',
    },
    {
      key: 'teacherName',
      header: 'Teacher',
      sortable: true,
      width: 140,
      render: (value) => value || 'N/A',
    },
    {
      key: 'weekStartDate',
      header: 'Week',
      sortable: true,
      width: 180,
      render: (_, item) => (
        <span className="text-sm">
          {formatDate(item.weekStartDate)} - {formatDate(item.weekEndDate)}
        </span>
      ),
    },
    {
      key: 'submittedAt',
      header: 'Submitted',
      sortable: true,
      width: 140,
      render: (value) => value ? formatDateTime(value) : 'N/A',
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 250,
      sticky: 'right',
      render: (_, item) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleView(item)}
            leftIcon={<EyeIcon className="w-4 h-4" />}
          >
            Preview
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleViewDetail(item)}
            leftIcon={<EyeIcon className="w-4 h-4" />}
          >
            Detail
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleApprove(item)}
            disabled={isSubmitting}
            leftIcon={<CheckCircleIcon className="w-4 h-4" />}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => openRejectModal(item)}
            disabled={isSubmitting}
            leftIcon={<XCircleIcon className="w-4 h-4" />}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  const historyColumns: DataGridColumn<WeeklyPlan>[] = [
    {
      key: 'id',
      header: 'Plan ID',
      sortable: true,
      width: 100,
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: 'subjectName',
      header: 'Subject',
      sortable: true,
      width: 140,
      render: (value) => value || 'N/A',
    },
    {
      key: 'classStreamName',
      header: 'Class',
      sortable: true,
      width: 120,
      render: (value) => value || 'N/A',
    },
    {
      key: 'teacherName',
      header: 'Teacher',
      sortable: true,
      width: 140,
      render: (value) => value || 'N/A',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: 120,
      render: (value: PlanStatus) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value]}`}>
          {statusLabels[value]}
        </span>
      ),
    },
    {
      key: 'reviewedAt',
      header: 'Reviewed',
      sortable: true,
      width: 140,
      render: (value) => value ? formatDateTime(value) : 'N/A',
    },
    {
      key: 'reviewedByName',
      header: 'Reviewed By',
      sortable: true,
      width: 180,
      render: (value) => value || 'N/A',
    },
    {
      key: 'reviewComments',
      header: 'Comments',
      sortable: false,
      width: 250,
      render: (value) => (
        <span className="text-sm text-gray-600 line-clamp-2">{value || 'N/A'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 120,
      sticky: 'right',
      render: (_, item) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleViewDetail(item)}
          leftIcon={<EyeIcon className="w-4 h-4" />}
        >
          View
        </Button>
      ),
    },
  ];

  const tabs = [
    { id: 'pending', label: `Pending (${submittedPlans.length})` },
    { id: 'approved', label: `Approved (${approvedPlans.length})` },
    { id: 'rejected', label: `Rejected (${rejectedPlans.length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('approval.title', 'Approval Queue')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and approve weekly lesson plans submitted by teachers.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pending Plans */}
      {activeTab === 'pending' && (
        <Card
          title={t('approval.pending', 'Pending Review')}
          subtitle={`${submittedPlans.length} plan(s) waiting for approval`}
        >
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading plans...</div>
          ) : submittedPlans.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h3>
              <p className="mt-1 text-sm text-gray-500">
                No plans are pending review at this time.
              </p>
            </div>
          ) : (
            <DataGrid
              columns={pendingColumns}
              data={submittedPlans}
              sortable
            />
          )}
        </Card>
      )}

      {/* Approved Plans */}
      {activeTab === 'approved' && (
        <Card
          title={t('approval.approved', 'Approved Plans')}
          subtitle={`${approvedPlans.length} plan(s) approved`}
        >
          {approvedPlans.length === 0 ? (
            <div className="text-center py-12">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No approved plans yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Approved plans will appear here.
              </p>
            </div>
          ) : (
            <DataGrid
              columns={historyColumns}
              data={approvedPlans}
              sortable
            />
          )}
        </Card>
      )}

      {/* Rejected Plans */}
      {activeTab === 'rejected' && (
        <Card
          title={t('approval.rejected', 'Rejected Plans')}
          subtitle={`${rejectedPlans.length} plan(s) rejected`}
        >
          {rejectedPlans.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No rejected plans</h3>
              <p className="mt-1 text-sm text-gray-500">
                Great! No plans have been rejected.
              </p>
            </div>
          ) : (
            <DataGrid
              columns={historyColumns}
              data={rejectedPlans}
              sortable
            />
          )}
        </Card>
      )}

      {/* View Plan Modal */}
      <DialogForm
        open={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setViewingPlan(null); }}
        title={`Plan Preview: ${viewingPlan?.id}`}
        size="lg"
      >
        {viewingPlan && (
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[viewingPlan.status]}`}>
                    {statusLabels[viewingPlan.status]}
                  </span>
                  <span className="text-sm text-gray-500">
                    Submitted: {formatDateTime(viewingPlan.submittedAt || '')}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => { handleApprove(viewingPlan); setViewModalOpen(false); }}
                    disabled={isSubmitting}
                    leftIcon={<CheckCircleIcon className="w-4 h-4" />}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => { openRejectModal(viewingPlan); setViewModalOpen(false); }}
                    disabled={isSubmitting}
                    leftIcon={<XCircleIcon className="w-4 h-4" />}
                  >
                    Reject
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <BookOpenIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Subject:</span>
                  <span className="font-medium">{viewingPlan.subjectName || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <UserCircleIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Teacher:</span>
                  <span className="font-medium">{viewingPlan.teacherName || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Class:</span>
                  <span className="font-medium">{viewingPlan.classStreamName || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Week:</span>
                  <span className="font-medium">
                    {formatDate(viewingPlan.weekStartDate)} - {formatDate(viewingPlan.weekEndDate)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Overall Objectives</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{viewingPlan.overallObjectives}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Teaching Aids</h4>
                <p className="text-sm text-gray-600">{viewingPlan.teachingAids || 'Not specified'}</p>
              </div>

              {viewingPlan.dayPlans && viewingPlan.dayPlans.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Day Plans ({viewingPlan.dayPlans.length})</h4>
                  <div className="space-y-2">
                    {viewingPlan.dayPlans.slice(0, 3).map((day) => (
                      <div key={day.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{day.dayOfWeek}</span>
                          <span className="text-xs text-gray-500">{formatDate(day.date)}</span>
                        </div>
                        <p className="text-sm text-gray-600">{day.topics}</p>
                        {day.periodPlans && day.periodPlans.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {day.periodPlans.length} period(s) planned
                          </p>
                        )}
                      </div>
                    ))}
                    {viewingPlan.dayPlans.length > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{viewingPlan.dayPlans.length - 3} more day(s) - view full details
                      </p>
                    )}
                  </div>
                </div>
              )}

              {viewingPlan.submittedByName && (
                <div className="flex items-center space-x-2 text-sm text-gray-500 pt-3 border-t">
                  <UsersIcon className="w-4 h-4" />
                  <span>Submitted by: {viewingPlan.submittedByName}</span>
                </div>
              )}
            </div>
          </FormSection>
        )}
      </DialogForm>

      {/* Reject Dialog */}
      <DialogForm
        open={rejectModalOpen}
        onClose={() => { setRejectModalOpen(false); setPlanToReject(null); setRejectionReason(''); }}
        title="Reject Plan"
        size="md"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={() => { setRejectModalOpen(false); setPlanToReject(null); setRejectionReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={isSubmitting}
              leftIcon={<XCircleIcon className="w-4 h-4" />}
            >
              {isSubmitting ? 'Processing...' : 'Confirm Reject'}
            </Button>
          </FormActions>
        }
      >
        <FormSection>
          {planToReject && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium">{planToReject.id}</p>
              <p className="text-sm text-gray-600">
                {planToReject.subjectName} - {planToReject.classStreamName}
              </p>
              <p className="text-sm text-gray-600">
                Teacher: {planToReject.teacherName}
              </p>
            </div>
          )}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start space-x-2 mb-4">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              Please provide detailed feedback so the teacher can improve the plan.
            </p>
          </div>
          <FormField label="Rejection Reason" required>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide specific feedback on what needs to be improved..."
              rows={4}
            />
          </FormField>
        </FormSection>
      </DialogForm>
    </div>
  );
};

export default ApprovalPage;
