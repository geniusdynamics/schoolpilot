// ABOUTME: Components page — the papers, practicals and coursework a learning area is
// ABOUTME: assessed through. Rows read and write through the canonical repository, and the
// ABOUTME: learning area a component belongs to is chosen with an EntityPicker.

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
  createdLabel,
  useCanonicalAcademics,
  type ComponentRow,
} from '../data/useCanonicalAcademics';

const FIELDS: readonly EntityFormFieldMeta[] = [
  {
    path: 'learning_area_id',
    label: 'Learning area',
    order: 1,
    section: 'Component',
    widget: 'entity',
    lookupKey: 'learning_area',
    required: true,
  },
  { path: 'code', label: 'Code', order: 2, section: 'Component', required: true },
  { path: 'name', label: 'Name', order: 3, section: 'Component', required: true, colSpan: 2 },
  { path: 'kind', label: 'Kind', order: 4, section: 'Component', required: true },
  { path: 'weight', label: 'Weight', order: 5, section: 'Scoring', widget: 'number', required: false },
  {
    path: 'max_score',
    label: 'Maximum score',
    order: 6,
    section: 'Scoring',
    widget: 'number',
    required: false,
  },
];

const ComponentsContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const toast = useToast();
  const confirm = useConfirm();
  const { repository, institutionId, isLoading, components, learningAreaById } =
    useCanonicalAcademics();
  const learningAreas = useLookup(repository, 'learning_area', { label: (row) => row.name });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ComponentRow | null>(null);

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const create = async (values: CreateInput<'component'>) => {
    try {
      await repository.create('component', values);
      closeForm();
      toast.showSuccess('Component created.');
    } catch (error) {
      throw new Error(messageOf(error));
    }
  };

  const update = async (values: UpdateInput<'component'>) => {
    if (!editing) return;
    try {
      await repository.update('component', asId<'component'>(editing.id), values, {
        expectedVersion: editing.rowVersion,
      });
      closeForm();
      toast.showSuccess('Component saved.');
    } catch (error) {
      throw new Error(messageOf(error));
    }
  };

  const remove = async (row: ComponentRow) => {
    const confirmed = await confirm({
      variant: 'danger',
      message: `Delete the component ${row.name}?`,
    });
    if (!confirmed) return;
    try {
      await repository.remove('component', asId<'component'>(row.id), {
        expectedVersion: row.rowVersion,
      });
      toast.showSuccess('Component deleted.');
    } catch (error) {
      toast.showError(messageOf(error));
    }
  };

  const columns: DataGridColumn<ComponentRow>[] = [
    { key: 'code', header: 'Code', sortable: true, filterable: true },
    { key: 'name', header: t('subjectPapers.paperName', 'Name'), sortable: true, filterable: true },
    {
      key: 'learning_area_id',
      header: t('subjects.title', 'Learning area'),
      render: (_value: unknown, row: ComponentRow) =>
        learningAreaById.get(row.learning_area_id)?.name ?? row.learning_area_id,
    },
    { key: 'kind', header: 'Kind' },
    {
      key: 'weight',
      header: 'Weight',
      align: 'right',
      render: (_value: unknown, row: ComponentRow) => row.weight ?? '—',
    },
    {
      key: 'max_score',
      header: 'Maximum score',
      align: 'right',
      render: (_value: unknown, row: ComponentRow) => row.max_score ?? '—',
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (_value: unknown, row: ComponentRow) => createdLabel(row.created_at),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: unknown, row: ComponentRow) => (
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

  const initialCreate: Partial<CreateInput<'component'>> = {
    institution_id: institutionId ?? undefined,
    kind: 'paper',
  };

  return (
    <div className="space-y-6">
      {institutionId === null && (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          The canonical database holds no institution row, so a component cannot be saved yet.
        </p>
      )}

      <Card
        title={t('subjectPapers.title', 'Assessment components')}
        bodyClassName="p-0"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            Add component
          </Button>
        }
      >
        <p className="p-4 text-sm text-surface-muted-fg border-t border-surface-border">
          A component is one paper, practical, coursework, oral, project or strand of a
          learning area.
        </p>
        <DataGrid
          columns={columns}
          data={[...components]}
          sortable
          filterable
          pagination
          emptyState="No components yet. Add the first one."
        />
      </Card>

      {(creating || editing) && (
        <Card title={editing ? `Edit ${editing.name}` : 'New component'}>
          {editing ? (
            <SchemaEntityForm
              schema={updateFormSchema('component')}
              fields={FIELDS}
              recordKey={editing.id}
              initialValues={toWritableValues(editing)}
              lookups={{ learning_area: learningAreas }}
              submitLabel="Save component"
              onCancel={closeForm}
              onSubmit={update}
            />
          ) : (
            <SchemaEntityForm
              schema={createFormSchema('component')}
              fields={FIELDS}
              recordKey="new-component"
              initialValues={initialCreate}
              lookups={{ learning_area: learningAreas }}
              submitLabel="Create component"
              onCancel={closeForm}
              onSubmit={create}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export const SubjectPapersManagementContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <ComponentsContent />
  </CanonicalRepositoryProvider>
);

const SubjectPapersManagementPage: React.FC = () => <SubjectPapersManagementContent />;

export default SubjectPapersManagementPage;
