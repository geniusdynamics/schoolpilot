// ABOUTME: Restricted data sealed at rest: the AES-256-GCM envelope, the key's lifecycle and the
// ABOUTME: startup sweep, proved against a real SQLite file and the seeded canonical fixtures.

import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createRepository } from '@/data/repository';
import { REDACTED_MARKER, RestrictedDataError, SEALED_PREFIX } from '@/data/security';
import { createTestContext, type TestContext } from '@/data/__tests__/harness';

import {
  AesGcmFieldCipher,
  RESTRICTED_KEY_ENV,
  createRestrictedDataCipher,
  loadOrCreateRestrictedKey,
} from '../security/aesGcmFieldCipher';
import { sealRestrictedData, type SealedRowCount } from '../security/sealRestrictedData';

const KEY_BYTES = 32;

let workDir: string;
let keysDir: string;
let context: TestContext;
let cipher: AesGcmFieldCipher;
let sweep: readonly SealedRowCount[];

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-encryption-'));
  keysDir = path.join(workDir, 'keys-here');

  context = await createTestContext({
    database: { kind: 'file', filename: path.join(workDir, 'schoolpilot.db') },
    entities: ['learner', 'health_visit', 'conduct_incident'],
  });

  cipher = await createRestrictedDataCipher({ dataDir: keysDir, adapter: context.adapter });
  sweep = await sealRestrictedData(context.adapter, cipher);
}, 60000);

afterAll(async () => {
  try {
    await context?.close();
  } finally {
    if (workDir) await fs.promises.rm(workDir, { recursive: true, force: true });
  }
});

describe('the restricted-data key', () => {
  it('is generated into a file only its owner can read', async () => {
    const keyFile = path.join(keysDir, 'keys', 'restricted-data.key');
    expect(fs.existsSync(keyFile)).toBe(true);

    const key = Buffer.from(fs.readFileSync(keyFile, 'utf8').trim(), 'base64');
    expect(key.length).toBe(KEY_BYTES);

    if (process.platform !== 'win32') {
      expect(fs.statSync(keyFile).mode & 0o777).toBe(0o600);
      expect(fs.statSync(path.dirname(keyFile)).mode & 0o777).toBe(0o700);
    }
  });

  it('is reloaded from the file rather than regenerated', async () => {
    const reloaded = await createRestrictedDataCipher({ dataDir: keysDir, adapter: context.adapter });
    const sealed = await rawValue('health_visit', 'complaint', context);
    expect(reloaded.open(sealed)).toBe('Headache and dizziness.');
  });

  it('takes an inline key ahead of the file', async () => {
    const inline = randomBytes(KEY_BYTES);
    const loaded = await loadOrCreateRestrictedKey({ dataDir: keysDir, key: inline.toString('base64') });
    expect(loaded.equals(inline)).toBe(true);
  });

  it('takes the environment variable when no inline key is given', async () => {
    const previous = process.env[RESTRICTED_KEY_ENV];
    const fromEnv = randomBytes(KEY_BYTES);
    process.env[RESTRICTED_KEY_ENV] = fromEnv.toString('hex');
    try {
      const emptyDir = path.join(workDir, 'no-key-yet');
      const loaded = await loadOrCreateRestrictedKey({ dataDir: emptyDir });
      expect(loaded.equals(fromEnv)).toBe(true);
      // The variable wins over generation: no key file was written.
      expect(fs.existsSync(path.join(emptyDir, 'keys', 'restricted-data.key'))).toBe(false);
    } finally {
      if (previous === undefined) delete process.env[RESTRICTED_KEY_ENV];
      else process.env[RESTRICTED_KEY_ENV] = previous;
    }
  });

  it('refuses to generate a key over a database that already holds sealed values', async () => {
    const freshDir = path.join(workDir, 'fresh-hub');
    await expect(
      loadOrCreateRestrictedKey({ dataDir: freshDir, adapter: context.adapter })
    ).rejects.toMatchObject({ code: 'key_missing' });
  });
});

