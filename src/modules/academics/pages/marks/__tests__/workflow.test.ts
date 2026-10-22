// ABOUTME: Workflow tests: the assessment status is the floor, a per-group record can only make it
// ABOUTME: stricter, an override needs a reason, a reopen needs a reason, and a moderation keeps the
// ABOUTME: value the cell held before it.

import { describe, expect, it } from 'vitest';

import {
  MarkWorkflow,
  assertOverrideReason,
  createMemoryWorkflowStore,
  effectiveWorkflowState,
  isReadOnly,
  requiresOverrideReason,
  stateFromAssessmentStatus,
} from '../workflow';
import { MarkEntryError } from '../types';

const at = '2026-10-22T09:00:00.000Z';

describe('workflow state', () => {
  it('maps the assessment status onto the workflow', () => {
    expect(stateFromAssessmentStatus('draft')).toBe('open');
    expect(stateFromAssessmentStatus('open')).toBe('open');
    expect(stateFromAssessmentStatus('closed')).toBe('submitted');
    expect(stateFromAssessmentStatus('moderated')).toBe('moderated');
    expect(stateFromAssessmentStatus('published')).toBe('published');
  });

  it('takes the stricter of the assessment and the group record', () => {
    expect(effectiveWorkflowState('open', 'locked')).toBe('locked');
    expect(effectiveWorkflowState('published', 'open')).toBe('published');
    expect(effectiveWorkflowState('open', undefined)).toBe('open');
  });

  it('read-only states need a reason and open states do not', () => {
    expect(requiresOverrideReason('open')).toBe(false);
    expect(requiresOverrideReason('submitted')).toBe(false);
    expect(requiresOverrideReason('moderated')).toBe(true);
    expect(requiresOverrideReason('locked')).toBe(true);
    expect(requiresOverrideReason('published')).toBe(true);
    expect(isReadOnly('locked')).toBe(true);
  });

  it('refuses an override with no reason, and names the state', () => {
    expect(() => assertOverrideReason('locked', null)).toThrow(MarkEntryError);
    expect(() => assertOverrideReason('locked', '   ')).toThrow(/needs a reason|Write a reason/);
    expect(() => assertOverrideReason('locked', 'Exam office correction')).not.toThrow();
    expect(() => assertOverrideReason('open', null)).not.toThrow();
  });
});

describe('workflow record', () => {
  it('advances forward without a reason and records who did it', () => {
    const workflow = new MarkWorkflow(createMemoryWorkflowStore());
    workflow.advance('assessment-1', 'group-1', 'open', 'submitted', { actorId: 'user-1', at });

    expect(workflow.state('assessment-1', 'group-1', 'open')).toBe('submitted');
    expect(workflow.audit('assessment-1', 'group-1')).toEqual([
      expect.objectContaining({ from: 'open', to: 'submitted', actorId: 'user-1', at }),
    ]);
  });

  it('refuses to reopen a locked group without a reason, and allows it with one', () => {
    const workflow = new MarkWorkflow(createMemoryWorkflowStore());
    workflow.advance('assessment-1', 'group-1', 'open', 'locked', { actorId: 'user-1', at });

    expect(() =>
      workflow.advance('assessment-1', 'group-1', 'open', 'open', { actorId: 'user-1', at })
    ).toThrow(/needs a reason/);

    workflow.advance('assessment-1', 'group-1', 'open', 'open', {
      actorId: 'user-1',
      at,
      reason: 'Examination office reopened after remarking.',
    });
    expect(workflow.state('assessment-1', 'group-1', 'open')).toBe('open');
    expect(workflow.audit('assessment-1', 'group-1')[1]).toMatchObject({
      from: 'locked',
      to: 'open',
      reason: 'Examination office reopened after remarking.',
    });
  });

  it('keeps the original and the moderated value of a cell', () => {
    const workflow = new MarkWorkflow(createMemoryWorkflowStore());
    workflow.advance('assessment-1', 'group-1', 'open', 'moderated', { actorId: 'user-1', at });
    workflow.moderate('assessment-1', 'group-1', 'enrolment-1|assessment-1', {
      original: '54',
      moderated: '62',
      reason: 'Script 14 remarked.',
      actorId: 'examiner-1',
      at,
    });

    expect(workflow.moderations('assessment-1', 'group-1')).toEqual({
      'enrolment-1|assessment-1': {
        original: '54',
        moderated: '62',
        reason: 'Script 14 remarked.',
        actorId: 'examiner-1',
        at,
      },
    });
  });

  it('keeps the workflow of two groups of one assessment apart', () => {
    const workflow = new MarkWorkflow(createMemoryWorkflowStore());
    workflow.advance('assessment-1', 'group-1', 'open', 'locked', { actorId: 'user-1', at });

    expect(workflow.state('assessment-1', 'group-1', 'open')).toBe('locked');
    expect(workflow.state('assessment-1', 'group-2', 'open')).toBe('open');
  });
});
