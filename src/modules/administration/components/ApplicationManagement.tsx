import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataGrid from '@/components/ui/data/DataGrid';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import { PlusIcon, EditIcon, DeleteIcon, DocumentSearchIcon } from '@/components/ui/icons';

import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';
import TabbedForm, { FormTab } from '@/components/ui/forms/TabbedForm';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import { logger } from '@/utils/logging';

import { 
  AdminApplicationType, 
  AdminKCPEMarksType,
  AdminApplicationReviewType,
  AdminApplicationDocumentType,
  AdminApplicationInterviewType,
  AdminApplicationApprovalType,
  ApplicationStatus,
  ApplicationType,
  ReviewStage,
  ReviewDecision,
  ApprovalDecision,
  DocumentType,
  InterviewType,
  AttendanceType
} from '../data/types';

import { useConfirm } from '@/components/ui/ConfirmDialog';

// Types for Application Management
export interface Application {
  id: string;
  applicantFirstName: string;
  applicantMiddleName?: string;
  applicantLastName: string;
  applicantEmail: string;
  applicantPhone?: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  applicationDate: string;
  intendedClass: string;
  previousSchool?: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  guardianRelationship?: string;
  address?: string;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Deferred';
  submittedDocuments?: string[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  applicationId: string;
  reviewedBy: string;
  reviewDate: string;
  decision: 'Recommend Approval' | 'Recommend Rejection' | 'Request More Info' | 'Defer';
  comments?: string;
  score?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  applicationId: string;
  reviewId?: string;
  approvedBy: string;
  approvalDate: string;
  finalDecision: 'Approved' | 'Rejected' | 'Deferred' | 'Waitlisted';
  assignedClass?: string;
  assignedStream?: string;
  startDate?: string;
  admissionNumber?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApplicationFormData extends Omit<Application, 'id' | 'createdAt' | 'updatedAt'> {}

const ApplicationManagement: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('administration');
  const { showToast } = useToast();
  
  // Mock data for now - replace with actual data hooks
  const [applications, setApplications] = useState<Application[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [activeView, setActiveView] = useState<'applications' | 'reviews' | 'approvals'>('applications');
  
  const initialFormData: ApplicationFormData = {
    applicantFirstName: '',
    applicantLastName: '',
    applicantEmail: '',
    dateOfBirth: '',
    gender: 'Male',
    applicationDate: new Date().toISOString().split('T')[0],
    intendedClass: '',
    guardianName: '',
    guardianPhone: '',
    status: 'Pending'
  };
  
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);

  // Column definitions for applications
  const applicationColumns = [
    {
      key: 'applicantName',
      header: t('admissions.application.applicantFirstName'),
      render: (app: Application) => `${app.applicantFirstName} ${app.applicantLastName}`
    },
    {
      key: 'applicantEmail',
      header: t('admissions.application.applicantEmail'),
      render: (app: Application) => app.applicantEmail
    },
    {
      key: 'intendedClass',
      header: t('admissions.application.intendedClass'),
      render: (app: Application) => app.intendedClass
    },
    {
      key: 'applicationDate',
      header: t('admissions.application.applicationDate'),
      render: (app: Application) => new Date(app.applicationDate).toLocaleDateString()
    },
    {
      key: 'status',
      header: t('admissions.application.status'),
      render: (app: Application) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(app.status)}`}
        >
          {t(`admissions.application.${app.status?.toLowerCase().replace(' ', '') ?? ''}`)}
        </span>
      )
    }
  ];

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Under Review':
        return 'bg-blue-100 text-blue-800';
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Deferred':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (application?: Application) => {
    setEditingApplication(application || null);
    if (application) {
      const { id, createdAt, updatedAt, ...appData } = application;
      setFormData(appData);
    } else {
      setFormData(initialFormData);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingApplication(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.applicantFirstName || !formData.applicantLastName || !formData.applicantEmail) {
      showToast(t('admissions.messages.validationError'), 'error');
      return;
    }

    try {
      const applicationData: Application = {
        ...formData,
        id: editingApplication?.id || `app_${Date.now()}`,
        createdAt: editingApplication?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingApplication) {
        // Update existing application
        setApplications(prev => 
          prev.map(app => app.id === editingApplication.id ? applicationData : app)
        );
        showToast(t('admissions.messages.applicationSubmitted'), 'success');
      } else {
        // Add new application
        setApplications(prev => [...prev, applicationData]);
        showToast(t('admissions.messages.applicationSubmitted'), 'success');
      }

      closeModal();
    } catch (error) {
      showToast(t('admissions.messages.validationError'), 'error');
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (applicationId: string) => {
    if ((await confirm({ variant: 'danger', message: t('admissions.messages.confirmDelete') }))) {
      setApplications(prev => prev.filter(app => app.id !== applicationId));
      showToast(t('admissions.messages.applicationSubmitted'), 'success');
    }
  };

  const handleReview = (application: Application) => {
    // Navigate to review page or open review modal
    logger.info('Reviewing application:', application.id);
    // TODO: Implement review functionality
  };

  const handleApprove = (application: Application) => {
    // Navigate to approval page or open approval modal
    logger.info('Approving application:', application.id);
    // TODO: Implement approval functionality
  };

  const getApplicationActions = (application: Application) => [
    {
      label: t('admissions.actions.viewDetails'),
      onClick: () => logger.info('View details:', application.id),
      icon: DocumentSearchIcon
    },
    {
      label: t('admissions.actions.review'),
      onClick: () => handleReview(application),
      icon: DocumentSearchIcon
    },
    {
      label: t('admissions.actions.edit'),
      onClick: () => openModal(application),
      icon: EditIcon
    },
    {
      label: t('admissions.actions.delete'),
      onClick: () => handleDelete(application.id),
      icon: DeleteIcon,
      variant: 'danger' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with view switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('admissions.title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('admissions.description')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="bg-white border border-gray-300 rounded-lg p-1 flex">
            <button
              onClick={() => setActiveView('applications')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeView === 'applications'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('admissions.applications.title')}
            </button>
            <button
              onClick={() => setActiveView('reviews')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeView === 'reviews'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('admissions.reviews.title')}
            </button>
            <button
              onClick={() => setActiveView('approvals')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeView === 'approvals'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('admissions.approvals.title')}
            </button>
          </div>
          
          {activeView === 'applications' && (
            <Button
              onClick={() => openModal()}
              leftIcon={<PlusIcon className="w-4 h-4" />}
              variant="primary"
            >
              {t('admissions.actions.submit')}
            </Button>
          )}
        </div>
      </div>

      {/* Main content area */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <Card>
          {activeView === 'applications' && (
            <DataGrid
              data={applications}
              columns={applicationColumns}
              actions={getApplicationActions}
              emptyMessage={t('admissions.messages.noApplicationsFound')}
            />
          )}
          
          {activeView === 'reviews' && (
            <div className="p-4 text-center text-gray-500">
              {t('admissions.reviews.description')}
              {/* TODO: Implement reviews view */}
            </div>
          )}
          
          {activeView === 'approvals' && (
            <div className="p-4 text-center text-gray-500">
              {t('admissions.approvals.description')}
              {/* TODO: Implement approvals view */}
            </div>
          )}
        </Card>
      )}

      {/* Application Form Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingApplication ? t('admissions.actions.edit') : t('admissions.actions.submit')}
        size="lg"
        onSubmit={handleSubmit}
      >
        {/* Applicant Information */}
        <FormSection
          title={t('admissions.application.applicantInfo', 'Applicant Information')}
          columns={2}
        >
          <FormField label={t('admissions.application.applicantFirstName')} required>
            <Input
              value={formData.applicantFirstName}
              onChange={(value) => handleInputChange('applicantFirstName', value)}
            />
          </FormField>
          <FormField label={t('admissions.application.applicantLastName')} required>
            <Input
              value={formData.applicantLastName}
              onChange={(value) => handleInputChange('applicantLastName', value)}
            />
          </FormField>
          <FormField label={t('admissions.application.applicantEmail')} required>
            <Input
              type="email"
              value={formData.applicantEmail}
              onChange={(value) => handleInputChange('applicantEmail', value)}
            />
          </FormField>
          <FormField label={t('admissions.application.applicantPhone')}>
            <Input
              value={formData.applicantPhone || ''}
              onChange={(value) => handleInputChange('applicantPhone', value)}
            />
          </FormField>
          <FormField label={t('admissions.application.dateOfBirth')} required>
            <Input
              type="date"
              value={formData.dateOfBirth}
              onChange={(value) => handleInputChange('dateOfBirth', value)}
            />
          </FormField>
          <FormField label={t('admissions.application.gender')} required>
            <Select
              value={formData.gender}
              onChange={(value) => handleInputChange('gender', value)}
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' }
              ]}
            />
          </FormField>
        </FormSection>

        {/* Academic Information */}
        <FormSection
          title={t('admissions.application.academicInfo', 'Academic Information')}
          columns={2}
        >
          <FormField label={t('admissions.application.intendedClass')} required>
            <Input
              value={formData.intendedClass}
              onChange={(value) => handleInputChange('intendedClass', value)}
            />
          </FormField>
          <FormField label={t('admissions.application.previousSchool')}>
            <Input
              value={formData.previousSchool || ''}
              onChange={(value) => handleInputChange('previousSchool', value)}
            />
          </FormField>
        </FormSection>

        {/* Guardian Information */}
        <FormSection
          title={t('admissions.application.guardianInfo', 'Guardian Information')}
          columns={2}
        >
          <FormField label={t('admissions.application.guardianName')} required>
            <Input
              value={formData.guardianName}
              onChange={(value) => handleInputChange('guardianName', value)}
            />
          </FormField>
          <FormField label={t('admissions.application.guardianPhone')} required>
            <Input
              value={formData.guardianPhone}
              onChange={(value) => handleInputChange('guardianPhone', value)}
            />
          </FormField>
          <FormField label={t('admissions.application.guardianEmail')}>
            <Input
              type="email"
              value={formData.guardianEmail || ''}
              onChange={(value) => handleInputChange('guardianEmail', value)}
            />
          </FormField>
          <FormField label={t('admissions.application.guardianRelationship')}>
            <Input
              value={formData.guardianRelationship || ''}
              onChange={(value) => handleInputChange('guardianRelationship', value)}
            />
          </FormField>
        </FormSection>

        {/* Additional Information */}
        <FormSection
          title={t('admissions.application.additionalInfo', 'Additional Information')}
        >
          <FormField label={t('admissions.application.address')}>
            <Input
              value={formData.address || ''}
              onChange={(value) => handleInputChange('address', value)}
              multiline
              rows={3}
            />
          </FormField>
          <FormField label={t('admissions.application.remarks')}>
            <Input
              value={formData.remarks || ''}
              onChange={(value) => handleInputChange('remarks', value)}
              multiline
              rows={3}
            />
          </FormField>
        </FormSection>

        {/* Form Actions */}
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit">
            {editingApplication ? t('admissions.actions.edit') : t('admissions.actions.submit')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default ApplicationManagement;
