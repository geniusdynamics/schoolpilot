// ABOUTME: Student directory: lists canonical learners with class placement and primary guardian resolved at read time.
// ABOUTME: Add and edit write the learner, the placement and the primary guardian through the repository in one transaction.

import React, { useCallback, useMemo, useState } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { Link, useNavigate } from 'react-router-dom';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { DataGrid } from '@/components/ui/data';
import { EntityPicker } from '@/components/ui/EntityPicker';
import TabbedForm, { type FormTab } from '@/components/ui/forms/TabbedForm';
import {
  AcademicCapIcon,
  DeleteIcon,
  EditIcon,
  PlusIcon,
  UserCircleIcon,
  UsersIcon,
} from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { asId } from '@/domain/ids';
import { logger } from '@/utils/logging';

import { useWritableRepository } from '../data/useWritableRepository';
import {
  useCanonicalLearners,
  type CanonicalLearner,
  type LearnerFormValues,
  type LearnerGuardianInput,
  admitLearner,
  updateLearner,
} from '../data/useCanonicalLearners';
import { useCanonicalClassGroups } from '../data/useCanonicalClassGroups';
import { useInstitutionId } from '../data/useCanonicalStaff';

interface StudentFormState extends LearnerFormValues {
  primary_guardian_name: string;
  primary_guardian_phone: string;
  primary_guardian_relationship_type: string;
  primary_guardian_id: string | null;
}

const createInitialForm = (): StudentFormState => ({
  admission_no: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: 'Male',
  status: 'Active',
  date_of_birth: '',
  admission_date: '',
  current_class_stream_id: null,
  upi_no: '',
  previous_school: '',
  county: '',
  religion: '',
  remarks: '',
  phone: '',
  email: '',
  primary_guardian_name: '',
  primary_guardian_phone: '',
  primary_guardian_relationship_type: 'Guardian',
  primary_guardian_id: null,
});

const RELATIONSHIP_OPTIONS = ['Father', 'Mother', 'Guardian', 'Other'] as const;

