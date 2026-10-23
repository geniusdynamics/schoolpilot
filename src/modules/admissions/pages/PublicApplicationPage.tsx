import { logger } from '@/utils/logging';

// ABOUTME: Public application form for prospective students
// ABOUTME: Multi-step wizard accessible without authentication

import React, { useState, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';
import {
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  UsersIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  UploadIcon,
  DocumentReportIcon,
} from '@/components/ui/icons';
import { useAdmissionsData } from '../data/useAdmissionsData';
import {
  ApplicationFormData,
  Gender,
  GuardianType,
  ApplicationType,
} from '../data/types';

// ─── Step Definitions ───────────────────────────────────────────────
interface StepDef {
  id: number;
  name: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

const steps: StepDef[] = [
  { id: 1, name: 'Student Info', icon: UserIcon },
  { id: 2, name: 'Parent / Guardian', icon: UsersIcon },
  { id: 3, name: 'Academic Info', icon: AcademicCapIcon },
  { id: 4, name: 'Documents', icon: DocumentTextIcon },
  { id: 5, name: 'Review & Submit', icon: EyeIcon },
];

// ─── Initial Form State ─────────────────────────────────────────────
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

// ─── Uploaded Document ──────────────────────────────────────────────
interface UploadedDoc {
  name: string;
  type: string;
  size: number;
  file: File;
}

// ─── Component ──────────────────────────────────────────────────────
export const PublicApplicationPageContent: React.FC = () => {
  const { t } = useTranslation('admissions');
  const { createApplication } = useAdmissionsData();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');

  // Document uploads
  const [birthCertFiles, setBirthCertFiles] = useState<UploadedDoc[]>([]);
  const [reportFiles, setReportFiles] = useState<UploadedDoc[]>([]);
  const [photoFile, setPhotoFile] = useState<UploadedDoc | null>(null);

  // Refs for file inputs
  const birthCertRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  // ── Handlers ────────────────────────────────────────────────────
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < steps.length) setCurrentStep((p) => p + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((p) => p - 1);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.firstName.trim() &&
          formData.lastName.trim() &&
          formData.dateOfBirth &&
          formData.gender &&
          formData.intendedClassId
        );
      case 2:
        return !!(
          formData.guardianFirstName.trim() &&
          formData.guardianLastName.trim() &&
          formData.guardianPhone.trim()
        );
      case 3:
        return true; // academic info is optional
      case 4:
        return true; // documents optional for submission
      case 5:
        return true;
      default:
        return false;
    }
  };

  // ── File Upload Helpers ─────────────────────────────────────────
  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<UploadedDoc[]>> | React.Dispatch<React.SetStateAction<UploadedDoc | null>>,
    multi = false
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (multi) {
      const arr = Array.from(files).map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
        file: f,
      }));
      (setter as React.Dispatch<React.SetStateAction<UploadedDoc[]>>)((prev) => [...(prev as UploadedDoc[]), ...arr]);
    } else {
      const f = files[0];
      (setter as React.Dispatch<React.SetStateAction<UploadedDoc | null>>)(null);
      setTimeout(() => {
        (setter as React.Dispatch<React.SetStateAction<UploadedDoc | null>>)({
          name: f.name,
          type: f.type,
          size: f.size,
          file: f,
        });
      }, 0);
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const removeFile = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<UploadedDoc[]>>
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await createApplication(formData);
      setReferenceNumber(result.applicationNumber);
      setIsSubmitted(true);
      showToast({
        type: 'success',
        message: t('public.submitSuccess', 'Application submitted successfully!'),
      });
    } catch (error) {
      logger.error('Submission error:', error);
      showToast({
        type: 'error',
        message: t('public.submitError', 'Failed to submit application. Please try again.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success Screen ──────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-primary-50 flex items-center justify-center p-4">
        <Card variant="elevated" size="lg" className="max-w-lg w-full text-center">
          <div className="py-8">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircleIcon className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-surface-foreground mb-2">
              {t('public.successTitle', 'Application Submitted!')}
            </h2>
            <p className="text-surface-muted-fg mb-6">
              {t(
                'public.successMessage',
                'Your application has been received. Please save your reference number below to track your application status.'
              )}
            </p>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-indigo-600 font-medium mb-1">
                {t('public.referenceNumber', 'Reference Number')}
              </p>
              <p className="text-2xl font-mono font-bold text-indigo-800 tracking-wide">
                {referenceNumber}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  navigator.clipboard?.writeText(referenceNumber);
                  showToast({
                    type: 'success',
                    message: 'Reference number copied to clipboard!',
                  });
                }}
              >
                Copy Reference Number
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  window.location.hash = '#/admissions/track';
                }}
              >
                Track Application
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ── File Upload Zone ────────────────────────────────────────────
  const renderFileUpload = (
    label: string,
    description: string,
    accepted: string,
    files: UploadedDoc[],
    ref: React.RefObject<HTMLInputElement>,
    onTrigger: () => void,
    onRemove: (idx: number) => void,
    multi = false
  ) => (
    <div className="border-2 border-dashed border-surface-border rounded-lg p-4 hover:border-indigo-400 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-surface-foreground">{label}</p>
          <p className="text-xs text-surface-muted-fg">{description}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onTrigger} leftIcon={<UploadIcon className="w-4 h-4" />}>
          Upload
        </Button>
      </div>
      <input
        ref={ref as any}
        type="file"
        accept={accepted}
        multiple={multi}
        className="hidden"
        onChange={(e) => handleFileSelect(e, multi ? (files as any) : null, multi)}
        onBlur={() => {
          // Re-wire: we handle via the trigger button instead
        }}
      />
      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-surface-muted rounded px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <DocumentReportIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span className="truncate">{f.name}</span>
                <span className="text-surface-muted-fg text-xs flex-shrink-0">({formatFileSize(f.size)})</span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
              >
                <XCircleIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Step 1: Student Info ────────────────────────────────────────
  const renderStudentInfo = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-foreground">{t('public.studentInfo', 'Student Information')}</h3>
        <p className="text-sm text-surface-muted-fg mt-1">
          {t('public.studentInfoDesc', 'Enter the prospective student\'s personal details')}
        </p>
      </div>

      {/* Photo Upload */}
      <div className="flex items-center gap-4">
        <div
          className="w-24 h-24 rounded-full bg-surface-accent border-2 border-dashed border-surface-border flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
          onClick={() => photoRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && photoRef.current?.click()}
        >
          {photoFile ? (
            <img
              src={URL.createObjectURL(photoFile.file)}
              alt="Student"
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="text-center">
              <UserIcon className="w-8 h-8 text-surface-muted-fg mx-auto" />
              <span className="text-xs text-surface-muted-fg mt-1 block">Photo</span>
            </div>
          )}
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPhotoFile({ name: f.name, type: f.type, size: f.size, file: f });
            e.target.value = '';
          }}
        />
        <div>
          <p className="text-sm font-medium text-surface-foreground">Student Photo</p>
          <p className="text-xs text-surface-muted-fg">Upload a recent passport-size photo (JPG, PNG)</p>
        </div>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          name="firstName"
          label={t('application.fields.firstName', 'First Name') + ' *'}
          value={formData.firstName}
          onChange={handleInputChange}
          required
        />
        <Input
          name="middleName"
          label={t('application.fields.middleName', 'Middle Name')}
          value={formData.middleName}
          onChange={handleInputChange}
        />
        <Input
          name="lastName"
          label={t('application.fields.lastName', 'Last Name') + ' *'}
          value={formData.lastName}
          onChange={handleInputChange}
          required
        />
      </div>

      {/* DOB, Gender, Nationality */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          name="dateOfBirth"
          label={t('application.fields.dateOfBirth', 'Date of Birth') + ' *'}
          type="date"
          value={formData.dateOfBirth}
          onChange={handleInputChange}
          required
        />
        <Select
          name="gender"
          label={t('application.fields.gender', 'Gender') + ' *'}
          value={formData.gender}
          onChange={handleInputChange}
          required
        >
          {Object.values(Gender).map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        <Input
          name="nationality"
          label={t('application.fields.nationality', 'Nationality')}
          value={formData.nationality}
          onChange={handleInputChange}
        />
      </div>
    </div>
  );

  // ── Step 2: Parent / Guardian Info ──────────────────────────────
  const renderGuardianInfo = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-foreground">
          {t('public.parentGuardianInfo', 'Parent / Guardian Information')}
        </h3>
        <p className="text-sm text-surface-muted-fg mt-1">
          {t('public.parentGuardianDesc', 'Enter the primary contact person\'s details')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          name="guardianType"
          label={t('application.fields.guardianType', 'Relationship') + ' *'}
          value={formData.guardianType}
          onChange={handleInputChange}
          required
        >
          {Object.values(GuardianType).map((gt) => (
            <option key={gt} value={gt}>
              {gt}
            </option>
          ))}
        </Select>
        <Input
          name="guardianFirstName"
          label={t('public.parentFirstName', 'Parent First Name') + ' *'}
          value={formData.guardianFirstName}
          onChange={handleInputChange}
          required
        />
        <Input
          name="guardianLastName"
          label={t('public.parentLastName', 'Parent Last Name') + ' *'}
          value={formData.guardianLastName}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          name="guardianPhone"
          label={t('application.fields.guardianPhone', 'Phone Number') + ' *'}
          value={formData.guardianPhone}
          onChange={handleInputChange}
          required
          placeholder="+254 7XX XXX XXX"
        />
        <Input
          name="guardianEmail"
          label={t('application.fields.guardianEmail', 'Email Address')}
          type="email"
          value={formData.guardianEmail}
          onChange={handleInputChange}
          placeholder="parent@example.com"
        />
      </div>

      <div className="border-t pt-4">
        <h4 className="text-md font-medium text-surface-foreground mb-3">Address</h4>
        <div className="space-y-4">
          <Input
            name="residentialAddress"
            label={t('application.fields.residentialAddress', 'Residential Address')}
            value={formData.residentialAddress}
            onChange={handleInputChange}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="county"
              label={t('application.fields.county', 'County')}
              value={formData.county}
              onChange={handleInputChange}
            />
            <Input
              name="subCounty"
              label={t('application.fields.subCounty', 'Sub-County')}
              value={formData.subCounty}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 3: Academic Info ───────────────────────────────────────
  const renderAcademicInfo = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-foreground">
          {t('public.academicInfo', 'Academic Information')}
        </h3>
        <p className="text-sm text-surface-muted-fg mt-1">
          {t('public.academicInfoDesc', 'Provide details about the class you are applying for and previous schooling')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          name="intendedClassId"
          label={t('application.fields.intendedClass', 'Applying for Class') + ' *'}
          value={formData.intendedClassId}
          onChange={handleInputChange}
          required
          placeholder="e.g., Grade 1, Form 1, Class 4"
        />
        <Input
          name="academicYearId"
          label={t('application.fields.academicYear', 'Academic Year')}
          value={formData.academicYearId}
          onChange={handleInputChange}
          placeholder="e.g., 2025, 2025-2026"
        />
      </div>

      <div className="border-t pt-4">
        <h4 className="text-md font-medium text-surface-foreground mb-3">
          {t('public.previousSchooling', 'Previous Schooling')}{' '}
          <span className="text-sm font-normal text-surface-muted-fg">(Optional)</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            name="previousSchool"
            label={t('application.fields.previousSchool', 'Previous School')}
            value={formData.previousSchool}
            onChange={handleInputChange}
          />
          <Input
            name="previousClass"
            label={t('application.fields.previousClass', 'Previous Class / Grade')}
            value={formData.previousClass}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div>
        <Textarea
          name="kcpeGrade"
          label={t('public.transferReason', 'Reason for Transfer / Additional Notes')}
          value={formData.kcpeGrade}
          onChange={(e) => setFormData((prev) => ({ ...prev, kcpeGrade: e.target.value }))}
          placeholder="Tell us why you are applying to our school..."
          rows={3}
        />
      </div>
    </div>
  );

  // ── Step 4: Documents ───────────────────────────────────────────
  const renderDocuments = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-foreground">
          {t('public.documents', 'Upload Documents')}
        </h3>
        <p className="text-sm text-surface-muted-fg mt-1">
          {t('public.documentsDesc', 'Upload any supporting documents. You can also bring these documents in person.')}
        </p>
      </div>

      {renderFileUpload(
        t('application.documents.birthCertificate', 'Birth Certificate'),
        'Upload a copy of the birth certificate (PDF, JPG, PNG)',
        '.pdf,.jpg,.jpeg,.png',
        birthCertFiles,
        birthCertRef as any,
        () => birthCertRef.current?.click(),
        (idx) => removeFile(idx, setBirthCertFiles),
        true
      )}

      {renderFileUpload(
        t('application.documents.previousSchoolReport', 'Previous School Reports'),
        'Upload previous academic reports or transcripts (PDF, JPG, PNG)',
        '.pdf,.jpg,.jpeg,.png',
        reportFiles,
        reportRef as any,
        () => reportRef.current?.click(),
        (idx) => removeFile(idx, setReportFiles),
        true
      )}

      {renderFileUpload(
        t('application.documents.passportPhoto', 'Passport Photo'),
        'Upload a recent passport-size photo (JPG, PNG)',
        '.jpg,.jpeg,.png',
        photoFile ? [photoFile] : [],
        photoRef as any,
        () => photoRef.current?.click(),
        () => setPhotoFile(null),
        false
      )}
    </div>
  );

  // ── Step 5: Review ──────────────────────────────────────────────
  const renderReview = () => {
    const Field = ({ label, value }: { label: string; value?: string }) => (
      <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
        <span className="text-sm text-surface-muted-fg">{label}</span>
        <span className="text-sm font-medium text-surface-foreground">{value || '—'}</span>
      </div>
    );

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-surface-foreground">
            {t('public.reviewTitle', 'Review Your Application')}
          </h3>
          <p className="text-sm text-surface-muted-fg mt-1">
            {t('public.reviewDesc', 'Please verify all details before submitting. You cannot edit after submission.')}
          </p>
        </div>

        {/* Student */}
        <div className="bg-surface-muted rounded-lg p-4">
          <h4 className="font-semibold text-surface-foreground mb-3 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-indigo-500" />
            {t('public.studentInfo', 'Student Information')}
          </h4>
          <Field label={t('application.fields.firstName', 'First Name')} value={formData.firstName} />
          <Field label={t('application.fields.middleName', 'Middle Name')} value={formData.middleName} />
          <Field label={t('application.fields.lastName', 'Last Name')} value={formData.lastName} />
          <Field label={t('application.fields.dateOfBirth', 'Date of Birth')} value={formData.dateOfBirth} />
          <Field label={t('application.fields.gender', 'Gender')} value={formData.gender} />
          <Field label={t('application.fields.nationality', 'Nationality')} value={formData.nationality} />
        </div>

        {/* Parent */}
        <div className="bg-surface-muted rounded-lg p-4">
          <h4 className="font-semibold text-surface-foreground mb-3 flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-indigo-500" />
            {t('public.parentGuardianInfo', 'Parent / Guardian Information')}
          </h4>
          <Field
            label={t('application.fields.guardianType', 'Relationship')}
            value={formData.guardianType}
          />
          <Field
            label={t('public.parentFirstName', 'Parent Name')}
            value={`${formData.guardianFirstName} ${formData.guardianLastName}`}
          />
          <Field label={t('application.fields.guardianPhone', 'Phone')} value={formData.guardianPhone} />
          <Field label={t('application.fields.guardianEmail', 'Email')} value={formData.guardianEmail} />
          <Field
            label={t('application.fields.residentialAddress', 'Address')}
            value={formData.residentialAddress}
          />
        </div>

        {/* Academic */}
        <div className="bg-surface-muted rounded-lg p-4">
          <h4 className="font-semibold text-surface-foreground mb-3 flex items-center gap-2">
            <AcademicCapIcon className="w-4 h-4 text-indigo-500" />
            {t('public.academicInfo', 'Academic Information')}
          </h4>
          <Field
            label={t('application.fields.intendedClass', 'Applying for Class')}
            value={formData.intendedClassId}
          />
          <Field
            label={t('application.fields.academicYear', 'Academic Year')}
            value={formData.academicYearId}
          />
          <Field
            label={t('application.fields.previousSchool', 'Previous School')}
            value={formData.previousSchool}
          />
        </div>

        {/* Documents */}
        <div className="bg-surface-muted rounded-lg p-4">
          <h4 className="font-semibold text-surface-foreground mb-3 flex items-center gap-2">
            <DocumentTextIcon className="w-4 h-4 text-indigo-500" />
            {t('public.documents', 'Documents')}
          </h4>
          <Field
            label={t('application.documents.birthCertificate', 'Birth Certificate')}
            value={birthCertFiles.length > 0 ? `${birthCertFiles.length} file(s) uploaded` : 'Not uploaded'}
          />
          <Field
            label={t('application.documents.previousSchoolReport', 'School Reports')}
            value={reportFiles.length > 0 ? `${reportFiles.length} file(s) uploaded` : 'Not uploaded'}
          />
          <Field
            label={t('application.documents.passportPhoto', 'Photo')}
            value={photoFile ? photoFile.name : 'Not uploaded'}
          />
        </div>

        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <CheckCircleIcon className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            {t(
              'public.confirmSubmit',
              'By submitting this application, you confirm that all information provided is accurate and complete. You will receive a reference number to track your application status.'
            )}
          </p>
        </div>
      </div>
    );
  };

  // ── Render Current Step ─────────────────────────────────────────
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStudentInfo();
      case 2:
        return renderGuardianInfo();
      case 3:
        return renderAcademicInfo();
      case 4:
        return renderDocuments();
      case 5:
        return renderReview();
      default:
        return null;
    }
  };

  // ── Step Indicator ──────────────────────────────────────────────
  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100;

  // ── Main Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-primary-50 py-8 px-4">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-bold text-surface-foreground mb-2">
          {t('public.applyTitle', 'Apply for Admission')}
        </h1>
        <p className="text-surface-muted-fg">
          {t(
            'public.applySubtitle',
            'Complete the form below to start your application. All fields marked with * are required.'
          )}
        </p>
      </div>

      <Card variant="elevated" size="lg" className="max-w-3xl mx-auto">
        {/* Step Indicator */}
        <div className="px-4 pt-4 sm:px-6 sm:pt-6">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Step Pills */}
          <div className="hidden sm:flex items-center justify-between mb-6">
            {steps.map((step, idx) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              const IconComponent = step.icon;
              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                          : 'bg-gray-200 text-surface-muted-fg'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircleIcon className="w-5 h-5" />
                      ) : (
                        <IconComponent className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium ${
                        isActive ? 'text-indigo-700' : isCompleted ? 'text-green-700' : 'text-surface-muted-fg'
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Step Label */}
          <div className="sm:hidden mb-6">
            <p className="text-sm font-medium text-indigo-700">
              {t('common.step', 'Step')} {currentStep} {t('common.of', 'of')} {steps.length}:{' '}
              {steps[currentStep - 1].name}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="px-4 py-4 sm:px-6 sm:py-6">{renderCurrentStep()}</div>

        {/* Navigation Buttons */}
        <div className="px-4 pb-4 sm:px-6 sm:pb-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            {t('application.actions.previous', 'Previous')}
          </Button>

          {currentStep < steps.length ? (
            <Button
              variant="primary"
              rightIcon={<ArrowRightIcon className="w-4 h-4" />}
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
            >
              {t('application.actions.next', 'Next')}
            </Button>
          ) : (
            <Button
              variant="success"
              leftIcon={isSubmitting ? undefined : <CheckCircleIcon className="w-4 h-4" />}
              onClick={handleSubmit}
              loading={isSubmitting}
              loadingText="Submitting..."
              disabled={!validateStep(currentStep)}
            >
              {t('application.actions.submitApplication', 'Submit Application')}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
const PublicApplicationPage: React.FC = () => (
  <div className="space-y-3">
    <PublicApplicationPageContent />
  </div>
);

export default PublicApplicationPage;
