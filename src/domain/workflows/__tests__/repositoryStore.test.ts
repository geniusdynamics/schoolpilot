// ABOUTME: The engine's canonical store over a real repository: a record's state lives in its own
// ABOUTME: entity's state column, and the transition audit is the repository's own audit trail.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  closeTestContext,
  createTestContext,
  fixtureInput,
  seededId,
  type TestContext,
} from '@/data/repository/__tests__/helpers';
import type { Id } from '@/domain/ids';

import { FEE_SCHEDULE_APPROVAL_KEY, feeScheduleApproval } from '../catalogue';
import { createRepositoryWorkflowStore, type RepositoryWorkflowStore } from '../repositoryStore';
import type { WorkflowActor } from '../types';

describe('the canonical repository store', () => {
  let context: TestContext;
  let store: RepositoryWorkflowStore<'fee_schedule'>;
  let accountant: WorkflowActor;
  let registrar: WorkflowActor;
  const at = '2026-10-22T09:00:00.000Z';

  beforeAll(async () => {
    context = await createTestContext();
    store = createRepositoryWorkflowStore(
      context.repository,
      { entity: 'fee_schedule', state_field: 'status', workflow_key: FEE_SCHEDULE_APPROVAL_KEY },
      feeScheduleApproval
    );
    const userId = seededId(context, 'user');
    accountant = { id: userId, roles: ['accountant'] };
    registrar = { id: userId, roles: ['registrar'] };
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  /** A fresh draft schedule, named apart so the institution-wide unique key holds. */
  async function draft(name: string): Promise<Id<'fee_schedule'>> {
    const row = await context.repository.create(
      'fee_schedule',
      fixtureInput(context, 'fee_schedule', { name, status: 'draft' })
    );
    return row.id;
  }

  async function status(id: Id<'fee_schedule'>): Promise<string> {
    const row = await context.repository.get('fee_schedule', id);
    return row?.status ?? 'missing';
  }

  it('reads the record state off the host row', async () => {
    const id = await draft('Read test');
    const record = await store.read(id);
    expect(record).toMatchObject({
      record_key: id,
      workflow_key: FEE_SCHEDULE_APPROVAL_KEY,
      state: 'draft',
    });
  });

  it('moves the state column and records the transition in the repository audit', async () => {
    const id = await draft('Submit test');
    const moved = await store.apply(feeScheduleApproval, {
      recordKey: id,
      to: 'submitted',
      actor: accountant,
      at,
      reason: 'Term 1 schedule prepared.',
    });

    expect(moved.move?.transition.key).toBe('submit');
    expect(await status(id)).toBe('submitted');

    const audit = await store.readAudit(id);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      from: 'draft',
      to: 'submitted',
      transition: 'submit',
      reason: 'Term 1 schedule prepared.',
      actor_id: accountant.id,
    });
  });

  it('refuses a move the actor may not make and leaves the row alone', async () => {
    const id = await draft('Refused test');
    await expect(
      store.apply(feeScheduleApproval, { recordKey: id, to: 'submitted', actor: registrar, at })
    ).rejects.toThrowError(/may not submit/);
    expect(await status(id)).toBe('draft');
    expect(await store.readAudit(id)).toHaveLength(0);
  });

  it('refuses a reasoned move that carries no reason', async () => {
    const id = await draft('Reasoned test');
    await store.apply(feeScheduleApproval, { recordKey: id, to: 'submitted', actor: accountant, at });

    await expect(
      store.apply(feeScheduleApproval, { recordKey: id, to: 'draft', actor: accountant, at })
    ).rejects.toThrowError(/needs a reason/);
    expect(await status(id)).toBe('submitted');
  });

  it('approves and publishes, labelling each transition from the definition', async () => {
    const id = await draft('Approved test');
    await store.apply(feeScheduleApproval, { recordKey: id, to: 'submitted', actor: accountant, at });
    await store.apply(feeScheduleApproval, { recordKey: id, to: 'approved', actor: accountant, at });

    expect(await status(id)).toBe('approved');

    const audit = await store.readAudit(id);
    expect(audit.map((entry) => entry.transition)).toEqual(['submit', 'approve']);
    expect(audit.map((entry) => entry.to)).toEqual(['submitted', 'approved']);
  });

  it('reads the transitions of the entity when no record is named', async () => {
    const all = await store.readAudit();
    expect(all.length).toBeGreaterThan(0);
    for (const entry of all) {
      expect(entry.workflow_key).toBe(FEE_SCHEDULE_APPROVAL_KEY);
      expect(entry.from).not.toBeNull();
    }
  });
});