export const StudentsListContent: React.FC = () => {
  const navigate = useNavigate();
  const repository = useWritableRepository();
  const institutionId = useInstitutionId();
  const { learners, learnerRows, status, isLoading } = useCanonicalLearners();
  const { classGroupsLookup } = useCanonicalClassGroups();
  const toast = useToast();
  const confirm = useConfirm();

  // GAP(P1-E01): the canonical model has no student category entity, so the category column
  // and the form field are not offered. Dormitory assignment has no learner column either;
  // a residence is a canonical entity but residence assignment is not modelled on the learner.
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CanonicalLearner | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState<StudentFormState>(createInitialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = useCallback((learner?: CanonicalLearner) => {
    setEditing(learner ?? null);
    setActiveTab(0);
    setError(null);
    setForm(
      learner
        ? {
            admission_no: learner.admission_no,
            first_name: learner.first_name,
            middle_name: learner.middle_name,
            last_name: learner.last_name,
            gender: learner.gender,
            status: learner.status,
            date_of_birth: learner.date_of_birth,
            admission_date: learner.admission_date,
            current_class_stream_id: learner.current_class_stream_id,
            upi_no: learner.upi_no,
            previous_school: learner.previous_school,
            county: learner.county,
            religion: learner.religion,
            remarks: learner.remarks,
            phone: learner.phone,
            email: learner.email,
            primary_guardian_name: learner.primary_guardian,
            primary_guardian_phone: learner.primary_guardian_phone,
            primary_guardian_relationship_type: learner.primary_guardian_relationship,
            primary_guardian_id: learner.primary_guardian_id,
          }
        : createInitialForm()
    );
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditing(null);
    setError(null);
  }, []);

  const handleFieldChange = useCallback((name: string, value: unknown) => {
    setForm((previous) => ({ ...previous, [name]: value }));
  }, []);

  const guardianOf = (state: StudentFormState): LearnerGuardianInput => ({
    guardianId: state.primary_guardian_id,
    name: state.primary_guardian_name,
    phone: state.primary_guardian_phone,
    relationship: state.primary_guardian_relationship_type,
  });

  const handleSubmit = useCallback(async () => {
    if (!form.admission_no.trim() || !form.first_name.trim() || !form.last_name.trim()) {
      toast.showWarning('Please fill in all required fields (Admission No, First Name, Last Name)');
      return;
    }
    if (!institutionId) {
      setError('The school profile is not available, so the learner cannot be saved.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const row = learnerRows.find((candidate) => candidate.id === editing.id);
        if (!row) throw new Error('the learner is no longer in the repository');
        await updateLearner(repository, {
          learner: row,
          values: form,
          guardian: guardianOf(form),
          currentGuardian: {
            guardianId: editing.primary_guardian_id,
            name: editing.primary_guardian,
            phone: editing.primary_guardian_phone,
            relationship: editing.primary_guardian_relationship,
          },
          placement: { classGroupId: form.current_class_stream_id ?? null },
        });
        toast.showToast({
          variant: 'success',
          title: 'Student Updated',
          message: 'Student information has been successfully updated.',
        });
      } else {
        await admitLearner(repository, {
          institutionId,
          values: form,
          guardian: guardianOf(form),
          placement: {
            classGroupId: form.current_class_stream_id ?? null,
            ...(form.admission_date ? { startDate: form.admission_date } : {}),
          },
        });
        toast.showToast({
          variant: 'success',
          title: 'Student Added',
          message: 'New student has been successfully added.',
        });
      }
      closeModal();
    } catch (caught) {
      logger.error('Error saving student:', caught);
      setError(caught instanceof Error ? caught.message : 'Failed to save student information.');
    } finally {
      setSaving(false);
    }
  }, [form, editing, learnerRows, repository, institutionId, toast, closeModal]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (await confirm({ variant: 'danger', message: 'Are you sure you want to delete this student?' })) {
        try {
          await repository.remove('learner', asId<'learner'>(id));
          toast.showToast({
            variant: 'success',
            title: 'Student Deleted',
            message: 'Student has been successfully deleted.',
          });
        } catch (caught) {
          logger.error('Error deleting student:', caught);
          toast.showToast({
            variant: 'error',
            title: 'Delete Failed',
            message: 'Failed to delete student. Please try again.',
          });
        }
      }
    },
    [confirm, repository, toast]
  );

  const columns = useMemo(
    () => [
      { key: 'admission_no' as const, header: 'Adm No', sortable: true, filterable: true },
      {
        key: 'name' as const,
        header: 'Name',
        sortable: true,
        filterable: true,
        render: (_value: unknown, item: CanonicalLearner) => (
          <Link
            to={`/administration/students/${item.id}`}
            className="block max-w-[160px] truncate font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            title={item.name}
          >
            {item.name}
          </Link>
        ),
      },
      { key: 'current_class_name' as const, header: 'Class', sortable: true, filterable: true },
      { key: 'current_class_stream_name' as const, header: 'Stream', sortable: true, filterable: true },
      {
        key: 'gender' as const,
        header: 'Gender',
        sortable: true,
        filterable: true,
      },
      {
        key: 'status' as const,
        header: 'Status',
        sortable: true,
        filterable: true,
        render: (_value: unknown, item: CanonicalLearner) => (
          <span className="inline-flex rounded-full bg-surface-accent px-2 text-xs font-semibold leading-5 text-surface-foreground">
            {item.status}
          </span>
        ),
      },
      {
        key: 'primary_guardian' as const,
        header: 'Guardian',
        sortable: true,
        filterable: true,
        render: (_value: unknown, item: CanonicalLearner) => (
          <span className="block max-w-[130px] truncate" title={item.primary_guardian}>
            {item.primary_guardian || '—'}
          </span>
        ),
      },
      {
        key: 'actions' as const,
        header: 'Actions',
        align: 'center' as const,
        sticky: 'right' as const,
        render: (_value: unknown, item: CanonicalLearner) => (
          <div className="flex justify-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                event.preventDefault();
                openModal(item);
              }}
              title="Edit"
            >
              <EditIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                event.preventDefault();
                void handleDelete(item.id);
              }}
              leftIcon={<DeleteIcon className="h-4 w-4" />}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [openModal, handleDelete]
  );

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
                value={form.admission_no}
                label="Admission No."
                required
                onChange={(event) => handleFieldChange('admission_no', event.target.value)}
              />
              <Input
                name="upi_no"
                value={form.upi_no ?? ''}
                label="UPI No."
                onChange={(event) => handleFieldChange('upi_no', event.target.value)}
              />
              <Input
                name="first_name"
                value={form.first_name}
                label="First Name"
                required
                onChange={(event) => handleFieldChange('first_name', event.target.value)}
              />
              <Input
                name="middle_name"
                value={form.middle_name ?? ''}
                label="Middle Name"
                onChange={(event) => handleFieldChange('middle_name', event.target.value)}
              />
              <Input
                name="last_name"
                value={form.last_name}
                label="Last Name"
                required
                onChange={(event) => handleFieldChange('last_name', event.target.value)}
              />
              <Select
                name="gender"
                value={form.gender}
                label="Gender"
                required
                onChange={(event) => handleFieldChange('gender', event.target.value)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
              <Input
                name="date_of_birth"
                value={form.date_of_birth ?? ''}
                label="Date of Birth"
                type="date"
                onChange={(event) => handleFieldChange('date_of_birth', event.target.value)}
              />
              <Input
                name="admission_date"
                value={form.admission_date ?? ''}
                label="Admission Date"
                type="date"
                onChange={(event) => handleFieldChange('admission_date', event.target.value)}
              />
              <Select
                name="status"
                value={form.status}
                label="Status"
                required
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
                value={form.religion ?? ''}
                label="Religion"
                onChange={(event) => handleFieldChange('religion', event.target.value)}
              />
              <Input
                name="county"
                value={form.county ?? ''}
                label="County"
                onChange={(event) => handleFieldChange('county', event.target.value)}
              />
              <Input
                name="primary_school"
                value={form.previous_school ?? ''}
                label="Primary School Attended"
                onChange={(event) => handleFieldChange('previous_school', event.target.value)}
              />
            </div>
            <Input
              name="remarks"
              value={form.remarks ?? ''}
              label="Remarks"
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
              value={form.primary_guardian_name}
              label="Guardian Full Name"
              onChange={(event) => handleFieldChange('primary_guardian_name', event.target.value)}
            />
            <Select
              name="primary_guardian_relationship_type"
              value={form.primary_guardian_relationship_type}
              label="Relationship Type"
              onChange={(event) =>
                handleFieldChange('primary_guardian_relationship_type', event.target.value)
              }
            >
              <option value="">Select Type</option>
              {RELATIONSHIP_OPTIONS.map((relationship) => (
                <option key={relationship} value={relationship}>
                  {relationship}
                </option>
              ))}
            </Select>
            <Input
              name="primary_guardian_phone"
              value={form.primary_guardian_phone}
              label="Phone Number"
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <EntityPicker
                  id="student-class-group"
                  name="current_class_stream_id"
                  label="Class Group"
                  value={
                    form.current_class_stream_id
                      ? asId<'class_group'>(form.current_class_stream_id)
                      : null
                  }
                  onChange={(id) => handleFieldChange('current_class_stream_id', id)}
                  lookup={classGroupsLookup}
                  placeholder="Select class group"
                  allowClear
                  data-testid="student-class-group-picker"
                  emptyState={
                    <p className="px-2 py-3 text-sm text-surface-muted-fg">
                      No class groups exist yet. Create one under Class Management.
                    </p>
                  }
                />
              </div>
            </div>
            {/* GAP(P1-E01): learner category and dormitory have no canonical column. */}
            <p className="text-sm text-surface-muted-fg">
              Student category and dormitory are not part of the canonical learner model yet.
            </p>
          </div>
        ),
      },
    ];
  }, [form, handleFieldChange, classGroupsLookup]);

  const pageIsLoading = isLoading && learnerRows.length === 0 && status === 'loading';

  return (
    <div className="space-y-3">
      <Card
        title="Student Management"
        bodyClassName="p-0"
        actions={
          <div className="flex space-x-2">
            <Button onClick={() => openModal()} leftIcon={<PlusIcon className="h-5 w-5" />}>
              Add Student
            </Button>
          </div>
        }
      >
        <div className="border-t border-surface-border">
          <DataGrid
            columns={columns}
            data={learners.slice()}
            loading={pageIsLoading && !isModalOpen}
            sortable
            filterable
            selectable
            onRowClick={(student) => navigate(`/administration/students/${student.id}`)}
            emptyState={{
              icon: <UserCircleIcon className="h-12 w-12 text-surface-muted-fg" />,
              title: 'No students found',
              description:
                'Get started by adding a new student using the Add Student action above.',
            }}
          />
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Student' : 'Add New Student'}
        size="xl"
        bodyClassName="max-h-[80vh] overflow-y-auto"
      >
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
          onCancel={closeModal}
          loading={saving}
          submitButtonText={editing ? 'Save Changes' : 'Add Student'}
          cancelButtonText="Cancel"
          size="md"
          variant="default"
        />
      </Modal>
    </div>
  );
};

const StudentsListPage: React.FC = () => <StudentsListContent />;

const StudentsListPageWithRepository = withCanonicalRepository(StudentsListPage);
export default StudentsListPageWithRepository;
export const StudentsListContentAlias = StudentsListPage;
