// ABOUTME: Additive column sync for SQLiteWASMProvider against a real sqlite-wasm engine and a fake storage worker.
// ABOUTME: Existing tables gain missing schema columns via ALTER TABLE ADD COLUMN, persisted, idempotent and fail-closed.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { SQLiteWASMProvider, StorageUnavailableError } from '../SQLiteWASMProvider';
import { collectionsDefinition } from '../collections';

const NEW_STAFF_COLUMNS = ['gender', 'national_id', 'employer_number', 'employment_type'];

/** Stand-in for the storage Web Worker: serves `snapshot` on open and records forwarded SQL. */
class FakeStorageWorker {
  onmessage: ((event: { data: any }) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onmessageerror: ((event: any) => void) | null = null;
  forwarded: string[] = [];
  terminate = vi.fn();
  constructor(private snapshot: Uint8Array, private failSql: RegExp | null = null) {}
  postMessage(msg: any) {
    let response: any = { ok: true };
    if (msg.type === 'open') response = { ok: true, bytes: this.snapshot };
    if (msg.type === 'exec') {
      this.forwarded.push(msg.sql);
      if (this.failSql && this.failSql.test(msg.sql)) response = { ok: false, error: 'disk I/O error' };
    }
    queueMicrotask(() => this.onmessage?.({ data: { id: msg.id, ...response } }));
  }
}

let sqlite3: any;

/** Build a persisted database image whose staff table predates the identity/employment columns. */
async function legacyStaffSnapshot(): Promise<Uint8Array> {
  sqlite3 ??= await sqlite3InitModule({ print: () => {}, printErr: () => {} });
  const db = new sqlite3.oo1.DB(':memory:');
  db.exec(`CREATE TABLE "staff" (
    "id" TEXT PRIMARY KEY, "staff_no" TEXT NOT NULL, "first_name" TEXT NOT NULL, "last_name" TEXT NOT NULL,
    "is_active" INTEGER NOT NULL, "email" TEXT, "phone" TEXT, "created_at" TEXT NOT NULL, "updated_at" TEXT NOT NULL)`);
  db.exec({
    sql: `INSERT INTO "staff" (id, staff_no, first_name, last_name, is_active, email, phone, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    bind: ['s-1', 'T001', 'Amina', 'Otieno', 1, 'amina@school.ke', '0700000001', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'],
  });
  const bytes = sqlite3.capi.sqlite3_js_db_export(db.pointer);
  db.close();
  return bytes;
}

async function openProvider(worker: FakeStorageWorker): Promise<SQLiteWASMProvider> {
  const provider = new SQLiteWASMProvider({ name: 'column_sync_test', version: 1 });
  vi.spyOn(provider as any, 'createStorageWorker').mockImplementation(() => worker);
  await provider.initialize();
  return provider;
}

function tableColumns(provider: SQLiteWASMProvider, table: string): string[] {
  const db = (provider as any).db;
  const rows = db.exec({ sql: `PRAGMA table_info(${table})`, returnValue: 'resultRows' }) as any[];
  return rows.map((r) => String(r[1]));
}

describe('SQLiteWASMProvider additive column sync', () => {
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

  it('adds the missing staff columns to an existing table, persists them, and keeps existing rows', async () => {
    const worker = new FakeStorageWorker(await legacyStaffSnapshot());
    const provider = await openProvider(worker);

    const staff = await provider.createCollection('staff', collectionsDefinition.staff.schema as any);

    const columns = tableColumns(provider, 'staff');
    for (const column of NEW_STAFF_COLUMNS) expect(columns).toContain(column);
    // Every ALTER reached the persistent worker and is additive only.
    const alters = worker.forwarded.filter((sql) => /^\s*ALTER TABLE/i.test(sql));
    for (const column of NEW_STAFF_COLUMNS) {
      expect(alters.some((sql) => sql.includes(`ADD COLUMN "${column}"`))).toBe(true);
    }
    expect(alters.every((sql) => /ADD COLUMN/i.test(sql) && !/DROP|RENAME/i.test(sql))).toBe(true);

    const existing: any = await staff.findById('s-1');
    expect(existing).toMatchObject({
      staff_no: 'T001', first_name: 'Amina', last_name: 'Otieno', email: 'amina@school.ke', phone: '0700000001',
    });
    expect(existing.gender ?? null).toBeNull();
  });

  it('persists and reads back identity and employment fields on create and edit', async () => {
    const worker = new FakeStorageWorker(await legacyStaffSnapshot());
    const provider = await openProvider(worker);
    const staff = await provider.createCollection<any>('staff', collectionsDefinition.staff.schema as any);

    const now = '2026-10-11T00:00:00Z';
    const created = await staff.insert({
      id: 's-2', staff_no: 'T002', first_name: 'Brian', last_name: 'Kip', is_active: true,
      email: 'brian@school.ke', gender: 'male', national_id: '12345678', employer_number: 'TSC-998877',
      employment_type: 'permanent', created_at: now, updated_at: now,
    } as any);
    expect(created.ok).toBe(true);

    expect(await staff.findById('s-2')).toMatchObject({
      email: 'brian@school.ke', gender: 'male', national_id: '12345678',
      employer_number: 'TSC-998877', employment_type: 'permanent',
    });
    expect(worker.forwarded.some((sql) => /^\s*INSERT/i.test(sql) && sql.includes('employment_type'))).toBe(true);

    await staff.update('s-2', {
      email: 'b.kip@school.ke', gender: 'other', national_id: '87654321',
      employer_number: 'TSC-111', employment_type: 'contract',
    });
    expect(await staff.findById('s-2')).toMatchObject({
      email: 'b.kip@school.ke', gender: 'other', national_id: '87654321',
      employer_number: 'TSC-111', employment_type: 'contract',
    });
  });

  it('is idempotent: opening an already-synced table again adds nothing', async () => {
    const worker = new FakeStorageWorker(await legacyStaffSnapshot());
    const provider = await openProvider(worker);
    await provider.createCollection('staff', collectionsDefinition.staff.schema as any);
    const altersAfterFirstOpen = worker.forwarded.filter((sql) => /^\s*ALTER TABLE/i.test(sql)).length;
    expect(altersAfterFirstOpen).toBeGreaterThanOrEqual(NEW_STAFF_COLUMNS.length);

    await provider.createCollection('staff', collectionsDefinition.staff.schema as any);

    expect(worker.forwarded.filter((sql) => /^\s*ALTER TABLE/i.test(sql))).toHaveLength(altersAfterFirstOpen);
    expect(tableColumns(provider, 'staff').filter((c) => c === 'gender')).toHaveLength(1);
  });

  it('fails closed with StorageUnavailableError when an ADD COLUMN is not persisted', async () => {
    const worker = new FakeStorageWorker(await legacyStaffSnapshot(), /^\s*ALTER TABLE/i);
    const provider = await openProvider(worker);

    await expect(provider.createCollection('staff', collectionsDefinition.staff.schema as any))
      .rejects.toBeInstanceOf(StorageUnavailableError);
    expect(provider.getCollection('staff')).toBeNull();
  });
});
