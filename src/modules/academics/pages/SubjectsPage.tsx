// ABOUTME: Learning areas page — the canonical curriculum entity behind the old subject list.
// ABOUTME: Rows read from the repository; create, edit and delete write through it, and the
// ABOUTME: programme a learning area belongs to is chosen with an EntityPicker.

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

import { CanonicalRepositoryProvider, createFormSchema, updateFormSchema } from '../data/canonicalRepository';
import { messageOf } from '../data/errors';
import {
  createdLabel,
  useCanonicalAcademics,
  type LearningAreaRow,
} from '../data/useCanonicalAcademics';

/** The fields a learning area form collects. Arrays of ids stay as the row stores them. */
const FIELDS: readonly EntityFormFieldMeta[] = [
  {
    path: 'programme_id',
    label: 'Programme',
    order: 1,
    section: 'Placement',
    widget: 'entity',
    lookupKey: 'programme',
    required: true,
  },
  { path: 'code', label: 'Code', order: 2, section: 'Learning area', required: true },
  { path: 'name', label: 'Name', order: 3, section: 'Learning area', required: true, colSpan: 2 },
  {
    path: 'short_name',
    label: 'Short name',
    order: 4,
    section: 'Learning area',
    required: false,
  },
  { path: 'group', label: 'Group', order: 5, section: 'Learning area', required: false },
  { path: 'kind', label: 'Kind', order: 6, section: 'Learning area', required: true },
];

const LearningAreasContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const toast = useToast();
  const confirm = useConfirm();
  const {
    repository,
    institutionId,
    isLoading,
    learningAreas,
    programmeById,
    levels,
  } = useCanonicalAcademics();
  const programmes = useLookup(repository, 'programme', { label: (row) => row.name });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LearningAreaRow | null>(null);

  const levelName = (id: string) => levels.find((level) => level.id === id)?.name ?? id;

  const columns: DataGridColumn<LearningAreaRow>[] = [
    { key: 'code', header: t('subjects.code', 'Code'), sortable: true, filterable: true },
    { key: 'name', header: t('subjects.name', 'Name'), sortable: true, filterable: true },
    {
      key: 'short_name',
      header: 'Short name',
      render: (_value: unknown, row: LearningAreaRow) => row.short_name ?? '—',
    },
    {
      key: 'programme_id',
      header: 'Programme',
      render: (_value: unknown, row: LearningAreaRow) =>
        programmeById.get(row.programme_id)?.name ?? row.programme_id,
    },
    { key: 'kind', header: 'Kind' },
    {
      key: 'level_ids',
      header: 'Levels',
      render: (_value: unknown, row: LearningAreaRow) =>
        row.level_ids.length > 0 ? row.level_ids.map(levelName).join(', ') : '—',
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (_value: unknown, row: LearningAreaRow) => createdLabel(row.created_at),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: unknown, row: LearningAreaRow) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(row)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            {t('common:edit', 'Edit')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => void remove(row)}
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            {t('common:delete', 'Delete')}
          </Button>
        </div>
      ),
    },
  ];

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const create = async (values: CreateInput<'learning_area'>) => {
    try {
      await repository.create('learning_area', values);
      closeForm();
      toast.showSuccess('Learning area created.');
    } catch (error) {
      throw new Error(messageOf(error));
    }
  };

  const update = async (values: UpdateInput<'learning_area'>) => {
    if (!editing) return;
    try {
      await repository.update('learning_area', asId<'learning_area'>(editing.id), values, {
        expectedVersion: editing.rowVersion,
      });
      closeForm();
      toast.showSuccess('Learning area saved.');
    } catch (error) {
      throw new Error(messageOf(error));
    }
  };

  const remove = async (row: LearningAreaRow) => {
    const confirmed = await confirm({
      variant: 'danger',
      message: `Delete the learning area ${row.name}? Its components and teaching groups stay, but no longer resolve.`,
    });
    if (!confirmed) return;
    try {
      await repository.remove('learning_area', asId<'learning_area'>(row.id), {
        expectedVersion: row.rowVersion,
      });
      toast.showSuccess('Learning area deleted.');
    } catch (error) {
      toast.showError(messageOf(error));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  const initialCreate: Partial<CreateInput<'learning_area'>> = {
    institution_id: institutionId ?? undefined,
    kind: 'core',
    level_ids: [],
    pathway_ids: [],
  };

  return (
    <div className="space-y-6">
      {institutionId === null && (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          The canonical database holds no institution row, so a learning area cannot be saved yet.
        </p>
      )}

      <Card
        title={t('subjects.management', 'Learning areas')}
        bodyClassName="p-0"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            Add learning area
          </Button>
        }
      >
        <div className="border-t border-surface-border">
          <DataGrid
            columns={columns}
            data={[...learningAreas]}
            sortable
            filterable
            pagination
            emptyState="No learning areas yet. Add the first one."
          />
        </div>
      </Card>

      {(creating || editing) && (
        <Card title={editing ? `Edit ${editing.name}` : 'New learning area'}>
          {editing ? (
            <SchemaEntityForm
              schema={updateFormSchema('learning_area')}
              fields={FIELDS}
              recordKey={editing.id}
              initialValues={toWritableValues(editing)}
              lookups={{ programme: programmes }}
              submitLabel="Save learning area"
              onCancel={closeForm}
              onSubmit={update}
            />
          ) : (
            <SchemaEntityForm
              schema={createFormSchema('learning_area')}
              fields={FIELDS}
              recordKey="new-learning-area"
              initialValues={initialCreate}
              lookups={{ programme: programmes }}
              submitLabel="Create learning area"
              onCancel={closeForm}
              onSubmit={create}
            />
          )}
        </Card>
      )}

      <p className="text-xs text-surface-muted-fg">
        The levels and pathways of a learning area are kept as stored; this form edits the
        learning area itself.
      </p>
    </div>
  );
};

export const SubjectsContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <LearningAreasContent />
  </CanonicalRepositoryProvider>
);

const SubjectsPage: React.FC = () => (
  <div className="space-y-6">
    <SubjectsContent />
  </div>
);

export default SubjectsPage;
