// ABOUTME: The engine over its store: applying a move writes the state and the audit entry, a move
// ABOUTME: to the state a record is already in is not an event, and the catalogue's protections hold.

import { describe, expect, it } from 'vitest';

import { MARKS_LIFECYCLE_KEY, PROMOTION_RUN_KEY, marksLifecycle, promotionRun } from '../catalogue';
import { WorkflowEngine } from '../engine';
import { createMemoryDefinitionStore, createMemoryWorkflowStore } from '../store';
import type { WorkflowActor, WorkflowDefinition } from '../types';

const admin: WorkflowActor = { id: 'user-admin', roles: ['administrator'] };
const registrar: WorkflowActor = { id: 'user-registrar', roles: ['registrar'] };
const teacher: WorkflowActor = { id: 'user-teacher', roles: ['teacher'] };
const at = '2026-10-22T09:00:00.000Z';

function engineWithCatalogue(): WorkflowEngine {
  return new WorkflowEngine({
    store: createMemoryWorkflowStore(),
    definitionStore: createMemoryDefinitionStore(),
    definitions: [marksLifecycle, promotionRun],
    newId: () => 'entry-1',
  });
}

describe('applying a move', () => {
  it('writes the state and appends the audit entry', () => {
    const engine = engineWithCatalogue();
    const result = engine.apply(MARKS_LIFECYCLE_KEY, {
      recordKey: 'a|g',
      from: 'open',
      to: 'submitted',
      actor: teacher,
      at,
    });

    expect(result.record.state).toBe('submitted');
    expect(result.record.updated_by).toBe('user-teacher');
    expect(result.entry).toMatchObject({
      from: 'open',
      to: 'submitted',
      transition: 'advance',
      actor_id: 'user-teacher',
      at,
      reason: null,
    });
    expect(engine.state(MARKS_LIFECYCLE_KEY, 'a|g')).toBe('submitted');
    expect(engine.history('a|g')).toHaveLength(1);
  });

  it('starts an unknown record at the workflow initial state', () => {
    const engine = engineWithCatalogue();
    expect(engine.record('a|g')).toBeNull();
    expect(engine.state(MARKS_LIFECYCLE_KEY, 'a|g')).toBe('open');
  });

  it('leaves a record already in the target state alone and records no event', () => {
    const engine = engineWithCatalogue();
    engine.apply(MARKS_LIFECYCLE_KEY, {
      recordKey: 'a|g',
      from: 'open',
      to: 'submitted',
      actor: teacher,
      at,
    });
    const again = engine.apply(MARKS_LIFECYCLE_KEY, {
      recordKey: 'a|g',
      from: 'submitted',
      to: 'submitted',
      actor: teacher,
      at,
    });

    expect(again.entry).toBeNull();
    expect(engine.history('a|g')).toHaveLength(1);
  });

  it('refuses a reasoned move that carries no reason, and writes nothing', () => {
    const engine = engineWithCatalogue();
    engine.apply(MARKS_LIFECYCLE_KEY, {
      recordKey: 'a|g',
      from: 'open',
      to: 'locked',
      actor: teacher,
      at,
    });

    expect(() =>
      engine.apply(MARKS_LIFECYCLE_KEY, {
        recordKey: 'a|g',
        from: 'locked',
        to: 'open',
        actor: teacher,
        at,
      })
    ).toThrowError(/needs a reason/);
    expect(engine.state(MARKS_LIFECYCLE_KEY, 'a|g')).toBe('locked');
    expect(engine.history('a|g')).toHaveLength(1);
  });

  it('keeps the payload a host record already carries', () => {
    const engine = engineWithCatalogue();
    engine.apply(MARKS_LIFECYCLE_KEY, {
      recordKey: 'a|g',
      from: 'open',
      to: 'submitted',
      actor: teacher,
      at,
      payload: { moderations: { 'e|a': { moderated: '62' } } },
    });
    engine.apply(MARKS_LIFECYCLE_KEY, {
      recordKey: 'a|g',
      from: 'submitted',
      to: 'moderated',
      actor: teacher,
      at,
    });

    expect(engine.record('a|g')?.payload).toEqual({ moderations: { 'e|a': { moderated: '62' } } });
  });

  it('names the transition in the entry for an explicit workflow', () => {
    const engine = engineWithCatalogue();
    const result = engine.apply(PROMOTION_RUN_KEY, {
      recordKey: 'run-1',
      from: 'computed',
      to: 'approved',
      actor: { id: 'user-head', roles: ['head_teacher'] },
      at,
    });
    expect(result.entry?.transition).toBe('approve');
    expect(result.entry?.effects).toEqual(['notify:promotion_approved']);
  });

  it('refuses a move the actor may not make', () => {
    const engine = engineWithCatalogue();
    expect(() =>
      engine.apply(PROMOTION_RUN_KEY, {
        recordKey: 'run-1',
        from: 'computed',
        to: 'approved',
        actor: registrar,
        at,
      })
    ).toThrowError(/may not approve/);
    expect(engine.history('run-1')).toHaveLength(0);
  });
});

