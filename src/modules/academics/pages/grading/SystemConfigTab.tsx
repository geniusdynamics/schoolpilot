// ABOUTME: The System config tab resolves a programme's grading model for the school: which
// ABOUTME: scales and schemes it runs on, at which levels, and whether the providing pack is installed.

import React from 'react';
import { Link } from 'react-router-dom';

import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

import { useGradingModel, type ProgrammeGradingView } from './useGradingModel';
import type { PackGradingDeclaration, RowSource } from './provenance';
import { schemeGradingScale } from './definitionLines';

function sourceLabel(source: RowSource): string {
  return source.kind === 'pack' ? `pack ${source.packRef}` : 'school';
}

const ProgrammeConfig: React.FC<{ readonly view: ProgrammeGradingView }> = ({ view }) => {
  const { programme, installed } = view;
  return (
    <Card
      title={programme.name}
      subtitle={`Pinned to ${programme.curriculum_pack_code}@${programme.pack_version}`}
      actions={
        <Badge variant={installed ? 'success' : 'warning'}>
          {installed ? 'Pack installed' : 'Pack not installed'}
        </Badge>
      }
    >
      {!installed ? (
        <p className="text-sm text-surface-muted-fg">
          This programme is pinned to {programme.curriculum_pack_code}@{programme.pack_version},
          but that pack is not installed in the school's data. Nothing was installed from it, so
          there are no pack scales or schemes to show.
        </p>
      ) : (
        <div className="space-y-4">
          <section className="space-y-1">
            <h4 className="text-sm font-semibold text-surface-foreground">Grading scales</h4>
            {view.scales.length === 0 ? (
              <p className="text-sm text-surface-muted-fg">
                No grading scales were installed for this programme.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {view.scales.map((scaleView) => (
                  <li key={scaleView.scale.id}>
                    <span className="font-medium text-surface-foreground">{scaleView.scale.code}</span>{' '}
                    <span className="text-surface-muted-fg">
                      ({scaleView.scale.kind.replace(/_/g, ' ')}, version {scaleView.scale.version},{' '}
                      {sourceLabel(scaleView.source)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-1">
            <h4 className="text-sm font-semibold text-surface-foreground">Assessment schemes</h4>
            {view.schemes.length === 0 ? (
              <p className="text-sm text-surface-muted-fg">
                No assessment schemes were installed for this programme.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {view.schemes.map((schemeView) => {
                  const scale = schemeGradingScale(schemeView.scheme.definition);
                  const levels =
                    schemeView.levels.length === 0
                      ? 'all levels'
                      : schemeView.levels.map((level) => level.name).join(', ');
                  return (
                    <li key={schemeView.scheme.id}>
                      <span className="font-medium text-surface-foreground">{schemeView.code}</span>{' '}
                      <span className="text-surface-muted-fg">
                        on {levels}
                        {scale === null ? '' : `, graded on ${scale}`} ({sourceLabel(schemeView.source)})
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <p className="text-xs text-surface-muted-fg">
            Create a scale of your own on the{' '}
            <Link
              to="/academics/grading-systems?tab=grading-schemes"
              className="font-medium text-primary-700 underline"
            >
              Grading schemes
            </Link>{' '}
            tab. What the pack itself means for this programme is changed through its pack overrides
            on the{' '}
            <Link to="/academics/programmes" className="font-medium text-primary-700 underline">
              Programmes
            </Link>{' '}
            screen.
          </p>
        </div>
      )}
    </Card>
  );
};

export interface SystemConfigTabProps {
  readonly packs: readonly PackGradingDeclaration[];
}

export const SystemConfigTab: React.FC<SystemConfigTabProps> = ({ packs }) => {
  const model = useGradingModel(packs);

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
        The system configuration could not be read from the canonical repository. Reload the page
        and try again.
      </p>
    );
  }

  if (model.programmes.length === 0) {
    return (
      <Card title="System configuration">
        <div className="space-y-2 py-6 text-center">
          <p className="text-sm font-medium text-surface-foreground">
            This school has no programme yet.
          </p>
          <p className="text-sm text-surface-muted-fg">
            A programme and its grading configuration arrive with a curriculum pack.{' '}
            <Link to="/setup" className="font-medium text-primary-700 underline">
              Install a curriculum pack
            </Link>{' '}
            to start.
          </p>
        </div>
      </Card>
    );
  }

  const installed = model.programmeViews.filter((view) => view.installed);
  const missing = model.programmeViews.length - installed.length;

  return (
    <div className="space-y-3">
      <Card
        title="System configuration"
        subtitle="What the grading configuration means for this school's programmes and levels."
      >
        {installed.length === 0 ? (
          <div className="space-y-2">
            <p role="status" className="text-sm font-medium text-surface-foreground">
              No curriculum pack is installed for any programme.
            </p>
            <p className="text-sm text-surface-muted-fg">
              Grading scales and assessment schemes are installed by a curriculum pack.{' '}
              <Link to="/setup" className="font-medium text-primary-700 underline">
                Install a curriculum pack
              </Link>{' '}
              to configure them.
            </p>
          </div>
        ) : (
          <p className="text-sm text-surface-muted-fg">
            {installed.length} programme{installed.length === 1 ? '' : 's'} run on an installed pack
            {missing > 0
              ? `; ${missing} programme${missing === 1 ? '' : 's'} ${missing === 1 ? 'is' : 'are'} still without one.`
              : '.'}
          </p>
        )}
      </Card>

      {model.programmeViews.map((view) => (
        <ProgrammeConfig key={view.programme.id} view={view} />
      ))}
    </div>
  );
};
