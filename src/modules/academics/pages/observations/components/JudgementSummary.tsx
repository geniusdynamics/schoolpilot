// ABOUTME: The term summary: one row per learner with the judgement derived from their latest
// ABOUTME: observations, the distribution behind it, the pack mean and the evidence that travelled.

import React from 'react';
import { useTranslation } from 'react-i18next';

import Badge from '@/components/ui/Badge';

import { deriveJudgement, type ObservationMode, type ObservationRecord } from '../data/judgement';
import type { CaptureLearner, CaptureTarget } from '../data/model';
import type { ObservationPack } from '../data/pack';

export interface JudgementSummaryProps {
  readonly learners: readonly CaptureLearner[];
  readonly targets: readonly CaptureTarget[];
  readonly observations: readonly ObservationRecord[];
  readonly mode: ObservationMode;
  readonly pack: ObservationPack;
  readonly labelByTarget: (targetKey: string) => string;
}

export const JudgementSummary: React.FC<JudgementSummaryProps> = ({
  learners,
  targets,
  observations,
  mode,
  pack,
  labelByTarget,
}) => {
  const { t } = useTranslation('academics');

  const rows = learners.map((learner) => ({
    learner,
    judgement: deriveJudgement({
      records: observations,
      enrolmentId: learner.enrolmentId,
      mode,
      pack,
    }),
  }));

  const unknownLevels = [...new Set(rows.flatMap((row) => row.judgement.unknownLevels))].sort();

  return (
    <section aria-labelledby="observations-judgement-heading">
      <h2 id="observations-judgement-heading" className="text-lg font-semibold text-surface-foreground">
        {mode === 'outcome'
          ? t('observations.termJudgement', 'Term judgement')
          : t('observations.competencyJudgement', 'Competency judgement')}
      </h2>
      <p className="mt-1 text-sm text-surface-muted-fg">
        {t(
          'observations.judgementBasis',
          'Derived from the latest saved observation per target with the pack scheme {{scheme}} and the {{scale}} rubric lookup. The pack suggests {{suggest}}.',
          {
            scheme: pack.scheme.code,
            scale: pack.scale.code,
            suggest: pack.scheme.termJudgement.suggest ?? 'teacher_best_fit',
          }
        )}
      </p>
      {unknownLevels.length > 0 ? (
        <p role="alert" className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
          {t(
            'observations.unknownLevels',
            'Some observations carry a level the pack scale does not name: {{levels}}. They are left out of the judgement.',
            { levels: unknownLevels.join(', ') }
          )}
        </p>
      ) : null}

      {learners.length === 0 ? (
        <p className="mt-3 text-sm text-surface-muted-fg">
          {t('observations.noLearners', 'No active learners in this class.')}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-surface-border">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-surface-accent">
              <tr>
                <th scope="col" className="border-b border-surface-border px-3 py-2 text-left font-semibold">
                  {t('observations.learner', 'Learner')}
                </th>
                <th scope="col" className="border-b border-surface-border px-3 py-2 text-left font-semibold">
                  {t('observations.observed', 'Observed')}
                </th>
                <th scope="col" className="border-b border-surface-border px-3 py-2 text-left font-semibold">
                  {t('observations.distribution', 'Levels')}
                </th>
                <th scope="col" className="border-b border-surface-border px-3 py-2 text-left font-semibold">
                  {t('observations.judgement', 'Judgement')}
                </th>
                <th scope="col" className="border-b border-surface-border px-3 py-2 text-left font-semibold">
                  {t('observations.packMean', 'Pack mean')}
                </th>
                <th scope="col" className="border-b border-surface-border px-3 py-2 text-left font-semibold">
                  {t('observations.evidence', 'Evidence')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ learner, judgement }) => {
                const observed = judgement.kind === 'derived' ? judgement.latest.length : 0;
                const distribution =
                  judgement.kind === 'derived'
                    ? judgement.counts
                        .filter((entry) => entry.count > 0)
                        .map((entry) => `${entry.level.code} ${entry.count}`)
                        .join(' · ')
                    : '—';
                const notes =
                  judgement.kind === 'derived'
                    ? judgement.latest.filter((entry) => (entry.record.evidence ?? '').trim() !== '')
                    : [];
                return (
                  <tr key={learner.enrolmentId} data-testid={`judgement-${learner.enrolmentId}`}>
                    <th scope="row" className="border-b border-surface-border px-3 py-2 text-left font-medium">
                      <span className="block">{learner.name}</span>
                      <span className="block text-xs font-normal text-surface-muted-fg">
                        {learner.admissionNumber}
                      </span>
                    </th>
                    <td className="border-b border-surface-border px-3 py-2 text-surface-muted-fg">
                      {observed} / {targets.length}
                    </td>
                    <td className="border-b border-surface-border px-3 py-2 text-surface-muted-fg">
                      {distribution}
                    </td>
                    <td className="border-b border-surface-border px-3 py-2">
                      {judgement.kind === 'derived' && judgement.band ? (
                        <Badge variant="info" size="lg">
                          {judgement.band.code} — {judgement.band.label}
                        </Badge>
                      ) : judgement.kind === 'derived' ? (
                        <span className="text-surface-muted-fg">
                          {t('observations.judgementUnavailable', 'Judgement unavailable')}
                        </span>
                      ) : (
                        <span className="text-surface-muted-fg">
                          {t('observations.noJudgement', 'No judgement yet')}
                        </span>
                      )}
                    </td>
                    <td className="border-b border-surface-border px-3 py-2 text-surface-muted-fg">
                      {judgement.kind === 'derived' && judgement.mean
                        ? `${judgement.mean.band} (${judgement.mean.value})`
                        : '—'}
                    </td>
                    <td className="border-b border-surface-border px-3 py-2">
                      {notes.length === 0 ? (
                        <span className="text-surface-muted-fg">—</span>
                      ) : (
                        <details>
                          <summary className="flex min-h-[44px] cursor-pointer items-center text-sm text-primary-700 dark:text-primary-300">
                            {t('observations.evidenceCount', 'Evidence ({{count}})', {
                              count: notes.length,
                            })}
                          </summary>
                          <ul className="mt-1 space-y-2">
                            {notes.map((entry) => (
                              <li key={entry.targetKey}>
                                <span className="block text-xs font-medium text-surface-foreground">
                                  {labelByTarget(entry.targetKey)}
                                </span>
                                <span className="block text-xs text-surface-muted-fg">
                                  {entry.record.evidence}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default JudgementSummary;
