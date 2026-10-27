// ABOUTME: Staff-facing admissions application form: a four-step wizard capturing student, guardian and academic details.
// ABOUTME: Each step passes {id, title, content, validate} to WizardForm; required fields block progression and submission.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, UserIcon, AcademicCapIcon, UsersIcon, EyeIcon } from '@/components/ui/icons';
import { addressLevelChoices } from '@/domain/country';
import { useAdmissionsData } from '../data/useAdmissionsData';
import {
  ApplicationFormData,
  Gender,
  GuardianType,
  ApplicationType,
} from '../data/types';
import { useToast } from '@/hooks/useToast';
import { logger } from '@/utils/logging';
import FormContainer from '@/components/ui/forms/FormContainer';
import FormHeader from '@/components/ui/forms/FormHeader';
import WizardForm, { WizardStep } from '@/components/ui/forms/WizardForm';

type StepId = 'student' | 'guardian' | 'academic' | 'review';

/** Fields that must be non-empty before the wizard may leave the given step. */
const REQUIRED_FIELDS: Record<StepId, (keyof ApplicationFormData)[]> = {
  student: ['firstName', 'lastName', 'dateOfBirth', 'gender', 'intendedClassId'],
  guardian: ['guardianFirstName', 'guardianLastName', 'guardianPhone'],
  academic: [],
  review: [],
};

const isBlank = (value: unknown) =>
  value === undefined || value === null || String(value).trim() === '';

const missingFields = (data: ApplicationFormData, stepIds: StepId[]) =>
  stepIds.flatMap(stepId => REQUIRED_FIELDS[stepId].filter(field => isBlank(data[field])));

const initialFormData: ApplicationFormData = {
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  gender: Gender.MALE,
  nationality: 'Kenyan',
  religion: '',
  birthCertificateNumber: '',
  intendedClassId: '',
  academicYearId: '',
  applicationType: ApplicationType.NEW,
  previousSchool: '',
  previousClass: '',
  kcpeIndexNumber: '',
  kcpeMarks: undefined,
  kcpeGrade: '',
  guardianType: GuardianType.FATHER,
  guardianFirstName: '',
  guardianLastName: '',
  guardianPhone: '',
  guardianEmail: '',
  guardianOccupation: '',
  guardianEmployer: '',
  residentialAddress: '',
  postalAddress: '',
  county: '',
  subCounty: '',
  location: '',
  subLocation: '',
};

