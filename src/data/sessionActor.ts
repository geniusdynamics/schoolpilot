// ABOUTME: Resolves the canonical `user` a page's writes act as, from the signed-in login.
// ABOUTME: The login and the canonical user are separate rows; the username links them, so a canonical
// ABOUTME: write that names an actor by a `user` reference names a row that exists.

import type { RepositoryRow } from '@/data/repository';

/** What the app shell knows about the signed-in login. */
export interface SessionIdentity {
  /** The legacy login's id. It is a UUIDv4 and is never a canonical id. */
  readonly actorId: string;
  readonly username: string | null;
  readonly role: string | null;
}

/**
 * The canonical user the session acts as, or null when the school has none.
 *
 * The platform's login lives in the legacy `users` collection and the canonical model keeps its own
 * `user` entity; the setup wizard creates both and links them by the username they share. A
 * canonical write that names an actor — a published report card's `published_by`, a promotion
 * decision's `decided_by`, the audit columns of any write made for a named actor — has to reference
 * that entity, and the canonical model stores UUIDv7 ids while the login's id is a UUIDv4, so the
 * login id can never be written into one.
 *
 * The username is the link. A school with exactly one canonical user resolves to it even when the
 * names differ (a renamed login), so the school is never left without an actor it can write under.
 */
export function resolveCanonicalActor(
  users: readonly RepositoryRow<'user'>[],
  session: SessionIdentity
): RepositoryRow<'user'> | null {
  const username = session.username?.trim().toLowerCase();
  if (username) {
    const matched = users.find((row) => row.username.trim().toLowerCase() === username);
    if (matched) return matched;
  }
  return users.length === 1 ? users[0] : null;
}

/**
 * The canonical user a login names, by username alone.
 *
 * Unlike {@link resolveCanonicalActor} this never falls back to the school's only canonical user.
 * A page resolves its teaching scope through this: the fallback is right for a write that needs *an*
 * actor, but for a scope it would hand one person another person's groups. A login with no canonical
 * row of its own resolves to none, and the scope then reaches nothing rather than someone else's work.
 */
export function resolveNamedCanonicalActor(
  users: readonly RepositoryRow<'user'>[],
  session: SessionIdentity
): RepositoryRow<'user'> | null {
  const username = session.username?.trim().toLowerCase();
  if (!username) return null;
  return users.find((row) => row.username.trim().toLowerCase() === username) ?? null;
}