describe('the AES-256-GCM cipher', () => {
  it('seals a value that does not contain its plaintext and opens it again', () => {
    const sealed = cipher.seal('Headache and dizziness.');
    expect(sealed.startsWith(SEALED_PREFIX)).toBe(true);
    expect(sealed).not.toContain('Headache');
    expect(cipher.open(sealed)).toBe('Headache and dizziness.');
  });

  it('uses a fresh iv, so the same value seals differently each time', () => {
    expect(cipher.seal('same')).not.toBe(cipher.seal('same'));
  });

  it('returns an already-sealed value unchanged', () => {
    const sealed = cipher.seal('Headache');
    expect(cipher.seal(sealed)).toBe(sealed);
  });

  it('refuses a value sealed with another key', () => {
    const other = new AesGcmFieldCipher(randomBytes(KEY_BYTES));
    expect(() => other.open(cipher.seal('Headache'))).toThrow(RestrictedDataError);
  });

  it('refuses a value whose ciphertext has been altered', () => {
    const sealed = cipher.seal('Headache and dizziness.');
    const [prefix, version, iv, tag, ciphertext] = sealed.split(':');
    const bytes = Buffer.from(ciphertext as string, 'base64');
    bytes[0] = (bytes[0] as number) ^ 0xff;
    const tampered = [prefix, version, iv, tag, bytes.toString('base64')].join(':');

    expect(() => cipher.open(tampered)).toThrow(/cannot be opened with this key/);
  });

  it('refuses a malformed envelope', () => {
    expect(() => cipher.open(`${SEALED_PREFIX}not-an-envelope`)).toThrow(RestrictedDataError);
  });

  it('refuses a key that is not 32 bytes', () => {
    expect(() => new AesGcmFieldCipher(randomBytes(16))).toThrow(/must be 32 bytes/);
  });
});

describe('the startup sweep', () => {
  it('seals the restricted values the seed wrote in plaintext', async () => {
    expect(byEntity(sweep, 'health_visit')).toBeGreaterThan(0);
    expect(byEntity(sweep, 'learner')).toBeGreaterThan(0);
    expect(byEntity(sweep, 'conduct_incident')).toBeGreaterThan(0);

    const complaint = await rawValue('health_visit', 'complaint', context);
    expect(complaint.startsWith(SEALED_PREFIX)).toBe(true);
    expect(complaint).not.toContain('Headache');

    const medical = await rawValue('learner', 'medical', context);
    expect(medical.startsWith(SEALED_PREFIX)).toBe(true);
    expect(medical).not.toContain('penicillin');
  });

  it('leaves the columns that are not restricted as they were', async () => {
    const row = await context.adapter.get<{ date: string; referred: number }>(
      'SELECT date, referred FROM health_visit'
    );
    expect(row?.date).toBe('2027-01-07');
    expect(row?.referred).toBe(0);
  });

  it('does nothing on a second run', async () => {
    const second = await sealRestrictedData(context.adapter, cipher);
    for (const summary of second) expect(summary.rows, summary.entity).toBe(0);
  });

  it('is invisible to the repository, which reads the plaintext back', async () => {
    const repository = createRepository({ adapter: context.adapter, cipher });
    await repository.setup();

    const visit = await repository.get('health_visit', context.seed.idOf('health_visit'));
    expect(visit?.complaint).toBe('Headache and dizziness.');
    expect(visit?.treatment).toBe('Rest and fluids; reviewed after an hour.');

    const learner = await repository.get('learner', context.seed.idOf('learner'));
    expect(learner?.medical).toEqual({ allergies: ['penicillin'] });
    expect(learner?.special_needs).toEqual(['low vision']);

    const incident = await repository.get('conduct_incident', context.seed.idOf('conduct_incident'));
    expect(incident?.description).toBe('Repeated disruption during the lesson.');
    expect(incident?.action).toBe('Counselling with the class teacher.');
  });
});

describe('the audit trail of a restricted entity', () => {
  it('records that a restricted field changed without recording either value', async () => {
    const repository = createRepository({ adapter: context.adapter, cipher });
    await repository.setup();
    const id = context.seed.idOf('health_visit');

    const current = await repository.get('health_visit', id);
    await repository.update(
      'health_visit',
      id,
      { treatment: 'A second review.' },
      { expectedVersion: current?.rowVersion ?? 1 }
    );

    const events = await repository.auditTrail('health_visit', id);
    const update = events.find((event) => event.action === 'update');
    expect(update, 'the update was recorded').toBeDefined();
    expect(update?.changedFields).toContain('treatment');
    expect((update?.after as Record<string, unknown>).treatment).toBe(REDACTED_MARKER);

    const trail = JSON.stringify(events);
    expect(trail).not.toContain('Rest and fluids');
    expect(trail).not.toContain('A second review');
    expect(trail).toContain(REDACTED_MARKER);
  });
});

/** The rows the sweep sealed for one entity. */
function byEntity(summaries: readonly SealedRowCount[], entity: string): number {
  return summaries.find((summary) => summary.entity === entity)?.rows ?? 0;
}

/** One stored column value, read straight from the database. */
async function rawValue(
  table: string,
  column: string,
  ctx: TestContext
): Promise<string> {
  const row = await ctx.adapter.get<Record<string, string>>(
    `SELECT "${column}" FROM "${table}" LIMIT 1`
  );
  return row?.[column] ?? '';
}
