// ABOUTME: Staff list page — searchable grid plus add/edit dialog bound to the canonical staff schema.
// ABOUTME: Reads and writes go through the repository; the job title and department are EntityPickers.

import React, { useMemo, useState } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { SchemaEntityForm } from '@/components/ui/forms';
import { DeleteIcon, EditIcon, EyeIcon, PlusIcon, UserGroupIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { createSchemaFor, updateSchemaFor } from '@/data/repository';
import { asId } from '@/domain/ids';

import { useWritableRepository } from '../data/useWritableRepository';
import { useInstitutionId } from '../data/useCanonicalStaff';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  type CanonicalStaffMember,
  saveStaffIdentifiers,
  staffCreateInput,
  staffUpdateInput,
  useCanonicalStaff,
} from '../data/useCanonicalStaff';
import { useCanonicalOrganisation } from '../data/useCanonicalOrganisation';

interface StaffFormState {
  staff_no: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: string;
  employment_type: string;
  department_id: string | null;
  designation_id: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  national_id: string;
  employer_number: string;
}

const emptyForm = (): StaffFormState => ({
  staff_no: '',
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  gender: 'not_stated',
  employment_type: 'permanent',
  department_id: null,
  designation_id: null,
  start_date: new Date().toISOString().slice(0, 10),
  end_date: null,
  is_active: true,
  national_id: '',
  employer_number: '',
});

function formOf(member: CanonicalStaffMember): StaffFormState {
  return {
    staff_no: member.staff_no,
    first_name: member.first_name,
    last_name: member.last_name,
    phone: member.phone,
    email: member.email,
    gender: member.gender || 'not_stated',
    employment_type: member.employment_type,
    department_id: member.department_id,
    designation_id: member.designation_id,
    start_date: member.start_date,
    end_date: member.end_date,
    is_active: member.is_active,
    national_id: member.national_id,
    employer_number: member.employer_number,
  };
}

