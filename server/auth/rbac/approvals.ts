// ABOUTME: The maker-checker engine of the hub: a privileged action is raised by a maker, stored
// ABOUTME: pending, and decided by a second, different person whose roles may check it. The trail
// ABOUTME: records both actors, so the decision is answerable without reading the row's history.

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import {
  assertDeciderIsNotMaker,
  hasPermission,
  type Permission,
  type Role,
} from '@/data/auth';
import { generateUuidv7 } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';

import { RbacError } from './errors';

/** One privileged action the hub requires a second person to approve. */
export interface ApprovalAction {
  /** The stable key a caller names, e.g. `fee_schedule.approve`. */
  readonly key: string;
  readonly label: string;
  /** The row of the spec the action comes from. */
  readonly spec: string;
  /** The canonical entity the action is about. */
  readonly entity: EntityName;
  /** The permission the maker must hold to raise the request. */
  readonly maker: Permission;
  /**
   * The permission the checker must hold.
   *
   * Named where the catalogue separates the two sides of the pair, so the checker's permission is
   * one the maker's roles do not carry.
   */
  readonly checker?: Permission;
  /**
   * The roles one of which the checker must hold, where the permission alone cannot separate the
   * sides: the mark change after a lock and the promotion commit are both the head teacher's, and
   * the maker holds the same write permission. The identity rule below is what separates one person
   * from doing both.
   */
  readonly checkerRoles?: readonly Role[];
}

/**
 * The privileged actions the specs name, as data.
 *
 * Spec 06 §5.2 names the sensitive actions: fee schedules, refunds, write-offs, mark changes after
 * a lock, and the promotion commit. Each row here is one of them: who may raise it, who may decide
 * it, and the row of the spec it comes from. The maker/checker permissions are the catalogue's own,
 * so the engine and the client's finance matrix cannot drift.
 */
export const APPROVAL_ACTIONS: readonly ApprovalAction[] = [
  {
    key: 'fee_schedule.approve',
    label: 'Approve a fee schedule',
    spec: '05 §11 · edit fee schedule',
    entity: 'fee_schedule',
    maker: 'finance.write',
    checker: 'fee_schedule.approve',
  },
  {
    key: 'refund.approve',
    label: 'Approve a refund',
    spec: '05 §11 · refund / write-off',
    entity: 'refund',
    maker: 'refund.request',
    checker: 'refund.approve',
  },
  {
    key: 'write_off.approve',
    label: 'Approve a write-off',
    spec: '05 §11 · refund / write-off',
    entity: 'invoice',
    maker: 'write_off.request',
    checker: 'write_off.approve',
  },
  {
    key: 'mark.change_after_lock',
    label: 'Change a mark after it was locked',
    spec: '03 §9 · mark entry and moderation',
    entity: 'mark',
    maker: 'mark.write',
    checkerRoles: ['head_teacher', 'administrator'],
  },
  {
    key: 'promotion.commit',
    label: 'Commit a promotion run',
    spec: '04 §6 · promotion run',
    entity: 'promotion_decision',
    maker: 'enrolment.write',
    checkerRoles: ['head_teacher', 'administrator'],
  },
];

/** The registered action a key names. An unknown key is refused rather than invented. */
export function approvalAction(key: string): ApprovalAction {
  const action = APPROVAL_ACTIONS.find((candidate) => candidate.key === key);
  if (!action) {
    throw new RbacError('unknown_action', `no approval action answers to "${key}"`);
  }
  return action;
}

/** The state of one approval. */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/** One privileged action, pending or decided. */
export interface ApprovalRecord {
  readonly id: string;
  readonly action: string;
  readonly entity: EntityName;
  readonly entityId: string;
  readonly status: ApprovalStatus;
  readonly payload: Readonly<Record<string, unknown>> | null;
  /** The maker. */
  readonly requestedBy: string;
  readonly requestedAt: string;
  /** The checker, once there is one. */
  readonly decidedBy: string | null;
  readonly decidedAt: string | null;
  readonly reason: string | null;
}

/** One entry of an approval's trail. */
export interface ApprovalEvent {
  readonly id: string;
  readonly approvalId: string;
  readonly kind: 'requested' | 'approved' | 'rejected';
  readonly actorId: string;
  readonly at: string;
  readonly reason: string | null;
}

/** Who is raising or deciding an approval: the account and the roles it holds. */
export interface ApprovalActor {
  readonly id: string;
  readonly roles: readonly Role[];
}

