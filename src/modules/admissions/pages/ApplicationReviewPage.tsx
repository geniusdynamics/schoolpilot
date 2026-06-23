import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Spinner from '@/components/ui/Spinner';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UsersIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@/components/ui/icons';
import { useAdmissionsData } from '../data/useAdmissionsData';
import {
  Application,
  ApplicationStatus,
  ReviewDecision,
  ReviewFormData,
  DecisionFormData,
} from '../data/types';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';

export const ApplicationReviewPageContent: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { getApplication, addReview, makeDecision, applications } = useAdmissionsData();
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'queue' | 'detail'>('queue');
  
  // Review form state
  const [reviewData, setReviewData] = useState<ReviewFormData>({
    recommendation: ReviewDecision.NEUTRAL,
    comments: '',
    internalNotes: '',
  });
  
  // Decision form state
  const [decisionData, setDecisionData] = useState<DecisionFormData>({
    decision: ApplicationStatus.APPROVED,
    conditions: '',
    finalComments: '',
    assignedClassId: '',
    assignedStreamId: '',
    admissionNumber: '',
    startDate: '',
    feeStructureId: '',
    dormitoryId: '',
    generateInvoice: true,
  });
  
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load applications for queue view
  const pendingApplications = applications.filter(
    app => app.status === ApplicationStatus.SUBMITTED || app.status === ApplicationStatus.UNDER_REVIEW
  );

  useEffect(() => {
    if (applicationId) {
      loadApplication(applicationId);
      setActiveView('detail');
    } else {
      setActiveView('queue');
      setLoading(false);
    }
  }, [applicationId, applications]);

  const loadApplication = async (id: string) => {
    setLoading(true);
    try {
      const app = await getApplication(id);
      setApplication(app);
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to load application.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewChange = (field: keyof ReviewFormData, value: string | number) => {
    setReviewData(prev => ({ ...prev, [field]: value }));
  };

  const handleDecisionChange = (field: keyof DecisionFormData, value: string | boolean) => {
    setDecisionData(prev => ({ ...prev, [field]: value }));
  };

  const submitReview = async () => {
    if (!application || !user) return;
    
    setIsSubmitting(true);
    try {
      await addReview(application.id, reviewData, user.id);
      showToast({
        type: 'success',
        message: 'Review saved successfully.',
      });
      // Reload application to get updated data
      await loadApplication(application.id);
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to save review.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDecisionModal = () => {
    setShowDecisionModal(true);
  };

  const submitDecision = async () => {
    if (!application || !user) return;
    
    setIsSubmitting(true);
    try {
      await makeDecision(application.id, decisionData, user.id);
      showToast({
        type: 'success',
        message: `Application ${decisionData.decision?.toLowerCase() ?? ''} successfully.`,
      });
      setShowDecisionModal(false);
      navigate('/admissions/applications');
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to process decision.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQueueView = () => (
    <div className="space-y-6">
      <Card title="Review Queue" subtitle={`${pendingApplications.length} applications pending review`}>
        {pendingApplications.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h3>
            <p className="mt-1 text-sm text-gray-500">No applications are pending review.</p>
          </div>
        ) : (
          <div className="divide-y">
            {pendingApplications.map((app) => (
              <div
                key={app.id}
                className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                onClick={() => navigate(`/admissions/review/${app.id}`)}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {app.firstName.charAt(0)}{app.lastName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {app.firstName} {app.middleName} {app.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      #{app.applicationNumber} • {app.intendedClassName || 'No class specified'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    app.status === ApplicationStatus.SUBMITTED
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {app.status}
                  </span>
                  <Button size="sm" variant="primary">
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  const renderDetailView = () => {
    if (!application) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/admissions/review-queue')}>
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Review Application
              </h1>
              <p className="text-sm text-gray-500">
                #{application.applicationNumber} • {application.firstName} {application.lastName}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/admissions/applications/${application.id}`)}
            >
              View Full Details
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Applicant Info */}
          <div className="space-y-6">
            <Card title="Applicant Information">
              <div className="p-4 space-y-3">
                <div className="flex items-center space-x-3 pb-3 border-b">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-lg">
                      {application.firstName.charAt(0)}{application.lastName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{application.firstName} {application.lastName}</p>
                    <p className="text-sm text-gray-500">{application.gender}</p>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Date of Birth:</span>
                  <p>{application.dateOfBirth}</p>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Application Type:</span>
                  <p>{application.applicationType}</p>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Intended Class:</span>
                  <p>{application.intendedClassName || 'Not specified'}</p>
                </div>
              </div>
            </Card>

            <Card title="Academic Background">
              <div className="p-4 space-y-3">
                <div className="text-sm">
                  <span className="text-gray-600">Previous School:</span>
                  <p>{application.previousSchool || 'N/A'}</p>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Previous Class:</span>
                  <p>{application.previousClass || 'N/A'}</p>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">KCPE Marks:</span>
                  <p>{application.kcpeMarks || 'N/A'}</p>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">KCPE Grade:</span>
                  <p>{application.kcpeGrade || 'N/A'}</p>
                </div>
              </div>
            </Card>

            <Card title="Guardian Information">
              <div className="p-4 space-y-3">
                <div className="text-sm">
                  <span className="text-gray-600">Name:</span>
                  <p>{application.guardianFirstName} {application.guardianLastName}</p>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Phone:</span>
                  <p>{application.guardianPhone || 'N/A'}</p>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Email:</span>
                  <p>{application.guardianEmail || 'N/A'}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Review Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Evaluation">
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Academic Score (/100)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={reviewData.academicScore || ''}
                      onChange={(e) => handleReviewChange('academicScore', parseInt(e.target.value))}
                      placeholder="Enter score"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interview Score (/100)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={reviewData.interviewScore || ''}
                      onChange={(e) => handleReviewChange('interviewScore', parseInt(e.target.value))}
                      placeholder="Enter score"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recommendation
                    </label>
                    <Select
                      value={reviewData.recommendation}
                      onChange={(e) => handleReviewChange('recommendation', e.target.value)}
                    >
                      {Object.values(ReviewDecision).map((decision) => (
                        <option key={decision} value={decision}>
                          {decision}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Behavioral Assessment
                  </label>
                  <Textarea
                    value={reviewData.behavioralAssessment || ''}
                    onChange={(e) => handleReviewChange('behavioralAssessment', e.target.value)}
                    placeholder="Describe the applicant's behavior, attitude, and interpersonal skills..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Comments
                  </label>
                  <Textarea
                    value={reviewData.comments}
                    onChange={(e) => handleReviewChange('comments', e.target.value)}
                    placeholder="Enter your overall comments and observations..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Notes (Not visible to applicant)
                  </label>
                  <Textarea
                    value={reviewData.internalNotes}
                    onChange={(e) => handleReviewChange('internalNotes', e.target.value)}
                    placeholder="Enter internal notes for staff only..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={submitReview}
                    disabled={isSubmitting}
                    leftIcon={<DocumentTextIcon className="w-4 h-4" />}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Review'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Decision Section */}
            <Card title="Final Decision">
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setDecisionData(prev => ({ ...prev, decision: ApplicationStatus.APPROVED }));
                      openDecisionModal();
                    }}
                    leftIcon={<CheckCircleIcon className="w-5 h-5" />}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setDecisionData(prev => ({ ...prev, decision: ApplicationStatus.REJECTED }));
                      openDecisionModal();
                    }}
                    leftIcon={<XCircleIcon className="w-5 h-5" />}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDecisionData(prev => ({ ...prev, decision: ApplicationStatus.DEFERRED }));
                      openDecisionModal();
                    }}
                    leftIcon={<ClockIcon className="w-5 h-5" />}
                  >
                    Defer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDecisionData(prev => ({ ...prev, decision: ApplicationStatus.WAITLISTED }));
                      openDecisionModal();
                    }}
                    leftIcon={<UsersIcon className="w-5 h-5" />}
                  >
                    Waitlist
                  </Button>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Important:</p>
                    <p>Once you make a decision, the applicant will be notified. For approvals, ensure all required documents are verified and class assignment is appropriate.</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      {activeView === 'queue' ? renderQueueView() : renderDetailView()}

      {/* Decision Confirmation Dialog */}
      <DialogForm
        open={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        title={`${decisionData.decision} Application`}
        size="lg"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={() => setShowDecisionModal(false)}>
              Cancel
            </Button>
            <Button
              variant={decisionData.decision === ApplicationStatus.APPROVED ? 'primary' : 'danger'}
              onClick={submitDecision}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : `Confirm ${decisionData.decision}`}
            </Button>
          </FormActions>
        }
      >
        <FormSection>
          {decisionData.decision === ApplicationStatus.APPROVED && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Assign Class *">
                  <Input
                    value={decisionData.assignedClassId}
                    onChange={(e) => handleDecisionChange('assignedClassId', e.target.value)}
                    placeholder="Enter class ID"
                  />
                </FormField>
                <FormField label="Assign Stream">
                  <Input
                    value={decisionData.assignedStreamId}
                    onChange={(e) => handleDecisionChange('assignedStreamId', e.target.value)}
                    placeholder="Enter stream ID"
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Admission Number">
                  <Input
                    value={decisionData.admissionNumber}
                    onChange={(e) => handleDecisionChange('admissionNumber', e.target.value)}
                    placeholder="Auto-generated if empty"
                  />
                </FormField>
                <FormField label="Start Date">
                  <Input
                    type="date"
                    value={decisionData.startDate}
                    onChange={(e) => handleDecisionChange('startDate', e.target.value)}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Fee Structure">
                  <Input
                    value={decisionData.feeStructureId}
                    onChange={(e) => handleDecisionChange('feeStructureId', e.target.value)}
                    placeholder="Enter fee structure ID"
                  />
                </FormField>
                <FormField label="Dormitory (Optional)">
                  <Input
                    value={decisionData.dormitoryId}
                    onChange={(e) => handleDecisionChange('dormitoryId', e.target.value)}
                    placeholder="Enter dormitory ID"
                  />
                </FormField>
              </div>
            </>
          )}
          
          <FormField label="Conditions (if any)">
            <Textarea
              value={decisionData.conditions}
              onChange={(e) => handleDecisionChange('conditions', e.target.value)}
              placeholder="Enter any conditions for this decision..."
              rows={3}
            />
          </FormField>
          
          <FormField label="Final Comments">
            <Textarea
              value={decisionData.finalComments}
              onChange={(e) => handleDecisionChange('finalComments', e.target.value)}
              placeholder="Enter final comments..."
              rows={3}
            />
          </FormField>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="generateInvoice"
              checked={decisionData.generateInvoice}
              onChange={(e) => handleDecisionChange('generateInvoice', e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="generateInvoice" className="text-sm text-gray-700">
              Generate invoice upon enrollment
            </label>
          </div>
        </FormSection>
      </DialogForm>
    </>
  );
};
const ApplicationReviewPage: React.FC = () => (
  <div className="space-y-6">
    <ApplicationReviewPageContent />
  </div>
);

export default ApplicationReviewPage;
