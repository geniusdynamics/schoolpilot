// ABOUTME: The signed-in login resolved to the canonical `user` its canonical writes and its teaching
// ABOUTME: scope act as. A page resolves scope and actor through this, never through the login's own id.

import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { openCanonicalRepository, useCanonicalRepository } from '@/data/canonicalRepository';
import { useEntityQuery } from '@/data/query';
import { MAX_LIMIT } from '@/data/repository';
import {
  resolveCanonicalPerson,
  resolveNamedCanonicalActor,
  type CanonicalPersonLabel,
  type SessionIdentity,
} from '@/data/sessionActor';

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

/**
 * The signed-in person as the app shell shows them.
 *
 * The header sits outside every page's canonical provider, so this opens the shared canonical
 * repository itself. It resolves the login to its canonical `user` by username and reads the staff
 * or learner row behind it; no canonical user leaves the header with the login's own legacy text.
 */
export function useCanonicalPerson(): CanonicalPersonLabel | null {
  const session = useLoginSession();
  const username = session.username;
  const role = session.role;
  const [person, setPerson] = useState<CanonicalPersonLabel | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!username) {
      setPerson(null);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      try {
        const repository = await openCanonicalRepository();
        const users = await repository.list('user', { limit: MAX_LIMIT });
        const user = resolveNamedCanonicalActor(users.items, {
          actorId: '',
          username,
          role,
        });
        if (user === null) {
          if (!cancelled) setPerson(null);
          return;
        }
        const reference = user.person_ref;
        const staff =
          reference?.type === 'staff'
            ? (
                await repository.list('staff', {
                  where: { id: reference.id },
                  limit: 1,
                })
              ).items[0] ?? null
            : null;
        const learner =
          reference?.type === 'learner'
            ? (
                await repository.list('learner', {
                  where: { id: reference.id },
                  limit: 1,
                })
              ).items[0] ?? null
            : null;
        const jobTitle =
          staff?.job_title_id === undefined
            ? null
            : (
                await repository.list('job_title', {
                  where: { id: staff.job_title_id },
                  limit: 1,
                })
              ).items[0] ?? null;
        if (!cancelled) {
          setPerson(resolveCanonicalPerson(user, { staff, learner, jobTitle }, role));
        }
      } catch {
        // The header must still render when the canonical layer is unavailable.
        if (!cancelled) setPerson(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, role]);

  return person;
}
