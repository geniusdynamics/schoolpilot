// ABOUTME: Teaching assignments page — a member of staff teaches a teaching group. Rows read
// ABOUTME: and write through the canonical repository, and the teacher and group are chosen
// ABOUTME: with EntityPickers.

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
  type TeachingAssignmentRow,
} from '../data/useCanonicalAcademics';

const FIELDS: readonly EntityFormFieldMeta[] = [
  {
    path: 'staff_id',
    label: 'Teacher',
    order: 1,
    section: 'Assignment',
    widget: 'entity',
    lookupKey: 'staff',
    required: true,
  },
  {
    path: 'teaching_group_id',
    label: 'Teaching group',
    order: 2,
    section: 'Assignment',
    widget: 'entity',
    lookupKey: 'teaching_group',
    required: true,
  },
  { path: 'role', label: 'Role', order: 3, section: 'Assignment', required: true },
  { path: 'valid_from', label: 'From', order: 4, section: 'Period', widget: 'date', required: true },
  {
    path: 'valid_to',
    label: 'To',
    order: 5,
    section: 'Period',
    widget: 'date',
    required: false,
  },
];

const TeacherAssignmentsContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const toast = useToast();
  const confirm = useConfirm();
  const {
    repository,
    institutionId,
    isLoading,
    teachingAssignments,
    teachingGroups,
    staffById,
    learningAreaById,
  } = useCanonicalAcademics();

  const staffLookup = useLookup(repository, 'staff', { label: (row) => personName(row) });
  const groupLookup = useLookup(repository, 'teaching_group', {
    label: (row) => `${row.name} · ${learningAreaById.get(row.learning_area_id)?.name ?? row.learning_area_id}`,
  });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeachingAssignmentRow | null>(null);

  const groupName = (id: string) =>
    teachingGroups.find((group) => group.id === id)?.name ?? id;

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const create = async (values: CreateInput<'teaching_assignment'>) => {
    try {
      await repository.create('teaching_assignment', values);
      closeForm();
      toast.showSuccess('Teacher assigned.');
    } catch (error) {
      throw new Error(messageOf(error));
    }
  };

  const update = async (values: UpdateInput<'teaching_assignment'>) => {
    if (!editing) return;
    try {
      await repository.update(
        'teaching_assignment',
        asId<'teaching_assignment'>(editing.id),
        values,
        { expectedVersion: editing.rowVersion }
      );
      closeForm();
      toast.showSuccess('Assignment saved.');
    } catch (error) {
      throw new Error(messageOf(error));
    }
  };

  const remove = async (row: TeachingAssignmentRow) => {
    const confirmed = await confirm({
      variant: 'danger',
      message: `Delete this assignment for ${personName(staffById.get(row.staff_id) ?? {}) || row.staff_id}?`,
    });
    if (!confirmed) return;
    try {
      await repository.remove('teaching_assignment', asId<'teaching_assignment'>(row.id), {
        expectedVersion: row.rowVersion,
      });
      toast.showSuccess('Assignment deleted.');
    } catch (error) {
      toast.showError(messageOf(error));
    }
  };

  const columns: DataGridColumn<TeachingAssignmentRow>[] = [
    {
      key: 'staff_id',
      header: t('teacherSubjectAssignments.teacher', 'Teacher'),
      sortable: true,
      filterable: true,
      render: (_value: unknown, row: TeachingAssignmentRow) =>
        personName(staffById.get(row.staff_id) ?? {}) || row.staff_id,
    },
    {
      key: 'teaching_group_id',
      header: t('teacherSubjectAssignments.classStream', 'Teaching group'),
      render: (_value: unknown, row: TeachingAssignmentRow) => groupName(row.teaching_group_id),
    },
    {
      key: 'learning_area',
      header: t('teacherSubjectAssignments.subject', 'Learning area'),
      render: (_value: unknown, row: TeachingAssignmentRow) => {
        const group = teachingGroups.find((candidate) => candidate.id === row.teaching_group_id);
        return group ? learningAreaById.get(group.learning_area_id)?.name ?? '—' : '—';
      },
    },
    { key: 'role', header: 'Role' },
    { key: 'valid_from', header: 'From' },
    {
      key: 'valid_to',
      header: 'To',
      render: (_value: unknown, row: TeachingAssignmentRow) => row.valid_to ?? '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: unknown, row: TeachingAssignmentRow) => (
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
            Delete
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

  const initialCreate: Partial<CreateInput<'teaching_assignment'>> = {
    institution_id: institutionId ?? undefined,
    role: 'main',
    valid_from: new Date().toISOString().slice(0, 10),
  };

  return (
    <div className="space-y-3">
      {institutionId === null && (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          The canonical database holds no institution row, so an assignment cannot be saved yet.
        </p>
      )}

      <Card
        title={t('teacherSubjectAssignments.title', 'Teaching assignments')}
        bodyClassName="p-0"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            Assign teacher
          </Button>
        }
      >
        <p className="border-t border-surface-border p-4 text-sm text-surface-muted-fg">
          An assignment joins a member of staff to a teaching group for a period. The group
          carries the learning area and the class group.
        </p>
        <DataGrid
          columns={columns}
          data={[...teachingAssignments]}
          sortable
          filterable
          pagination
          emptyState="No teaching assignments yet."
        />
      </Card>

      {(creating || editing) && (
        <Card title={editing ? 'Edit assignment' : 'New assignment'}>
          {editing ? (
            <SchemaEntityForm
              schema={updateFormSchema('teaching_assignment')}
              fields={FIELDS}
              recordKey={editing.id}
              initialValues={toWritableValues(editing)}
              lookups={{ staff: staffLookup, teaching_group: groupLookup }}
              submitLabel="Save assignment"
              onCancel={closeForm}
              onSubmit={update}
            />
          ) : (
            <SchemaEntityForm
              schema={createFormSchema('teaching_assignment')}
              fields={FIELDS}
              recordKey="new-teaching-assignment"
              initialValues={initialCreate}
              lookups={{ staff: staffLookup, teaching_group: groupLookup }}
              submitLabel="Create assignment"
              onCancel={closeForm}
              onSubmit={create}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export const TeacherSubjectAssignmentPageContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <TeacherAssignmentsContent />
  </CanonicalRepositoryProvider>
);

const TeacherSubjectAssignmentPage: React.FC = () => (
  <div className="space-y-3">
    <TeacherSubjectAssignmentPageContent />
  </div>
);

export default TeacherSubjectAssignmentPage;