export const ApplicationFormPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('admissions');
  const { createApplication } = useAdmissionsData();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);
  const [invalidStep, setInvalidStep] = useState<StepId | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const nextValue = name === 'kcpeMarks' ? (value === '' ? undefined : Number(value)) : value;
    setFormData(prev => ({ ...prev, [name]: nextValue }));
  };

  /** Returns true when every required field of the given steps is filled; otherwise flags the step. */
  const validateSteps = (flagStep: StepId, stepIds: StepId[]) => {
    const valid = missingFields(formData, stepIds).length === 0;
    setInvalidStep(valid ? null : flagStep);
    return valid;
  };

  const showFieldError = (stepId: StepId, field: keyof ApplicationFormData) =>
    invalidStep === stepId && isBlank(formData[field]);

  const renderStepError = (stepId: StepId) =>
    invalidStep === stepId ? (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
      >
        {stepId === 'review'
          ? t('applicationForm.validation.incompleteApplication', 'Some required fields are missing. Go back and complete all required fields before submitting.')
          : t('applicationForm.validation.requiredFields', 'Please fill in all required fields (marked *) before continuing.')}
      </div>
    ) : null;

  const handleCancel = () => {
    navigate('/admissions/applications');
  };

  const handleSubmit = async () => {
    try {
      await createApplication(formData);
      showToast({
        type: 'success',
        message: 'Application submitted successfully!',
      });
      navigate('/admissions/applications');
    } catch (error) {
      logger.error('Failed to submit admission application:', error);
      showToast({
        type: 'error',
        message: 'Failed to submit application. Please try again.',
      });
    }
  };

  // Step 1: Student Information
  const renderStudentInfo = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-surface-foreground">Student Information</h3>
      {renderStepError('student')}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          name="firstName"
          label="First Name *"
          value={formData.firstName}
          onChange={handleInputChange}
          required
          errorState={showFieldError('student', 'firstName')}
        />
        <Input
          name="middleName"
          label="Middle Name"
          value={formData.middleName}
          onChange={handleInputChange}
        />
        <Input
          name="lastName"
          label="Last Name *"
          value={formData.lastName}
          onChange={handleInputChange}
          required
          errorState={showFieldError('student', 'lastName')}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          name="dateOfBirth"
          label="Date of Birth *"
          type="date"
          value={formData.dateOfBirth}
          onChange={handleInputChange}
          required
          errorState={showFieldError('student', 'dateOfBirth')}
        />
        <Select
          name="gender"
          label="Gender *"
          value={formData.gender}
          onChange={handleInputChange}
          required
          errorState={showFieldError('student', 'gender')}
        >
          {Object.values(Gender).map(gender => (
            <option key={gender} value={gender}>
              {gender}
            </option>
          ))}
        </Select>
        <Input
          name="birthCertificateNumber"
          label="Birth Certificate Number"
          value={formData.birthCertificateNumber}
          onChange={handleInputChange}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          name="nationality"
          label="Nationality"
          value={formData.nationality}
          onChange={handleInputChange}
        />
        <Input
          name="religion"
          label="Religion"
          value={formData.religion}
          onChange={handleInputChange}
        />
      </div>
      <div className="border-t pt-4 mt-4">
        <h4 className="text-md font-medium text-surface-foreground mb-3">Application Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            name="applicationType"
            label="Application Type *"
            value={formData.applicationType}
            onChange={handleInputChange}
            required
          >
            {Object.values(ApplicationType).map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <Input
            name="intendedClassId"
            label="Intended Class *"
            value={formData.intendedClassId}
            onChange={handleInputChange}
            required
            errorState={showFieldError('student', 'intendedClassId')}
            placeholder="Enter class ID"
          />
          <Input
            name="academicYearId"
            label="Academic Year"
            value={formData.academicYearId}
            onChange={handleInputChange}
            placeholder="Enter academic year ID"
          />
        </div>
      </div>
    </div>
  );

  // Step 2: Guardian Information
  const renderGuardianInfo = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-surface-foreground">Guardian Information</h3>
      {renderStepError('guardian')}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          name="guardianType"
          label="Guardian Type *"
          value={formData.guardianType}
          onChange={handleInputChange}
          required
        >
          {Object.values(GuardianType).map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <Input
          name="guardianFirstName"
          label="First Name *"
          value={formData.guardianFirstName}
          onChange={handleInputChange}
          required
          errorState={showFieldError('guardian', 'guardianFirstName')}
        />
        <Input
          name="guardianLastName"
          label="Last Name *"
          value={formData.guardianLastName}
          onChange={handleInputChange}
          required
          errorState={showFieldError('guardian', 'guardianLastName')}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          name="guardianPhone"
          label="Phone Number *"
          value={formData.guardianPhone}
          onChange={handleInputChange}
          required
          errorState={showFieldError('guardian', 'guardianPhone')}
        />
        <Input
          name="guardianEmail"
          label="Email Address"
          type="email"
          value={formData.guardianEmail}
          onChange={handleInputChange}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          name="guardianOccupation"
          label="Occupation"
          value={formData.guardianOccupation}
          onChange={handleInputChange}
        />
        <Input
          name="guardianEmployer"
          label="Employer"
          value={formData.guardianEmployer}
          onChange={handleInputChange}
        />
      </div>
      <div className="border-t pt-4 mt-4">
        <h4 className="text-md font-medium text-surface-foreground mb-3">Address Information</h4>
        <div className="space-y-4">
          <Input
            name="residentialAddress"
            label="Residential Address"
            value={formData.residentialAddress}
            onChange={handleInputChange}
          />
          <Input
            name="postalAddress"
            label="Postal Address"
            value={formData.postalAddress}
            onChange={handleInputChange}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              name="county"
              label="County"
              value={formData.county}
              onChange={handleInputChange}
            >
              <option value="">Select county</option>
              {addressLevelChoices('KE', 'county', formData.county).map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
            <Input
              name="subCounty"
              label="Sub-County"
              value={formData.subCounty}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Step 3: Academic Background
  const renderAcademicBackground = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-surface-foreground">Academic Background</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          name="previousSchool"
          label="Previous School"
          value={formData.previousSchool}
          onChange={handleInputChange}
        />
        <Input
          name="previousClass"
          label="Previous Class"
          value={formData.previousClass}
          onChange={handleInputChange}
        />
      </div>
      <div className="border-t pt-4 mt-4">
        <h4 className="text-md font-medium text-surface-foreground mb-3">KCPE Results (if applicable)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            name="kcpeIndexNumber"
            label="KCPE Index Number"
            value={formData.kcpeIndexNumber}
            onChange={handleInputChange}
          />
          <Input
            name="kcpeMarks"
            label="Total Marks"
            type="number"
            value={formData.kcpeMarks?.toString() || ''}
            onChange={handleInputChange}
          />
          <Input
            name="kcpeGrade"
            label="Overall Grade"
            value={formData.kcpeGrade}
            onChange={handleInputChange}
          />
        </div>
      </div>
    </div>
  );

  // Step 4: Review & Submit
  const renderReview = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-surface-foreground">Review Application</h3>
      {renderStepError('review')}
      
      <div className="bg-surface-muted p-4 rounded-lg">
        <h4 className="font-medium text-surface-foreground mb-2">Student Information</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-surface-muted-fg">Name:</span>
          <span>{`${formData.firstName} ${formData.middleName} ${formData.lastName}`}</span>
          <span className="text-surface-muted-fg">Date of Birth:</span>
          <span>{formData.dateOfBirth}</span>
          <span className="text-surface-muted-fg">Gender:</span>
          <span>{formData.gender}</span>
        </div>
      </div>

      <div className="bg-surface-muted p-4 rounded-lg">
        <h4 className="font-medium text-surface-foreground mb-2">Guardian Information</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-surface-muted-fg">Guardian:</span>
          <span>{`${formData.guardianFirstName} ${formData.guardianLastName}`}</span>
          <span className="text-surface-muted-fg">Phone:</span>
          <span>{formData.guardianPhone}</span>
          <span className="text-surface-muted-fg">Email:</span>
          <span>{formData.guardianEmail || 'N/A'}</span>
        </div>
      </div>

      {formData.previousSchool && (
        <div className="bg-surface-muted p-4 rounded-lg">
          <h4 className="font-medium text-surface-foreground mb-2">Academic Background</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-surface-muted-fg">Previous School:</span>
            <span>{formData.previousSchool}</span>
            {formData.kcpeMarks && (
              <>
                <span className="text-surface-muted-fg">KCPE Marks:</span>
                <span>{formData.kcpeMarks}</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2 text-sm text-surface-muted-fg">
        <CheckCircleIcon className="w-5 h-5 text-green-500" />
        <span>Please review all information before submitting. You will not be able to edit after submission.</span>
      </div>
    </div>
  );

  const steps: WizardStep[] = [
    {
      id: 'student',
      title: 'Student Information',
      icon: <UserIcon className="w-5 h-5" />,
      content: renderStudentInfo(),
      validate: () => validateSteps('student', ['student']),
    },
    {
      id: 'guardian',
      title: 'Guardian Information',
      icon: <UsersIcon className="w-5 h-5" />,
      content: renderGuardianInfo(),
      validate: () => validateSteps('guardian', ['guardian']),
    },
    {
      id: 'academic',
      title: 'Academic Background',
      icon: <AcademicCapIcon className="w-5 h-5" />,
      content: renderAcademicBackground(),
      optional: true,
    },
    {
      id: 'review',
      title: 'Review & Submit',
      icon: <EyeIcon className="w-5 h-5" />,
      content: renderReview(),
      validate: () => validateSteps('review', ['student', 'guardian']),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-xl">
        <FormContainer>
          <FormHeader
            title="New Application"
            description="Complete all steps to submit your application"
          />
          <WizardForm
            steps={steps}
            onComplete={handleSubmit}
            onCancel={handleCancel}
            showProgress={true}
            validateOnNext={true}
            previousButtonText="Previous"
            nextButtonText="Next"
            completeButtonText="Submit Application"
            cancelButtonText="Cancel"
          />
        </FormContainer>
      </Card>
    </div>
  );
};
const ApplicationFormPage: React.FC = () => (
  <div className="space-y-3">
    <ApplicationFormPageContent />
  </div>
);

export default ApplicationFormPage;
