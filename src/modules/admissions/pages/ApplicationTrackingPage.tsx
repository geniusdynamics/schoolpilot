import { logger } from '@/utils/logging';

// ABOUTME: Application tracking page for prospective students
// ABOUTME: Allows applicants to check their application status using a reference number

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';
import {
  SearchIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  UserIcon,
  AcademicCapIcon,
  CalendarIcon,
  DocumentTextIcon,
  HomeIcon,
} from '@/components/ui/icons';
import { useAdmissionsData } from '../data/useAdmissionsData';
import { Application, ApplicationStatus } from '../data/types';

// ─── Status Timeline Configuration ────────────────────────────────
interface TimelineStep {
  key: string;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  statusOrder: number;
}

const timelineSteps: TimelineStep[] = [
  { key: 'submitted', label: 'Submitted', icon: DocumentTextIcon, statusOrder: 1 },
  { key: 'under_review', label: 'Under Review', icon: SearchIcon, statusOrder: 2 },
  { key: 'interview_scheduled', label: 'Interview', icon: CalendarIcon, statusOrder: 3 },
  { key: 'decision', label: 'Decision', icon: CheckCircleIcon, statusOrder: 4 },
  { key: 'enrolled', label: 'Enrolled', icon: HomeIcon, statusOrder: 5 },
];

// Map ApplicationStatus enum values to timeline step keys
const statusToTimelineKey: Record<string, string> = {
  [ApplicationStatus.DRAFT]: 'submitted',
  [ApplicationStatus.SUBMITTED]: 'submitted',
  [ApplicationStatus.UNDER_REVIEW]: 'under_review',
  [ApplicationStatus.INTERVIEW_SCHEDULED]: 'interview_scheduled',
  [ApplicationStatus.APPROVED]: 'decision',
  [ApplicationStatus.REJECTED]: 'decision',
  [ApplicationStatus.DEFERRED]: 'decision',
  [ApplicationStatus.WAITLISTED]: 'decision',
  [ApplicationStatus.ENROLLED]: 'enrolled',
};

// Badge variant per status
const getBadgeVariant = (status: ApplicationStatus): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' => {
  switch (status) {
    case ApplicationStatus.SUBMITTED:
    case ApplicationStatus.DRAFT:
      return 'primary'; // blue
    case ApplicationStatus.UNDER_REVIEW:
    case ApplicationStatus.WAITLISTED:
      return 'warning'; // yellow
    case ApplicationStatus.INTERVIEW_SCHEDULED:
      return 'info'; // indigo
    case ApplicationStatus.APPROVED:
      return 'success'; // green
    case ApplicationStatus.ENROLLED:
      return 'success'; // green (emerald-ish via success)
    case ApplicationStatus.REJECTED:
      return 'danger'; // red
    case ApplicationStatus.DEFERRED:
      return 'secondary'; // gray
    default:
      return 'secondary';
  }
};

// Human-readable status label
const getStatusLabel = (status: ApplicationStatus, t: (key: string) => string): string => {
  const map: Record<string, string> = {
    [ApplicationStatus.DRAFT]: t('public.status.draft', 'Draft'),
    [ApplicationStatus.SUBMITTED]: t('public.status.submitted', 'Submitted'),
    [ApplicationStatus.UNDER_REVIEW]: t('public.status.underReview', 'Under Review'),
    [ApplicationStatus.INTERVIEW_SCHEDULED]: t('public.status.interviewScheduled', 'Interview Scheduled'),
    [ApplicationStatus.APPROVED]: t('public.status.accepted', 'Accepted'),
    [ApplicationStatus.REJECTED]: t('public.status.rejected', 'Rejected'),
    [ApplicationStatus.DEFERRED]: t('public.status.deferred', 'Deferred'),
    [ApplicationStatus.WAITLISTED]: t('public.status.waitlisted', 'Waitlisted'),
    [ApplicationStatus.ENROLLED]: t('public.status.enrolled', 'Enrolled'),
  };
  return map[status] || status;
};

