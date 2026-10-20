// ABOUTME: Add Student page: the standalone tabbed form that admits one canonical learner with a guardian.
// ABOUTME: The learner, the primary contact and the first enrolment are written through the repository in one transaction.

import React, { useCallback, useMemo, useState } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import TabbedForm, { type FormTab } from '@/components/ui/forms/TabbedForm';
import { EntityPicker } from '@/components/ui/EntityPicker';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  UserCircleIcon,
  UsersIcon,
} from '@/components/ui/icons';
import { useToast } from '@/hooks/useToast';
import { asId } from '@/domain/ids';
import { logger } from '@/utils/logging';

import { useWritableRepository } from '../data/useWritableRepository';
import { useInstitutionId } from '../data/useCanonicalStaff';
import { useCanonicalClassGroups } from '../data/useCanonicalClassGroups';
import { admitLearner, type LearnerGuardianInput } from '../data/useCanonicalLearners';

interface AddStudentForm {
  admission_no: string;
  upi_no: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  admission_date: string;
  status: string;
  religion: string;
  county: string;
  primary_school: string;
  remarks: string;
  current_class_stream_id: string | null;
  primary_guardian_name: string;
  primary_guardian_phone: string;
  primary_guardian_relationship_type: string;
}

const initialForm = (): AddStudentForm => ({
  admission_no: '',
  upi_no: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: 'Male',
  date_of_birth: '',
  admission_date: '',
  status: 'Active',
  religion: '',
  county: '',
  primary_school: '',
  remarks: '',
  current_class_stream_id: null,
  primary_guardian_name: '',
  primary_guardian_phone: '',
  primary_guardian_relationship_type: 'Guardian',
});

