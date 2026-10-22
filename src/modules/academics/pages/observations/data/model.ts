// ABOUTME: The shapes the capture page and its grid share, and the pure comparison that says which
// ABOUTME: cells still differ from the saved observations. No React and no storage in this file.

import type { ObservationDraft } from './draft';
import { cellKeyOf, type ObservationMode, type ObservationRecord } from './judgement';

/** One outcome or competency the grid captures observations against. */
export interface CaptureTarget {
  readonly key: string;
  readonly id: string;
  readonly kind: ObservationMode;
  readonly code: string;
  readonly label: string;
}

/** One active learner in the chosen class, with the enrolment the observation is attached to. */
export interface CaptureLearner {
  readonly enrolmentId: string;
  readonly learnerId: string;
  readonly name: string;
  readonly admissionNumber: string;
}

/** A cell that differs from the saved observations and will be written on save. */
export interface PendingChange {
  readonly key: string;
  readonly learner: CaptureLearner;
  readonly target: CaptureTarget;
  readonly saved: ObservationRecord | null;
  readonly level: string;
  readonly evidence: string;
}

function normaliseEvidence(value: string | undefined): string {
  return (value ?? '').trim();
}

/**
 * The cells whose draft level or evidence differs from the latest saved observation.
 *
 * A cell with no level is not an observation: evidence on its own is ignored rather than written
 * against a learner without a judgement.
 */
export function pendingChanges(
  learners: readonly CaptureLearner[],
  targets: readonly CaptureTarget[],
  latest: ReadonlyMap<string, ObservationRecord>,
  draft: ObservationDraft
): readonly PendingChange[] {
  const changes: PendingChange[] = [];
  for (const learner of learners) {
    for (const target of targets) {
      const key = cellKeyOf(target.key, learner.enrolmentId);
      const saved = latest.get(key) ?? null;
      const level = draft.levels[key] ?? saved?.rubric_level ?? '';
      if (level === '') continue;

      const hasDraftEvidence = Object.prototype.hasOwnProperty.call(draft.evidence, key);
      const evidence = hasDraftEvidence ? draft.evidence[key] : saved?.evidence ?? '';
      const levelChanged = level !== (saved?.rubric_level ?? '');
      const evidenceChanged = normaliseEvidence(evidence) !== normaliseEvidence(saved?.evidence);

      if (!levelChanged && !evidenceChanged) continue;
      changes.push({ key, learner, target, saved, level, evidence: evidence.trim() });
    }
  }
  return changes;
}

/**
 * The learners whose level differs from the bulk level that was applied to their cell.
 *
 * The baseline is kept separately from the level, so applying ME to the group and then recording AE
 * for one learner leaves the bulk entry visible and this exception counted.
 */
export function bulkExceptions(
  learners: readonly CaptureLearner[],
  target: CaptureTarget | null,
  latest: ReadonlyMap<string, ObservationRecord>,
  draft: ObservationDraft
): readonly CaptureLearner[] {
  if (target === null) return [];
  return learners.filter((learner) => {
    const key = cellKeyOf(target.key, learner.enrolmentId);
    const baseline = draft.bulk[key];
    if (baseline === undefined) return false;
    const level = draft.levels[key] ?? latest.get(key)?.rubric_level ?? '';
    return level !== baseline;
  });
}
