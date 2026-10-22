// ABOUTME: Grade moderation for the results page, recorded in the mark entry workflow's own store:
// ABOUTME: the value the engine computed, the value a moderator set, the reason, the actor and the time.

import { MarkEntryError } from '../marks/types';
import type { TeachingScope } from '../marks/types';
import { assertCanWrite } from '../marks/teachingScope';
import { assertOverrideReason, MarkWorkflow } from '../marks/workflow';
import type { GradeOverrideView } from './types';

/** The prefix that keeps an aggregate's workflow apart from a real assessment's. */
const AGGREGATE_PREFIX = 'aggregate:';

/** The class groups the actor's own teaching groups reach. The same reach filters the picker. */
export function classGroupsInScope(
  scope: TeachingScope,
  groups: readonly { readonly id: string; readonly classGroupIds: readonly string[] }[]
): ReadonlySet<string> {
  const reachable = new Set<string>();
  for (const group of groups) {
    if (!scope.groupIds.has(group.id)) continue;
    for (const classGroupId of group.classGroupIds) reachable.add(classGroupId);
  }
  return reachable;
}

/** Refuses a class group the actor's teaching groups do not reach. */
export function assertClassInScope(
  scope: TeachingScope,
  groups: readonly { readonly id: string; readonly classGroupIds: readonly string[] }[],
  classGroupId: string
): void {
  if (classGroupsInScope(scope, groups).has(classGroupId)) return;
  throw new MarkEntryError(
    'scope',
    'This class group is outside your scope, so its results cannot be moderated.'
  );
}

export interface GradeOverrideInput {
  readonly aggregationCode: string;
  readonly classGroupId: string;
  readonly enrolmentId: string;
  /** The grade the engine computed at the moment of the override. */
  readonly computed: string;
  readonly value: string;
  readonly reason: string;
  readonly actorId: string;
  readonly at: string;
}

export interface GradeReleaseInput {
  readonly aggregationCode: string;
  readonly classGroupId: string;
  readonly enrolmentId: string;
  /** The override that is being removed. */
  readonly current: GradeOverrideView;
  readonly reason: string;
  readonly actorId: string;
  readonly at: string;
}

/** An empty moderated value means no override is in force; see `read`. */
const NO_OVERRIDE = '';

/**
 * The moderation of an aggregate grade.
 *
 * The record lives in the same `MarkWorkflow` the mark grid uses, under a namespaced assessment id,
 * so a school has one audit trail: the actor, the instant, the reason, and the value before and
 * after. The engine's own result is never rewritten - the page shows both.
 */
export class GradeModeration {
  private readonly workflow: MarkWorkflow;
  private readonly scope: TeachingScope;
  private readonly groups: readonly { readonly id: string; readonly classGroupIds: readonly string[] }[];

  constructor(
    workflow: MarkWorkflow,
    scope: TeachingScope,
    groups: readonly { readonly id: string; readonly classGroupIds: readonly string[] }[]
  ) {
    this.workflow = workflow;
    this.scope = scope;
    this.groups = groups;
  }

  private assessmentId(aggregationCode: string): string {
    return `${AGGREGATE_PREFIX}${aggregationCode}`;
  }

  read(aggregationCode: string, classGroupId: string, enrolmentId: string): GradeOverrideView | null {
    const record = this.workflow.moderations(this.assessmentId(aggregationCode), classGroupId)[enrolmentId];
    if (record === undefined) return null;
    // An unmoderation is recorded as an empty moderated value, so the history keeps the reason and
    // the value that was released while the result goes back to the engine's own grade.
    if (record.moderated.trim() === NO_OVERRIDE) return null;
    return {
      original: record.original,
      value: record.moderated,
      reason: record.reason,
      actorId: record.actorId,
      at: record.at,
    };
  }

  /** Records an override. A computed grade is a decision already made, so a reason is required. */
  override(input: GradeOverrideInput): GradeOverrideView {
    this.assertMayModerate(input.classGroupId, input.reason);
    const value = input.value.trim();
    if (value === '') {
      throw new MarkEntryError('invalid_score', 'Write the grade the learner should be awarded.');
    }
    this.workflow.moderate(this.assessmentId(input.aggregationCode), input.classGroupId, input.enrolmentId, {
      original: input.computed,
      moderated: value,
      reason: input.reason.trim(),
      actorId: input.actorId,
      at: input.at,
    });
    return this.read(input.aggregationCode, input.classGroupId, input.enrolmentId) as GradeOverrideView;
  }

  /** Removes an override, back to the engine's grade. Removing a decision needs a reason too. */
  release(input: GradeReleaseInput): void {
    this.assertMayModerate(input.classGroupId, input.reason);
    this.workflow.moderate(this.assessmentId(input.aggregationCode), input.classGroupId, input.enrolmentId, {
      original: input.current.value,
      moderated: NO_OVERRIDE,
      reason: input.reason.trim(),
      actorId: input.actorId,
      at: input.at,
    });
  }

  private assertMayModerate(classGroupId: string, reason: string): void {
    assertCanWrite(this.scope);
    assertClassInScope(this.scope, this.groups, classGroupId);
    // E01's rule, unchanged: a moderated decision may only be changed with a reason.
    assertOverrideReason('moderated', reason);
  }
}