// ─── Component ─────────────────────────────────────────────────────
export const ApplicationTrackingPageContent: React.FC = () => {
  const { t } = useTranslation('admissions');
  const { getApplicationByReference } = useAdmissionsData();
  const { showToast } = useToast();

  const [referenceNumber, setReferenceNumber] = useState('');
  const [application, setApplication] = useState<Application | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // ── Search Handler ────────────────────────────────────────────
  const handleSearch = async () => {
    const trimmed = referenceNumber.trim();
    if (!trimmed) {
      showToast({
        type: 'warning',
        message: t('public.tracking.enterReference', 'Please enter a reference number'),
      });
      return;
    }

    setIsSearching(true);
    setNotFound(false);
    setHasSearched(false);
    setApplication(null);

    try {
      const result = await getApplicationByReference(trimmed);
      setHasSearched(true);
      if (result) {
        setApplication(result);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      logger.error('Search error:', error);
      setHasSearched(true);
      setNotFound(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  // ── Timeline Renderer ─────────────────────────────────────────
  const renderTimeline = (app: Application) => {
    const currentKey = statusToTimelineKey[app.status] || 'submitted';
    const isRejected = app.status === ApplicationStatus.REJECTED;
    const currentIdx = timelineSteps.findIndex((s) => s.key === currentKey);

    return (
      <div className="relative">
        {timelineSteps.map((step, idx) => {
          const isComplete = idx < currentIdx || (idx === currentIdx && !isRejected);
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;
          const isRejectedStep = isRejected && idx === currentIdx;
          const IconComponent = step.icon;

          return (
            <div key={step.key} className="flex items-start mb-8 last:mb-0">
              {/* Connector Line */}
              <div className="flex flex-col items-center mr-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isRejectedStep
                      ? 'bg-red-100 border-red-400'
                      : isComplete
                      ? 'bg-green-500 border-green-500'
                      : isCurrent
                      ? 'bg-yellow-100 border-yellow-400'
                      : 'bg-surface-accent border-surface-border'
                  }`}
                >
                  {isRejectedStep ? (
                    <XCircleIcon className="w-5 h-5 text-red-600" />
                  ) : isComplete ? (
                    <CheckCircleIcon className="w-5 h-5 text-white" />
                  ) : (
                    <IconComponent
                      className={`w-5 h-5 ${isCurrent ? 'text-yellow-600' : 'text-surface-muted-fg'}`}
                    />
                  )}
                </div>
                {idx < timelineSteps.length - 1 && (
                  <div
                    className={`w-0.5 h-12 mt-1 ${
                      isComplete && !isRejected ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <div className="pt-1">
                <p
                  className={`font-semibold text-sm ${
                    isRejectedStep
                      ? 'text-red-700'
                      : isComplete
                      ? 'text-green-700'
                      : isCurrent
                      ? 'text-yellow-700'
                      : 'text-surface-muted-fg'
                  }`}
                >
                  {step.label}
                </p>
                {isCurrent && !isRejected && (
                  <p className="text-xs text-surface-muted-fg mt-0.5">
                    {t('public.tracking.currentStatus', 'Current Status')}
                  </p>
                )}
                {isRejectedStep && app.rejectionReason && (
                  <p className="text-xs text-red-600 mt-1 bg-red-50 rounded p-2">
                    {app.rejectionReason}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Main Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-primary-50 py-8 px-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-bold text-surface-foreground mb-2">
          {t('public.tracking.title', 'Track Your Application')}
        </h1>
        <p className="text-surface-muted-fg">
          {t(
            'public.tracking.subtitle',
            'Enter your application reference number to check the current status of your application.'
          )}
        </p>
      </div>

      {/* Search Card */}
      <Card variant="elevated" size="lg" className="max-w-2xl mx-auto mb-6">
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <label className="block text-sm font-medium text-surface-foreground mb-2">
            {t('public.tracking.referenceNumber', 'Application Reference Number')}
          </label>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., APP-XXXXX-XXX"
                leftIcon={<SearchIcon className="w-4 h-4 text-surface-muted-fg" />}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleSearch}
              loading={isSearching}
              loadingText="Searching..."
              disabled={!referenceNumber.trim()}
            >
              {t('public.tracking.checkStatus', 'Check Status')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {isSearching && (
        <div className="max-w-2xl mx-auto text-center py-12">
          <Spinner size="lg" />
          <p className="text-surface-muted-fg mt-4">{t('common.loading', 'Searching...')}</p>
        </div>
      )}

      {/* Not Found State */}
      {notFound && !isSearching && (
        <Card variant="outlined" size="lg" className="max-w-2xl mx-auto">
          <div className="px-4 py-8 sm:px-6 text-center">
            <XCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-surface-foreground mb-2">
              {t('public.tracking.notFound', 'Application Not Found')}
            </h3>
            <p className="text-surface-muted-fg mb-4">
              {t(
                'public.tracking.notFoundDesc',
                'No application was found with that reference number. Please check the number and try again.'
              )}
            </p>
            <p className="text-sm text-surface-muted-fg">
              {t('public.tracking.searchedFor', 'Searched for:')}{' '}
              <code className="bg-surface-accent px-2 py-0.5 rounded font-mono">{referenceNumber}</code>
            </p>
          </div>
        </Card>
      )}

      {/* Application Found */}
      {application && !isSearching && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Application Details Card */}
          <Card variant="elevated" size="lg">
            {/* Status Header */}
            <div className="px-4 py-4 sm:px-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-surface-muted-fg">
                  {t('public.tracking.applicationNumber', 'Application')}
                </p>
                <p className="text-lg font-mono font-bold text-indigo-700">
                  {application.applicationNumber}
                </p>
              </div>
              <Badge variant={getBadgeVariant(application.status)} size="lg">
                {getStatusLabel(application.status, t)}
              </Badge>
            </div>

            {/* Student Details */}
            <div className="px-4 py-4 sm:px-6 space-y-3">
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-surface-muted-fg" />
                <div>
                  <p className="text-xs text-surface-muted-fg">
                    {t('public.studentName', 'Student Name')}
                  </p>
                  <p className="font-medium text-surface-foreground">
                    {application.firstName} {application.middleName && `${application.middleName} `}
                    {application.lastName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <AcademicCapIcon className="w-5 h-5 text-surface-muted-fg" />
                <div>
                  <p className="text-xs text-surface-muted-fg">
                    {t('application.fields.intendedClass', 'Applied Class')}
                  </p>
                  <p className="font-medium text-surface-foreground">
                    {application.intendedClassName || application.intendedClassId || '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-surface-muted-fg" />
                <div>
                  <p className="text-xs text-surface-muted-fg">
                    {t('public.tracking.submittedOn', 'Submitted On')}
                  </p>
                  <p className="font-medium text-surface-foreground">
                    {application.submissionDate
                      ? new Date(application.submissionDate).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
              </div>

              {application.guardianEmail && (
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="w-5 h-5 text-surface-muted-fg" />
                  <div>
                    <p className="text-xs text-surface-muted-fg">
                      {t('application.fields.guardianEmail', 'Contact Email')}
                    </p>
                    <p className="font-medium text-surface-foreground">{application.guardianEmail}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Timeline Card */}
          <Card variant="elevated" size="lg">
            <div className="px-4 py-4 sm:px-6 border-b border-gray-100">
              <h3 className="text-base font-semibold text-surface-foreground">
                {t('public.tracking.statusTimeline', 'Application Progress')}
              </h3>
            </div>
            <div className="px-4 py-4 sm:px-6">{renderTimeline(application)}</div>
          </Card>

          {/* Action Buttons Based on Status */}
          {application.status === ApplicationStatus.APPROVED && (
            <Card variant="filled" size="lg" className="border-green-200 bg-green-50">
              <div className="px-4 py-6 sm:px-6 text-center">
                <CheckCircleIcon className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  {t('public.tracking.congratulations', 'Congratulations!')}
                </h3>
                <p className="text-green-700 mb-4">
                  {t(
                    'public.tracking.acceptedMessage',
                    'Your application has been accepted. You can now proceed to enrollment.'
                  )}
                </p>
                {application.reviewNotes && (
                  <div className="bg-surface-card rounded-lg p-3 mb-4 text-left">
                    <p className="text-sm text-surface-muted-fg">
                      <span className="font-medium">{t('public.tracking.notes', 'Notes:')}</span>{' '}
                      {application.reviewNotes}
                    </p>
                  </div>
                )}
                <Button
                  variant="success"
                  size="lg"
                  rightIcon={<ArrowRightIcon className="w-4 h-4" />}
                  onClick={() => {
                    showToast({
                      type: 'info',
                      message: t(
                        'public.tracking.enrollmentRedirect',
                        'Redirecting to enrollment page...'
                      ),
                    });
                    // In a real app: navigate('/admissions/enroll')
                    window.location.hash = '#/admissions/enroll';
                  }}
                >
                  {t('public.tracking.proceedToEnrollment', 'Proceed to Enrollment')}
                </Button>
              </div>
            </Card>
          )}

          {application.status === ApplicationStatus.REJECTED && (
            <Card variant="filled" size="lg" className="border-red-200 bg-red-50">
              <div className="px-4 py-6 sm:px-6 text-center">
                <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  {t('public.tracking.applicationRejected', 'Application Not Accepted')}
                </h3>
                <p className="text-red-700 mb-3">
                  {t(
                    'public.tracking.rejectedMessage',
                    'We regret to inform you that your application was not successful at this time.'
                  )}
                </p>
                {application.rejectionReason && (
                  <div className="bg-surface-card rounded-lg p-3 mb-4 text-left">
                    <p className="text-sm text-surface-foreground">
                      <span className="font-medium">
                        {t('public.tracking.reason', 'Reason:')}:
                      </span>{' '}
                      {application.rejectionReason}
                    </p>
                  </div>
                )}
                <p className="text-sm text-red-600">
                  {t(
                    'public.tracking.contactAdmissions',
                    'If you have questions, please contact the admissions office for more information.'
                  )}
                </p>
              </div>
            </Card>
          )}

          {application.status === ApplicationStatus.ENROLLED && (
            <Card variant="filled" size="lg" className="border-emerald-200 bg-emerald-50">
              <div className="px-4 py-6 sm:px-6 text-center">
                <CheckCircleIcon className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-emerald-900 mb-2">
                  {t('public.tracking.welcomeMessage', 'Welcome!')}
                </h3>
                <p className="text-emerald-700">
                  {t(
                    'public.tracking.enrolledMessage',
                    'You are now enrolled. Please check your email for further instructions and orientation details.'
                  )}
                </p>
              </div>
            </Card>
          )}

          {application.status === ApplicationStatus.WAITLISTED && (
            <Card variant="filled" size="lg" className="border-yellow-200 bg-yellow-50">
              <div className="px-4 py-6 sm:px-6 text-center">
                <ClockIcon className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  {t('public.tracking.waitlistedTitle', 'Waitlisted')}
                </h3>
                <p className="text-yellow-700">
                  {t(
                    'public.tracking.waitlistedMessage',
                    'Your application is currently on the waitlist. We will contact you if a spot becomes available.'
                  )}
                </p>
              </div>
            </Card>
          )}

          {/* Back to Apply */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => {
                setApplication(null);
                setReferenceNumber('');
                setHasSearched(false);
                setNotFound(false);
              }}
            >
              {t('public.tracking.checkAnother', 'Check Another Application')}
            </Button>
          </div>
        </div>
      )}

      {/* Initial State - Before Search */}
      {!hasSearched && !isSearching && (
        <div className="max-w-2xl mx-auto mt-8">
          <Card variant="outlined" size="lg">
            <div className="px-4 py-6 sm:px-6">
              <h3 className="text-base font-semibold text-surface-foreground mb-3">
                {t('public.tracking.howItWorks', 'How It Works')}
              </h3>
              <div className="space-y-3 text-sm text-surface-muted-fg">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <p>
                    {t(
                      'public.tracking.step1',
                      'After submitting your application, you will receive a unique reference number.'
                    )}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <p>
                    {t(
                      'public.tracking.step2',
                      'Enter that reference number above to see the current status of your application.'
                    )}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <p>
                    {t(
                      'public.tracking.step3',
                      'The timeline will show you exactly where your application is in the review process.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
const ApplicationTrackingPage: React.FC = () => (
  <div className="space-y-6">
    <ApplicationTrackingPageContent />
  </div>
);

export default ApplicationTrackingPage;
