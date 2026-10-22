// ABOUTME: The narrow capture layout: one learner at a time with 44 px level buttons, used on a
// ABOUTME: phone or a tablet in class. It has no hover-only affordance; every action is a visible control.

import React from 'react';
import { useTranslation } from 'react-i18next';

import type { ObservationDraft } from '../data/draft';
import { cellKeyOf, type ObservationRecord } from '../data/judgement';
import type { CaptureLearner, CaptureTarget } from '../data/model';
import type { ObservationLevel } from '../data/pack';
import LevelPicker from './LevelPicker';
import type { EvidenceRequest } from './CaptureMatrix';

export interface LearnerCaptureProps {
  readonly learners: readonly CaptureLearner[];
  readonly selectedLearnerId: string | null;
  readonly targets: readonly CaptureTarget[];
  readonly levels: readonly ObservationLevel[];
  readonly latest: ReadonlyMap<string, ObservationRecord>;
  readonly draft: ObservationDraft;
  readonly exceptions: ReadonlySet<string>;
  readonly onSelectLearner: (learnerId: string) => void;
  readonly onLevel: (cellKey: string, level: string) => void;
  readonly onClearLevel: (cellKey: string) => void;
  readonly onOpenEvidence: (request: EvidenceRequest) => void;
}

const navButtonClass =
  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-surface-border bg-surface px-3 text-sm font-medium text-surface-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50';

export const LearnerCapture: React.FC<LearnerCaptureProps> = ({
  learners,
  selectedLearnerId,
  targets,
  levels,
  latest,
  draft,
  exceptions,
  onSelectLearner,
  onLevel,
  onClearLevel,
  onOpenEvidence,
}) => {
  const { t } = useTranslation('academics');
  const index = Math.max(
    0,
    learners.findIndex((learner) => learner.learnerId === selectedLearnerId)
  );
  const learner = learners[index] ?? null;

  if (learner === null) {
    return (
      <p className="text-sm text-surface-muted-fg" data-testid="narrow-capture">
        {t('observations.noLearners', 'No active learners in this class.')}
      </p>
    );
  }

  return (
    <section data-testid="narrow-capture" aria-label={t('observations.narrowTitle', 'Capture one learner')}>
      <div className="flex flex-wrap items-end gap-2">
        <button
          type="button"
          className={navButtonClass}
          aria-label={t('observations.previousLearner', 'Previous learner')}
          onClick={() => onSelectLearner(learners[Math.max(0, index - 1)].learnerId)}
          disabled={index === 0}
        >
          ‹
        </button>
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="narrow-learner" className="block text-sm font-medium text-surface-foreground">
            {t('observations.learner', 'Learner')}
          </label>
          <select
            id="narrow-learner"
            className="mt-1 w-full min-h-[44px] rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-surface-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            value={learner.learnerId}
            onChange={(event) => onSelectLearner(event.target.value)}
          >
            {learners.map((entry) => (
              <option key={entry.learnerId} value={entry.learnerId}>
                {entry.name} · {entry.admissionNumber}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={navButtonClass}
          aria-label={t('observations.nextLearner', 'Next learner')}
          onClick={() => onSelectLearner(learners[Math.min(learners.length - 1, index + 1)].learnerId)}
          disabled={index === learners.length - 1}
        >
          ›
        </button>
      </div>
      <p className="mt-1 text-xs text-surface-muted-fg" aria-live="polite">
        {t('observations.learnerPosition', '{{position}} of {{total}}', {
          position: index + 1,
          total: learners.length,
        })}
      </p>

      <div className="mt-3 space-y-3">
        {targets.map((target) => {
          const key = cellKeyOf(target.key, learner.enrolmentId);
          const saved = latest.get(key) ?? null;
          const value = draft.levels[key] ?? saved?.rubric_level ?? '';
          const note = Object.prototype.hasOwnProperty.call(draft.evidence, key)
            ? draft.evidence[key]
            : saved?.evidence ?? '';
          const exception = exceptions.has(key);
          return (
            <div
              key={target.key}
              data-testid="observation-learner-card"
              className="rounded-lg border border-surface-border bg-surface p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-surface-foreground">
                  <span className="block text-xs font-normal text-surface-muted-fg">{target.code}</span>
                  {target.label}
                </h3>
                {exception ? (
                  <span
                    data-testid="bulk-exception"
                    className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  >
                    {t('observations.exception', 'Exception')}
                  </span>
                ) : null}
              </div>
              <div className="mt-2">
                <LevelPicker
                  levels={levels}
                  value={value}
                  savedValue={saved?.rubric_level ?? null}
                  label={t('observations.levelFor', 'Level for {{learner}}, {{target}}', {
                    learner: learner.name,
                    target: target.code,
                  })}
                  variant="buttons"
                  onChange={(code) => onLevel(key, code)}
                  onClear={() => onClearLevel(key)}
                />
              </div>
              <button
                type="button"
                data-testid="evidence-button"
                aria-label={t('observations.evidenceForCell', 'Evidence for {{learner}}, {{target}}', {
                  learner: learner.name,
                  target: target.code,
                })}
                onClick={() => onOpenEvidence({ cellKey: key, learner, target })}
                disabled={value === ''}
                className="mt-2 inline-flex min-h-[44px] items-center rounded-md border border-surface-border px-3 py-2 text-sm text-surface-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
              >
                {t('observations.evidence', 'Evidence')}
                {note.trim() ? <span className="ml-1" aria-hidden="true">•</span> : null}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default LearnerCapture;
