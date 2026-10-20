// ABOUTME: Integration tests for the repository read and write paths against a real SQLite
// ABOUTME: database: create, get, list, update, soft delete and the row mapping round trip.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { asId, isId } from '@/domain/ids';
import { ENTITY_NAMES } from '@/domain/schema';

import {
  closeTestContext,
  createTestContext,
  fixtureInput,
  SEED_ORDER,
  TEST_ACTOR,
  type TestContext,
} from './helpers';

describe('repository CRUD', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('seeds every registered entity', () => {
    expect([...SEED_ORDER].sort()).toEqual([...ENTITY_NAMES].sort());
  });

  it('creates a row and reads it back with every field type intact', async () => {
    const created = await context.repository.create(
      'learner',
      fixtureInput(context, 'learner', { admission_number: 'GA/2027/900' })
    );

    const stored = await context.repository.get('learner', created.id);

    expect(stored).not.toBeNull();
    expect(stored?.given_name).toBe('Amani');
    expect(stored?.family_name).toBe('Wekesa');
    // Money, phones, emails, addresses and free-form attributes are JSON columns.
    expect(stored?.phones).toEqual([{ number: '+254711000000', label: 'parent' }]);
    expect(stored?.emails).toEqual([{ address: 'amani@example.test' }]);
    expect(stored?.address).toEqual({ city: 'Nairobi', country: 'KE' });
    expect(stored?.attributes).toEqual({ 'ke.kemis_upi': 'UPI-1' });
    expect(stored?.medical).toEqual({ allergies: ['penicillin'] });
    // Plain arrays stay arrays, dates stay calendar dates.
    expect(stored?.languages).toEqual(['en', 'sw']);
    expect(stored?.date_of_birth).toBe('2014-06-01');
    // Ids are opaque strings.
    expect(typeof stored?.id).toBe('string');
    expect(isId(stored?.id)).toBe(true);
  });

  it('stamps the server-owned fields on a created row', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry')
    );

    const stored = await context.repository.get('comment_bank_entry', created.id);
    expect(stored?.created_by).toBe(TEST_ACTOR);
    expect(stored?.updated_by).toBe(TEST_ACTOR);
    expect(stored?.created_at).toBeTruthy();
    expect(stored?.updated_at).toBeTruthy();
    expect(stored?.rowVersion).toBe(1);
  });

  it('returns null for an id that was never stored', async () => {
    const missing = asId<'comment_bank_entry'>('01930000-0000-7000-8000-0000000000ff');
    expect(await context.repository.get('comment_bank_entry', missing)).toBeNull();
  });

  it('rejects an id that is not a uuid', async () => {
    await expect(
      context.repository.get('comment_bank_entry', asId<'comment_bank_entry'>('not-an-id'))
    ).rejects.toMatchObject({ code: 'validation' });
  });

  it('lists rows with a filter, a sort and a page', async () => {
    const page = await context.repository.list('learner', {
      where: { institution_id: fixtureInput(context, 'learner').institution_id },
      orderBy: [{ field: 'admission_number', direction: 'asc' }],
      limit: 1,
    });

    expect(page.items).toHaveLength(1);
    expect(page.total).toBeGreaterThanOrEqual(1);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBeTruthy();

    const next = await context.repository.list('learner', {
      where: { institution_id: fixtureInput(context, 'learner').institution_id },
      orderBy: [{ field: 'admission_number', direction: 'asc' }],
      limit: 1,
      cursor: page.nextCursor,
    });

    expect(next.items[0]?.id).not.toBe(page.items[0]?.id);
  });

  it('applies a partial patch and leaves the other fields alone', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Shows steady improvement.' })
    );

    const updated = await context.repository.update(
      'comment_bank_entry',
      created.id,
      { text: 'Shows marked improvement.' },
      { expectedVersion: created.rowVersion }
    );

    expect(updated.text).toBe('Shows marked improvement.');
    expect(updated.locale).toBe('en-KE');
    expect(updated.scope).toBe('learning_area');
    expect(updated.rowVersion).toBe(created.rowVersion + 1);

    const stored = await context.repository.get('comment_bank_entry', created.id);
    expect(stored?.text).toBe('Shows marked improvement.');
    expect(stored?.rowVersion).toBe(created.rowVersion + 1);
  });

  it('soft deletes a row and hides it from the default reads', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'To be removed.' })
    );

    const removed = await context.repository.remove('comment_bank_entry', created.id);

    expect(removed.deleted_at).toBeTruthy();
    expect(await context.repository.get('comment_bank_entry', created.id)).toBeNull();
    expect(
      await context.repository.list('comment_bank_entry', {
        where: { id: created.id },
      })
    ).toMatchObject({ total: 0 });

    const archived = await context.repository.get('comment_bank_entry', created.id, {
      includeDeleted: true,
    });
    expect(archived?.deleted_at).toBeTruthy();

    const withDeleted = await context.repository.list('comment_bank_entry', {
      where: { id: created.id },
      includeDeleted: true,
    });
    expect(withDeleted.total).toBe(1);
  });

  it('keeps a nullable field null and an absent field absent', async () => {
    const created = await context.repository.create(
      'enrolment_change',
      fixtureInput(context, 'enrolment_change')
    );

    const stored = await context.repository.get('enrolment_change', created.id);
    expect(stored?.approved_by).toBeTruthy();
    expect(stored?.deleted_at).toBeNull();
  });

  it('filters with operators and refuses an unknown column', async () => {
    const matching = await context.repository.list('learner', {
      conditions: { family_name: { startsWith: 'Wek' } },
    });
    expect(matching.total).toBeGreaterThan(0);

    const listed = await context.repository.list('learner', {
      conditions: { admission_number: { in: ['GA/2027/001'] } },
    });
    expect(listed.total).toBe(1);

    const none = await context.repository.list('learner', {
      conditions: { admission_number: { in: [] } },
    });
    expect(none.total).toBe(0);

    await expect(
      context.repository.list('learner', { where: { nickname: 'x' } })
    ).rejects.toMatchObject({ code: 'validation' });
  });

  it('clears a nullish field with null and refuses to clear an optional one', async () => {
    const created = await context.repository.create(
      'enrolment_change',
      fixtureInput(context, 'enrolment_change')
    );

    // `approved_by` is optional but not nullable, so it cannot be cleared.
    const refused = await context.repository
      .update('enrolment_change', created.id, { approved_by: null } as never, {
        expectedVersion: created.rowVersion,
      })
      .then(
        () => null,
        (error: unknown) => error as { code?: string }
      );
    expect(refused?.code).toBe('validation');

    // A `.nullish()` field is cleared with null.
    const learner = await context.repository.create(
      'learner',
      fixtureInput(context, 'learner', { admission_number: 'GA/2027/940' })
    );
    const enrolment = await context.repository.create(
      'enrolment',
      fixtureInput(context, 'enrolment', {
        learner_id: learner.id,
        start_date: '2027-01-05',
        end_date: '2027-11-30',
      })
    );

    const nulled = await context.repository.update(
      'enrolment',
      enrolment.id,
      { end_date: null },
      { expectedVersion: enrolment.rowVersion }
    );
    expect(nulled.end_date).toBeNull();
  });

  it('treats an archived row as gone for a write', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Archived.' })
    );
    await context.repository.remove('comment_bank_entry', created.id);

    await expect(
      context.repository.update(
        'comment_bank_entry',
        created.id,
        { text: 'Edited after the removal.' },
        { expectedVersion: created.rowVersion + 1 }
      )
    ).rejects.toMatchObject({ code: 'not_found' });

    await expect(
      context.repository.remove('comment_bank_entry', created.id)
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});
