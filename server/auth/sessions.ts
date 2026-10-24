// ABOUTME: The hub's session store: opaque bearer tokens kept only as their SHA-256, an idle and
// ABOUTME: an absolute expiry, the touch that slides the idle window, and per-user revocation.

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { generateUuidv7 } from '@/domain/ids';

import { hashToken, newSessionToken } from './tokens';

/** How long a session may sit unused, and how long it may last at all. */
export interface SessionPolicy {
  /** The idle window the first use starts; every touch pushes it forward. */
  readonly idleMs: number;
  /** The hard limit from creation, which a touch never moves. */
  readonly absoluteMs: number;
  /** The smallest gap between two touches; without it every request would write. */
  readonly touchEveryMs: number;
}

/** A shared school PC defaults to half an hour idle and a twelve-hour day. */
export const DEFAULT_SESSION_POLICY: SessionPolicy = {
  idleMs: 30 * 60_000,
  absoluteMs: 12 * 60 * 60_000,
  touchEveryMs: 60_000,
};

/** A session as the client sees it: never the token and never its hash. */
export interface SessionSummary {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: string;
  readonly lastSeenAt: string;
  readonly expiresAt: string;
  readonly idleExpiresAt: string;
  readonly deviceLabel: string | null;
  readonly peer: string | null;
}

/** A session as the store holds it, including the hash that a request is matched against. */
export interface SessionRecord extends SessionSummary {
  readonly tokenHash: string;
  readonly revokedAt: string | null;
}

interface SessionRow {
  readonly id: string;
  readonly user_id: string;
  readonly token_hash: string;
  readonly created_at: string;
  readonly last_seen_at: string;
  readonly expires_at: string;
  readonly idle_expires_at: string;
  readonly revoked_at: string | null;
  readonly device_label: string | null;
  readonly peer: string | null;
}

export interface SessionStoreOptions {
  readonly policy?: SessionPolicy;
  readonly now?: () => Date;
}

/** The session a successful sign-in minted. */
export interface IssuedSession {
  /** The only copy of the bearer token; nothing stores it. */
  readonly token: string;
  readonly session: SessionSummary;
}

/**
 * The sessions of the hub.
 *
 * A stolen copy of the database holds a hash, not a token, so it cannot be replayed. Each
 * request presents the token once; the store hashes it and looks the hash up. Expiry is
 * checked on every use rather than by a background sweep, so a session is refused the moment
 * it lapses even if nothing has cleaned the table.
 */
export class SessionStore {
  private readonly adapter: SqliteAdapter;
  private readonly policy: SessionPolicy;
  private readonly clock: () => Date;

  constructor(adapter: SqliteAdapter, options: SessionStoreOptions = {}) {
    this.adapter = adapter;
    this.policy = options.policy ?? DEFAULT_SESSION_POLICY;
    this.clock = options.now ?? (() => new Date());
  }

  /** The policy this store enforces. */
  get currentPolicy(): SessionPolicy {
    return this.policy;
  }

