// ABOUTME: Admissions module definition
// ABOUTME: Self-contained module definition for student admission management

import { ModuleDefinition } from '@/core/types';
import { DocumentAddIcon, DocumentTextIcon, ClipboardDocumentListIcon, EyeIcon, ChartBarIcon, AcademicCapIcon, UserPlusIcon, UserGroupIcon } from '@/components/ui/icons';

export const admissionsModule: ModuleDefinition = {
  id: 'admissions',
  name: 'navigation:admissions.title',
  description: 'navigation:admissions.description',
  icon: AcademicCapIcon,
  path: '/admissions',
  isActive: true,
  version: '1.0.0',
  navigation: [
    {
      name: 'navigation:admissions.dashboard',
      path: '/admissions/dashboard',
      icon: ChartBarIcon,
      page: 'AdmissionsDashboardPage',
      showInModes: ['standard', 'fullwidth'],
    },
    {
      name: 'navigation:admissions.admitLearner',
      path: '/admissions/admit',
      icon: UserPlusIcon,
      page: 'AdmitLearnerPage',
      showInModes: ['standard', 'fullwidth'],
    },
    {
      name: 'navigation:admissions.register',
      path: '/admissions/register',
      icon: UserGroupIcon,
      page: 'AdmissionsRegisterPage',
      showInModes: ['standard', 'fullwidth'],
    },
    {
      name: 'navigation:admissions.newApplication',
      path: '/admissions/new-application',
      icon: DocumentAddIcon,
      page: 'ApplicationFormPage',
      showInModes: ['standard', 'fullwidth'],
    },
    {
      name: 'navigation:admissions.applicationsHub',
      path: '/admissions/applications-hub',
      icon: ClipboardDocumentListIcon,
      page: 'ApplicationsPage',
      showInModes: ['standard', 'fullwidth'],
    },
    {
      name: 'navigation:admissions.applications',
      path: '/admissions/applications',
      icon: ClipboardDocumentListIcon,
      page: 'ApplicationsListPage',
      deprecated: true,
      showInModes: ['fullwidth'],
      redirectTo: '/admissions/applications-hub?tab=applications',
    },
    {
      name: 'navigation:admissions.reviewQueue',
      path: '/admissions/review-queue',
      icon: EyeIcon,
      page: 'ApplicationReviewPage',
      deprecated: true,
      showInModes: ['fullwidth'],
      redirectTo: '/admissions/applications-hub?tab=review-queue',
    },
    {
      name: 'navigation:admissions.apply',
      path: '/admissions/apply',
      icon: DocumentAddIcon,
      page: 'PublicApplicationPage',
      showInModes: ['standard', 'fullwidth'],
    },
    {
      name: 'navigation:admissions.track',
      path: '/admissions/track',
      icon: DocumentTextIcon,
      page: 'ApplicationTrackingPage',
      deprecated: true,
      showInModes: ['fullwidth'],
      redirectTo: '/admissions/applications-hub?tab=tracking',
    },
  ],
  features: [
    'admission-management',
    'application-processing',
    'document-management',
    'review-workflow',
    'enrollment-automation'
  ],
  dependencies: [
    {
      moduleId: 'administration',
      version: '^1.0.0',
      required: true
    },
    {
      moduleId: 'finance',
      version: '^1.0.0',
      required: false
    }
  ],
  optionalDependencies: [],
  routes: [
    { path: '/admissions/dashboard', page: 'AdmissionsDashboardPage' },
    { path: '/admissions/admit', page: 'AdmitLearnerPage' },
    { path: '/admissions/register', page: 'AdmissionsRegisterPage' },
    { path: '/admissions/new-application', page: 'ApplicationFormPage' },
    { path: '/admissions/applications-hub', page: 'ApplicationsPage' },
    { path: '/admissions/applications', page: 'ApplicationsListPage' },
    { path: '/admissions/applications/:applicationId', page: 'ApplicationDetailPage' },
    { path: '/admissions/review-queue', page: 'ApplicationReviewPage' },
    { path: '/admissions/review/:applicationId', page: 'ApplicationReviewPage' },
    { path: '/admissions/apply', page: 'PublicApplicationPage' },
    { path: '/admissions/track', page: 'ApplicationTrackingPage' },
    { path: '/admissions/track/:applicationId', page: 'ApplicationTrackingPage' },
    { path: '/admissions/form-builder', page: 'FormBuilderPage' },
  ],
  settings: {
    category: 'admissions',
    items: [
      {
        key: 'enableOnlineApplications',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'requireDocumentVerification',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableInterviewScheduling',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'autoAssignAdmissionNumbers',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'defaultFeeStructureId',
        type: 'string',
        defaultValue: ''
      },
      {
        key: 'applicationDeadlineDays',
        type: 'number',
        defaultValue: 14
      },
      {
        key: 'enableWaitlistManagement',
        type: 'boolean',
        defaultValue: true
      }
    ]
  },
  publicAccess: true,
};

export default admissionsModule;
