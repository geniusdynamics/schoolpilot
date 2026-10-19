// ABOUTME: Integration tests for the authorisation hook: a denied action raises a typed
// ABOUTME: permission error and leaves the database untouched.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createRepository, type Repository, type RepositoryPermissionError } from '..';
import {
  closeTestContext,
  createTestContext,
  fixtureInput,
  TEST_ACTOR,
  type TestContext,
} from './helpers';

describe('repository permissions', () => {
  let context: TestContext;
  let repository: Repository;

  beforeAll(async () => {
    context = await createTestContext();

    // A second repository over the same database, with a hook that refuses one action.
    repository = createRepository({
      adapter: context.adapter,
      actor: TEST_ACTOR,
      authorize: (request) => {
        if (request.action === 'create' && request.entity === 'learner') {
          throw new Error('the school may not enrol a learner');
        }
      },
    });
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('denies an action the hook refuses', async () => {
    const error = await repository
      .create('learner', fixtureInput(context, 'learner', { admission_number: 'GA/2027/920' }))
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryPermissionError);

    expect(error?.code).toBe('permission');
    expect(error?.action).toBe('create');
    expect(error?.entity).toBe('learner');
  });

  it('leaves the database untouched when an action is denied', async () => {
    await repository
      .create('learner', fixtureInput(context, 'learner', { admission_number: 'GA/2027/921' }))
      .catch(() => undefined);

    const page = await repository.list('learner', {
      where: { admission_number: 'GA/2027/921' },
    });
    expect(page.total).toBe(0);
  });

  it('allows the actions the hook does not refuse', async () => {
    const created = await repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Allowed.' })
    );
    expect(created.id).toBeTruthy();
  });
});
