// ABOUTME: The admissions register: the applicants and admitted learners of the canonical model,
// ABOUTME: with the guardian edit and identifier forms a registrar needs after an admission.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { SchemaEntityForm } from '@/components/ui/forms';
import { CanonicalRepositoryProvider, useCanonicalRepository } from '@/data/canonicalRepository';
import {
  createSchemaFor,
  toWritableValues,
  updateSchemaFor,
  type CreateInput,
  type RepositoryRow,
  type UpdateInput,
} from '@/data/repository';
import { asId } from '@/domain/ids';
import type { Guardian } from '@/domain/schema';
import { PlusIcon, UsersIcon } from '@/components/ui/icons';
import {
  isAdmitted,
  useCanonicalAdmissions,
  type AdmissionRegisterRow,
} from '../data/useCanonicalAdmissions';
import { writableRepository } from '../data/writableRepository';

type RegisterScope = 'all' | 'applicants' | 'admitted';

/** The guardian fields an edit form shows. */
const GUARDIAN_FORM_FIELDS = [
  { path: 'given_name', label: 'First name', order: 1, section: 'Identity' },
  { path: 'family_name', label: 'Family name', order: 2, section: 'Identity' },
  { path: 'preferred_name', label: 'Preferred name', order: 3, section: 'Identity' },
  { path: 'gender', label: 'Gender', order: 4, section: 'Identity' },
  { path: 'date_of_birth', label: 'Date of birth', order: 5, section: 'Identity' },
  { path: 'nationality', label: 'Nationality', order: 6, section: 'Identity' },
  { path: 'occupation', label: 'Occupation', order: 7, section: 'Contact' },
  { path: 'employer', label: 'Employer', order: 8, section: 'Contact' },
  { path: 'national_id', label: 'National ID', order: 9, section: 'Contact' },
] as const;

/** The identifier fields the record form shows. */
const IDENTIFIER_FORM_FIELDS = [
  { path: 'scheme', label: 'Scheme', order: 1, placeholder: 'ke.kemis_upi' },
  { path: 'value', label: 'Value', order: 2 },
] as const;

/** The text of one field of a validated form payload. */
function textOf(values: Record<string, unknown>, key: string): string | undefined {
  return typeof values[key] === 'string' ? (values[key] as string) : undefined;
}

/** The guardian patch an edit form submits: the fields it shows, after its own validation. */
function guardianPatch(values: Record<string, unknown>): UpdateInput<'guardian'> {
  const patch: UpdateInput<'guardian'> = {};
  const givenName = textOf(values, 'given_name');
  if (givenName !== undefined) patch.given_name = givenName;
  const familyName = textOf(values, 'family_name');
  if (familyName !== undefined) patch.family_name = familyName;
  const preferredName = textOf(values, 'preferred_name');
  if (preferredName !== undefined) patch.preferred_name = preferredName;
  const gender = textOf(values, 'gender');
  if (gender !== undefined) patch.gender = gender as Guardian['gender'];
  const dateOfBirth = textOf(values, 'date_of_birth');
  if (dateOfBirth !== undefined) patch.date_of_birth = dateOfBirth;
  const nationality = textOf(values, 'nationality');
  if (nationality !== undefined) patch.nationality = nationality;
  const occupation = textOf(values, 'occupation');
  if (occupation !== undefined) patch.occupation = occupation;
  const employer = textOf(values, 'employer');
  if (employer !== undefined) patch.employer = employer;
  const nationalId = textOf(values, 'national_id');
  if (nationalId !== undefined) patch.national_id = nationalId;
  return patch;
}

/** The identifier row a record form submits, for the learner it was opened on. */
function identifierInput(
  values: Record<string, unknown>,
  learner: AdmissionRegisterRow
): CreateInput<'identifier'> {
  return {
    institution_id: asId<'institution'>(learner.institution_id),
    owner_type: 'learner',
    owner_id: asId<'learner'>(learner.id),
    scheme: textOf(values, 'scheme') ?? '',
    value: textOf(values, 'value') ?? '',
  };
}

const STATUS_LABELS: Readonly<Record<string, string>> = {
  applicant: 'Applicant',
  enrolled: 'Admitted',
  suspended: 'Suspended',
  withdrawn: 'Withdrawn',
  transferred_out: 'Transferred out',
  graduated: 'Graduated',
  deceased: 'Deceased',
};

/** A learner of the register, in the status colours the admissions pages use. */
const StatusBadge: React.FC<{ readonly status: string }> = ({ status }) => (
  <span
    className={`rounded-full px-2 py-1 text-xs font-medium ${
      status === 'applicant'
        ? 'bg-primary-100 text-primary-800'
        : 'bg-teal-100 text-teal-800'
    }`}
  >
    {STATUS_LABELS[status] ?? status}
  </span>
);

