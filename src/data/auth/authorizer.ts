// ABOUTME: The permission context of an actor and the authorizer that judges a repository action
// ABOUTME: against it: the role's permissions first, then the scope the data resolves to.

import {
  RepositoryPermissionError,
  type AuthorizationRequest,
  type Authorizer,
} from '@/data/repository';
import type { EntityName } from '@/domain/schema';

import { hasPermission, permissionFor, type Role } from './roles';
import { coversRow, resolveScope, type PermissionScope, type ScopeReader } from './scope';

/** Why an action was denied. */
export type PermissionDenialReason = 'no_context' | 'permission' | 'scope';

/**
 * The denial the repository raises.
 *
 * It is a {@link RepositoryPermissionError}, so the repository passes it through unchanged, and it
 * adds the reason: `permission` when the actor's roles do not hold the permission, `scope` when
 * the row is outside the actor's scope.
 */
export class ScopePermissionError extends RepositoryPermissionError {
  readonly reason: PermissionDenialReason;
  /** The detail a reader of the log needs: which role, which permission, which scope. */
  readonly detail: string;

  constructor(
    entity: EntityName,
    action: string,
    reason: PermissionDenialReason,
    detail: string
  ) {
    super(entity, action);
    this.name = 'ScopePermissionError';
    this.reason = reason;
    this.detail = detail;
    this.message = `Not allowed to ${action} ${entity}: ${detail}`;
  }
}

/**
 * Everything the authorizer knows about the actor.
 *
 * The roles come from the caller's session (the platform entities of spec 02 §11 will hold them
 * once they are modelled); the scope is resolved from the data the actor actually holds.
 */
export interface PermissionContext {
  /** The acting user. */
  readonly actorId: string;
  /** The roles the actor holds. */
  readonly roles: readonly Role[];
  /** The scope resolved from the data at `at`. */
  readonly scope: PermissionScope;
  /** The date the scope was resolved for. */
  readonly at: string;
}

/** What the resolution needs to know about the actor. */
export interface ResolvePermissionContextOptions {
  readonly actorId: string;
  readonly roles: readonly Role[];
  /** The reader the scope is resolved from. */
  readonly reader: ScopeReader;
  /** The date the scope is effective at. Defaults to today. */
  readonly at?: string;
}

/**
 * Resolves the permission context of an actor.
 *
 * The scope is read from the real data: the teaching assignments of the actor's staff record, the
 * class groups that name the actor as homeroom teacher, and the actor's user row. An actor
 * without an active user row resolves to an empty scope, so every action is denied.
 */
export async function resolvePermissionContext(
  options: ResolvePermissionContextOptions
): Promise<PermissionContext> {
  const at = (options.at ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
  const scope = await resolveScope({
    actorId: options.actorId,
    roles: options.roles,
    reader: options.reader,
    at,
  });
  return { actorId: options.actorId, roles: options.roles, scope, at };
}

/**
 * The authorizer of the repository's `authorize` hook.
 *
 * It answers two questions, in order: does one of the actor's roles hold the permission the
 * action needs, and is the row inside the actor's scope. A denial raises a
 * {@link ScopePermissionError}, which the repository passes through as a permission error.
 *
 * Without a context the authorizer denies everything: an actor that was never resolved is never
 * allowed by default.
 */
export function createAuthorizer(context: PermissionContext | undefined): Authorizer {
  return (request: AuthorizationRequest): void => {
    if (!context) {
      throw new ScopePermissionError(
        request.entity,
        request.action,
        'no_context',
        'the actor has no permission context'
      );
    }

    const permission = permissionFor(request.entity, request.action);
    if (!permission) {
      throw new ScopePermissionError(
        request.entity,
        request.action,
        'permission',
        `no permission covers ${request.entity}`
      );
    }

    if (!hasPermission(context.roles, permission)) {
      throw new ScopePermissionError(
        request.entity,
        request.action,
        'permission',
        `the roles [${context.roles.join(', ')}] do not hold ${permission}`
      );
    }

    if (request.row && !coversRow(context.scope, request.entity, request.row)) {
      throw new ScopePermissionError(
        request.entity,
        request.action,
        'scope',
        `the row is outside the scope of the roles [${context.roles.join(', ')}]`
      );
    }
  };
}