describe('the catalogue a school owns', () => {
  const own: WorkflowDefinition = {
    key: 'school.custom',
    name: 'Custom',
    system: false,
    policy: 'sequence',
    states: [
      { key: 'a', name: 'A', sequence_order: 0, is_initial: true },
      { key: 'b', name: 'B', sequence_order: 1 },
    ],
    transitions: [],
  };

  it('defines, edits and removes a workflow a school wrote itself', () => {
    const engine = engineWithCatalogue();
    engine.define(own, admin);
    expect(engine.has('school.custom')).toBe(true);

    const edited = engine.update('school.custom', { ...own, name: 'Renamed' }, admin);
    expect(edited.name).toBe('Renamed');

    engine.remove('school.custom', admin);
    expect(engine.has('school.custom')).toBe(false);
  });

  it('refuses a caller whose roles do not own the catalogue', () => {
    const engine = engineWithCatalogue();
    expect(() => engine.define(own, registrar)).toThrowError(/do not hold workflow.manage/);
    expect(() => engine.remove(MARKS_LIFECYCLE_KEY, registrar)).toThrowError(
      /do not hold workflow.manage/
    );
  });

  it('refuses to define a workflow over a key that already answers', () => {
    const engine = engineWithCatalogue();
    expect(() => engine.define({ ...own, key: MARKS_LIFECYCLE_KEY }, admin)).toThrowError(
      /already exists/
    );
  });
});

describe('system workflow protections', () => {
  it('refuses to delete a system workflow', () => {
    const engine = engineWithCatalogue();
    expect(() => engine.remove(MARKS_LIFECYCLE_KEY, admin)).toThrowError(/cannot be deleted/);
    expect(engine.has(MARKS_LIFECYCLE_KEY)).toBe(true);
  });

  it('refuses to disable a system workflow', () => {
    const engine = engineWithCatalogue();
    expect(() => engine.setEnabled(MARKS_LIFECYCLE_KEY, false, admin)).toThrowError(
      /cannot be disabled/
    );
  });

  it('refuses to remove a state of a system workflow', () => {
    const engine = engineWithCatalogue();
    expect(() =>
      engine.update(
        MARKS_LIFECYCLE_KEY,
        { ...marksLifecycle, states: marksLifecycle.states.slice(0, 4) },
        admin
      )
    ).toThrowError(/cannot be removed/);
  });

  it('refuses to rename or reorder a state of a system workflow', () => {
    const engine = engineWithCatalogue();
    const renamed = {
      ...marksLifecycle,
      states: marksLifecycle.states.map((state) =>
        state.key === 'locked' ? { ...state, name: 'Sealed' } : state
      ),
    };
    expect(() => engine.update(MARKS_LIFECYCLE_KEY, renamed, admin)).toThrowError(
      /cannot be renamed or reordered/
    );

    const reordered = {
      ...marksLifecycle,
      states: marksLifecycle.states.map((state) =>
        state.key === 'locked' ? { ...state, sequence_order: 9 } : state
      ),
    };
    expect(() => engine.update(MARKS_LIFECYCLE_KEY, reordered, admin)).toThrowError(
      /cannot be renamed or reordered/
    );
  });

  it('refuses to remove or re-point a transition of a system workflow', () => {
    const engine = engineWithCatalogue();
    const withoutUndo = {
      ...promotionRun,
      transitions: promotionRun.transitions.filter((transition) => transition.key !== 'undo'),
    };
    expect(() => engine.update(PROMOTION_RUN_KEY, withoutUndo, admin)).toThrowError(
      /cannot be removed/
    );

    const repointed = {
      ...promotionRun,
      transitions: promotionRun.transitions.map((transition) =>
        transition.key === 'approve' ? { ...transition, to: 'committed' } : transition
      ),
    };
    expect(() => engine.update(PROMOTION_RUN_KEY, repointed, admin)).toThrowError(
      /cannot be re-pointed/
    );
  });

  it('allows a state or a transition to be added to a system workflow', () => {
    const engine = engineWithCatalogue();
    const extended = engine.update(
      MARKS_LIFECYCLE_KEY,
      {
        ...marksLifecycle,
        states: [
          ...marksLifecycle.states,
          { key: 'archived', name: 'Archived', sequence_order: 5, is_terminal: true },
        ],
      },
      admin
    );

    expect(extended.states).toHaveLength(6);
    expect(extended.system).toBe(true);
    // The addition is live: the engine resolves the key against the edited definition.
    expect(engine.definition(MARKS_LIFECYCLE_KEY).states.map((state) => state.key)).toContain(
      'archived'
    );
  });

  it('allows the name of a system workflow to be edited', () => {
    const engine = engineWithCatalogue();
    const edited = engine.update(MARKS_LIFECYCLE_KEY, { ...marksLifecycle, name: 'Mark life' }, admin);
    expect(edited.name).toBe('Mark life');
  });
});
