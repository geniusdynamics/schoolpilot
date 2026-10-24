// ABOUTME: The sync conflict log as a presentational table: the summary counts, every recorded
// ABOUTME: conflict and the refusal detail, with an empty, loading and error state.

import React from 'react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@/components/ui/icons';
import { summariseConflicts, type SyncConflict } from '@/data/sync';

export interface SyncConflictLogProps {
  readonly conflicts: readonly SyncConflict[];
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly onRefresh?: () => void;
}

const KIND_LABEL: Record<SyncConflict['kind'], string> = {
  field: 'Field',
  cell_identity: 'Cell identity',
  immutable: 'Append-only',
  unresolved: 'Unresolved',
};

const KIND_CLASS: Record<SyncConflict['kind'], string> = {
  field: 'bg-primary-100 text-primary-800',
  cell_identity: 'bg-sky-100 text-sky-800',
  immutable: 'bg-amber-100 text-amber-800',
  unresolved: 'bg-red-100 text-red-800',
};

/** The conflict log a settings page shows. It holds no state and reads no database. */
export const SyncConflictLog: React.FC<SyncConflictLogProps> = ({
  conflicts,
  loading = false,
  error = null,
  onRefresh,
}) => {
  const summary = summariseConflicts(conflicts);

  const columns: DataGridColumn<SyncConflict>[] = [
    {
      key: 'detectedAt',
      header: 'Detected',
      sortable: true,
      width: 180,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      key: 'entity',
      header: 'Entity',
      sortable: true,
      filterable: true,
      width: 150,
    },
    {
      key: 'kind',
      header: 'Kind',
      sortable: true,
      filterable: true,
      width: 130,
      render: (value: SyncConflict['kind']) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${KIND_CLASS[value]}`}>
          {KIND_LABEL[value]}
        </span>
      ),
    },
    {
      key: 'field',
      header: 'Field',
      sortable: true,
      width: 130,
    },
    {
      key: 'winner',
      header: 'Kept',
      sortable: false,
      width: 140,
      render: (value: string, row: SyncConflict) => (
        <span title={row.winnerHlc}>{value || '—'}</span>
      ),
    },
    {
      key: 'loser',
      header: 'Overruled',
      sortable: false,
      width: 140,
      render: (value: string, row: SyncConflict) => (
        <span title={row.loserHlc}>{value || '—'}</span>
      ),
    },
    {
      key: 'resolved',
      header: 'Resolution',
      sortable: false,
      minWidth: 260,
      render: (value: string, row: SyncConflict) => (
        <div className="space-y-1">
          <div>{value}</div>
          {row.detail ? (
            <div className="text-xs text-surface-muted-fg">{row.detail}</div>
          ) : null}
          <div className="text-xs text-surface-muted-fg font-mono">{row.entityId}</div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Card
        title="Sync conflicts"
        info="Every write the merge could not settle silently: field-level last-writer-wins, a mark cell that landed under two ids, an append-only event written twice, and any change the server refused."
        icon={<ExclamationTriangleIcon className="w-5 h-5" />}
        actions={
          onRefresh ? (
            <Button
              variant="secondary"
              onClick={onRefresh}
              disabled={loading}
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            >
              Refresh
            </Button>
          ) : null
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
          <SummaryCell label="Conflicts" value={summary.total} />
          <SummaryCell
            label="Unresolved"
            value={summary.unresolved}
            tone={summary.unresolved > 0 ? 'danger' : 'default'}
          />
          <SummaryCell
            label="Entities affected"
            value={summary.byEntity.length}
            hint={summary.byEntity
              .slice(0, 3)
              .map((entry) => `${entry.entity} (${entry.count})`)
              .join(', ')}
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="mx-4 mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            The conflict log could not be read: {error}
          </div>
        ) : null}

        <DataGrid
          columns={columns}
          data={[...conflicts]}
          loading={loading}
          sortable
          filterable
          emptyState={{
            icon: <ExclamationTriangleIcon className="h-12 w-12 text-surface-muted-fg" />,
            title: 'No sync conflicts',
            description:
              'Conflicts appear here when two devices change the same field, write one mark cell under two ids, or the server refuses a change.',
          }}
          className="mt-4"
        />
      </Card>
    </div>
  );
};

const SummaryCell: React.FC<{
  readonly label: string;
  readonly value: number;
  readonly hint?: string;
  readonly tone?: 'default' | 'danger';
}> = ({ label, value, hint, tone = 'default' }) => (
  <div className="rounded-lg border border-surface-border p-3">
    <div className="text-xs uppercase tracking-wide text-surface-muted-fg">{label}</div>
    <div
      className={`mt-1 text-2xl font-semibold ${
        tone === 'danger' && value > 0 ? 'text-red-700' : 'text-surface-foreground'
      }`}
    >
      {value}
    </div>
    {hint ? <div className="mt-1 text-xs text-surface-muted-fg">{hint}</div> : null}
  </div>
);

export default SyncConflictLog;