export interface ApprovalEngineOptions {
  readonly adapter: SqliteAdapter;
  readonly now?: () => Date;
  /** A new id. Defaults to a UUIDv7. */
  readonly newId?: () => string;
}

interface ApprovalRow {
  readonly id: string;
  readonly action: string;
  readonly entity: string;
  readonly entity_id: string;
  readonly status: string;
  readonly payload: string | null;
  readonly requested_by: string;
  readonly requested_at: string;
  readonly decided_by: string | null;
  readonly decided_at: string | null;
  readonly reason: string | null;
}

interface EventRow {
  readonly id: string;
  readonly approval_id: string;
  readonly kind: string;
  readonly actor_id: string;
  readonly at: string;
  readonly reason: string | null;
}

/**
 * The maker-checker engine.
 *
 * A maker raises a registered action against one row and the engine stores it pending. A different
 * account whose roles may check it approves or rejects it; the row then carries both actors and the
 * decision, and the trail carries one entry per move. The engine refuses three things the workflow
 * engine's own guard cannot: a maker deciding their own request, a checker whose roles do not hold
 * the checker permission, and a second decision on a row already decided.
 */
export class ApprovalEngine {
  private readonly adapter: SqliteAdapter;
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: ApprovalEngineOptions) {
    this.adapter = options.adapter;
    this.clock = options.now ?? (() => new Date());
    this.newId = options.newId ?? generateUuidv7;
  }

  /**
   * Raises a privileged action for approval.
   *
   * The maker's roles must hold the action's maker permission; nothing else is checked here, because
   * the checker is the one who decides whether the request is sound.
   */
  async request(input: {
    readonly action: string;
    readonly entityId: string;
    readonly payload?: Readonly<Record<string, unknown>>;
    readonly actor: ApprovalActor;
    readonly reason?: string;
  }): Promise<ApprovalRecord> {
    const action = approvalAction(input.action);
    if (!hasPermission(input.actor.roles, action.maker)) {
      throw new RbacError(
        'permission',
        `the roles [${input.actor.roles.join(', ')}] do not hold ${action.maker}, so they may not ${action.label.toLowerCase()}`
      );
    }

    const id = this.newId();
    const at = this.clock().toISOString();
    const reason = cleanReason(input.reason);

    await this.adapter.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO "auth_approval"
           ("id", "action", "entity", "entity_id", "status", "payload", "requested_by", "requested_at", "decided_by", "decided_at", "reason")
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, NULL, NULL, ?)`,
        [
          id,
          action.key,
          action.entity,
          input.entityId,
          input.payload === undefined ? null : JSON.stringify(input.payload),
          input.actor.id,
          at,
          reason,
        ]
      );
      await tx.run(
        `INSERT INTO "auth_approval_event" ("id", "approval_id", "kind", "actor_id", "at", "reason")
         VALUES (?, ?, 'requested', ?, ?, ?)`,
        [this.newId(), id, input.actor.id, at, reason]
      );
    });

    return (await this.require(id));
  }

  /** Approves a pending action. The maker may not do it. */
  async approve(input: {
    readonly id: string;
    readonly actor: ApprovalActor;
    readonly reason?: string;
  }): Promise<ApprovalRecord> {
    return this.decide('approved', input);
  }

  /** Rejects a pending action, with the reason the rejection needs. */
  async reject(input: {
    readonly id: string;
    readonly actor: ApprovalActor;
    readonly reason: string;
  }): Promise<ApprovalRecord> {
    const reason = cleanReason(input.reason);
    if (reason === null) {
      throw new RbacError('reason_required', 'a rejection needs a reason');
    }
    return this.decide('rejected', { ...input, reason });
  }

  /** One approval, or null when the id names nothing. */
  async get(id: string): Promise<ApprovalRecord | null> {
    const row = await this.adapter.get<ApprovalRow>(
      'SELECT * FROM "auth_approval" WHERE "id" = ?',
      [id]
    );
    return row === null ? null : approvalOf(row);
  }

  /** The pending approvals, oldest first, optionally narrowed to one action. */
  async pending(action?: string): Promise<readonly ApprovalRecord[]> {
    const rows =
      action === undefined
        ? await this.adapter.all<ApprovalRow>(
            'SELECT * FROM "auth_approval" WHERE "status" = \'pending\' ORDER BY "requested_at", "id"'
          )
        : await this.adapter.all<ApprovalRow>(
            'SELECT * FROM "auth_approval" WHERE "status" = \'pending\' AND "action" = ? ORDER BY "requested_at", "id"',
            [action]
          );
    return rows.map(approvalOf);
  }

  /** The trail of one approval, oldest first: who raised it and who decided it. */
  async history(id: string): Promise<readonly ApprovalEvent[]> {
    const rows = await this.adapter.all<EventRow>(
      'SELECT * FROM "auth_approval_event" WHERE "approval_id" = ? ORDER BY "at", "id"',
      [id]
    );
    return rows.map((row) => ({
      id: row.id,
      approvalId: row.approval_id,
      kind: row.kind as ApprovalEvent['kind'],
      actorId: row.actor_id,
      at: row.at,
      reason: row.reason,
    }));
  }

  /** True when the actor's roles may decide the action. */
  mayCheck(actionKey: string, actor: ApprovalActor): boolean {
    const action = APPROVAL_ACTIONS.find((candidate) => candidate.key === actionKey);
    if (!action) return false;
    return this.checks(action, actor);
  }

  // ------------------------------------------------------------------ internals

  private async decide(
    status: 'approved' | 'rejected',
    input: { readonly id: string; readonly actor: ApprovalActor; readonly reason?: string }
  ): Promise<ApprovalRecord> {
    const row = await this.adapter.get<ApprovalRow>(
      'SELECT * FROM "auth_approval" WHERE "id" = ?',
      [input.id]
    );
    if (row === null) {
      throw new RbacError('not_found', `no approval with id ${input.id}`);
    }
    if (row.status !== 'pending') {
      throw new RbacError(
        'already_decided',
        `the approval ${input.id} was already ${row.status}`
      );
    }

    const action = approvalAction(row.action);
    this.assertMayCheck(action, input.actor);
    // The one rule the role and permission model cannot carry: a maker may not decide their own
    // request. It is the shared gate of the finance matrix, so the hub and the client's own
    // adjustments module refuse the same decision with the same code.
    assertDeciderIsNotMaker(row.requested_by, input.actor.id, action.label);

    const at = this.clock().toISOString();
    const reason = cleanReason(input.reason);

    await this.adapter.transaction(async (tx) => {
      const updated = await tx.run(
        `UPDATE "auth_approval"
            SET "status" = ?, "decided_by" = ?, "decided_at" = ?, "reason" = ?
          WHERE "id" = ? AND "status" = 'pending'`,
        [status, input.actor.id, at, reason, input.id]
      );
      // Two checkers deciding at once: the loser sees the row it read as pending, and the
      // conditional update is what stops the second decision from overwriting the first.
      if (updated.changes === 0) {
        throw new RbacError('already_decided', `the approval ${input.id} was decided by someone else`);
      }
      await tx.run(
        `INSERT INTO "auth_approval_event" ("id", "approval_id", "kind", "actor_id", "at", "reason")
         VALUES (?, ?, ?, ?, ?, ?)`,
        [this.newId(), input.id, status, input.actor.id, at, reason]
      );
    });

    return this.require(input.id);
  }

  private assertMayCheck(action: ApprovalAction, actor: ApprovalActor): void {
    if (this.checks(action, actor)) return;
    const required = action.checker === undefined ? [] : [action.checker];
    const byRole = action.checkerRoles === undefined ? '' : ` (or one of ${action.checkerRoles.join(', ')})`;
    throw new RbacError(
      'permission',
      `the roles [${actor.roles.join(', ')}] may not decide ${action.key}: it needs ${required.join(', ')}${byRole}`
    );
  }

  /** True when the actor holds the checker permission or one of the checker roles. */
  private checks(action: ApprovalAction, actor: ApprovalActor): boolean {
    if (action.checker !== undefined && hasPermission(actor.roles, action.checker)) return true;
    if (action.checkerRoles === undefined) return false;
    return actor.roles.some((role) => action.checkerRoles?.includes(role));
  }

  private async require(id: string): Promise<ApprovalRecord> {
    const record = await this.get(id);
    if (record === null) throw new RbacError('not_found', `no approval with id ${id}`);
    return record;
  }
}

/** The reason of a decision: trimmed, and null when nothing was said. */
function cleanReason(reason: string | undefined): string | null {
  const trimmed = (reason ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

function approvalOf(row: ApprovalRow): ApprovalRecord {
  return {
    id: row.id,
    action: row.action,
    entity: row.entity as EntityName,
    entityId: row.entity_id,
    status: row.status as ApprovalStatus,
    payload: row.payload === null ? null : (JSON.parse(row.payload) as Record<string, unknown>),
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    reason: row.reason,
  };
}
