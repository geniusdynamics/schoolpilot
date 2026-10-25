// ABOUTME: The single-sign-on tables of the hub: the identity of a provider account linked to a hub
// ABOUTME: user, and the authorisation request kept between the two legs of the flow.

import type { SqliteAdapter } from '@/data/adapters/sqlite';

/**
 * The single-sign-on tables.
 *
 * Like the authentication tables, they are the hub's own deployment state rather than school
 * records, so they are not in the entity registry. No column holds a secret in the clear: the
 * state is stored as its SHA-256, and the PKCE verifier is sealed with the hub's own key, because
 * whoever holds it can complete the authorisation the hub started.
 *
 * The identity table is the security boundary. `(issuer, subject)` is unique, so one provider
 * account resolves to exactly one hub user; `(user_id, provider)` is unique, so one hub user
 * cannot quietly collect a second provider account at the same provider.
 */
export const OIDC_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "auth_identity" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "issuer" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "created_at" TEXT NOT NULL,
      "last_login_at" TEXT
    )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_auth_identity_subject"
     ON "auth_identity" ("issuer", "subject")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_auth_identity_user_provider"
     ON "auth_identity" ("user_id", "provider")`,

  `CREATE TABLE IF NOT EXISTS "auth_oidc_login" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "provider" TEXT NOT NULL,
      "issuer" TEXT NOT NULL,
      "state_hash" TEXT NOT NULL UNIQUE,
      "nonce" TEXT NOT NULL,
      "code_verifier" TEXT NOT NULL,
      "redirect_uri" TEXT NOT NULL,
      "created_at" TEXT NOT NULL,
      "expires_at" TEXT NOT NULL,
      "consumed_at" TEXT
    )`,
  `CREATE INDEX IF NOT EXISTS "idx_auth_oidc_login_expires"
     ON "auth_oidc_login" ("expires_at")`,
];

/** Creates the single-sign-on tables and their indexes. Idempotent. */
export async function applyOidcSchema(adapter: SqliteAdapter): Promise<void> {
  for (const statement of OIDC_DDL) {
    await adapter.exec(statement);
  }
}
