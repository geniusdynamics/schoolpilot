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
      // A loopback hub the suite drives over plain HTTP: no TLS to pin and nothing to advertise.
      '--no-tls',
      '--no-mdns',
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

/** The account the hub is set up with on its first run; there are no default credentials. */
const ADMIN = 'grace.wekesa';
const PASSWORD = 'mwangaza-hub-2027';

/**
 * Signs in to a hub, setting it up first when it has never been used.
 *
 * A hub that has just been installed holds no institution and no account, and the entity API
 * refuses until somebody can sign in, so the first run carries the institution's own fields.
 */
async function authenticate(
  request: APIRequestContext,
  baseUrl: string,
  institutionName: string
): Promise<string> {
  const state = await readJson<{ setupRequired: boolean }>(
    await request.get(`${baseUrl}/api/auth/state`)
  );

  if (!state.setupRequired) {
    const login = await readJson<{ token: string }>(
      await request.post(`${baseUrl}/api/auth/login`, {
        data: { username: ADMIN, password: PASSWORD },
      })
    );
    return login.token;
  }

  const created = await readJson<{ token: string }>(
    await request.post(`${baseUrl}/api/auth/setup`, {
      data: {
        institution: {
          name: institutionName,
          country: 'KE',
          ownership: 'private',
          gender_policy: 'mixed',
          boarding_policy: 'day',
          default_locale: 'en-KE',
          time_zone: 'Africa/Nairobi',
          base_currency: 'KES',
        },
        username: ADMIN,
        password: PASSWORD,
      },
    })
  );
  return created.token;
}

/** Seeds one learner into the institution the first run created. */
async function seedLearner(
  request: APIRequestContext,
  baseUrl: string,
  token: string,
  learnerFamilyName: string
): Promise<void> {
  const page = await readJson<{ items: Array<{ id: string }> }>(
    await request.get(`${baseUrl}/api/entities/institution`, { headers: authHeaders(token) })
  );
  const institutionId = page.items[0]?.id;
  if (!institutionId) throw new Error('the first run left no institution to seed into');

  await readJson<{ id: string }>(
    await request.post(`${baseUrl}/api/entities/learner`, {
      headers: authHeaders(token),
      data: {
        institution_id: institutionId,
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

/** The bearer header every request after the sign-in carries. */
function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
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
    /**
     * The session the first run issued, reused for the hubs that follow.
     *
     * Signing in again would be the obvious thing, but a sign-in writes to the `user` row, and
     * this journey compares a live logical checksum against the one the archive restores to. A
     * write between the automatic backup and that comparison makes the two differ for a reason
     * that has nothing to do with the backup.
     */
    let sessionToken = '';

    try {
      await test.step('seed a school through the hub API', async () => {
        sourceHub = await startHub(sourceDir, ['--no-backups']);
        sessionToken = await authenticate(
          request,
          sourceHub.url,
          `GP-8 Backup School ${learnerFamilyName}`
        );
        await seedLearner(request, sourceHub.url, sessionToken, learnerFamilyName);
      });

      let backupId = '';
      let archiveFile = '';
      let sourceDigest: DigestBody | null = null;

      await test.step('start the hub with a key and let the automatic backup run', async () => {
        await stopHub(sourceHub);
        sourceHub = null;

        backedUpHub = await startHub(sourceDir, ['--backup-passphrase', PASSPHRASE]);

        const list = await readJson<{ backups: BackupEntryBody[] }>(
          await request.get(`${backedUpHub.url}/api/backups`, {
            headers: authHeaders(sessionToken),
          })
        );
        expect(list.backups).toHaveLength(1);
        expect(list.backups[0]?.kind).toBe('automatic');

        backupId = list.backups[0]!.id;
        archiveFile = path.join(sourceDir, 'backups', `${backupId}.spbk`);
        expect((await fs.promises.stat(archiveFile)).size).toBeGreaterThan(0);

        const status = await readJson<BackupStatusBody>(
          await request.get(`${backedUpHub.url}/api/backups/status`, {
            headers: authHeaders(sessionToken),
          })
        );
        expect(status.available).toBe(true);
        expect(status.lastAutomaticAt).not.toBeNull();
        expect(status.retention).toEqual({ daily: 7, weekly: 4, monthly: 12 });

        sourceDigest = await readJson<DigestBody>(
          await request.get(`${backedUpHub.url}/api/backups/checksum`, {
            headers: authHeaders(sessionToken),
          })
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
          await request.get(`${restoredHub.url}/api/backups/checksum`, {
            headers: authHeaders(sessionToken),
          })
        );
        expect(restoredDigest).toEqual(sourceDigest);
        expect(receipt.digest).toBe(restoredDigest.overall);

        const page = await readJson<{ items: { family_name: string }[] }>(
          await request.get(`${restoredHub.url}/api/entities/learner`, {
            headers: authHeaders(sessionToken),
          })
        );
        expect(page.items.map((row) => row.family_name)).toContain(learnerFamilyName);
      });

      await test.step('the restore drill reminder is due and a drill clears it', async () => {
        const before = await readJson<BackupStatusBody>(
          await request.get(`${restoredHub.url}/api/backups/status`, {
            headers: authHeaders(sessionToken),
          })
        );
        expect(before.drill.due).toBe(true);
        expect(before.drill.reason).toBe('never_performed');

        const drill = await readJson<DrillBody>(
          await request.post(`${restoredHub.url}/api/backups/drill`, {
            headers: authHeaders(sessionToken),
          })
        );
        expect(drill.backupId).toBe(backupId);
        expect(drill.digest.overall).toBe(sourceDigest?.overall);

        const after = await readJson<BackupStatusBody>(
          await request.get(`${restoredHub.url}/api/backups/status`, {
            headers: authHeaders(sessionToken),
          })
        );
        expect(after.drill.due).toBe(false);
        expect(after.lastDrillAt).not.toBeNull();
      });

      await test.step('the portable export contains the seeded school', async () => {
        const manifest = await readJson<ExportBody>(
          await request.post(`${restoredHub.url}/api/backups/export`, {
            headers: authHeaders(sessionToken),
            data: {},
          })
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
