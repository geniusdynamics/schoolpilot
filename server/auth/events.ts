// ABOUTME: The hub's authentication event log: who signed in, what was refused and what was
// ABOUTME: changed about a factor, stored without a password, a code, a token or a TOTP secret.

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { generateUuidv7 } from '@/domain/ids';

/** The events the authentication service records. */
export type AuthEventKind =
  | 'administrator_created'
  | 'login_succeeded'
  | 'login_refused'
  | 'login_locked'
  | 'login_mfa_required'
  | 'logout'
  | 'session_revoked'
  | 'session_revoked_all'
  | 'guardian_otp_requested'
  | 'guardian_otp_refused'
  | 'guardian_otp_undeliverable'
  | 'guardian_otp_verified'
  | 'password_reset_requested'
  | 'password_reset_undeliverable'
  | 'password_reset_completed'
  | 'totp_enrolled'
  | 'totp_disabled'
  | 'totp_refused';

/** One recorded event. */
export interface AuthEvent {
  readonly id: string;
  readonly kind: AuthEventKind;
  readonly actorId: string | null;
  readonly detail: Readonly<Record<string, unknown>> | null;
  readonly createdAt: string;
}

interface AuthEventRow {
  readonly id: string;
  readonly kind: string;
  readonly actor_id: string | null;
  readonly detail: string | null;
  readonly created_at: string;
}

export interface AuthEventLogOptions {
  readonly now?: () => Date;
}

/**
 * The authentication trail.
 *
 * It answers the operator's questions — was this account attacked, when did the password
 * change, who signed in from where — and never holds a value that could be replayed. A detail
 * object may name a session id, a refusal reason or a count; it must not carry a password, a
 * one-time code, a reset token or a TOTP secret.
 */
export class AuthEventLog {
  private readonly adapter: SqliteAdapter;
  private readonly clock: () => Date;

  constructor(adapter: SqliteAdapter, options: AuthEventLogOptions = {}) {
    this.adapter = adapter;
    this.clock = options.now ?? (() => new Date());
  }

  /** Appends one event. */
  async append(
    kind: AuthEventKind,
    input: {
      readonly actorId?: string | null;
      readonly detail?: Readonly<Record<string, unknown>>;
    } = {}
  ): Promise<void> {
    await this.adapter.run(
      'INSERT INTO "auth_event" ("id", "kind", "actor_id", "detail", "created_at") VALUES (?, ?, ?, ?, ?)',
      [
        generateUuidv7(),
        kind,
        input.actorId ?? null,
        input.detail === undefined ? null : JSON.stringify(input.detail),
        this.clock().toISOString(),
      ]
    );
  }

  /** The most recent events, newest first. */
  async recent(limit = 50): Promise<AuthEvent[]> {
    const rows = await this.adapter.all<AuthEventRow>(
      'SELECT * FROM "auth_event" ORDER BY "created_at" DESC, "id" DESC LIMIT ?',
      [Math.max(1, Math.min(Math.trunc(limit), 500))]
    );
    return rows.map(eventOf);
  }

  /** The most recent events of one actor, newest first. */
  async forActor(actorId: string, limit = 50): Promise<AuthEvent[]> {
    const rows = await this.adapter.all<AuthEventRow>(
      `SELECT * FROM "auth_event" WHERE "actor_id" = ?
        ORDER BY "created_at" DESC, "id" DESC LIMIT ?`,
      [actorId, Math.max(1, Math.min(Math.trunc(limit), 500))]
    );
    return rows.map(eventOf);
  }
}

function eventOf(row: AuthEventRow): AuthEvent {
  return {
    id: row.id,
    kind: row.kind as AuthEventKind,
    actorId: row.actor_id,
    detail:
      row.detail === null
        ? null
        : (JSON.parse(row.detail) as Readonly<Record<string, unknown>>),
    createdAt: row.created_at,
  };
}