export const AdmissionsRegisterPageContent: React.FC = () => {
  const navigate = useNavigate();
  const repository = useCanonicalRepository();
  const writable = useMemo(() => writableRepository(repository), [repository]);
  const { rows, isLoading, error, guardianLookup } = useCanonicalAdmissions();
  const [scope, setScope] = useState<RegisterScope>('all');
  const [editingGuardian, setEditingGuardian] = useState<RepositoryRow<'guardian'> | null>(null);
  const [identifierFor, setIdentifierFor] = useState<AdmissionRegisterRow | null>(null);

  const visible = useMemo(
    () =>
      rows.filter((row) =>
        scope === 'applicants'
          ? row.status === 'applicant'
          : scope === 'admitted'
            ? isAdmitted(row.status)
            : true
      ),
    [rows, scope]
  );

  const openGuardianEditor = (row: AdmissionRegisterRow) => {
    if (!row.primary_guardian_id) return;
    const guardian = guardianLookup.resolve(asId<'guardian'>(row.primary_guardian_id));
    if (guardian) setEditingGuardian(guardian);
  };

  const columns: DataGridColumn<AdmissionRegisterRow>[] = [
    {
      key: 'admission_number',
      header: 'Admission #',
      sortable: true,
      render: (_, row) => <span className="font-mono text-sm">{row.admission_number}</span>,
    },
    { key: 'name', header: 'Learner', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (_, row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'class_group',
      header: 'Class group',
      sortable: true,
      render: (_, row) => row.class_group || 'Not placed',
    },
    {
      key: 'guardian_names',
      header: 'Guardians',
      sortable: false,
      filterable: false,
      render: (_, row) => row.guardian_names.join(', ') || 'No guardian linked',
    },
    {
      key: 'admission_date',
      header: 'Admitted on',
      sortable: true,
      render: (_, row) => row.admission_date || 'Not admitted',
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={!row.primary_guardian_id}
            onClick={() => openGuardianEditor(row)}
          >
            Edit guardian
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIdentifierFor(row)}>
            Record identifier
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card
        title="Applicants and admitted learners"
        subtitle="Every learner of the canonical register, with the class group and the guardians of the day."
        actions={
          <Button
            onClick={() => navigate('/admissions/admit')}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            Admit learner
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter learners">
          {(
            [
              ['all', 'All learners'],
              ['applicants', 'Applicants'],
              ['admitted', 'Admitted'],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={scope === id ? 'primary' : 'outline'}
              aria-pressed={scope === id}
              onClick={() => setScope(id)}
            >
              {label}
            </Button>
          ))}
        </div>

        {error ? (
          <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
            The register could not be read. {error instanceof Error ? error.message : ''}
          </p>
        ) : null}

        <DataGrid
          columns={columns}
          data={visible}
          loading={isLoading}
          emptyState={
            <div className="py-10 text-center">
              <UsersIcon className="mx-auto h-10 w-10 text-surface-muted-fg" />
              <p className="mt-2 text-sm text-surface-foreground">No learner matches this view.</p>
              <p className="mt-1 text-sm text-surface-muted-fg">
                Admit a learner to start the register.
              </p>
            </div>
          }
        />
      </Card>

      {editingGuardian ? (
        <Modal
          isOpen
          onClose={() => setEditingGuardian(null)}
          title="Edit guardian"
          size="lg"
        >
          <SchemaEntityForm
            schema={updateSchemaFor('guardian')}
            recordKey={editingGuardian.id}
            initialValues={toWritableValues(editingGuardian)}
            fields={[...GUARDIAN_FORM_FIELDS]}
            title="Guardian details"
            submitLabel="Save guardian"
            cancelLabel="Cancel"
            onCancel={() => setEditingGuardian(null)}
            onSubmit={async (values) => {
              await writable.update(
                'guardian',
                editingGuardian.id,
                guardianPatch(values),
                { expectedVersion: editingGuardian.rowVersion }
              );
              setEditingGuardian(null);
            }}
          />
        </Modal>
      ) : null}

      {identifierFor ? (
        <Modal
          isOpen
          onClose={() => setIdentifierFor(null)}
          title={`Record an identifier for ${identifierFor.name}`}
          size="md"
        >
          <SchemaEntityForm
            schema={createSchemaFor('identifier')}
            recordKey={identifierFor.id}
            initialValues={{
              institution_id: identifierFor.institution_id,
              owner_type: 'learner',
              owner_id: identifierFor.id,
            }}
            fields={[...IDENTIFIER_FORM_FIELDS]}
            submitLabel="Save identifier"
            cancelLabel="Cancel"
            onCancel={() => setIdentifierFor(null)}
            onSubmit={async (values) => {
              await writable.create('identifier', identifierInput(values, identifierFor));
              setIdentifierFor(null);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
};

const AdmissionsRegisterPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <AdmissionsRegisterPageContent />
  </CanonicalRepositoryProvider>
);

export default AdmissionsRegisterPage;
