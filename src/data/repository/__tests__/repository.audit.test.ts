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
import { Repository } from '../repository';

describe('repository audit trail', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('starts its commit sequence where the audit trail already is', async () => {
    // Something other than the repository can write the trail (the repair tool numbers its own
    // events from the table), so a fresh repository over the same database must not restart the
    // counter at zero and hand out a sequence another event already carries.
    const other = await createTestContext();
    await other.repository.create(
      'comment_bank_entry',
      fixtureInput(other, 'comment_bank_entry', { text: 'Written elsewhere.' })
    );
    await other.adapter.exec('UPDATE "audit_event" SET "commit_sequence" = 5000');

    const repository = new Repository({ adapter: other.adapter });
    await repository.setup();

    expect(repository.currentCommitSequence).toBe(5000);
    const created = await repository.create(
      'comment_bank_entry',
      fixtureInput(other, 'comment_bank_entry', { text: 'After the reseed.' })
    );
    expect(repository.currentCommitSequence).toBeGreaterThan(5000);
    const trail = await repository.auditTrail('comment_bank_entry', created.id);
    expect(trail[0]?.commitSequence).toBeGreaterThan(5000);
    await closeTestContext(other);
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
