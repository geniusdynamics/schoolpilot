// ABOUTME: GP-8 disaster recovery over the hub: seed a school, let the hub take an automatic encrypted
// ABOUTME: backup, wipe its database, restore into a new instance and prove the two logical checksums match.
// ABOUTME: The backup API has no browser client yet, so this suite drives the hub's HTTP API directly.

import playwright from '@playwright/test';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const { test, expect } = playwright;

const ROOT = process.cwd();
const PASSPHRASE = 'gp8-backup-passphrase-2026';

interface Hub {
  readonly child: ChildProcessWithoutNullStreams;
  readonly url: string;
  readonly log: string[];
}

interface BackupEntryBody {
  readonly id: string;
  readonly kind: string;
  readonly digest: string;
  readonly createdAt: string;
}

interface DigestBody {
  readonly algorithm: string;
  readonly overall: string;
  readonly rows: number;
  readonly tables: readonly unknown[];
}

interface BackupStatusBody {
  readonly available: boolean;
  readonly lastAutomaticAt: string | null;
  readonly lastDrillAt: string | null;
  readonly retention: { readonly daily: number; readonly weekly: number; readonly monthly: number };
  readonly drill: { readonly due: boolean; readonly reason: string };
}

interface DrillBody {
  readonly backupId: string;
  readonly digest: DigestBody;
}

interface ExportBody {
  readonly format: string;
  readonly includeRestricted: boolean;
  readonly excludedEntities: readonly string[];
  readonly files: readonly { readonly entity: string; readonly rows: number }[];
}

/** Starts one hub on an OS-picked port and resolves once it says it is listening. */
async function startHub(dataDir: string, extraArgs: readonly string[] = []): Promise<Hub> {
  const child = spawn(
    process.execPath,
    [
      '--import',
      'tsx',
      'src/server/cli.ts',
      '--host',
      '127.0.0.1',
      '--port',
      '0',
      '--data-dir',
      dataDir,
      ...extraArgs,
    ],
    {
      cwd: ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }
  ) as ChildProcessWithoutNullStreams;

  const log: string[] = [];
  const url = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`the hub did not listen within 120s:\n${log.join('')}`));
    }, 120_000);
    timer.unref?.();

    const onData = (chunk: Buffer, stream: 'stdout' | 'stderr') => {
      const text = chunk.toString('utf8');
      log.push(`${stream}: ${text}`);
      const match = /LAN Server listening on (http:\/\/[^\s]+)/.exec(text);
      if (match?.[1]) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    };

    child.stdout.on('data', (chunk: Buffer) => onData(chunk, 'stdout'));
    child.stderr.on('data', (chunk: Buffer) => onData(chunk, 'stderr'));
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`the hub exited with code ${code}:\n${log.join('')}`));
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  return { child, url, log };
}

/** Stops a hub and waits for the process to release its SQLite files. */
async function stopHub(hub: Hub | null): Promise<void> {
  if (!hub || hub.child.exitCode !== null || hub.child.signalCode !== null) return;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      hub.child.kill('SIGKILL');
      resolve();
    }, 15_000);
    timer.unref?.();

    hub.child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    hub.child.kill('SIGTERM');
  });
}

/** Reads a response body, failing with the body text instead of an opaque JSON parse error. */
async function readJson<T>(response: APIResponse): Promise<T> {
  const text = await response.text();
  if (!response.ok()) {
    throw new Error(`${response.url()} answered ${response.status()}: ${text}`);
  }
  return JSON.parse(text) as T;
}

/** Seeds one institution and one learner over the same API a LAN client uses. */
async function seedSchool(
  request: APIRequestContext,
  baseUrl: string,
  learnerFamilyName: string
): Promise<void> {
  const institution = await readJson<{ id: string }>(
    await request.post(`${baseUrl}/api/entities/institution`, {
      data: {
        name: `GP-8 Backup School ${learnerFamilyName}`,
        country: 'KE',
        ownership: 'private',
        gender_policy: 'mixed',
        boarding_policy: 'day',
        default_locale: 'en-KE',
        time_zone: 'Africa/Nairobi',
        base_currency: 'KES',
      },
    })
  );

  await readJson<{ id: string }>(
    await request.post(`${baseUrl}/api/entities/learner`, {
      data: {
        institution_id: institution.id,
        given_name: 'Amina',
        family_name: learnerFamilyName,
        name_order: 'given_first',
        gender: 'female',
        admission_number: `GP8-${learnerFamilyName}`,
        status: 'enrolled',
        residence_status: 'day',
      },
    })
  );
}