  /** Mints a session for a user. */
  async create(input: {
    readonly userId: string;
    readonly deviceLabel?: string;
    readonly peer?: string;
  }): Promise<IssuedSession> {
    const token = newSessionToken();
    const tokenHash = hashToken(token);
    const now = this.clock();
    const expiresAt = new Date(now.getTime() + this.policy.absoluteMs);
    const idleExpiresAt = new Date(now.getTime() + this.policy.idleMs);
    const id = generateUuidv7();

    await this.adapter.run(
      `INSERT INTO "auth_session"
         ("id", "user_id", "token_hash", "created_at", "last_seen_at", "expires_at",
          "idle_expires_at", "revoked_at", "revoked_reason", "device_label", "peer")
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
      [
        id,
        input.userId,
        tokenHash,
        now.toISOString(),
        now.toISOString(),
        expiresAt.toISOString(),
        idleExpiresAt.toISOString(),
        input.deviceLabel ?? null,
        input.peer ?? null,
      ]
    );

    return {
      token,
      session: {
        id,
        userId: input.userId,
        createdAt: now.toISOString(),
        lastSeenAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        idleExpiresAt: idleExpiresAt.toISOString(),
        deviceLabel: input.deviceLabel ?? null,
        peer: input.peer ?? null,
      },
    };
  }

  /**
   * Verifies a presented token and slides its idle window.
   *
   * Returns null for a token this store never issued, one that was revoked, and one that has
   * run out of idle or absolute time; the caller cannot tell those apart, and neither can a
   * client.
   */
  async verify(token: string): Promise<SessionRecord | null> {
    const record = await this.findByToken(token);
    if (record === null || record.revokedAt !== null) return null;

    const now = this.clock();
    if (Date.parse(record.expiresAt) <= now.getTime()) {
      await this.revoke(record.id, 'absolute_expiry');
      return null;
    }
    if (Date.parse(record.idleExpiresAt) <= now.getTime()) {
      await this.revoke(record.id, 'idle_expiry');
      return null;
    }

    return this.touch(record, now);
  }

  /** The record of a token, live or not, without touching it. */
  async findByToken(token: string): Promise<SessionRecord | null> {
    const row = await this.adapter.get<SessionRow>(
      'SELECT * FROM "auth_session" WHERE "token_hash" = ?',
      [hashToken(token)]
    );
    return row === null ? null : recordOf(row);
  }

  /** The record of one session id, live or not. */
  async findById(id: string): Promise<SessionRecord | null> {
    const row = await this.adapter.get<SessionRow>('SELECT * FROM "auth_session" WHERE "id" = ?', [
      id,
    ]);
    return row === null ? null : recordOf(row);
  }

  /** Revokes one session. Idempotent: a session already revoked keeps its first reason. */
  async revoke(id: string, reason: string): Promise<boolean> {
    const result = await this.adapter.run(
      `UPDATE "auth_session" SET "revoked_at" = ?, "revoked_reason" = ?
        WHERE "id" = ? AND "revoked_at" IS NULL`,
      [this.clock().toISOString(), reason, id]
    );
    return result.changes > 0;
  }

  /** Revokes a token's session, if it has a live one. */
  async revokeToken(token: string, reason: string): Promise<boolean> {
    const record = await this.findByToken(token);
    if (record === null) return false;
    return this.revoke(record.id, reason);
  }

  /**
   * Revokes every live session of a user, optionally keeping one.
   *
   * Keeping the current session is what "sign out my other devices" means; a password reset
   * keeps nothing, because the token that asked for the reset may be the stolen one.
   */
  async revokeForUser(
    userId: string,
    reason: string,
    options: { readonly exceptId?: string } = {}
  ): Promise<number> {
    const params: string[] = [this.clock().toISOString(), reason, userId];
    const except = options.exceptId === undefined ? '' : ' AND "id" <> ?';
    if (options.exceptId !== undefined) params.push(options.exceptId);

    const result = await this.adapter.run(
      `UPDATE "auth_session" SET "revoked_at" = ?, "revoked_reason" = ?
        WHERE "user_id" = ? AND "revoked_at" IS NULL${except}`,
      params
    );
    return result.changes;
  }

  /** The live sessions of a user, newest first. */
  async listForUser(userId: string): Promise<SessionSummary[]> {
    const now = this.clock().getTime();
    const rows = await this.adapter.all<SessionRow>(
      `SELECT * FROM "auth_session"
        WHERE "user_id" = ? AND "revoked_at" IS NULL
        ORDER BY "created_at" DESC`,
      [userId]
    );

    return rows
      .map(recordOf)
      .filter(
        (record) =>
          Date.parse(record.expiresAt) > now && Date.parse(record.idleExpiresAt) > now
      )
      .map(summaryOf);
  }

  private async touch(record: SessionRecord, now: Date): Promise<SessionRecord> {
    if (now.getTime() - Date.parse(record.lastSeenAt) < this.policy.touchEveryMs) {
      return record;
    }

    // The idle window never pushes the absolute expiry out.
    const idleExpiresAt = new Date(
      Math.min(now.getTime() + this.policy.idleMs, Date.parse(record.expiresAt))
    );
    await this.adapter.run(
      `UPDATE "auth_session" SET "last_seen_at" = ?, "idle_expires_at" = ?
        WHERE "id" = ? AND "revoked_at" IS NULL`,
      [now.toISOString(), idleExpiresAt.toISOString(), record.id]
    );

    return {
      ...record,
      lastSeenAt: now.toISOString(),
      idleExpiresAt: idleExpiresAt.toISOString(),
    };
  }
}

function recordOf(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
    idleExpiresAt: row.idle_expires_at,
    revokedAt: row.revoked_at,
    deviceLabel: row.device_label,
    peer: row.peer,
  };
}

function summaryOf(record: SessionRecord): SessionSummary {
  return {
    id: record.id,
    userId: record.userId,
    createdAt: record.createdAt,
    lastSeenAt: record.lastSeenAt,
    expiresAt: record.expiresAt,
    idleExpiresAt: record.idleExpiresAt,
    deviceLabel: record.deviceLabel,
    peer: record.peer,
  };
}
