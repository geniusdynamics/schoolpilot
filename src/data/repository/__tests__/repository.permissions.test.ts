// ABOUTME: Integration tests for the authorisation hook: a denied action raises a typed
// ABOUTME: permission error and leaves the database untouched.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createRepository, type Repository, type RepositoryPermissionError } from '..';
import {
  closeTestContext,
  createTestContext,
  fixtureInput,
  seededId,
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

  describe('the removal', () => {
    it('denies a removal the hook refuses', async () => {
      const guarded = createRepository({
        adapter: context.adapter,
        actor: TEST_ACTOR,
        authorize: (request) => {
          if (request.action === 'remove') {
            throw new Error('the actor may not remove a row');
          }
        },
      });

      const error = await guarded
        .remove('comment_bank_entry', seededId(context, 'comment_bank_entry'))
        .then(() => null)
        .catch((caught: unknown) => caught as RepositoryPermissionError);

      expect(error?.code).toBe('permission');
      expect(error?.action).toBe('remove');
      expect(error?.entity).toBe('comment_bank_entry');
    });

    it('leaves the row in the database when a removal is denied', async () => {
      const guarded = createRepository({
        adapter: context.adapter,
        actor: TEST_ACTOR,
        authorize: (request) => {
          if (request.action === 'remove') {
            throw new Error('the actor may not remove a row');
          }
        },
      });

      await guarded
        .remove('comment_bank_entry', seededId(context, 'comment_bank_entry'))
        .catch(() => undefined);

      // The row is still there, and it is not archived.
      const stored = await context.repository.get(
        'comment_bank_entry',
        seededId(context, 'comment_bank_entry')
      );
      expect(stored).not.toBeNull();
      expect(stored?.deleted_at).toBeNull();

      const page = await context.repository.list('comment_bank_entry', {
        where: { id: seededId(context, 'comment_bank_entry') },
      });
      expect(page.total).toBe(1);
    });

    it('passes the row to the hook, so a scope can be judged against it', async () => {
      const seen: Array<{ action: string; entity: string; hasRow: boolean }> = [];
      const guarded = createRepository({
        adapter: context.adapter,
        actor: TEST_ACTOR,
        authorize: (request) => {
          seen.push({
            action: request.action,
            entity: request.entity,
            hasRow: request.row !== undefined,
          });
        },
      });

      await guarded.remove('comment_bank_entry', seededId(context, 'comment_bank_entry'));

      const removal = seen.find((entry) => entry.action === 'remove');
      expect(removal?.entity).toBe('comment_bank_entry');
      expect(removal?.hasRow).toBe(true);
    });

    it('removes the row when the hook allows it', async () => {
      const permissive = createRepository({
        adapter: context.adapter,
        actor: TEST_ACTOR,
        authorize: () => undefined,
      });

      const created = await permissive.create(
        'comment_bank_entry',
        fixtureInput(context, 'comment_bank_entry', { text: 'Removable.' })
      );

      const removed = await permissive.remove('comment_bank_entry', created.id);

      expect(removed.deleted_at).toBeTruthy();
      expect(await context.repository.get('comment_bank_entry', created.id)).toBeNull();
    });
  });

  it('denies an audit trail the hook refuses', async () => {
    const guarded = createRepository({
      adapter: context.adapter,
      actor: TEST_ACTOR,
      authorize: (request) => {
        if (request.action === 'audit') {
          throw new Error('the actor may not read the audit trail');
        }
      },
    });

    const error = await guarded
      .auditLog()
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryPermissionError);

    expect(error?.code).toBe('permission');
    expect(error?.action).toBe('audit');
  });
});
