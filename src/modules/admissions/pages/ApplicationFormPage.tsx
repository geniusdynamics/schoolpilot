import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  UserIcon,
  AcademicCapIcon,
  UsersIcon,
  DocumentTextIcon,
  EyeIcon,
} from '@/components/ui/icons';
import { useAdmissionsData } from '../data/useAdmissionsData';
import {
  ApplicationFormData,
  Gender,
  GuardianType,
  ApplicationType,
} from '../data/types';
import { useToast } from '@/hooks/useToast';
import FormContainer from '../../../components/ui/forms/FormContainer';
import FormHeader from '../../../components/ui/forms/FormHeader';
import WizardForm from '../../../components/ui/forms/WizardForm';

const steps = [
  { id: 1, name: 'Student Information', icon: UserIcon },
  { id: 2, name: 'Guardian Information', icon: UsersIcon },
  { id: 3, name: 'Academic Background', icon: AcademicCapIcon },
  { id: 4, name: 'Review & Submit', icon: EyeIcon },
];

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

const ApplicationFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { createApplication } = useAdmissionsData();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createApplication(formData);
      showToast({
        type: 'success',
        message: 'Application submitted successfully!',
      });
      navigate('/admissions/applications');
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to submit application. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.firstName &&
          formData.lastName &&
          formData.dateOfBirth &&
          formData.gender &&
          formData.intendedClassId
        );
      case 2:
        return (
          formData.guardianFirstName &&
          formData.guardianLastName &&
          formData.guardianPhone
        );
      case 3:
        return true; // Academic background is optional
      case 4:
        return true;
      default:
        return false;
    }
  };

  // Step 1: Student Information
  const renderStudentInfo = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Student Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          name="firstName"
          label="First Name *"
          value={formData.firstName}
          onChange={handleInputChange}
          required
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
        />
        <Select
          name="gender"
          label="Gender *"
          value={formData.gender}
          onChange={handleInputChange}
          required
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
        <h4 className="text-md font-medium text-gray-900 mb-3">Application Details</h4>
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
      <h3 className="text-lg font-semibold text-gray-900">Guardian Information</h3>
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
        />
        <Input
          name="guardianLastName"
          label="Last Name *"
          value={formData.guardianLastName}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          name="guardianPhone"
          label="Phone Number *"
          value={formData.guardianPhone}
          onChange={handleInputChange}
          required
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
        <h4 className="text-md font-medium text-gray-900 mb-3">Address Information</h4>
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
            <Input
              name="county"
              label="County"
              value={formData.county}
              onChange={handleInputChange}
            />
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
      <h3 className="text-lg font-semibold text-gray-900">Academic Background</h3>
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
        <h4 className="text-md font-medium text-gray-900 mb-3">KCPE Results (if applicable)</h4>
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
      <h3 className="text-lg font-semibold text-gray-900">Review Application</h3>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Student Information</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-600">Name:</span>
          <span>{`${formData.firstName} ${formData.middleName} ${formData.lastName}`}</span>
          <span className="text-gray-600">Date of Birth:</span>
          <span>{formData.dateOfBirth}</span>
          <span className="text-gray-600">Gender:</span>
          <span>{formData.gender}</span>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Guardian Information</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-600">Guardian:</span>
          <span>{`${formData.guardianFirstName} ${formData.guardianLastName}`}</span>
          <span className="text-gray-600">Phone:</span>
          <span>{formData.guardianPhone}</span>
          <span className="text-gray-600">Email:</span>
          <span>{formData.guardianEmail || 'N/A'}</span>
        </div>
      </div>

      {formData.previousSchool && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Academic Background</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-600">Previous School:</span>
            <span>{formData.previousSchool}</span>
            {formData.kcpeMarks && (
              <>
                <span className="text-gray-600">KCPE Marks:</span>
                <span>{formData.kcpeMarks}</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <CheckCircleIcon className="w-5 h-5 text-green-500" />
        <span>Please review all information before submitting. You will not be able to edit after submission.</span>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStudentInfo();
      case 2:
        return renderGuardianInfo();
      case 3:
        return renderAcademicBackground();
      case 4:
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-xl">
        <FormContainer>
          <FormHeader
            title="New Application"
            description="Complete all steps to submit your application"
          />
          <WizardForm
            steps={wizardSteps}
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

export default ApplicationFormPage;
