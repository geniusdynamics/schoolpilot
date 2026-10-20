// ABOUTME: Fee templates store applicable_level_ids (class/level ids) through the real SQLite provider.
// ABOUTME: A legacy fee_templates table gains the column via additive sync and the array round-trips on insert and update.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { SQLiteWASMProvider } from '@/services/database/SQLiteWASMProvider';
import { feeTemplatesSchema } from '../schema';

/** Stand-in for the storage Web Worker: serves `snapshot` on open and records forwarded SQL. */
class FakeStorageWorker {
  onmessage: ((event: { data: any }) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onmessageerror: ((event: any) => void) | null = null;
  forwarded: string[] = [];
  terminate = vi.fn();
  constructor(private snapshot: Uint8Array) {}
  postMessage(msg: any) {
    let response: any = { ok: true };
    if (msg.type === 'open') response = { ok: true, bytes: this.snapshot };
    if (msg.type === 'exec') this.forwarded.push(msg.sql);
    queueMicrotask(() => this.onmessage?.({ data: { id: msg.id, ...response } }));
  }
}

let sqlite3: any;
const NOW = '2026-10-17T00:00:00Z';

/** A persisted database image whose fee_templates table predates applicable_level_ids. */
async function legacyFeeTemplatesSnapshot(): Promise<Uint8Array> {
  sqlite3 ??= await sqlite3InitModule({ print: () => {}, printErr: () => {} });
  const db = new sqlite3.oo1.DB(':memory:');
  db.exec(`CREATE TABLE "fee_templates" (
    "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "school_period_id" TEXT NOT NULL, "student_category_id" TEXT,
    "school_period_name" TEXT, "student_category_name" TEXT, "items" TEXT,
    "created_at" TEXT NOT NULL, "updated_at" TEXT NOT NULL)`);
  db.exec({
    sql: `INSERT INTO "fee_templates" (id, name, school_period_id, items, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    bind: ['tpl-legacy', 'Legacy', 'period-t1', '[]', NOW, NOW],
  });
  const bytes = sqlite3.capi.sqlite3_js_db_export(db.pointer);
  db.close();
  return bytes;
}

async function openFeeTemplates() {
  const worker = new FakeStorageWorker(await legacyFeeTemplatesSnapshot());
  const provider = new SQLiteWASMProvider({ name: 'fee_template_levels_test', version: 1 });
  vi.spyOn(provider as any, 'createStorageWorker').mockImplementation(() => worker);
  await provider.initialize();
  const collection = await provider.createCollection<any>('fee_templates', feeTemplatesSchema as any);
  return { worker, collection };
}

describe('fee template applicable levels storage', () => {
  const originalStorage = (globalThis.navigator as any)?.storage;

  beforeEach(() => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: { getDirectory: vi.fn(), persist: vi.fn().mockResolvedValue(true) },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    Object.defineProperty(globalThis.navigator, 'storage', { configurable: true, value: originalStorage });
  });

  it('declares applicable_level_ids as an array of string ids on the fee template schema', () => {
    const property = (feeTemplatesSchema as any).properties.applicable_level_ids;
    expect(property).toBeDefined();
    expect(property.type).toBe('array');
    expect(property.items.type).toBe('string');
  });

  it('adds the column to an existing table and keeps legacy rows readable with no levels', async () => {
    const { worker, collection } = await openFeeTemplates();

    expect(worker.forwarded.some((sql) => /ALTER TABLE/i.test(sql) && sql.includes('ADD COLUMN "applicable_level_ids"'))).toBe(true);
    const legacy: any = await collection.findById('tpl-legacy');
    expect(legacy).toMatchObject({ name: 'Legacy', items: [] });
    expect(legacy.applicable_level_ids ?? null).toBeNull();
  });

  it('round-trips applicable_level_ids on insert and update', async () => {
    const { collection } = await openFeeTemplates();

    const created = await collection.insert({
      id: 'tpl-f1', name: 'Form 1 Boarders', school_period_id: 'period-t1', items: [],
      applicable_level_ids: ['class-f1', 'class-f2'], created_at: NOW, updated_at: NOW,
    });
    expect(created.ok).toBe(true);
    expect(((await collection.findById('tpl-f1')) as any).applicable_level_ids).toEqual(['class-f1', 'class-f2']);

    await collection.update('tpl-f1', { applicable_level_ids: ['class-f3'] });
    expect(((await collection.findById('tpl-f1')) as any).applicable_level_ids).toEqual(['class-f3']);

    await collection.update('tpl-legacy', { applicable_level_ids: [] });
    expect(((await collection.findById('tpl-legacy')) as any).applicable_level_ids).toEqual([]);
  });
});
