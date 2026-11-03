// ABOUTME: The Grading schemes tab reads the canonical grading_scale rows a curriculum pack wrote
// ABOUTME: and lets the school add or edit its own scales; a pack scale is marked and left alone.

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { EditIcon, PlusIcon } from '@/components/ui/icons';
import { useCan } from '@/data/auth/useCan';
import { asId } from '@/domain/ids';
import type { CreateInput } from '@/data/repository';
import { useToast } from '@/hooks/useToast';

import { messageOf } from '../../data/errors';
import { GradingScaleForm, type GradingScaleDraft } from './GradingScaleForm';
import type { GradingScaleView } from './useGradingModel';
import { useGradingModel } from './useGradingModel';
import type { PackGradingDeclaration } from './provenance';

export const PACK_SCALE_LOCKED =
  "Pack-owned. The pack installs this scale; change it through the programme's pack overrides.";

const InstallPackLink: React.FC = () => (
  <Link to="/setup" className="font-medium text-primary-700 underline">
    Install a curriculum pack
  </Link>
);

const EmptyScales: React.FC = () => (
  <div className="space-y-2 py-6 text-center">
    <p className="text-sm font-medium text-surface-foreground">No grading scales yet.</p>
    <p className="text-sm text-surface-muted-fg">
      A curriculum pack installs its grading scales when it is installed, and the school can add
      its own here. <InstallPackLink /> to start.
    </p>
  </div>
);

export interface GradingScalesTabProps {
  readonly packs: readonly PackGradingDeclaration[];
}

export const GradingScalesTab: React.FC<GradingScalesTabProps> = ({ packs }) => {
  const model = useGradingModel(packs);
  const toast = useToast();
  const canEdit = useCan('reference.write');

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<GradingScaleView['scale'] | null>(null);

  const columns = useMemo<DataGridColumn<GradingScaleView>[]>(() => {
    const list: DataGridColumn<GradingScaleView>[] = [
      {
        key: 'code',
        header: 'Code',
        sortable: true,
        filterable: true,
        render: (_value, view) => view.scale.code,
      },
      {
        key: 'programme',
        header: 'Programme',
        sortable: true,
        render: (_value, view) => view.programme?.name ?? view.scale.programme_id,
      },
      {
        key: 'kind',
        header: 'Kind',
        render: (_value, view) => view.scale.kind.replace(/_/g, ' '),
      },
      {
        key: 'version',
        header: 'Version',
        render: (_value, view) => view.scale.version,
      },
      {
        key: 'bands',
        header: 'Bands',
        filterable: false,
        render: (_value, view) =>
          view.scale.bands.length === 0
            ? '—'
            : view.scale.bands
                .map((band) => `${band.code} ${band.min}\u2013${band.max}`)
                .join(', '),
      },
      {
        key: 'source',
        header: 'Source',
        filterable: false,
        render: (_value, view) =>
          view.source.kind === 'pack' ? (
            <div className="space-y-1">
              <Badge variant="info" size="sm">
                Pack
              </Badge>
              <p className="text-xs text-surface-muted-fg">Pack: {view.source.packRef}</p>
              <p className="text-xs text-surface-muted-fg">{PACK_SCALE_LOCKED}</p>
            </div>
          ) : (
            <Badge variant="secondary" size="sm">
              School-created
            </Badge>
          ),
      },
    ];

    if (canEdit) {
      list.push({
        key: 'actions',
        header: 'Actions',
        filterable: false,
        render: (_value, view) =>
          view.source.kind === 'pack' ? (
            <span className="text-xs text-surface-muted-fg">Pack-owned</span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setEditing(view.scale);
              }}
              leftIcon={<EditIcon className="w-4 h-4" />}
            >
              Edit
            </Button>
          ),
      });
    }

    return list;
  }, [canEdit]);

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const create = async (draft: GradingScaleDraft) => {
    if (model.institutionId === null) {
      throw new Error(
        'The canonical database holds no institution row, so a grading scale cannot be saved yet.'
      );
    }
    try {
      const input: CreateInput<'grading_scale'> = {
        institution_id: model.institutionId,
        programme_id: draft.programme_id,
        code: draft.code,
        kind: draft.kind,
        version: draft.version,
        bands: draft.bands.map((band) => ({ ...band })),
      };
      await model.repository.create('grading_scale', input);
      closeForm();
      toast.showSuccess('Grading scale created.');
    } catch (error) {
      throw new Error(messageOf(error));
    }
  };

  const update = async (draft: GradingScaleDraft) => {
    if (editing === null) return;
    const stored = model.scales.find((view) => view.scale.id === editing.id);
    if (stored?.source.kind === 'pack') {
      throw new Error(PACK_SCALE_LOCKED);
    }
    try {
      await model.repository.update(
        'grading_scale',
        asId<'grading_scale'>(editing.id),
        {
          programme_id: draft.programme_id,
          code: draft.code,
          kind: draft.kind,
          version: draft.version,
          bands: draft.bands.map((band) => ({ ...band })),
        },
        { expectedVersion: editing.rowVersion }
      );
      closeForm();
      toast.showSuccess('Grading scale saved.');
    } catch (error) {
      throw new Error(messageOf(error));
    }
  };

  if (model.loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (model.failed) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        The grading scales could not be read from the canonical repository. Reload the page and try
        again.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {model.institutionId === null && (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          The canonical database holds no institution row, so a grading scale cannot be saved yet.
        </p>
      )}

      <Card
        title="Grading scales"
        subtitle={`${model.scales.length} scale${model.scales.length === 1 ? '' : 's'} across ${model.programmes.length} programme${model.programmes.length === 1 ? '' : 's'}. A pack scale belongs to the pack and is shown as such.`}
        bodyClassName="p-0"
        actions={
          canEdit && model.institutionId !== null ? (
            <Button
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
              leftIcon={<PlusIcon className="w-5 h-5" />}
            >
              Add grading scale
            </Button>
          ) : undefined
        }
      >
        {model.scales.length === 0 ? (
          <div className="border-t border-surface-border">
            <EmptyScales />
          </div>
        ) : (
          <div className="border-t border-surface-border">
            <DataGrid
              columns={columns}
              data={[...model.scales]}
              sortable
              filterable
              pagination
              emptyState="No grading scales yet."
            />
          </div>
        )}
      </Card>

      {(creating || editing !== null) && (
        <Card title={editing ? `Edit ${editing.code}` : 'New grading scale'}>
          <GradingScaleForm
            programmes={model.programmes}
            scales={model.scales.map((view) => view.scale)}
            initial={editing}
            onSubmit={editing ? update : create}
            onCancel={closeForm}
          />
        </Card>
      )}
    </div>
  );
};
