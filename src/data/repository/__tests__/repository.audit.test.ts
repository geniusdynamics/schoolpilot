// ABOUTME: Integration tests for the repository's own audit trail: every mutation records who
// ABOUTME: changed what, and a write that fails leaves no trace behind.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  closeTestContext,
  createTestContext,
  fixtureInput,
  TEST_ACTOR,
  type TestContext,
} from './helpers';

describe('repository audit trail', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('records a create with the actor, the entity, the id and the changed fields', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'An audited remark.' })
    );

    const trail = await context.repository.auditTrail('comment_bank_entry', created.id);

    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({
      entity: 'comment_bank_entry',
      entityId: created.id,
      action: 'create',
      actorId: TEST_ACTOR,
    });
    expect(trail[0]?.changedFields).toContain('text');
    expect(trail[0]?.createdAt).toBeTruthy();
    expect(trail[0]?.before).toBeNull();
    expect(trail[0]?.after).toMatchObject({ text: 'An audited remark.' });
  });

  it('records an update with the fields that changed and the row before it', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Before the change.' })
    );

    await context.repository.update(
      'comment_bank_entry',
      created.id,
      { text: 'After the change.' },
      { expectedVersion: created.rowVersion, reason: 'editorial' }
    );

    const trail = await context.repository.auditTrail('comment_bank_entry', created.id);

    expect(trail).toHaveLength(2);
    const [latest] = trail;
    expect(latest?.action).toBe('update');
    expect(latest?.changedFields).toEqual(['text']);
    expect(latest?.reason).toBe('editorial');
    expect(latest?.before).toMatchObject({ text: 'Before the change.' });
    expect(latest?.after).toMatchObject({ text: 'After the change.' });
  });

  it('records a removal', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'To be removed.' })
    );

    await context.repository.remove('comment_bank_entry', created.id, { reason: 'duplicate' });

    const trail = await context.repository.auditTrail('comment_bank_entry', created.id);
    expect(trail[0]).toMatchObject({ action: 'remove', reason: 'duplicate' });
    expect(trail[0]?.changedFields).toEqual(['deleted_at']);
  });

  it('leaves no audit event behind when the write is rejected', async () => {
    const before = await context.repository.auditLog({ entity: 'comment_bank_entry' });

    await context.repository
      .create('comment_bank_entry', {
        ...fixtureInput(context, 'comment_bank_entry'),
        nickname: 'not part of the schema',
      } as never)
      .catch(() => undefined);

    const after = await context.repository.auditLog({ entity: 'comment_bank_entry' });
    expect(after).toHaveLength(before.length);
  });

  it('reads the trail of a whole entity, newest first', async () => {
    const trail = await context.repository.auditLog({ entity: 'comment_bank_entry', limit: 5 });

    expect(trail.length).toBeGreaterThan(0);
    expect(trail[0]?.createdAt >= trail[trail.length - 1]?.createdAt).toBe(true);
  });
});
