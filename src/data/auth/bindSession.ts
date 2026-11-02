// ABOUTME: Binds the permission authority to the login the app just signed in, and clears it at sign-out.
// ABOUTME: The login and the canonical user are separate rows; the username is the link, and the scope
// ABOUTME: is read from the rows the canonical user actually holds.

import { openCanonicalRepository } from '@/data/canonicalRepository';
import { MAX_LIMIT } from '@/data/repository';
import { resolveNamedCanonicalActor, type SessionIdentity } from '@/data/sessionActor';
import { logger } from '@/utils/logging';

import { resolvePermissionContext } from './authorizer';
import { canonicalRolesFor, isKnownLegacyRole } from './legacyRoles';
import { bindSessionAuthority, clearSessionAuthority } from './sessionAuthority';

/** What the signed-in login says about itself. */
export interface BoundLogin extends SessionIdentity {
  /** The modules the legacy login may reach, or `['*']` for a superuser. */
  readonly moduleAccess?: readonly string[] | null;
}

/**
 * Binds the authority to a login, or clears it when nobody is signed in.
 *
 * The login's own id is a UUIDv4 and is never a canonical id, so the canonical `user` row with the
 * same username is what the scope resolves against. A login with no canonical row still binds: its
 * roles apply and its scope reaches nothing, which is the same reach it has today. A login whose
 * role the catalogue does not know binds with no roles, so it reads and cannot write - the school
 * sees the refusal and the log names the role.
 */
export async function bindAuthorityForSession(session: BoundLogin | null): Promise<void> {
  if (!session?.actorId) {
    clearSessionAuthority();
    return;
  }

  try {
    const repository = await openCanonicalRepository();
    const users = await repository.list('user', { limit: MAX_LIMIT });
    const canonical = resolveNamedCanonicalActor(users.items, session);
    const roles = canonicalRolesFor(session.role, session.moduleAccess);

    if (session.role && !isKnownLegacyRole(session.role) && !session.moduleAccess?.includes('*')) {
      logger.warn(
        `[permissions] the login role "${session.role}" has no canonical role: the session may read and may not write`
      );
    }

    const context = await resolvePermissionContext({
      actorId: canonical?.id ?? session.actorId,
      roles,
      reader: repository,
    });
    bindSessionAuthority(context);
  } catch (error) {
    // A session that cannot be resolved is not trusted: writes are refused until the next sign-in
    // rather than run unchecked. The failure is logged with the login so it can be fixed.
    logger.error('[permissions] could not resolve the signed-in actor; writes are refused:', error);
    clearSessionAuthority();
  }
}
