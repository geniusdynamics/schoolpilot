// ABOUTME: Teaching group membership page — the canonical replacement for student subject
// ABOUTME: enrolment: an enrolment joins a teaching group for a period. Rows read and write
// ABOUTME: through the repository, and the group and enrolment are chosen with EntityPickers.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { SchemaEntityForm, type EntityFormFieldMeta } from '@/components/ui/forms';
import { useLookup } from '@/data/query';
import { toWritableValues, type CreateInput, type UpdateInput } from '@/data/repository';
import { asId } from '@/domain/ids';
import { useToast } from '@/hooks/useToast';

import {
  CanonicalRepositoryProvider,
  createFormSchema,
  updateFormSchema,
} from '../data/canonicalRepository';
import { messageOf } from '../data/errors';
import {
  personName,
  useCanonicalAcademics,
  type TeachingGroupMemberRow,
} from '../data/useCanonicalAcademics';

const FIELDS: readonly EntityFormFieldMeta[] = [
  {
    path: 'teaching_group_id',
    label: 'Teaching group',
    order: 1,
    section: 'Membership',
    widget: 'entity',
    lookupKey: 'teaching_group',
    required: true,
  },
  {
    path: 'enrolment_id',
    label: 'Learner enrolment',
    order: 2,
    section: 'Membership',
    widget: 'entity',
    lookupKey: 'enrolment',
    required: true,
  },
  { path: 'valid_from', label: 'From', order: 3, section: 'Period', widget: 'date', required: true },
  {
    path: 'valid_to',
    label: 'To',
    order: 4,
    section: 'Period',
    widget: 'date',
    required: false,
  },
];

const MembershipContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const toast = useToast();
  const confirm = useConfirm();
  const {
    repository,
    institutionId,
    isLoading,
    teachingGroupMembers,
    teachingGroups,
    enrolments,
    learnerById,
    classGroupById,
    academicYearById,
    learningAreaById,
  } = useCanonicalAcademics();

  const groupLookup = useLookup(repository, 'teaching_group', {
    label: (row) => `${row.name} · ${learningAreaById.get(row.learning_area_id)?.name ?? row.learning_area_id}`,
  });
  const enrolmentLookup = useLookup(repository, 'enrolment', {
    label: (row) => {
      const learner = learnerById.get(row.learner_id);
      const classGroup = classGroupById.get(row.class_group_id);
      return [learner ? personName(learner) : row.learner_id, classGroup?.name, row.status]
        .filter(Boolean)
        .join(' · ');
    },
  });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeachingGroupMemberRow | null>(null);

  const enrolmentName = (id: string) => {
    const enrolment = enrolments.find((row) => row.id === id);
    const learner = enrolment ? learnerById.get(enrolment.learner_id) : undefined;
    return learner ? personName(learner) : id;
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const create = async (values: CreateInput<'teaching_group_member'>) => {
    try {
      await repository.create('teaching_group_member', values);
      closeForm();
      toast.showSuccess('Membership added.');
    } catch (error) {
      throw new Error(messageOf(error));
    }
  };

  const update = async (values: UpdateInput<'teaching_group_member'>) => {
    if (!editing) return;
    try {
      await repository.update(
        'teaching_group_member',
        asId<'teaching_group_member'>(editing.id),
        values,
        { expectedVersion: editing.rowVersion }
      );
      closeForm();
      toast.showSuccess('Membership saved.');
    } catch (error) {
      throw new Error(messageOf(error));
    }
  };

  const remove = async (row: TeachingGroupMemberRow) => {
    const group = teachingGroups.find((candidate) => candidate.id === row.teaching_group_id);
    const confirmed = await confirm({
      variant: 'danger',
      message: `Remove ${enrolmentName(row.enrolment_id)} from ${group?.name ?? 'this teaching group'}?`,
    });
    if (!confirmed) return;
    try {
      await repository.remove(
        'teaching_group_member',
        asId<'teaching_group_member'>(row.id),
        { expectedVersion: row.rowVersion }
      );
      toast.showSuccess('Membership removed.');
    } catch (error) {
      toast.showError(messageOf(error));
    }
  };

  const columns: DataGridColumn<TeachingGroupMemberRow>[] = [
    {
      key: 'enrolment_id',
      header: t('studentSubjectEnrollment.student', 'Learner'),
      sortable: true,
      filterable: true,
      render: (_value: unknown, row: TeachingGroupMemberRow) => enrolmentName(row.enrolment_id),
    },
    {
      key: 'teaching_group_id',
      header: t('studentSubjectEnrollment.subject', 'Teaching group'),
      render: (_value: unknown, row: TeachingGroupMemberRow) => {
        const group = teachingGroups.find((candidate) => candidate.id === row.teaching_group_id);
        if (!group) return row.teaching_group_id;
        const classGroup = group.class_group_ids
          .map((id) => classGroupById.get(id)?.name)
          .filter(Boolean)
          .join(', ');
        return [group.name, classGroup].filter(Boolean).join(' · ');
      },
    },
    {
      key: 'class_group',
      header: t('classSubjectAllocations.classStreamLabel', 'Class group'),
      render: (_value: unknown, row: TeachingGroupMemberRow) => {
        const enrolment = enrolments.find((candidate) => candidate.id === row.enrolment_id);
        return enrolment ? classGroupById.get(enrolment.class_group_id)?.name ?? '—' : '—';
      },
    },
    {
      key: 'academic_year',
      header: t('classSubjectAllocations.academicYearLabel', 'Academic year'),
      render: (_value: unknown, row: TeachingGroupMemberRow) => {
        const enrolment = enrolments.find((candidate) => candidate.id === row.enrolment_id);
        return enrolment ? academicYearById.get(enrolment.academic_year_id)?.name ?? '—' : '—';
      },
    },
    { key: 'valid_from', header: 'From' },
    {
      key: 'valid_to',
      header: 'To',
      render: (_value: unknown, row: TeachingGroupMemberRow) => row.valid_to ?? '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: unknown, row: TeachingGroupMemberRow) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(row)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => void remove(row)}
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  const initialCreate: Partial<CreateInput<'teaching_group_member'>> = {
    institution_id: institutionId ?? undefined,
    valid_from: new Date().toISOString().slice(0, 10),
  };

  return (
    <div className="space-y-6">
      {institutionId === null && (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          The canonical database holds no institution row, so a membership cannot be saved yet.
        </p>
      )}

      <Card
        title={t('studentSubjectEnrollment.title', 'Teaching group membership')}
        bodyClassName="p-0"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            Add member
          </Button>
        }
      >
        <p className="border-t border-surface-border p-4 text-sm text-surface-muted-fg">
          A membership places one learner enrolment in one teaching group for a period. Marks can
          only be entered for a learner who is a member on the assessment date.
        </p>
        <DataGrid
          columns={columns}
          data={[...teachingGroupMembers]}
          sortable
          filterable
          pagination
          emptyState="No memberships yet. Add the first one."
        />
      </Card>

      {(creating || editing) && (
        <Card title={editing ? 'Edit membership' : 'New membership'}>
          {editing ? (
            <SchemaEntityForm
              schema={updateFormSchema('teaching_group_member')}
              fields={FIELDS}
              recordKey={editing.id}
              initialValues={toWritableValues(editing)}
              lookups={{ teaching_group: groupLookup, enrolment: enrolmentLookup }}
              submitLabel="Save membership"
              onCancel={closeForm}
              onSubmit={update}
            />
          ) : (
            <SchemaEntityForm
              schema={createFormSchema('teaching_group_member')}
              fields={FIELDS}
              recordKey="new-teaching-group-member"
              initialValues={initialCreate}
              lookups={{ teaching_group: groupLookup, enrolment: enrolmentLookup }}
              submitLabel="Create membership"
              onCancel={closeForm}
              onSubmit={create}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export const StudentSubjectEnrollmentPageContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <MembershipContent />
  </CanonicalRepositoryProvider>
);

const StudentSubjectEnrollmentPage: React.FC = () => (
  <div className="space-y-6">
    <StudentSubjectEnrollmentPageContent />
  </div>
);

export default StudentSubjectEnrollmentPage;
