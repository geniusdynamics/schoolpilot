// ABOUTME: Tests for the canonical identity of a login: the `user` row a canonical write names and the
// ABOUTME: `staff` row a teaching scope resolves, created from the login and linked the way the schema
// ABOUTME: intends (staff.user_id -> user, and the user's person_ref back), idempotently.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, type TestContext } from '@/data/__tests__/harness';

import { ensureCanonicalLogin, ensureCanonicalUser, linkCanonicalPersonRef } from '../canonicalIdentity';

let context: TestContext;

beforeEach(async () => {
  context = await createTestContext({ seed: true });
});

afterEach(async () => {
  await context.close();
});

describe('ensureCanonicalUser', () => {
  it('creates one canonical user per username, and reuses the row on a second call', async () => {
    const first = await ensureCanonicalUser(context.repository, {
      username: 'teacher.one',
      passwordHash: 'hash:salt:1',
    });
    const second = await ensureCanonicalUser(context.repository, {
      username: 'teacher.one',
      passwordHash: 'hash:salt:1',
    });

    expect(first).not.toBeNull();
    expect(second?.id).toBe(first!.id);

    const rows = await context.repository.list('user', { where: { username: 'teacher.one' }, limit: 10 });
    expect(rows.items).toHaveLength(1);
  });

  it('creates nothing when the school has no institution to belong to', async () => {
    const empty = await createTestContext({ seed: false });
    try {
      expect(
        await ensureCanonicalUser(empty.repository, { username: 'teacher.two', passwordHash: 'h' })
      ).toBeNull();
    } finally {
      await empty.close();
    }
  });
});

describe('ensureCanonicalLogin', () => {
  it('links the canonical user to a staff record, both ways', async () => {
    const link = await ensureCanonicalLogin(context.repository, {
      username: 'teacher.three',
      displayName: 'Grace Wekesa',
      passwordHash: 'hash:salt:1',
    });

    expect(link).not.toBeNull();
    const user = await context.repository.get('user', link!.userId as never);
    expect(user?.person_ref).toEqual({ type: 'staff', id: link!.staffId });

    const staff = await context.repository.get('staff', link!.staffId as never);
    expect(staff?.user_id).toBe(link!.userId);
    expect(staff?.given_name).toBe('Grace');
    expect(staff?.family_name).toBe('Wekesa');
  });

  it('is idempotent: a second call reuses both rows instead of duplicating them', async () => {
    const first = await ensureCanonicalLogin(context.repository, {
      username: 'teacher.four',
      displayName: 'A B',
      passwordHash: 'h',
    });
    const second = await ensureCanonicalLogin(context.repository, {
      username: 'teacher.four',
      displayName: 'A B',
      passwordHash: 'h',
    });

    expect(second).toEqual(first);
    const users = await context.repository.list('user', { where: { username: 'teacher.four' }, limit: 10 });
    expect(users.items).toHaveLength(1);
    const staff = await context.repository.list('staff', { where: { user_id: first!.userId as never }, limit: 10 });
    expect(staff.items).toHaveLength(1);
  });
});

describe('linkCanonicalPersonRef', () => {
  it('points a canonical user at a staff record, and leaves it alone when it already does', async () => {
    const user = await ensureCanonicalUser(context.repository, { username: 'teacher.five', passwordHash: 'h' });
    const staff = await context.repository.list('staff', { limit: 1 });

    await linkCanonicalPersonRef(context.repository, { userId: user!.id, staffId: staff.items[0].id });
    const linked = await context.repository.get('user', user!.id);
    expect(linked?.person_ref).toEqual({ type: 'staff', id: staff.items[0].id });

    const before = linked!.rowVersion;
    await linkCanonicalPersonRef(context.repository, { userId: user!.id, staffId: staff.items[0].id });
    const after = await context.repository.get('user', user!.id);
    expect(after?.rowVersion).toBe(before);
  });
});
