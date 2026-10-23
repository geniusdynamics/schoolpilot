// ABOUTME: The authentication tables of the hub — sessions, TOTP factors, OTP and TOTP challenges,
// ABOUTME: password-reset tokens, lockout state and the authentication event log — as raw SQLite DDL.

import type { SqliteAdapter } from '@/data/adapters/sqlite';

/**
 * The authentication tables.
 *
 * They are the hub's own tables, not canonical entities: sessions and lockout state are
 * deployment state, not school records, and putting them in the entity registry would expose
 * them to the repository API. No column of any table holds a bearer token, an OTP code or a
 * TOTP secret in the clear; the service stores a SHA-256 hash of each, and encrypts the TOTP
 * secret with the hub's own key.
 *
 * The tables carry no foreign key to `user`. A session outlives the row it names only as an
 * audit record of a revoked login, and the identity rows of a school are never hard-deleted,
 * so a foreign key would add a failure mode without protecting anything.
 */
export const AUTH_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "auth_session" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "token_hash" TEXT NOT NULL UNIQUE,
      "created_at" TEXT NOT NULL,
      "last_seen_at" TEXT NOT NULL,
      "expires_at" TEXT NOT NULL,
      "idle_expires_at" TEXT NOT NULL,
      "revoked_at" TEXT,
      "revoked_reason" TEXT,
      "device_label" TEXT,
      "peer" TEXT
    )`,
  `CREATE INDEX IF NOT EXISTS "idx_auth_session_user" ON "auth_session" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_auth_session_idle" ON "auth_session" ("idle_expires_at")`,

  `CREATE TABLE IF NOT EXISTS "auth_totp" (
      "user_id" TEXT NOT NULL PRIMARY KEY,
      "secret" TEXT NOT NULL,
      "confirmed_at" TEXT,
      "last_used_step" INTEGER,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL
    )`,

  `CREATE TABLE IF NOT EXISTS "auth_challenge" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "kind" TEXT NOT NULL,
      "subject_id" TEXT NOT NULL,
      "token_hash" TEXT NOT NULL UNIQUE,
      "code_hash" TEXT,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "created_at" TEXT NOT NULL,
      "expires_at" TEXT NOT NULL,
      "consumed_at" TEXT
    )`,
  `CREATE INDEX IF NOT EXISTS "idx_auth_challenge_subject" ON "auth_challenge" ("kind", "subject_id")`,

  `CREATE TABLE IF NOT EXISTS "auth_reset" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "token_hash" TEXT NOT NULL UNIQUE,
      "created_at" TEXT NOT NULL,
      "expires_at" TEXT NOT NULL,
      "consumed_at" TEXT
    )`,
  `CREATE INDEX IF NOT EXISTS "idx_auth_reset_user" ON "auth_reset" ("user_id")`,

  `CREATE TABLE IF NOT EXISTS "auth_lockout" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "failures" INTEGER NOT NULL,
      "level" INTEGER NOT NULL,
      "first_failure_at" TEXT NOT NULL,
      "last_failure_at" TEXT NOT NULL,
      "locked_until" TEXT,
      "updated_at" TEXT NOT NULL
    )`,

  `CREATE TABLE IF NOT EXISTS "auth_event" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "kind" TEXT NOT NULL,
      "actor_id" TEXT,
      "detail" TEXT,
      "created_at" TEXT NOT NULL
    )`,
  `CREATE INDEX IF NOT EXISTS "idx_auth_event_created_at" ON "auth_event" ("created_at")`,
  `CREATE INDEX IF NOT EXISTS "idx_auth_event_actor" ON "auth_event" ("actor_id")`,
];

/** Creates the authentication tables and their indexes. Idempotent. */
export async function applyAuthSchema(adapter: SqliteAdapter): Promise<void> {
  for (const statement of AUTH_DDL) {
    await adapter.exec(statement);
  }
}
