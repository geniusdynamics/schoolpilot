// ABOUTME: The Education systems tab shows the canonical assessment_scheme rows a pack installed,
// ABOUTME: per programme and version, with their levels and a readable rendering of the definition.

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';

import { useGradingModel, type AssessmentSchemeView } from './useGradingModel';
import type { PackGradingDeclaration } from './provenance';
import { SchemeDefinitionSummary } from './SchemeDefinition';

export const SCHEMES_READ_ONLY =
  'Assessment schemes are owned by the curriculum pack and are read-only here.';

const EmptySchemes: React.FC = () => (
  <div className="space-y-2 py-6 text-center">
    <p className="text-sm font-medium text-surface-foreground">No assessment schemes yet.</p>
    <p className="text-sm text-surface-muted-fg">
      A curriculum pack installs its assessment schemes when it is installed.{' '}
      <Link to="/setup" className="font-medium text-primary-700 underline">
        Install a curriculum pack
      </Link>{' '}
      to start.
    </p>
  </div>
);

export interface AssessmentSchemesTabProps {
  readonly packs: readonly PackGradingDeclaration[];
}

export const AssessmentSchemesTab: React.FC<AssessmentSchemesTabProps> = ({ packs }) => {
  const model = useGradingModel(packs);

  const columns = useMemo<DataGridColumn<AssessmentSchemeView>[]>(
    () => [
      {
        key: 'programme',
        header: 'Programme',
        render: (_value, view) => view.programme?.name ?? view.scheme.programme_id,
      },
      {
        key: 'code',
        header: 'Scheme',
        render: (_value, view) => view.code,
      },
      {
        key: 'version',
        header: 'Version',
        // A pack scheme is stored as `<pack version>+<scheme code>`; the pack version is what a
        // reader recognises, so that is what the column shows.
        render: (_value, view) =>
          view.source.kind === 'pack' && view.programme !== null
            ? view.programme.pack_version
            : view.scheme.version,
      },
      {
        key: 'levels',
        header: 'Levels',
        render: (_value, view) =>
          view.levels.length === 0 ? '—' : view.levels.map((level) => level.name).join(', '),
      },
      {
        key: 'definition',
        header: 'Definition',
        render: (_value, view) => <SchemeDefinitionSummary definition={view.scheme.definition} />,
      },
      {
        key: 'source',
        header: 'Source',
        render: (_value, view) =>
          view.source.kind === 'pack' ? (
            <div className="space-y-1">
              <Badge variant="info" size="sm">
                Pack
              </Badge>
              <p className="text-xs text-surface-muted-fg">Pack: {view.source.packRef}</p>
            </div>
          ) : (
            <Badge variant="secondary" size="sm">
              School-created
            </Badge>
          ),
      },
    ],
    []
  );

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
        The assessment schemes could not be read from the canonical repository. Reload the page and
        try again.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Card
        title="Assessment schemes"
        subtitle={`${model.schemes.length} scheme${model.schemes.length === 1 ? '' : 's'} across ${model.programmes.length} programme${model.programmes.length === 1 ? '' : 's'}.`}
        bodyClassName="p-0"
      >
        <p className="border-t border-surface-border px-4 py-3 text-sm text-surface-muted-fg sm:px-6">
          {SCHEMES_READ_ONLY}
        </p>
        {model.schemes.length === 0 ? (
          <div className="border-t border-surface-border">
            <EmptySchemes />
          </div>
        ) : (
          <div className="border-t border-surface-border">
            <DataGrid
              columns={columns}
              data={[...model.schemes]}
              sortable={false}
              filterable={false}
              emptyState="No assessment schemes yet."
            />
          </div>
        )}
      </Card>
    </div>
  );
};
