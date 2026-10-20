// ABOUTME: The internal state of a migration runner: where the database stands, what is
// ABOUTME: running and what went wrong. The runner and the rollback share it.

import type {
  AppliedMigration,
  MigrationBackup,
  MigrationDescriptor,
  MigrationPhase,
} from './types';

/** The state a runner keeps while it works. */
export interface RunnerState {
  phase: MigrationPhase;
  current?: MigrationDescriptor;
  applied: AppliedMigration[];
  remaining: MigrationDescriptor[];
  interrupted: MigrationDescriptor[];
  error?: string;
  failed?: MigrationDescriptor & { error: string };
  backup?: MigrationBackup;
}

/** The state of a runner that has not run yet. */
export function createRunnerState(): RunnerState {
  return { phase: 'idle', applied: [], remaining: [], interrupted: [] };
}
