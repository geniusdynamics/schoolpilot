// ABOUTME: The signed-in login resolved to the canonical `user` its canonical writes and its teaching
// ABOUTME: scope act as. A page resolves scope and actor through this, never through the login's own id.

import { useMemo } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useCanonicalRepository } from '@/data/canonicalRepository';
import { useEntityQuery } from '@/data/query';
import { MAX_LIMIT } from '@/data/repository';
import { resolveNamedCanonicalActor, type SessionIdentity } from '@/data/sessionActor';

/** The session a page reads when it is rendered inside the app shell, or an empty one outside it. */
function useLoginSession(): SessionIdentity {
  try {
    const auth = useAuth();
    return {
      actorId: auth.user?.id ?? '',
      username: auth.user?.username ?? null,
      role: auth.user?.role ?? null,
    };
  } catch {
    return { actorId: '', username: null, role: null };
  }
}

/** What a page acts as: the canonical identity, and the login's own role name. */
export interface CanonicalSessionActor {
  /**
   * The id a canonical write and a teaching scope act under: the canonical `user` row the login
   * resolves to, or the login's own id when the school has no canonical identity for it.
   */
  readonly actorId: string;
  /** The canonical `user` row the login resolves to, or null when the school has none. */
  readonly canonicalUserId: string | null;
  readonly username: string | null;
  readonly role: string | null;
}

/**
 * The canonical identity behind the signed-in login.
 *
 * The login lives in the legacy `users` collection and the canonical model keeps its own `user`
 * entity; the username links them. A staff record's `user_id` references the canonical row, so the
 * teaching scope has to be resolved with the canonical id, not the login's UUIDv4 id, or a teacher
 * with a linked staff record would still reach no group. A login with no canonical row of its own
 * keeps its own id rather than inheriting the school's only canonical user, so one person's scope is
 * never handed to another.
 */
export function useCanonicalSessionActor(): CanonicalSessionActor {
  const session = useLoginSession();
  const repository = useCanonicalRepository();
  const users = useEntityQuery(repository, 'user', { limit: MAX_LIMIT });

  return useMemo(() => {
    const canonical = resolveNamedCanonicalActor(users.data?.items ?? [], session);
    return {
      actorId: canonical?.id ?? session.actorId,
      canonicalUserId: canonical?.id ?? null,
      username: session.username,
      role: session.role,
    };
  }, [users.data, session]);
}
