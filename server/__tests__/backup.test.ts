// ABOUTME: The backup service proved on a real SQLite file: encryption at rest, tamper detection,
// ABOUTME: restore into a new instance with equal checksums, retention, the drill, export and the schedule.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter } from '@/data/adapters/sqlite';
import { createTestContext, type TestContext } from '@/data/__tests__/harness';
import type { RepositoryRow } from '@/data/repository';

import {
  BackupError,
  BackupScheduler,
  BackupService,
  decodeArchive,
  resolveBackupSecret,
  type BackupSecret,
} from '../backup';

const PASSPHRASE = 'a passphrase long enough for a school hub';
const LEARNER_FAMILY = 'Zanzibarquux';

let workDir: string;
let databaseFile: string;
let context: TestContext;
let learner: RepositoryRow<'learner'>;
let secret: BackupSecret;

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-backup-'));
  databaseFile = path.join(workDir, 'schoolpilot.db');
  context = await createTestContext({ database: { kind: 'file', filename: databaseFile } });

  learner = await context.repository.create('learner', {
    institution_id: context.seed.idOf('institution'),
    given_name: 'Beacon',
    family_name: LEARNER_FAMILY,
    name_order: 'given_first',
    gender: 'female',
    admission_number: 'GP8/001',
    status: 'enrolled',
    residence_status: 'day',
    medical: { allergies: ['peanuts'] },
  });
  await context.repository.whenIdle();

  const resolved = resolveBackupSecret({ passphrase: PASSPHRASE, env: {} });
  if (!resolved) throw new Error('the test passphrase did not resolve');
  secret = resolved;
}, 60000);

afterAll(async () => {
  await context?.close();
  if (workDir) await fs.promises.rm(workDir, { recursive: true, force: true });
}, 60000);

/** A service over the shared database, with its own archive directory. */
function serviceIn(name: string, overrides: Partial<ConstructorParameters<typeof BackupService>[0]> = {}) {
  const backupDir = path.join(workDir, name, 'backups');
  return new BackupService({
    adapter: context.adapter,
    repository: context.repository,
    backupDir,
    secret,
    databaseFile,
    ...overrides,
  });
}

