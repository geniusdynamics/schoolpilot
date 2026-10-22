// ABOUTME: The pure transition guard: which moves a workflow allows, which actor may make them,
// ABOUTME: when a reason is required, and where a record starts.

import { describe, expect, it } from 'vitest';

import { initialStateOf, orderedStates, resolveMove, stateByKey, availableMoves } from '../guard';
import { defineWorkflow } from '../definition';
import { marksLifecycle, promotionRun, twoStepApproval } from '../catalogue';
import type { WorkflowActor, WorkflowDefinition } from '../types';

const head: WorkflowActor = { id: 'user-head', roles: ['head_teacher'] };
const registrar: WorkflowActor = { id: 'user-registrar', roles: ['registrar'] };
const accountant: WorkflowActor = { id: 'user-accountant', roles: ['accountant'] };
const anonymous: WorkflowActor = { id: 'user-none', roles: [] };

describe('a sequence workflow', () => {
  it('starts at its declared initial state and orders its states', () => {
    expect(initialStateOf(marksLifecycle).key).toBe('open');
    expect(orderedStates(marksLifecycle).map((state) => state.key)).toEqual([
      'open',
      'submitted',
      'moderated',
      'locked',
      'published',
    ]);
  });

  it('advances forward without a reason, however far the move jumps', () => {
    const decision = resolveMove(marksLifecycle, {
      recordKey: 'a|g',
      from: 'open',
      to: 'locked',
      actor: anonymous,
    });
    expect(decision.allowed).toBe(true);
    if (decision.allowed) expect(decision.move.transition.key).toBe('advance');
  });

  it('refuses a backward move without a reason and names the state', () => {
    const denied = resolveMove(marksLifecycle, {
      recordKey: 'a|g',
      from: 'locked',
      to: 'open',
      actor: anonymous,
    });
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) {
      expect(denied.code).toBe('reason_required');
      expect(denied.transition).toBe('reopen');
    }
  });

  it('allows a backward move once a reason is given', () => {
    const decision = resolveMove(marksLifecycle, {
      recordKey: 'a|g',
      from: 'locked',
      to: 'open',
      actor: anonymous,
      reason: 'The examination office reopened after remarking.',
    });
    expect(decision.allowed).toBe(true);
    if (decision.allowed) expect(decision.move.transition.key).toBe('reopen');
  });

  it('declares which states an edit is an override in', () => {
    expect(stateByKey(marksLifecycle, 'open')?.requires_reason_on_leave).toBeUndefined();
    expect(stateByKey(marksLifecycle, 'submitted')?.requires_reason_on_leave).toBeUndefined();
    expect(stateByKey(marksLifecycle, 'moderated')?.requires_reason_on_leave).toBe(true);
    expect(stateByKey(marksLifecycle, 'locked')?.requires_reason_on_leave).toBe(true);
    expect(stateByKey(marksLifecycle, 'published')?.requires_reason_on_leave).toBe(true);
  });

  it('refuses a state the workflow does not declare', () => {
    const denied = resolveMove(marksLifecycle, {
      recordKey: 'a|g',
      from: 'open',
      to: 'archived',
      actor: anonymous,
    });
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('unknown_state');
  });

  it('lists the moves an actor may make from a state', () => {
    const moves = availableMoves(marksLifecycle, { from: 'open', actor: anonymous });
    expect(moves.map((move) => move.transition.key)).toEqual([
      'advance',
      'advance',
      'advance',
      'advance',
    ]);
    expect(moves.map((move) => move.to)).toEqual([
      'submitted',
      'moderated',
      'locked',
      'published',
    ]);
  });
});

describe('an explicit workflow', () => {
  it('lets the head approve and refuses the registrar, through the repository roles', () => {
    const allowed = resolveMove(promotionRun, {
      recordKey: 'run-1',
      from: 'computed',
      to: 'approved',
      actor: head,
    });
    expect(allowed.allowed).toBe(true);
    if (allowed.allowed) expect(allowed.move.transition.key).toBe('approve');

    const denied = resolveMove(promotionRun, {
      recordKey: 'run-1',
      from: 'computed',
      to: 'approved',
      actor: registrar,
    });
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) {
      expect(denied.code).toBe('forbidden');
      expect(denied.transition).toBe('approve');
    }
  });

  it('refuses a permission the actor does not hold even when the role matches', () => {
    // The accountant owns fee approval but not the enrolment; the promotion transition asks for both.
    const denied = resolveMove(promotionRun, {
      recordKey: 'run-1',
      from: 'computed',
      to: 'approved',
      actor: accountant,
    });
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('forbidden');
  });

  it('refuses a move no transition declares', () => {
    const denied = resolveMove(promotionRun, {
      recordKey: 'run-1',
      from: 'computed',
      to: 'committed',
      actor: head,
    });
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('no_such_transition');
  });

  it('needs a reason where the transition says so', () => {
    const denied = resolveMove(twoStepApproval, {
      recordKey: 'req-1',
      from: 'pending_approval',
      to: 'rejected',
      actor: anonymous,
    });
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('reason_required');

    const allowed = resolveMove(twoStepApproval, {
      recordKey: 'req-1',
      from: 'pending_approval',
      to: 'rejected',
      actor: anonymous,
      reason: 'Budget was already spent.',
    });
    expect(allowed.allowed).toBe(true);
  });
});

describe('a condition', () => {
  const guarded: WorkflowDefinition = defineWorkflow({
    key: 'test.conditional',
    name: 'Conditional',
    system: false,
    policy: 'explicit',
    states: [
      { key: 'draft', name: 'Draft', sequence_order: 0, is_initial: true },
      { key: 'signed', name: 'Signed', sequence_order: 1, is_terminal: true },
    ],
    transitions: [
      {
        key: 'sign',
        label: 'Sign',
        from: ['draft'],
        to: 'signed',
        condition: { kind: 'field_present', field: 'signature' },
      },
    ],
  });

  it('refuses the move while the record does not satisfy it', () => {
    const denied = resolveMove(guarded, {
      recordKey: 'doc-1',
      from: 'draft',
      to: 'signed',
      actor: anonymous,
      record: {},
    });
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('condition_failed');
  });

  it('allows the move once the record satisfies it', () => {
    const allowed = resolveMove(guarded, {
      recordKey: 'doc-1',
      from: 'draft',
      to: 'signed',
      actor: anonymous,
      record: { signature: 'A. Teacher' },
    });
    expect(allowed.allowed).toBe(true);
  });
});

describe('a disabled workflow', () => {
  it('moves nothing', () => {
    const denied = resolveMove({ ...marksLifecycle, enabled: false }, {
      recordKey: 'a|g',
      from: 'open',
      to: 'submitted',
      actor: anonymous,
    });
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('disabled_workflow');
  });
});
