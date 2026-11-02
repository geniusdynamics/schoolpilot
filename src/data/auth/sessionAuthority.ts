// ABOUTME: Holds who the browser is acting as and judges the repository's writes against that actor:
// ABOUTME: one delegating authorizer installed on the shared repository, rebound at sign-in and cleared at sign-out.

import type { AuthorizationRequest, Authorizer, RepositoryAction } from '@/data/repository';
import type { EntityName } from '@/domain/schema';

import { createAuthorizer, ScopePermissionError, type PermissionContext } from './authorizer';
import { hasPermission, type Permission, type Role } from './roles';

/**
 * Who the browser is acting as.
 *
 * - `boot` is before anyone signs in: the setup wizard and the demo seed write here, so writes are
 *   allowed. It is also the phase every page test starts in, which is why a page test does not have
 *   to know about permissions.
 * - `bound` is a signed-in actor, and every write is judged by that actor's roles and scope.
 * - `signed_out` is after a sign-out: nothing writes until someone signs in again, so a page left
 *   open on the login screen cannot be used as a way into the database.
 * - `system` is an explicit, short-lived claim for a writer that acts for nobody - a restore, a
 *   migration, the demo seed triggered from the settings page. It is opened by {@link runAsSystem}
 *   and closed again when that work returns.
 */
export type AuthorityPhase = 'boot' | 'bound' | 'signed_out' | 'system';

/** The actions that do not write. Reads stay open until the model can scope them. */
const READ_ACTIONS: readonly RepositoryAction[] = ['read', 'list', 'watch', 'audit'];

interface AuthorityState {
  phase: AuthorityPhase;
  context: PermissionContext | null;
  /** The authorizer of the current context, rebuilt when the context is bound. */
  judge: Authorizer | null;
  /** Bumped on every change, so a React subscriber can tell that something moved. */
  version: number;
}

const state: AuthorityState = { phase: 'boot', context: null, judge: null, version: 0 };

/** The stable empty role list, so a subscriber that reads it does not see a new array each call. */
const NO_ROLES: readonly Role[] = [];

const listeners = new Set<() => void>();

function announce(): void {
  state.version += 1;
  for (const listener of listeners) listener();
}

/**
 * The repository's `authorize` hook.
 *
 * One hook is installed when the shared repository is created and it reads the current actor on
 * every call, so signing in does not have to rebuild the repository, and no watcher or cached
 * service keeps acting for the actor that has gone.
 */
export const sessionAuthorizer: Authorizer = (request: AuthorizationRequest): void => {
  // A read is not judged yet: the scope model has no row for a read to be checked against, and
  // refusing reads by permission would empty the pages of every role that is not an administrator.
  // Writes are judged, and a write is what the walkthrough showed a teacher doing.
  if (READ_ACTIONS.includes(request.action)) return;

  switch (state.phase) {
    case 'boot':
    case 'system':
      return;
    case 'signed_out':
      throw new ScopePermissionError(
        request.entity,
        request.action,
        'no_context',
        'nobody is signed in'
      );
    case 'bound':
      // `judge` is set with the context; the branch below keeps the compiler honest about it.
      if (!state.judge) {
        throw new ScopePermissionError(
          request.entity,
          request.action,
          'no_context',
          'the signed-in actor has no permission context'
        );
      }
      state.judge(request);
  }
};

/** Binds the signed-in actor: every write from now on is judged by these roles and this scope. */
export function bindSessionAuthority(context: PermissionContext): void {
  state.context = context;
  state.judge = createAuthorizer(context);
  state.phase = 'bound';
  announce();
}

/** Clears the actor at sign-out: nothing writes until the next sign-in. */
export function clearSessionAuthority(): void {
  state.context = null;
  state.judge = null;
  state.phase = 'signed_out';
  announce();
}

/**
 * Runs a writer that acts for nobody, and restores the previous phase afterwards.
 *
 * The demo seed, the setup wizard and a restore write rows that no person is behind. They run as
 * the system, and only for the length of the call, so an actor signed in elsewhere in the tab is
 * judged normally before and after it.
 */
export async function runAsSystem<T>(work: () => Promise<T>): Promise<T> {
  const previous = state.phase;
  state.phase = 'system';
  announce();
  try {
    return await work();
  } finally {
    state.phase = previous;
    announce();
  }
}

/** The actor the browser is acting as, for a page that needs the id. */
export function currentAuthority(): PermissionContext | null {
  return state.context;
}

export function currentAuthorityPhase(): AuthorityPhase {
  return state.phase;
}

/** The roles of the signed-in actor. Empty before sign-in and after sign-out. */
export function currentRoles(): readonly Role[] {
  return state.context?.roles ?? NO_ROLES;
}

/**
 * Whether the signed-in actor holds a permission, for a page deciding what to offer.
 *
 * Before sign-in this is true: nobody has said who the actor is, and a page rendered outside the
 * app shell (a test, a print layout) must not hide its own controls. After sign-out it is false.
 */
export function can(permission: Permission): boolean {
  if (state.phase === 'boot' || state.phase === 'system') return true;
  if (state.phase === 'signed_out') return false;
  return hasPermission(currentRoles(), permission);
}

/**
 * The guard a service that writes on its own connection consults before it does.
 *
 * The posting engine, the document-number sequences and the cashier sessions write through the
 * adapter rather than the repository, so the repository's hook never sees them. A service method
 * calls this first, naming the entity and action its write would have carried, and it raises the
 * same denial a judged repository write would.
 */
export function assertCan(entity: EntityName, action: string, permission: Permission): void {
  if (can(permission)) return;
  throw new ScopePermissionError(
    entity,
    action,
    'permission',
    `the roles [${currentRoles().join(', ') || 'none'}] do not hold ${permission}`
  );
}

/** Subscribes to a change of actor, for a page that shows or hides a control. Returns the unsubscribe. */
export function subscribeAuthority(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The version of the actor state, so a subscriber can tell that it changed. */
export function authorityVersion(): number {
  return state.version;
}
