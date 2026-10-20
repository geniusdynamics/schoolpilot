// ABOUTME: The identity of a migration: a hash over the SQL the migration declares, or the
// ABOUTME: checksum the migration states itself. The ledger records the value and its kind.

import { MigrationError } from './errors';
import type { Migration, MigrationChecksumKind } from './types';

/** The identity of a migration, and how it was established. */
export interface MigrationIdentity {
  readonly kind: MigrationChecksumKind;
  readonly value: string;
}

/** How the identity of a migration compares with the one the ledger recorded. */
export type ChecksumDecision =
  /** The identities are the same. */
  | 'match'
  /** The identity got stronger: an explicit checksum became a declared one. */
  | 'tighten'
  /** The identities differ, or the identity got weaker. */
  | 'mismatch';

const FNV_OFFSET_A = 0x811c9dc5;
const FNV_OFFSET_B = 0x01000193;

function fnv1a(text: string, seed: number): number {
  let hash = seed >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** A stable hash of a text. */
function hashText(text: string): string {
  const first = fnv1a(text, FNV_OFFSET_A);
  const second = fnv1a(text, FNV_OFFSET_B);
  return `fnv1a-${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`;
}

/**
 * The identity of a migration.
 *
 * A migration that declares its SQL gets a hash over its version, its name and the declared
 * statements: the text survives minification byte for byte, so the identity of a shipped
 * migration does not change with the build. A migration whose SQL cannot be declared states
 * its own checksum. A migration with neither has no identity and is refused.
 */
export function migrationIdentity(migration: Migration): MigrationIdentity {
  if (migration.statements && migration.checksum) {
    throw new MigrationError(
      `Migration ${migration.version} (${migration.name}) declares both its SQL and a checksum; a migration has one identity`,
      { code: 'invalid_migration', version: migration.version, migrationName: migration.name }
    );
  }
  if (migration.statements) {
    return {
      kind: 'declared',
      value: hashText(
        JSON.stringify([migration.version, migration.name, migration.statements])
      ),
    };
  }
  if (migration.checksum) {
    return { kind: 'explicit', value: migration.checksum };
  }
  throw new MigrationError(
    `Migration ${migration.version} (${migration.name}) declares neither its SQL nor a checksum, so it has no identity`,
    { code: 'missing_checksum', version: migration.version, migrationName: migration.name }
  );
}

/**
 * Compares the identity a migration has now with the one the ledger recorded.
 *
 * An explicit checksum may be tightened into a declared one: the migration now states its
 * SQL, which is stronger than a checksum it stated itself. The other way round is refused:
 * a shipped migration's identity cannot be weakened after the fact.
 */
export function compareIdentities(
  recorded: MigrationIdentity,
  current: MigrationIdentity
): ChecksumDecision {
  if (recorded.kind === current.kind) {
    return recorded.value === current.value ? 'match' : 'mismatch';
  }
  if (recorded.kind === 'explicit' && current.kind === 'declared') return 'tighten';
  return 'mismatch';
}

/** The message that explains a refused identity. */
export function identityMismatchMessage(
  version: number,
  name: string,
  recorded: MigrationIdentity,
  current: MigrationIdentity
): string {
  if (recorded.kind === 'declared' && current.kind === 'explicit') {
    return `Migration ${version} (${name}) was applied with a declared SQL and now states a checksum of its own, which weakens its identity`;
  }
  return `Migration ${version} (${name}) was applied with ${recorded.kind} checksum ${recorded.value} and now has ${current.kind} checksum ${current.value}`;
}
