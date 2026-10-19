// ABOUTME: Integration tests for the repository validation path: the entity's own schema decides,
// ABOUTME: the field paths line up with the schema, and the form reaches the same verdict.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { validateEntityForm } from '@/components/ui/forms/validation';

import {
  createSchemaFor,
  entitySchema,
  isServerOwnedField,
  toWritableValues,
  updateSchemaFor,
  type RepositoryValidationError,
} from '..';
import {
  closeTestContext,
  createTestContext,
  fixtureInput,
  type TestContext,
} from './helpers';

describe('repository validation', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('rejects a payload that breaks the entity schema', async () => {
    const input = {
      ...fixtureInput(context, 'invoice', {
        number: 'INV/2027/T1/900001',
        total: { amount_minor: 600000, currency: 'KES' },
      }),
      total: { amount_minor: 'six hundred thousand', currency: 'KES' },
    };

    const error = await context.repository
      .create('invoice', input as never)
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryValidationError);

    expect(error?.code).toBe('validation');
    expect(error?.issues.map((issue) => issue.path)).toContain('total.amount_minor');
  });

  it('addresses a nested list field by its index', async () => {
    const input = {
      ...fixtureInput(context, 'learner', { admission_number: 'GA/2027/901' }),
      phones: [{ number: '0711000000', label: 'parent' }],
    };

    const error = await context.repository
      .create('learner', input as never)
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryValidationError);

    expect(error?.issues.map((issue) => issue.path)).toContain('phones.0.number');
  });

  it('reports an unknown key with its own path', async () => {
    const input = {
      ...fixtureInput(context, 'comment_bank_entry'),
      nickname: 'not part of the schema',
    };

    const error = await context.repository
      .create('comment_bank_entry', input as never)
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryValidationError);

    expect(error?.issues.map((issue) => issue.path)).toContain('nickname');
  });

  it('rejects a payload that tries to set a server-owned field', async () => {
    const input = {
      ...fixtureInput(context, 'comment_bank_entry'),
      id: '01930000-0000-7000-8000-0000000000bb',
    };

    const error = await context.repository
      .create('comment_bank_entry', input as never)
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryValidationError);

    expect(error?.code).toBe('validation');
    expect(error?.issues.map((issue) => issue.path)).toContain('id');
  });

  it('rejects a patch that tries to set a server-owned field', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'A remark.' })
    );

    const error = await context.repository
      .update('comment_bank_entry', created.id, { created_at: '2020-01-01T00:00:00Z' } as never, {
        expectedVersion: created.rowVersion,
      })
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryValidationError);

    expect(error?.code).toBe('validation');
    expect(error?.issues.map((issue) => issue.path)).toContain('created_at');
  });

  it('reaches the same verdict as the schema-bound form', async () => {
    const input = {
      ...fixtureInput(context, 'invoice', {
        number: 'INV/2027/T1/900002',
        total: { amount_minor: 600000, currency: 'KES' },
      }),
      total: { amount_minor: 'not a number', currency: 'KES' },
    };

    // The create form binds to the derived create schema, the repository validates the
    // assembled row with the entity's own schema. Both must reach the same verdict.
    const form = validateEntityForm(createSchemaFor('invoice'), input, ['total']);
    const error = await context.repository
      .create('invoice', input as never)
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryValidationError);

    expect(form.success).toBe(false);
    expect(error).not.toBeNull();
    expect(Object.keys(form.fieldErrors)).toEqual(['total']);
    expect(error?.issues.map((issue) => issue.path)).toContain('total.amount_minor');
  });

  it('derives the create and update shapes from the entity schema', () => {
    const createShape = createSchemaFor('learner');
    const updateShape = updateSchemaFor('learner');

    for (const field of ['id', 'created_at', 'updated_at', 'created_by', 'deleted_at']) {
      expect(isServerOwnedField(field)).toBe(true);
      expect(Object.keys(createShape.shape)).not.toContain(field);
      expect(Object.keys(updateShape.shape)).not.toContain(field);
    }

    // The writable fields stay, so a form can still collect them.
    expect(Object.keys(createShape.shape)).toContain('admission_number');
    expect(Object.keys(updateShape.shape)).toContain('family_name');
  });

  it('strips a stored row down to the values a form may submit', async () => {
    const created = await context.repository.create(
      'learner',
      fixtureInput(context, 'learner', { admission_number: 'GA/2027/930' })
    );

    // A row that comes back from the repository no longer matches its own schema: the
    // repository added rowVersion, and the schema is strict.
    const strict = entitySchema('learner').safeParse(created);
    expect(strict.success).toBe(false);

    const values = toWritableValues(created);

    for (const field of [
      'id',
      'created_at',
      'updated_at',
      'created_by',
      'updated_by',
      'deleted_at',
      'rowVersion',
    ]) {
      expect(Object.keys(values), field).not.toContain(field);
    }

    // The stripped values satisfy both derived shapes, so a form can bind them.
    expect(updateSchemaFor('learner').safeParse(values).success).toBe(true);
    expect(createSchemaFor('learner').safeParse(values).success).toBe(true);
  });

  it('accepts the writable values of a row as a patch', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Seeded from a form.' })
    );

    const values = toWritableValues(created);
    const updated = await context.repository.update(
      'comment_bank_entry',
      created.id,
      { ...values, text: 'Edited from a form.' },
      { expectedVersion: created.rowVersion }
    );

    expect(updated.text).toBe('Edited from a form.');
  });
});
