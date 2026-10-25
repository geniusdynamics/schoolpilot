// ABOUTME: The hub's authorisation layer: it resolves an account's roles from the assignment store,
// ABOUTME: resolves the permission context the client's model defines, and hands the request a
// ABOUTME: scoped repository, so every entity operation is judged the way the browser judges it.

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import {
  createAuthorizer,
  hasPermission,
  resolvePermissionContext,
  ScopedRepository,
  type Permission,
  type PermissionContext,
  type Role,
} from '@/data/auth';
import type { FieldCipher } from '@/data/security';
import { restrictedFieldsIn } from '@/data/security';
import type { Repository, RepositoryAction } from '@/data/repository';
import type { EntityName } from '@/domain/schema';

import type { RestrictedAccessAction, RestrictedAccessLog } from '../../security/restrictedAccessLog';
import type { AuthenticatedActor } from '../service';
import { RbacError } from './errors';
import { RoleAssignmentStore } from './roles';
import { applyRbacSchema } from './tables';

/** What the authorisation layer is built with. */
export interface RbacServiceOptions {
  readonly adapter: SqliteAdapter;
  /**
   * The hub's repository, without an authorizer.
   *
   * It is the privileged reader the scope is resolved from: resolving the scope is a read of the
   * assignment data, and it cannot run through a repository that already denies the actor.
   */
  readonly repository: Repository;
  /** The cipher the hub seals restricted columns with, so a scoped repository reads them. */
  readonly cipher?: FieldCipher;
  /** Records every access to restricted data a scoped repository makes. */
  readonly accessLog?: RestrictedAccessLog;
  readonly now?: () => Date;
}

/** What one request may do: the resolved context and the repository it acts through. */
export interface ActorAccess {
  readonly actorId: string;
  readonly context: PermissionContext;
  /** The repository the actor reads and writes through: the scope and the field policy apply. */
  readonly repository: ScopedRepository;
  /** Refuses the actor when none of its roles holds the permission. */
  assertPermission(permission: Permission): void;
  /**
   * Judges one entity action against the permission and the scope, the way the repository's own
   * hook does, for an operation that does not go through the repository.
   */
  authorize(
    entity: EntityName,
    action: RepositoryAction,
    row?: Readonly<Record<string, unknown>>
  ): void;
}

/** How the actor access is resolved. */
export interface ActorAccessOptions {
  /** The date the scope is effective at. Defaults to today. */
  readonly at?: string;
}

/**
 * The authorisation the hub serves.
 *
 * It owns no permission model of its own. The roles come from `auth_role_assignment`, and every
 * decision is made by the client's own model: `resolvePermissionContext` resolves the scope from
 * the real assignment data, `createAuthorizer` judges a write, `ScopedRepository` judges a read and
 * applies the field policy, and `redactRow` is the same policy the browser applies. The hub's
 * answer to "may this account read this row" is therefore the browser's answer by construction, and
 * the test `server/__tests__/rbac.test.ts` holds the two side by side.
 *
 * Call `setup()` once before serving. Everything else assumes the tables exist.
 */
export class RbacService {
  private readonly adapter: SqliteAdapter;
  private readonly repository: Repository;
  private readonly cipher: FieldCipher | undefined;
  private readonly accessLog: RestrictedAccessLog | undefined;
  private readonly clock: () => Date;
  private readonly assignments: RoleAssignmentStore;

  constructor(options: RbacServiceOptions) {
    this.adapter = options.adapter;
    this.repository = options.repository;
    this.cipher = options.cipher;
    this.accessLog = options.accessLog;
    this.clock = options.now ?? (() => new Date());
    this.assignments = new RoleAssignmentStore(this.adapter, { now: this.clock });
  }

  /**
   * Creates the authorisation tables and, for a hub that predates them, hands the administrator
   * its role. Idempotent, so it runs on every start.
   *
   * Run it after the authentication service's own `setup()`: the backfill reads that service's
   * event log.
   */
  async setup(): Promise<void> {
    await applyRbacSchema(this.adapter);
    await this.backfillFirstAdministrator();
  }