export const StaffListContent: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('administration');
  const repository = useWritableRepository();
  const institutionId = useInstitutionId();
  const { staff, isLoading } = useCanonicalStaff();
  const { departments, jobTitles, departmentRows, jobTitleRows } = useCanonicalOrganisation();
  const confirm = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CanonicalStaffMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [form, setForm] = useState<StaffFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = (member?: CanonicalStaffMember) => {
    setEditing(member ?? null);
    setError(null);
    setForm(
      member
        ? formOf(member)
        : { ...emptyForm(), staff_no: nextEmployeeNumber(staff) }
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this staff member?' }))) {
      await repository.remove('staff', asId<'staff'>(id));
    }
  };

  const filteredStaff = useMemo(
    () =>
      staff
        .filter((member) => !member.deleted_at)
        .filter((member) =>
          statusFilter ? (statusFilter === 'active' ? member.is_active : !member.is_active) : true
        )
        .filter((member) =>
          [
            member.first_name,
            member.last_name,
            member.staff_no,
            member.email,
            member.department_name,
            member.designation_title,
            member.display_name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        ),
    [staff, searchTerm, statusFilter]
  );

  const columns: DataGridColumn<CanonicalStaffMember>[] = [
    { key: 'staff_no', header: 'Staff No', sortable: true, filterable: true, render: (_v, item) => item.staff_no || '—' },
    { key: 'name', header: 'Name', sortable: true, filterable: true, render: (_v, item) => item.name || '—' },
    {
      key: 'department_name',
      header: 'Department',
      sortable: true,
      filterable: true,
      render: (_v, item) => item.department_name || '—',
    },
    {
      key: 'designation_title',
      header: 'Designation',
      sortable: true,
      filterable: true,
      render: (_v, item) => item.designation_title || '—',
    },
    {
      key: 'hod_of_department_name',
      header: 'HOD Of',
      sortable: true,
      filterable: true,
      render: (_v, item) => item.hod_of_department_name || '—',
    },
    { key: 'phone', header: 'Phone', sortable: true, filterable: true, render: (_v, item) => item.phone || '—' },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      filterable: true,
      render: (_v, item) => (
        <span className="block max-w-[180px] truncate" title={item.email || ''}>
          {item.email || '—'}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (_v, item) => (item.is_active ? 'Active' : 'Inactive'),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      sticky: 'right',
      render: (_v, item) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => navigate(`/administration/staff/${item.id}`)} leftIcon={<EyeIcon className="w-4 h-4" />}>
            View
          </Button>
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Card
        title="Staff Management"
        bodyClassName="p-0"
        actions={
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Add Staff
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-4 p-4 pb-0 sm:p-6 md:grid-cols-3">
          <Input
            type="text"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            label="Search"
          />
          <Select
            name="statusFilter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'active' | 'inactive' | '')}
            label="Filter by Status"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        {isLoading && staff.length === 0 && !isModalOpen ? (
          <div className="flex items-center justify-center py-10">
            <Spinner /> <span className="ml-2">Loading staff...</span>
          </div>
        ) : (
          <div className="border-t border-surface-border">
            <DataGrid
              columns={columns}
              data={filteredStaff}
              loading={isLoading && !isModalOpen}
              sortable
              filterable
              emptyState={{
                icon: <UserGroupIcon className="h-12 w-12 text-surface-muted-fg" />,
                title: 'No staff members found',
                description: 'Get started by adding your first staff member.',
              }}
            />
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Staff Member' : 'Add New Staff Member'}
        size="xl"
        bodyClassName="max-h-[80vh] overflow-y-auto"
      >
        {error ? (
          <p role="alert" className="mb-4 text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}
        <SchemaEntityForm
          schema={editing ? updateSchemaFor('staff') : createSchemaFor('staff')}
          recordKey={editing?.id ?? 'new'}
          initialValues={
            editing
              ? {
                  institution_id: editing.institution_id,
                  given_name: editing.given_name,
                  family_name: editing.family_name,
                  name_order: 'given_first',
                  gender: editing.gender || 'not_stated',
                  employee_number: editing.employee_number,
                  employment_type: editing.employment_type,
                  department_ids: [...editing.department_ids],
                  start_date: editing.start_date,
                  ...(editing.job_title_id ? { job_title_id: editing.job_title_id } : {}),
                  ...(editing.end_date ? { end_date: editing.end_date } : {}),
                }
              : {
                  institution_id: institutionId ?? '',
                  given_name: '',
                  family_name: '',
                  name_order: 'given_first',
                  gender: 'not_stated',
                  employee_number: form.staff_no,
                  employment_type: 'permanent',
                  department_ids: [],
                  start_date: form.start_date,
                }
          }
          fields={[
            { path: 'employee_number', label: 'Staff No.', order: 1, required: true },
            { path: 'given_name', label: 'First Name', order: 2, required: true },
            { path: 'family_name', label: 'Last Name', order: 3, required: true },
            {
              path: 'gender',
              label: t('staff.form.gender', 'Gender'),
              order: 4,
              widget: 'select',
              options: GENDER_OPTIONS.map((option) => ({ ...option })),
            },
            {
              path: 'employment_type',
              label: t('staff.form.employmentType', 'Employment Type'),
              order: 5,
              widget: 'select',
              options: EMPLOYMENT_TYPE_OPTIONS.map((option) => ({ ...option })),
            },
            {
              path: 'job_title_id',
              label: 'Designation',
              order: 6,
              widget: 'entity',
              lookupKey: 'job_title_id',
            },
            { path: 'start_date', label: 'Start Date', order: 7, widget: 'date', required: true },
          ]}
          lookups={{ job_title_id: jobTitles }}
          onSubmit={async (values) => {
            const gender =
              values.gender === 'female' || values.gender === 'male' || values.gender === 'other'
                ? values.gender
                : 'not_stated';
            const employmentType =
              values.employment_type === 'contract' ||
              values.employment_type === 'board_employed' ||
              values.employment_type === 'volunteer' ||
              values.employment_type === 'intern'
                ? values.employment_type
                : 'permanent';
            const mapped = {
              staff_no: String(values.employee_number ?? ''),
              first_name: String(values.given_name ?? ''),
              last_name: String(values.family_name ?? ''),
              phone: form.phone,
              email: form.email,
              gender,
              employment_type: employmentType,
              department_id: form.department_id,
              designation_id:
                typeof values.job_title_id === 'string' ? values.job_title_id : null,
              start_date: String(values.start_date ?? form.start_date),
              end_date: form.end_date,
              is_active: form.is_active,
              national_id: form.national_id,
              employer_number: form.employer_number,
            };
            setSaving(true);
            setError(null);
            try {
              const staffId = editing
                ? (
                    await repository.update('staff', asId<'staff'>(editing.id), staffUpdateInput(mapped), {
                      expectedVersion: editing.rowVersion,
                    })
                  ).id
                : (
                    await repository.create('staff', staffCreateInput(mapped, institutionId ?? ''))
                  ).id;
              await saveStaffIdentifiers(repository, {
                staffId,
                institutionId: institutionId ?? '',
                nationalId: mapped.national_id,
                employerNumber: mapped.employer_number,
              });
              closeModal();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : 'The staff member could not be saved.');
            } finally {
              setSaving(false);
            }
          }}
          onCancel={closeModal}
          submitting={saving}
          submitLabel={editing ? 'Save Changes' : 'Add Staff Member'}
          cancelLabel="Cancel"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              name="phone"
              label="Phone"
              value={form.phone}
              onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
            />
            <Input
              name="email"
              label={t('staff.form.email', 'Email')}
              type="email"
              value={form.email}
              onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
            />
            <Input
              name="national_id"
              label={t('staff.form.nationalId', 'National ID / Passport No.')}
              value={form.national_id}
              onChange={(event) => setForm((previous) => ({ ...previous, national_id: event.target.value }))}
            />
            <Input
              name="employer_number"
              label={t('staff.form.employerNumber', 'Employer No. (e.g. TSC number)')}
              value={form.employer_number}
              onChange={(event) => setForm((previous) => ({ ...previous, employer_number: event.target.value }))}
            />
            <div>
              <EntityPicker
                id="staff-department"
                name="department_id"
                label="Department"
                value={form.department_id ? asId<'department'>(form.department_id) : null}
                onChange={(id) => setForm((previous) => ({ ...previous, department_id: id }))}
                lookup={departments}
                placeholder="Select Department"
                allowClear
                data-testid="staff-department-picker"
              />
            </div>
          </div>
          <p className="mt-4 text-xs text-surface-muted-fg">
            {departmentRows.length} department(s) and {jobTitleRows.length} designation(s) are held
            by the canonical repository.
          </p>
        </SchemaEntityForm>
      </Modal>
    </div>
  );
};

/** The next employee number the dialog proposes. */
function nextEmployeeNumber(staff: readonly CanonicalStaffMember[]): string {
  const existing = staff
    .map((member) => parseInt(String(member.staff_no ?? '').replace(/\D/g, ''), 10))
    .filter((value) => !Number.isNaN(value));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `EMP${String(next).padStart(3, '0')}`;
}

const StaffListPage: React.FC = () => (
  <div className="space-y-3">
    <StaffListContent />
  </div>
);

const StaffListPageWithRepository = withCanonicalRepository(StaffListPage);
export default StaffListPageWithRepository;