describe('the encrypted archive', () => {
  it('writes a backup that carries no plaintext and records the key id', async () => {
    const service = serviceIn('encrypted');
    const entry = await service.create('manual');

    expect(fs.existsSync(entry.file)).toBe(true);
    const bytes = await fs.promises.readFile(entry.file);
    expect(bytes.subarray(0, 5).toString('ascii')).toBe('SPBK1');
    expect(bytes.includes(Buffer.from(LEARNER_FAMILY))).toBe(false);
    expect(bytes.includes(Buffer.from(learner.admission_number))).toBe(false);

    const header = await service.readHeader(entry.id);
    expect(header.encryption.keyId).toBe(secret.keyId);
    expect(header.encryption.algorithm).toBe('aes-256-gcm');
    expect(header.content.rows).toBeGreaterThan(0);
    expect(header.content.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(header.kind).toBe('manual');
  });

  it('refuses the archive when the key is wrong', async () => {
    const service = serviceIn('wrong-key');
    const entry = await service.create('manual');
    const bytes = await fs.promises.readFile(entry.file);

    const other = resolveBackupSecret({ passphrase: 'a different passphrase entirely', env: {} });
    if (!other) throw new Error('the second passphrase did not resolve');

    const error = await refusalOf(() => decodeArchive(bytes, other));
    expect(error.code).toBe('wrong_key');
  });

  it('detects a tampered authentication tag', async () => {
    const service = serviceIn('tampered');
    const entry = await service.create('manual');
    const bytes = await fs.promises.readFile(entry.file);
    const tampered = Buffer.from(bytes);
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 0xff;

    const error = await refusalOf(() => decodeArchive(tampered, secret));
    expect(error.code).toBe('archive_corrupt');
  });

  it('refuses a key file kept inside the backup directory', async () => {
    const backupDir = path.join(workDir, 'key-inside', 'backups');
    await fs.promises.mkdir(backupDir, { recursive: true });
    const keyFile = path.join(backupDir, 'backup.key');
    await fs.promises.writeFile(keyFile, 'this key must not sit beside the ciphertext', 'utf8');

    const error = refusalOfSync(() => resolveBackupSecret({ keyFile, backupDir, env: {} }));
    expect(error.code).toBe('key_invalid');
  });
});

describe('restore into a new instance', () => {
  it('produces the same checksum and the same learner row', async () => {
    const service = serviceIn('restore');
    const before = await service.checksum();
    const entry = await service.create('manual');

    const restored = await service.restore(entry.id);

    expect(restored.backupId).toBe(entry.id);
    expect(restored.databaseFile).not.toBe(databaseFile);
    expect(restored.digest.overall).toBe(before.overall);
    expect(restored.digest.rows).toBe(before.rows);

    const restoredAdapter = createNodeSqliteAdapter({
      filename: restored.databaseFile,
      readonly: true,
    });
    await restoredAdapter.open();
    try {
      const rows = await restoredAdapter.all<{ family_name: string; medical: string | null }>(
        'SELECT family_name, medical FROM learner WHERE admission_number = ?',
        ['GP8/001']
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.family_name).toBe(LEARNER_FAMILY);
    } finally {
      await restoredAdapter.close();
    }

    const receipt = path.join(path.dirname(restored.databaseFile), 'restore.json');
    expect(fs.existsSync(receipt)).toBe(true);

    const state = await service.readState();
    expect(state.lastRestoreAt).toBe(restored.restoredAt);
  });

  it('never overwrites a database that is already in the target directory', async () => {
    const service = serviceIn('no-overwrite');
    const entry = await service.create('manual');
    const first = await service.restore(entry.id);

    const error = await refusalOf(() =>
      service.restoreFile(entry.file, path.dirname(first.databaseFile))
    );
    expect(error.code).toBe('restore_target_exists');
  });
});

describe('retention on the service', () => {
  it('deletes the archive the policy does not keep', async () => {
    const service = serviceIn('retention', {
      retention: { daily: 1, weekly: 0, monthly: 0 },
    });

    await service.create('manual', new Date('2026-03-01T02:00:00.000Z'));
    const newest = await service.create('manual', new Date('2026-03-02T02:00:00.000Z'));

    const { entries } = await service.list();
    expect(entries.map((entry) => entry.id)).toEqual([newest.id]);
  });
});

describe('the portable export', () => {
  it('writes JSON and CSV, excludes restricted entities and redacts encrypted columns', async () => {
    const service = serviceIn('export');

    const manifest = await service.exportAll();

    expect(manifest.format).toBe('schoolpilot-export');
    expect(manifest.excludedEntities).toEqual(
      expect.arrayContaining(['identifier', 'health_visit', 'conduct_incident'])
    );
    expect(manifest.redactedColumns).toEqual(
      expect.arrayContaining([{ entity: 'learner', column: 'medical' }])
    );
    expect(fs.existsSync(path.join(manifest.directory, 'identifier.json'))).toBe(false);

    const learnerFile = manifest.files.find((file) => file.entity === 'learner');
    expect(learnerFile).toBeDefined();

    const learnerJson = JSON.parse(
      await fs.promises.readFile(path.join(manifest.directory, 'learner.json'), 'utf8')
    ) as Array<{ family_name: string; medical: unknown }>;
    const exported = learnerJson.find((row) => row.family_name === LEARNER_FAMILY);
    expect(exported?.medical).toBeNull();

    const csv = await fs.promises.readFile(path.join(manifest.directory, 'learner.csv'), 'utf8');
    expect(csv.split('\n')[0]).toContain('medical');
    expect(csv).toContain(LEARNER_FAMILY);

    const jsonBytes = await fs.promises.readFile(path.join(manifest.directory, 'learner.json'));
    expect(learnerFile?.checksums.json).toBe(
      createHash('sha256').update(jsonBytes).digest('hex')
    );
  });

  it('includes restricted rows and encrypted values only when the operator asks', async () => {
    const service = serviceIn('export-restricted');
    const manifest = await service.exportAll({ includeRestricted: true });

    expect(manifest.excludedEntities).toEqual([]);
    expect(manifest.redactedColumns).toEqual([]);
    expect(fs.existsSync(path.join(manifest.directory, 'identifier.json'))).toBe(true);

    const learnerJson = JSON.parse(
      await fs.promises.readFile(path.join(manifest.directory, 'learner.json'), 'utf8')
    ) as Array<{ family_name: string; medical: { allergies?: string[] } | null }>;
    const exported = learnerJson.find((row) => row.family_name === LEARNER_FAMILY);
    expect(exported?.medical?.allergies).toEqual(['peanuts']);
  });
});

describe('the restore drill', () => {
  it('restores the newest archive into scratch space and clears the reminder', async () => {
    const clock = new Date('2026-03-01T03:00:00.000Z');
    const service = serviceIn('drill', { now: () => clock });

    const before = await service.status();
    expect(before.drill.due).toBe(true);
    expect(before.drill.reason).toBe('never_performed');

    await service.create('manual', clock);
    const drilled = await service.drill(clock);

    expect(drilled.digest.overall).toMatch(/^[0-9a-f]{64}$/);
    expect(drilled.durationMs).toBeGreaterThanOrEqual(0);
    expect(fs.readdirSync(path.join(workDir, 'drill', 'drills'))).toHaveLength(0);

    clock.setUTCMinutes(clock.getUTCMinutes() + 1);
    const after = await service.status();
    expect(after.drill.due).toBe(false);
    expect(after.drill.reason).toBe('on_schedule');
    expect(after.lastDrillAt).toBe('2026-03-01T03:00:00.000Z');
  });
});

describe('the automatic schedule', () => {
  it('backs up once, waits a day, then backs up again', async () => {
    const clock = new Date('2026-03-01T03:00:00.000Z');
    const service = serviceIn('schedule', { now: () => clock });
    const scheduler = new BackupScheduler({
      service,
      dailyAt: '02:00',
      now: () => clock,
      intervalMs: 60_000,
      logger: () => undefined,
    });

    const first = await scheduler.runDue();
    expect(first?.kind).toBe('automatic');

    clock.setUTCHours(clock.getUTCHours() + 1);
    expect(await scheduler.runDue()).toBeNull();

    clock.setUTCDate(clock.getUTCDate() + 1);
    const second = await scheduler.runDue();
    expect(second?.kind).toBe('automatic');
    expect(second?.id).not.toBe(first?.id);

    const { entries } = await service.list();
    expect(entries).toHaveLength(2);
  });

  it('refuses to write when no key is configured', async () => {
    const service = serviceIn('no-key', { secret: null });
    const error = await refusalOf(() => service.create('manual'));
    expect(error.code).toBe('key_missing');
    expect(service.isConfigured).toBe(false);
  });
});

async function refusalOf(work: () => Promise<unknown> | unknown): Promise<BackupError> {
  try {
    await work();
  } catch (error) {
    expect(error).toBeInstanceOf(BackupError);
    return error as BackupError;
  }
  throw new Error('expected the backup layer to refuse');
}

function refusalOfSync(work: () => unknown): BackupError {
  try {
    work();
  } catch (error) {
    expect(error).toBeInstanceOf(BackupError);
    return error as BackupError;
  }
  throw new Error('expected the backup layer to refuse');
}