const AddStudentPage: React.FC = () => {
  const navigate = useNavigate();
  const repository = useWritableRepository();
  const institutionId = useInstitutionId();
  const { classGroupsLookup } = useCanonicalClassGroups();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AddStudentForm>(initialForm);

  const handleFieldChange = useCallback((name: string, value: unknown) => {
    setForm((previous) => ({ ...previous, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.admission_no.trim() || !form.first_name.trim() || !form.last_name.trim()) {
      toast.showWarning('Please fill in all required fields (Admission No, First Name, Last Name)');
      return;
    }
    if (!institutionId) {
      setError('The school profile is not available, so the learner cannot be saved.');
      return;
    }

    const guardian: LearnerGuardianInput = {
      name: form.primary_guardian_name,
      phone: form.primary_guardian_phone,
      relationship: form.primary_guardian_relationship_type,
    };

    setIsSubmitting(true);
    setError(null);
    try {
      await admitLearner(repository, {
        institutionId,
        values: {
          admission_no: form.admission_no,
          first_name: form.first_name,
          middle_name: form.middle_name,
          last_name: form.last_name,
          gender: form.gender,
          status: form.status,
          date_of_birth: form.date_of_birth,
          admission_date: form.admission_date,
          current_class_stream_id: form.current_class_stream_id,
          upi_no: form.upi_no,
          previous_school: form.primary_school,
          county: form.county,
          religion: form.religion,
          remarks: form.remarks,
        },
        guardian,
        placement: {
          classGroupId: form.current_class_stream_id,
          ...(form.admission_date ? { startDate: form.admission_date } : {}),
        },
      });
      navigate('/administration/students');
    } catch (caught) {
      logger.error('Error adding student:', caught);
      setError(caught instanceof Error ? caught.message : 'The learner could not be saved.');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, repository, institutionId, navigate, toast]);

  const tabs = useMemo((): FormTab[] => {
    return [
      {
        id: 'personal',
        label: 'Personal Details',
        icon: <UserCircleIcon className="h-5 w-5" />,
        required: true,
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                name="admission_no"
                label="Admission No."
                required
                value={form.admission_no}
                onChange={(event) => handleFieldChange('admission_no', event.target.value)}
              />
              <Input
                name="upi_no"
                label="UPI No."
                value={form.upi_no}
                onChange={(event) => handleFieldChange('upi_no', event.target.value)}
              />
              <Input
                name="first_name"
                label="First Name"
                required
                value={form.first_name}
                onChange={(event) => handleFieldChange('first_name', event.target.value)}
              />
              <Input
                name="middle_name"
                label="Middle Name"
                value={form.middle_name}
                onChange={(event) => handleFieldChange('middle_name', event.target.value)}
              />
              <Input
                name="last_name"
                label="Last Name"
                required
                value={form.last_name}
                onChange={(event) => handleFieldChange('last_name', event.target.value)}
              />
              <Select
                name="gender"
                label="Gender"
                required
                value={form.gender}
                onChange={(event) => handleFieldChange('gender', event.target.value)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
              <Input
                name="date_of_birth"
                label="Date of Birth"
                type="date"
                value={form.date_of_birth}
                onChange={(event) => handleFieldChange('date_of_birth', event.target.value)}
              />
              <Input
                name="admission_date"
                label="Admission Date"
                type="date"
                value={form.admission_date}
                onChange={(event) => handleFieldChange('admission_date', event.target.value)}
              />
              <Select
                name="status"
                label="Status"
                required
                value={form.status}
                onChange={(event) => handleFieldChange('status', event.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Transferred">Transferred</option>
                <option value="Alumni">Alumni</option>
                <option value="Withdrawn">Withdrawn</option>
              </Select>
              <Input
                name="religion"
                label="Religion"
                value={form.religion}
                onChange={(event) => handleFieldChange('religion', event.target.value)}
              />
              <Input
                name="county"
                label="County"
                value={form.county}
                onChange={(event) => handleFieldChange('county', event.target.value)}
              />
              <Input
                name="primary_school"
                label="Primary School Attended"
                value={form.primary_school}
                onChange={(event) => handleFieldChange('primary_school', event.target.value)}
              />
            </div>
            <Input
              name="remarks"
              label="Remarks"
              value={form.remarks}
              onChange={(event) => handleFieldChange('remarks', event.target.value)}
              className="w-full"
            />
          </div>
        ),
      },
      {
        id: 'guardian',
        label: 'Guardian Details',
        icon: <UsersIcon className="h-5 w-5" />,
        content: (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              name="primary_guardian_name"
              label="Guardian Full Name"
              value={form.primary_guardian_name}
              onChange={(event) => handleFieldChange('primary_guardian_name', event.target.value)}
            />
            <Select
              name="primary_guardian_relationship_type"
              label="Relationship Type"
              value={form.primary_guardian_relationship_type}
              onChange={(event) =>
                handleFieldChange('primary_guardian_relationship_type', event.target.value)
              }
            >
              <option value="">Select Type</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Guardian">Guardian</option>
              <option value="Other">Other</option>
            </Select>
            <Input
              name="primary_guardian_phone"
              label="Phone Number"
              value={form.primary_guardian_phone}
              onChange={(event) => handleFieldChange('primary_guardian_phone', event.target.value)}
            />
          </div>
        ),
      },
      {
        id: 'academic',
        label: 'Academic Details',
        icon: <AcademicCapIcon className="h-5 w-5" />,
        content: (
          <div className="space-y-4">
            <div>
              <EntityPicker
                id="add-student-class-group"
                name="current_class_stream_id"
                label="Class Group"
                value={form.current_class_stream_id ? asId<'class_group'>(form.current_class_stream_id) : null}
                onChange={(id) => handleFieldChange('current_class_stream_id', id)}
                lookup={classGroupsLookup}
                placeholder="Select class group"
                allowClear
                data-testid="add-student-class-group-picker"
              />
            </div>
            {/* GAP(P1-E01): learner category, dormitory and the primary exam summary have no canonical column. */}
            <p className="text-sm text-surface-muted-fg">
              Student category, dormitory and the primary exam summary are not part of the
              canonical learner model yet.
            </p>
          </div>
        ),
      },
    ];
  }, [form, handleFieldChange, classGroupsLookup]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/administration/students')}
            leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
          >
            Back to Students
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-surface-foreground">Add New Student</h1>
            <p className="text-sm text-surface-muted-fg">
              Fill in the student information using the tabbed form below
            </p>
          </div>
        </div>
      </div>

      <Card className="mx-auto max-w-6xl">
        {error ? (
          <p role="alert" className="mb-4 text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}
        <TabbedForm
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showProgress
          allowTabSwitching
          onSubmit={handleSubmit}
          onCancel={() => navigate('/administration/students')}
          loading={isSubmitting}
          submitButtonText="Add Student"
          cancelButtonText="Cancel"
          size="lg"
          variant="default"
        />
      </Card>
    </div>
  );
};

const AddStudentPageWithRepository = withCanonicalRepository(AddStudentPage);
export default AddStudentPageWithRepository;
