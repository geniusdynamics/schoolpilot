// ABOUTME: The wide capture matrix: a learner per row and an outcome per column, with a sticky
// ABOUTME: learner column and a sticky header so a long class stays readable while it scrolls sideways.

import React from 'react';
import { useTranslation } from 'react-i18next';

import type { ObservationDraft } from '../data/draft';
import { cellKeyOf, type ObservationRecord } from '../data/judgement';
import type { CaptureLearner, CaptureTarget } from '../data/model';
import type { ObservationLevel } from '../data/pack';
import LevelPicker from './LevelPicker';

export interface EvidenceRequest {
  readonly cellKey: string;
  readonly learner: CaptureLearner;
  readonly target: CaptureTarget;
}

export interface CaptureMatrixProps {
  readonly learners: readonly CaptureLearner[];
  readonly targets: readonly CaptureTarget[];
  readonly levels: readonly ObservationLevel[];
  readonly latest: ReadonlyMap<string, ObservationRecord>;
  readonly draft: ObservationDraft;
  readonly exceptions: ReadonlySet<string>;
  readonly onLevel: (cellKey: string, level: string) => void;
  readonly onClearLevel: (cellKey: string) => void;
  readonly onOpenEvidence: (request: EvidenceRequest) => void;
}

function evidenceOf(
  key: string,
  draft: ObservationDraft,
  saved: ObservationRecord | null
): string {
  if (Object.prototype.hasOwnProperty.call(draft.evidence, key)) return draft.evidence[key];
  return saved?.evidence ?? '';
}

export const CaptureMatrix: React.FC<CaptureMatrixProps> = ({
  learners,
  targets,
  levels,
  latest,
  draft,
  exceptions,
  onLevel,
  onClearLevel,
  onOpenEvidence,
}) => {
  const { t } = useTranslation('academics');

  return (
    <div className="overflow-x-auto rounded-lg border border-surface-border" data-testid="capture-matrix">
      <table className="min-w-full border-collapse text-sm">
        <caption className="sr-only">
          {t('observations.matrixCaption', 'Observations by learner and outcome')}
        </caption>
        <thead className="sticky top-0 z-20 bg-surface-accent">
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-30 min-w-[12rem] border-b border-r border-surface-border bg-surface-accent px-3 py-2 text-left font-semibold text-surface-foreground"
            >
              {t('observations.learner', 'Learner')}
            </th>
            {targets.map((target) => (
              <th
                key={target.key}
                scope="col"
                className="min-w-[11rem] border-b border-surface-border px-3 py-2 text-left font-semibold text-surface-foreground"
              >
                <span className="block text-xs text-surface-muted-fg">{target.code}</span>
                {target.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {learners.map((learner) => (
            <tr key={learner.enrolmentId} className="align-top">
              <th
                scope="row"
                className="sticky left-0 z-10 min-w-[12rem] border-b border-r border-surface-border bg-surface px-3 py-2 text-left font-medium text-surface-foreground"
              >
                <span className="block">{learner.name}</span>
                <span className="block text-xs font-normal text-surface-muted-fg">
                  {learner.admissionNumber}
                </span>
              </th>
              {targets.map((target) => {
                const key = cellKeyOf(target.key, learner.enrolmentId);
                const saved = latest.get(key) ?? null;
                const value = draft.levels[key] ?? saved?.rubric_level ?? '';
                const note = evidenceOf(key, draft, saved);
                const exception = exceptions.has(key);
                return (
                  <td key={target.key} className="border-b border-surface-border px-2 py-2">
                    <LevelPicker
                      levels={levels}
                      value={value}
                      savedValue={saved?.rubric_level ?? null}
                      label={t('observations.levelFor', 'Level for {{learner}}, {{target}}', {
                        learner: learner.name,
                        target: target.code,
                      })}
                      variant="select"
                      onChange={(code) => onLevel(key, code)}
                      onClear={() => onClearLevel(key)}
                    />
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        data-testid="evidence-button"
                        aria-label={t('observations.evidenceForCell', 'Evidence for {{learner}}, {{target}}', {
                          learner: learner.name,
                          target: target.code,
                        })}
                        onClick={() => onOpenEvidence({ cellKey: key, learner, target })}
                        disabled={value === ''}
                        className="inline-flex min-h-[44px] items-center rounded-md border border-surface-border px-2 py-1 text-xs text-surface-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
                      >
                        {t('observations.evidence', 'Evidence')}
                        {note.trim() ? <span className="ml-1" aria-hidden="true">•</span> : null}
                      </button>
                      {exception ? (
                        <span
                          data-testid="bulk-exception"
                          className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        >
                          {t('observations.exception', 'Exception')}
                        </span>
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CaptureMatrix;
