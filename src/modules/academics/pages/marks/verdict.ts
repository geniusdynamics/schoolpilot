// ABOUTME: Runs one learner's marks through the assessment engine so the grid shows the engine's
// ABOUTME: own verdict - incomplete, exempt, which slot is missing - rather than a second opinion.

import { evaluateScheme } from '@/domain/assessment/engine';
import type { EngineIssueCode, SchemeDefinition, SchemeMark } from '@/domain/assessment/engine';

import { cellKey, type RowMark } from './scheme';
import type { RowVerdict } from './types';

/** What a reader is told when the scheme itself is the problem. `detail` is a developer string. */
function describeIssue(code: EngineIssueCode): string {
  switch (code) {
    case 'missing_max_score':
      return 'The scheme does not declare a maximum for this paper, so the row cannot be graded.';
    case 'slot_without_scale':
      return 'The scheme does not say what this slot is out of, so the row cannot be graded.';
    case 'mark_unknown_slot':
      return 'A mark names a slot this scheme does not have, so the row cannot be graded.';
    case 'mark_slot_not_in_score':
      return 'A mark names a slot the learning-area score does not count, so the row cannot be graded.';
    case 'multiple_assessments_in_single_slot':
      return 'Two assessments share a slot that accepts one, so the row cannot be graded.';
    case 'score_out_of_range':
      return 'A stored score is outside the range the scheme allows.';
    case 'invalid_score':
      return 'A stored score is not a number.';
    case 'duplicate_mark':
      return 'Two marks were entered for the same learner, assessment and paper.';
    case 'empty_slots':
      return 'The scheme declares no slots, so there is nothing to mark.';
    default:
      return 'The scheme cannot be evaluated for this learner.';
  }
}

/**
 * The engine's verdict for one row of cells.
 *
 * The grid does not re-implement the missing policy, the exemptions or the range rules: it hands
 * the row to `evaluateScheme` and reads back the status, the flags and the issues. A refused
 * evaluation blocks every cell of the row, because no cell of a row the engine cannot read can be
 * graded.
 */
export function evaluateRow(
  scheme: SchemeDefinition,
  marks: readonly RowMark[]
): RowVerdict {
  const schemeMarks: SchemeMark[] = marks.map((mark) => ({
    slot: mark.slot,
    assessment: mark.assessment,
    ...(mark.score === undefined ? {} : { score: mark.score }),
    ...(mark.maxScore === undefined ? {} : { max_score: mark.maxScore }),
    status: mark.status,
  }));

  const evaluation = evaluateScheme({ scheme, marks: schemeMarks });
  if (!evaluation.ok) {
    const issue = evaluation.issues[0];
    const reason = issue ? describeIssue(issue.code) : 'The scheme cannot be evaluated for this learner.';
    const blocked = new Map<string, string>();
    for (const mark of marks) {
      blocked.set(cellKey(mark.slot, mark.assessment), reason);
    }
    return { status: 'incomplete', missing: new Set(), blocked, reason };
  }

  const result = evaluation.result;
  const missing = new Set<string>();
  for (const flag of result.flags) {
    if (flag.code !== 'mark_missing') continue;
    missing.add(cellKey(flag.slot, flag.assessment ?? flag.slot));
  }

  return {
    status: result.status,
    missing,
    blocked: new Map(),
    reason:
      result.status === 'incomplete'
        ? 'A required assessment has no mark, so this learner has no result yet.'
        : null,
  };
}
