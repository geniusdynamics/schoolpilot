// ABOUTME: The migration list: the order the migrations run in, the checks the list has to
// ABOUTME: pass before a runner is built, and the descriptors the framework reports.

import { migrationIdentity } from './checksum';
import { MigrationError } from './errors';
import type { Migration, MigrationDescriptor } from './types';

/** The identity of a migration, without its body. */
export function descriptorOf(migration: {
  readonly version: number;
  readonly name: string;
}): MigrationDescriptor {
  return { version: migration.version, name: migration.name };
}

/**
 * Sorts the migrations by version and refuses two that share one.
 *
 * A version is an ordering key and an identity: it is never reused, so two migrations
 * cannot share it.
 */
export function sortMigrations(migrations: readonly Migration[]): readonly Migration[] {
  const sorted = [...migrations].sort((left, right) => left.version - right.version);
  const seen = new Set<number>();
  for (const migration of sorted) {
    if (!Number.isInteger(migration.version)) {
      throw new MigrationError(
        `The version of migration ${migration.name} is not a whole number`,
        { code: 'invalid_migration', migrationName: migration.name }
      );
    }
    if (seen.has(migration.version)) {
      throw new MigrationError(
        `Two migrations share version ${migration.version}`,
        { code: 'duplicate_version', version: migration.version }
      );
    }
    seen.add(migration.version);
  }
  return sorted;
}

/**
 * Checks that every migration has an identity.
 *
 * A migration that declares neither its SQL nor a checksum cannot be told apart from
 * another one with the same version and name, so the runner refuses to be built with it.
 */
export function assertEveryMigrationHasAnIdentity(migrations: readonly Migration[]): void {
  for (const migration of migrations) {
    migrationIdentity(migration);
  }
}
