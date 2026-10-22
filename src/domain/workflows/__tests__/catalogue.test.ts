// ABOUTME: The seeded catalogue: every common workflow the engine ships describes a usable
// ABOUTME: workflow, and a definition that does not is refused when it is declared.

import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_POSTED_KEY,
  FEE_SCHEDULE_APPROVAL_KEY,
  LIFECYCLE_DRAFT_ACTIVE_CLOSED_KEY,
  MARKS_LIFECYCLE_KEY,
  PROMOTION_RUN_KEY,
  REVIEW_VERIFY_KEY,
  SYSTEM_WORKFLOWS,
  TWO_STEP_APPROVAL_KEY,
  findSystemWorkflow,
  marksLifecycle,
  promotionRun,
} from '../catalogue';
import { defineWorkflow, validateDefinition } from '../definition';
import type { WorkflowDefinition } from '../types';

describe('the seeded catalogue', () => {
  it('describes a usable workflow for every seeded key', () => {
    expect(SYSTEM_WORKFLOWS.map((workflow) => workflow.key).sort()).toEqual(
      [
        DOCUMENT_POSTED_KEY,
        FEE_SCHEDULE_APPROVAL_KEY,
        LIFECYCLE_DRAFT_ACTIVE_CLOSED_KEY,
        MARKS_LIFECYCLE_KEY,
        PROMOTION_RUN_KEY,
        REVIEW_VERIFY_KEY,
        TWO_STEP_APPROVAL_KEY,
      ].sort()
    );
    for (const workflow of SYSTEM_WORKFLOWS) {
      expect(workflow.system, workflow.key).toBe(true);
      expect(() => validateDefinition(workflow), workflow.key).not.toThrow();
    }
  });

  it('resolves a seeded workflow by its key', () => {
    expect(findSystemWorkflow(MARKS_LIFECYCLE_KEY)?.name).toBe('Marks lifecycle');
    expect(findSystemWorkflow('no.such.workflow')).toBeNull();
  });

  it('orders the marks lifecycle and marks the states an override needs a reason in', () => {
    expect(marksLifecycle.policy).toBe('sequence');
    expect(marksLifecycle.scope_entity).toBe('mark');
    expect(marksLifecycle.states.map((state) => state.key)).toEqual([
      'open',
      'submitted',
      'moderated',
      'locked',
      'published',
    ]);
    expect(marksLifecycle.states.find((state) => state.is_initial)?.key).toBe('open');
  });

  it('carries the approval roles and permission on the promotion transition', () => {
    const approve = promotionRun.transitions.find((transition) => transition.key === 'approve');
    expect(approve?.allowed_roles).toEqual(['head_teacher', 'administrator']);
    expect(approve?.allowed_permissions).toEqual(['enrolment.write']);
    expect(promotionRun.scope_entity).toBe('promotion_decision');
  });
});

describe('declaring a definition', () => {
  function base(overrides: Partial<WorkflowDefinition>): WorkflowDefinition {
    return {
      key: 'test.workflow',
      name: 'Test',
      system: false,
      policy: 'sequence',
      states: [
        { key: 'a', name: 'A', sequence_order: 0, is_initial: true },
        { key: 'b', name: 'B', sequence_order: 1 },
      ],
      transitions: [],
      ...overrides,
    };
  }

  it('accepts a definition with states and an order', () => {
    expect(() => defineWorkflow(base({}))).not.toThrow();
  });

  it('refuses a workflow with no states', () => {
    expect(() => defineWorkflow(base({ states: [] }))).toThrowError(/at least one state/);
  });

  it('refuses two states that share a key', () => {
    const states = [
      { key: 'a', name: 'A', sequence_order: 0, is_initial: true },
      { key: 'a', name: 'A again', sequence_order: 1 },
    ];
    expect(() => defineWorkflow(base({ states }))).toThrowError(/declared twice/);
  });

  it('refuses two states that share a sequence order', () => {
    const states = [
      { key: 'a', name: 'A', sequence_order: 0, is_initial: true },
      { key: 'b', name: 'B', sequence_order: 0 },
    ];
    expect(() => defineWorkflow(base({ states }))).toThrowError(/share the sequence order/);
  });

  it('refuses more than one initial state', () => {
    const states = [
      { key: 'a', name: 'A', sequence_order: 0, is_initial: true },
      { key: 'b', name: 'B', sequence_order: 1, is_initial: true },
    ];
    expect(() => defineWorkflow(base({ states }))).toThrowError(/more than one state is declared initial/);
  });

  it('refuses an explicit workflow with no transitions', () => {
    expect(() => defineWorkflow(base({ policy: 'explicit' }))).toThrowError(
      /needs at least one transition/
    );
  });

  it('refuses a transition that enters an unknown state', () => {
    const transitions = [{ key: 'go', label: 'Go', from: ['a'], to: 'c' }];
    expect(() => defineWorkflow(base({ policy: 'explicit', transitions }))).toThrowError(
      /enters the unknown state c/
    );
  });

  it('refuses a transition that leaves an unknown state', () => {
    const transitions = [{ key: 'go', label: 'Go', from: ['z'], to: 'b' }];
    expect(() => defineWorkflow(base({ policy: 'explicit', transitions }))).toThrowError(
      /leaves the unknown state z/
    );
  });

  it('refuses two transitions that lead from one state to another', () => {
    const transitions = [
      { key: 'go', label: 'Go', from: ['a'], to: 'b' },
      { key: 'go_again', label: 'Go again', from: ['a'], to: 'b' },
    ];
    expect(() => defineWorkflow(base({ policy: 'explicit', transitions }))).toThrowError(
      /two transitions lead from a to b/
    );
  });
});