test.describe('GP-8 backup and restore', () => {
  test('an automatic encrypted backup restores into a new instance with the same checksum', async ({
    request,
  }) => {
    test.setTimeout(300_000);

    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-gp8-'));
    const sourceDir = path.join(root, 'source');
    const restoredDir = path.join(root, 'restored');
    const learnerFamilyName = `Wanjiku-${Date.now()}`;

    let sourceHub: Hub | null = null;
    let backedUpHub: Hub | null = null;
    let restoredHub: Hub | null = null;

    try {
      await test.step('seed a school through the hub API', async () => {
        sourceHub = await startHub(sourceDir, ['--no-backups']);
        await seedSchool(request, sourceHub.url, learnerFamilyName);
      });

      let backupId = '';
      let archiveFile = '';
      let sourceDigest: DigestBody | null = null;

      await test.step('start the hub with a key and let the automatic backup run', async () => {
        await stopHub(sourceHub);
        sourceHub = null;

        backedUpHub = await startHub(sourceDir, ['--backup-passphrase', PASSPHRASE]);
        const list = await readJson<{ backups: BackupEntryBody[] }>(
          await request.get(`${backedUpHub.url}/api/backups`)
        );
        expect(list.backups).toHaveLength(1);
        expect(list.backups[0]?.kind).toBe('automatic');

        backupId = list.backups[0]!.id;
        archiveFile = path.join(sourceDir, 'backups', `${backupId}.spbk`);
        expect((await fs.promises.stat(archiveFile)).size).toBeGreaterThan(0);

        const status = await readJson<BackupStatusBody>(
          await request.get(`${backedUpHub.url}/api/backups/status`)
        );
        expect(status.available).toBe(true);
        expect(status.lastAutomaticAt).not.toBeNull();
        expect(status.retention).toEqual({ daily: 7, weekly: 4, monthly: 12 });

        sourceDigest = await readJson<DigestBody>(
          await request.get(`${backedUpHub.url}/api/backups/checksum`)
        );
        expect(sourceDigest.rows).toBeGreaterThan(0);
      });

      await test.step('the archive is encrypted, not a readable SQLite file', async () => {
        const bytes = await fs.promises.readFile(archiveFile);
        expect(bytes.subarray(0, 5).toString('latin1')).toBe('SPBK1');
        expect(bytes.includes(Buffer.from('SQLite format 3'))).toBe(false);
        expect(bytes.includes(Buffer.from(learnerFamilyName))).toBe(false);

        const digest = createHash('sha256').update(bytes).digest('hex');
        expect(digest).toHaveLength(64);
      });

      await test.step('copy the backup set, then wipe the source database', async () => {
        await fs.promises.cp(
          path.join(sourceDir, 'backups'),
          path.join(restoredDir, 'backups'),
          { recursive: true }
        );
        await stopHub(backedUpHub);
        backedUpHub = null;

        await fs.promises.rm(sourceDir, { recursive: true, force: true });
        expect(fs.existsSync(path.join(sourceDir, 'schoolpilot.db'))).toBe(false);
      });

      await test.step('restore into a new instance and compare the logical checksums', async () => {
        const archive = path.join(restoredDir, 'backups', `${backupId}.spbk`);
        restoredHub = await startHub(restoredDir, [
          '--backup-passphrase',
          PASSPHRASE,
          '--restore-from',
          archive,
        ]);

        const receipt = JSON.parse(
          await fs.promises.readFile(path.join(restoredDir, 'restore.json'), 'utf8')
        ) as { backupId: string; digest: string; databaseFile: string };
        expect(receipt.backupId).toBe(backupId);
        expect(receipt.databaseFile).toBe(path.join(restoredDir, 'schoolpilot.db'));

        const restoredDigest = await readJson<DigestBody>(
          await request.get(`${restoredHub.url}/api/backups/checksum`)
        );
        expect(restoredDigest).toEqual(sourceDigest);
        expect(receipt.digest).toBe(restoredDigest.overall);

        const page = await readJson<{ items: { family_name: string }[] }>(
          await request.get(`${restoredHub.url}/api/entities/learner`)
        );
        expect(page.items.map((row) => row.family_name)).toContain(learnerFamilyName);
      });

      await test.step('the restore drill reminder is due and a drill clears it', async () => {
        const before = await readJson<BackupStatusBody>(
          await request.get(`${restoredHub.url}/api/backups/status`)
        );
        expect(before.drill.due).toBe(true);
        expect(before.drill.reason).toBe('never_performed');

        const drill = await readJson<DrillBody>(
          await request.post(`${restoredHub.url}/api/backups/drill`)
        );
        expect(drill.backupId).toBe(backupId);
        expect(drill.digest.overall).toBe(sourceDigest?.overall);

        const after = await readJson<BackupStatusBody>(
          await request.get(`${restoredHub.url}/api/backups/status`)
        );
        expect(after.drill.due).toBe(false);
        expect(after.lastDrillAt).not.toBeNull();
      });

      await test.step('the portable export contains the seeded school', async () => {
        const manifest = await readJson<ExportBody>(
          await request.post(`${restoredHub.url}/api/backups/export`, { data: {} })
        );
        expect(manifest.format).toBe('schoolpilot-export');
        expect(manifest.includeRestricted).toBe(false);
        expect(manifest.excludedEntities).toContain('identifier');
        expect(manifest.files.find((file) => file.entity === 'institution')?.rows).toBe(1);
        expect(manifest.files.find((file) => file.entity === 'learner')?.rows).toBe(1);
      });
    } finally {
      await stopHub(restoredHub);
      await stopHub(backedUpHub);
      await stopHub(sourceHub);
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  });
});
