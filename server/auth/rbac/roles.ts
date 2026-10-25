// ABOUTME: The roles an account holds on the hub: the assignment store the authorisation layer reads
// ABOUTME: its role list from, and the check that a name is one of the catalogue's roles.

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { ROLES, type Role } from '@/data/auth';
import { generateUuidv7 } from '@/domain/ids';

import { RbacError } from './errors';

/** One role an account holds, and who granted it. */
export interface RoleAssignment {
  readonly userId: string;
  readonly role: Role;
  readonly grantedAt: string;
  readonly grantedBy: string | null;
}

interface RoleAssignmentRow {
  readonly user_id: string;
  readonly role: string;
  readonly granted_at: string;
  readonly granted_by: string | null;
}

export interface RoleAssignmentStoreOptions {
  readonly now?: () => Date;
}

/** True when a name is one of the catalogue's roles. */
export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * The roles each account holds.
 *
 * The store is the server's answer to the question the client answers with an argument: the
 * permission model takes the roles as an input, and on the hub the input is these rows. Granting a
 * role is idempotent, so an operator (or the first run) may grant one twice.
 */
export class RoleAssignmentStore {
  private readonly adapter: SqliteAdapter;
  private readonly clock: () => Date;

  constructor(adapter: SqliteAdapter, options: RoleAssignmentStoreOptions = {}) {
    this.adapter = adapter;
    this.clock = options.now ?? (() => new Date());
  }

  /** The roles one account holds, in the order they were granted. */
  async rolesFor(userId: string): Promise<readonly Role[]> {
    const rows = await this.adapter.all<{ role: string }>(
      'SELECT "role" FROM "auth_role_assignment" WHERE "user_id" = ? ORDER BY "granted_at", "id"',
      [userId]
    );
    return rows.map((row) => row.role).filter(isRole);
  }

  /** Every role assignment of one account. */
  async listFor(userId: string): Promise<readonly RoleAssignment[]> {
    const rows = await this.adapter.all<RoleAssignmentRow>(
      `SELECT "user_id", "role", "granted_at", "granted_by" FROM "auth_role_assignment"
        WHERE "user_id" = ? ORDER BY "granted_at", "id"`,
      [userId]
    );
    return rows.filter((row) => isRole(row.role)).map(assignmentOf);
  }

  /**
   * Grants a role. Idempotent: a role the account already holds is left as it is.
   *
   * An unknown role name is refused rather than stored: a row the model cannot interpret would
   * grant nothing and hide the mistake.
   */
  async grant(
    userId: string,
    role: Role,
    options: { readonly grantedBy?: string | null } = {}
  ): Promise<void> {
    if (!isRole(role)) {
      throw new RbacError('unknown_action', `${String(role)} is not a role of the catalogue`);
    }
    await this.adapter.run(
      `INSERT INTO "auth_role_assignment" ("id", "user_id", "role", "granted_at", "granted_by")
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT("user_id", "role") DO NOTHING`,
      [generateUuidv7(), userId, role, this.clock().toISOString(), options.grantedBy ?? null]
    );
  }

  /** Grants several roles in one call. */
  async grantAll(
    userId: string,
    roles: readonly Role[],
    options: { readonly grantedBy?: string | null } = {}
  ): Promise<void> {
    for (const role of roles) await this.grant(userId, role, options);
  }

  /** Revokes a role. A role the account does not hold is simply not held. */
  async revoke(userId: string, role: Role): Promise<void> {
    await this.adapter.run(
      'DELETE FROM "auth_role_assignment" WHERE "user_id" = ? AND "role" = ?',
      [userId, role]
    );
  }

  /** Revokes every role of one account. */
  async revokeAll(userId: string): Promise<void> {
    await this.adapter.run('DELETE FROM "auth_role_assignment" WHERE "user_id" = ?', [userId]);
  }
}

function assignmentOf(row: RoleAssignmentRow): RoleAssignment {
  return {
    userId: row.user_id,
    role: row.role as Role,
    grantedAt: row.granted_at,
    grantedBy: row.granted_by,
  };
}
