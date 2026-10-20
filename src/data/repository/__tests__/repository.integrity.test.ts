// ABOUTME: Integration tests for referential integrity: unique constraints, dangling references
// ABOUTME: and the tenancy rule that a row may only point at rows of its own institution.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { asId } from '@/domain/ids';

import type { RepositoryConflictError, RepositoryInvariantError, RepositoryReferenceError } from '..';
import {
  closeTestContext,
  createTestContext,
  fixtureInput,
  type TestContext,
} from './helpers';

describe('repository referential integrity', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('reports a unique constraint as a conflict with the columns involved', async () => {
    // The seeded learner already holds this admission number for the institution.
    const input = fixtureInput(context, 'learner');

    const error = await context.repository
      .create('learner', input)
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryConflictError);

    expect(error?.code).toBe('conflict');
    expect(error?.reason).toBe('unique');
    expect(error?.columns).toContain('admission_number');
  });

  it('names the relation a dangling reference points at', async () => {
    const input = fixtureInput(context, 'learner', { admission_number: 'GA/2027/903' });
    input.household_id = asId<'household'>('01930000-0000-7000-8000-0000000000c1');

    const error = await context.repository
      .create('learner', input)
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryReferenceError);

    expect(error?.code).toBe('reference');
    expect(error?.relation).toBe('household');
    expect(error?.column).toBe('household_id');
    expect(error?.referencedId).toBe('01930000-0000-7000-8000-0000000000c1');
  });

  it('refuses a reference that points at another institution', async () => {
    const otherInstitution = await context.repository.create(
      'institution',
      fixtureInput(context, 'institution', { name: 'Second School', short_name: 'Second' })
    );

    const otherHouse = await context.repository.create(
      'house',
      fixtureInput(context, 'house', {
        institution_id: otherInstitution.id,
        name: 'Other House',
        patron_staff_id: undefined,
      })
    );

    const input = fixtureInput(context, 'learner', { admission_number: 'GA/2027/904' });
    input.house_id = otherHouse.id;

    const error = await context.repository
      .create('learner', input)
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryInvariantError);

    expect(error?.code).toBe('invariant');
    expect(error?.invariant).toBe('tenancy.institution_scope');
    expect(error?.issues.map((issue) => issue.path)).toContain('house_id');
  });

  it('lets the database reject a dangling reference as well', async () => {
    const [pragma] = await context.adapter.all<{ foreign_keys: number }>('PRAGMA foreign_keys');
    expect(pragma?.foreign_keys).toBe(1);

    await expect(
      context.adapter.run(
        'INSERT INTO "learner_guardian" ("id", "institution_id", "learner_id", "guardian_id", "relationship", "is_primary", "has_parental_responsibility", "is_fee_payer", "can_pick_up", "receives_reports", "receives_sms", "preferred_channel", "created_at", "updated_at") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          '01930000-0000-7000-8000-0000000000c2',
          '01930000-0000-7000-8000-0000000000c3',
          '01930000-0000-7000-8000-0000000000c4',
          '01930000-0000-7000-8000-0000000000c5',
          'mother',
          0,
          0,
          0,
          0,
          0,
          0,
          'sms',
          '2027-01-01T00:00:00Z',
          '2027-01-01T00:00:00Z',
        ]
      )
    ).rejects.toMatchObject({ constraint: 'foreign_key' });
  });
});