  /**
   * A hub set up before roles existed has accounts and no assignment at all, and since an account
   * that holds no role is denied everything, nobody could sign in and do anything.
   *
   * The audit log names who set the hub up (`administrator_created`), so that account is the
   * administrator. This runs only while the hub holds no assignment whatever: once any exists the
   * operator is managing roles, and a role revoked later must stay revoked.
   */
  private async backfillFirstAdministrator(): Promise<void> {
    const held = await this.adapter.get<{ total: number }>(
      'SELECT COUNT(*) AS total FROM "auth_role_assignment"'
    );
    if (Number(held?.total ?? 0) > 0) return;

    const hasEvents = await this.adapter.get<{ present: number }>(
      `SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'auth_event'`
    );
    if (!hasEvents) return;

    const events = await this.adapter.all<{ actor_id: string }>(
      `SELECT DISTINCT "actor_id" FROM "auth_event"
        WHERE "kind" = 'administrator_created' AND "actor_id" IS NOT NULL`
    );
    for (const event of events) {
      await this.assignments.grant(event.actor_id, 'administrator', { grantedBy: null });
    }
  }

  /** The roles each account holds. */
  get roles(): RoleAssignmentStore {
    return this.assignments;
  }

  /** Grants an account the roles it holds. Idempotent. */
  async assignRoles(
    userId: string,
    roles: readonly Role[],
    options: { readonly grantedBy?: string | null } = {}
  ): Promise<void> {
    await this.assignments.grantAll(userId, roles, options);
  }

  /**
   * Resolves what one account may do.
   *
   * An account that holds no role resolves to an empty role list, so every action is denied: the
   * hub never falls back to "no role means everything".
   */
  async accessFor(
    actor: Pick<AuthenticatedActor, 'userId'>,
    options: ActorAccessOptions = {}
  ): Promise<ActorAccess> {
    const roles = await this.assignments.rolesFor(actor.userId);
    const context = await resolvePermissionContext({
      actorId: actor.userId,
      roles,
      reader: this.repository,
      ...(options.at === undefined ? {} : { at: options.at }),
    });

    const actorId = actor.userId;
    const repository = new ScopedRepository({
      adapter: this.adapter,
      actor: actorId,
      context,
      ...(this.cipher === undefined ? {} : { cipher: this.cipher }),
      onRow: (event) => this.recordRestrictedAccess(actorId, event.action, event.entity, event.rows),
    });
    const authorizer = createAuthorizer(context);

    return {
      actorId,
      context,
      repository,
      assertPermission: (permission) => {
        if (!hasPermission(context.roles, permission)) {
          throw new RbacError(
            'permission',
            `the roles [${context.roles.join(', ')}] do not hold ${permission}`
          );
        }
      },
      // The client's own authorizer decides, and its `ScopePermissionError` is a
      // `RepositoryPermissionError`, so the hub's error mapping already answers 403 `permission`.
      authorize: (entity, action, row) => {
        authorizer({ entity, action, ...(row === undefined ? {} : { row }) });
      },
    };
  }

  /**
   * Records an access to restricted data, when the rows carried any.
   *
   * It runs inside the repository call, before the response is handed back, so a read whose access
   * cannot be recorded fails the request rather than going unlogged. The entry names the actor, the
   * rows and the fields, never a value.
   */
  private recordRestrictedAccess(
    actorId: string,
    action: RepositoryAction,
    entity: EntityName,
    rows: readonly Readonly<Record<string, unknown>>[]
  ): void {
    const log = this.accessLog;
    if (!log) return;

    const fields = new Set<string>();
    const ids: string[] = [];
    for (const row of rows) {
      const touched = restrictedFieldsIn(entity, row);
      if (touched.length === 0) continue;
      for (const field of touched) fields.add(field);
      const id = row['id'];
      ids.push(typeof id === 'string' ? id : '');
    }
    if (ids.length === 0) return;

    log.record({
      at: this.clock().toISOString(),
      actor: actorId,
      action: action as RestrictedAccessAction,
      entity,
      ids,
      fields: [...fields],
      outcome: 'allowed',
    });
  }
}
