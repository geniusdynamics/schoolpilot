import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLiteWASMProvider, SQLiteWASMCollection } from '../SQLiteWASMProvider';

// Mock sqlite3 initialization
vi.mock('@sqlite.org/sqlite-wasm', () => {
  return {
    default: vi.fn().mockResolvedValue({
      oo1: {
        DB: class MockDB {
          exec = vi.fn();
          close = vi.fn();
        },
        OpfsDb: class MockOpfsDb {
          exec = vi.fn();
          close = vi.fn();
        }
      }
    })
  };
});

describe('SQLiteWASMProvider', () => {
  let provider: SQLiteWASMProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new SQLiteWASMProvider({ name: 'test_db', version: 1 });
    // Mock internal state to simulate initialization
    provider['isInitialized'] = true;
    provider['db'] = { exec: vi.fn(), close: vi.fn() } as any;
  });

  describe('Transaction Management', () => {
    it('should successfully commit a transaction', async () => {
      const mockExec = provider['db']!.exec;
      
      const result = await provider.transaction(async (tx) => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(mockExec).toHaveBeenCalledWith('BEGIN;');
      expect(mockExec).toHaveBeenCalledWith('COMMIT;');
      expect(mockExec).not.toHaveBeenCalledWith('ROLLBACK;');
    });

    it('should rollback a transaction if an error is thrown', async () => {
      const mockExec = provider['db']!.exec;
      
      await expect(provider.transaction(async (tx) => {
        throw new Error('Simulated failure');
      })).rejects.toThrow('Simulated failure');

      expect(mockExec).toHaveBeenCalledWith('BEGIN;');
      expect(mockExec).toHaveBeenCalledWith('ROLLBACK;');
      expect(mockExec).not.toHaveBeenCalledWith('COMMIT;');
    });
  });

  describe('Connection Pooling (Queued Execution)', () => {
    it('should execute queued queries sequentially', async () => {
      const executionOrder: number[] = [];
      
      const task1 = provider.executeQueued(async () => {
        await new Promise(r => setTimeout(r, 50));
        executionOrder.push(1);
        return 'task1';
      });
      
      const task2 = provider.executeQueued(async () => {
        executionOrder.push(2);
        return 'task2';
      });

      const results = await Promise.all([task1, task2]);
      
      expect(results).toEqual(['task1', 'task2']);
      expect(executionOrder).toEqual([1, 2]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Regression: sqlite-wasm exec() returns POSITIONAL row arrays. find()/findOne()
// must zip them against PRAGMA table_info column names — otherwise every
// document comes back keyed by column index ("0","1",...) and every UI consumer
// reading d.first_name / d.name gets undefined (grids full of "—", comboboxes
// with empty labels). See the Aug 2026 data-context incident.
// ─────────────────────────────────────────────────────────────────────────────
describe('SQLiteWASMCollection row shape (positional-row regression)', () => {
  const COLUMNS = ['id', 'staff_no', 'first_name', 'last_name', 'meta'];

  const makeFakeDb = (rows: any[][]) => ({
    exec: vi.fn((opts: any) => {
      if (typeof opts === 'string') return undefined; // DDL / PRAGMA string form
      const sql: string = opts.sql;
      if (sql.startsWith('PRAGMA table_info')) {
        // sqlite-wasm PRAGMA table_info rows are positional:
        // [cid, name, type, notnull, dflt_value, pk]
        return COLUMNS.map((c, i) => [i, c, 'TEXT', 0, null, 0]);
      }
      if (sql.startsWith('SELECT *')) {
        return rows; // positional arrays, exactly like the real provider
      }
      return [];
    }),
  });

  const makeCollection = (rows: any[][]) => {
    const collection: any = Object.create((SQLiteWASMCollection as any).prototype);
    collection.db = makeFakeDb(rows);
    collection.name = 'staff';
    collection.tableName = 'staff';
    collection.isDestroyed = false;
    collection.queryCount = 0;
    collection.totalQueryTime = 0;
    collection.columnNamesCache = null;
    return collection;
  };

  it('find() returns documents keyed by column NAME, not index', async () => {
    const rows = [
      ['STF001', 'EMP001', 'Michael', 'Scott', JSON.stringify({ flag: true })],
      ['STF002', 'EMP002', 'Dwight', 'Schrute', null],
    ];
    const collection = makeCollection(rows);

    const docs = await collection.find({});

    expect(docs).toHaveLength(2);
    expect(docs[0].first_name).toBe('Michael');
    expect(docs[0].staff_no).toBe('EMP001');
    expect(docs[0].meta).toEqual({ flag: true }); // JSON column parsed
    expect(docs[0]['0']).toBeUndefined(); // no positional leakage
    expect(docs[1].last_name).toBe('Schrute');
  });

  it('findOne() decodes positional rows the same way', async () => {
    const collection = makeCollection([['STF001', 'EMP001', 'Michael', 'Scott', null]]);
    const doc = await collection.findOne({});
    expect(doc.first_name).toBe('Michael');
    expect(doc['0']).toBeUndefined();
  });

  it('still accepts already-named row objects (other providers/legacy shapes)', async () => {
    const collection: any = Object.create((SQLiteWASMCollection as any).prototype);
    collection.db = makeFakeDb([]);
    collection.name = 'staff';
    collection.tableName = 'staff';
    collection.isDestroyed = false;
    collection.queryCount = 0;
    collection.totalQueryTime = 0;
    collection.columnNamesCache = null;

    const doc = collection.deserializeRow({ id: 'STF009', first_name: 'Pam', last_name: 'Beesly' });
    expect(doc.first_name).toBe('Pam');
    expect(doc.id).toBe('STF009');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Regression: documents may carry extra/denormalized properties that are NOT
// table columns (e.g. classes.streams nested array, class_streams.stream_code).
// Including them in INSERT/UPDATE caused "no such column" failures that
// insertMany collected silently — demo seeding wrote 0 rows for `classes` and
// `class_streams`, leaving every class-stream combobox across the app empty
// (Aug 2026). Writes must intersect document keys with table columns.
// ─────────────────────────────────────────────────────────────────────────────
describe('SQLiteWASMCollection write column filtering (extra-property regression)', () => {
  const COLS = ['id', 'name', 'class_code'];

  const makeHarness = () => {
    const execCalls: any[] = [];
    const db = {
      exec: vi.fn((opts: any) => {
        if (typeof opts === 'string') return undefined; // BEGIN/COMMIT
        execCalls.push(opts);
        const sql: string = opts.sql;
        if (sql.startsWith('PRAGMA table_info')) {
          return COLS.map((c, i) => [i, c, 'TEXT', 0, null, 0]);
        }
        if (sql.startsWith('SELECT') || sql.startsWith('INSERT') || sql.startsWith('UPDATE')) return [];
        return [];
      }),
    };
    const collection: any = Object.create(SQLiteWASMCollection.prototype);
    collection.db = db;
    collection.name = 'classes';
    collection.tableName = 'classes';
    collection.isDestroyed = false;
    collection.queryCount = 0;
    collection.totalQueryTime = 0;
    collection.columnNamesCache = null;
    collection.changeSubject = { next: vi.fn() };
    collection.dataSubject = { next: vi.fn() };
    collection.find = vi.fn().mockResolvedValue([]); // avoid async reload path
    return { collection, execCalls };
  };

  it('insert() omits keys that are not real table columns', async () => {
    const { collection, execCalls } = makeHarness();

    await collection.insert({
      id: 'C1',
      name: 'Form 1',
      streams: [{ id: 1, name: 'A' }], // nested array — NOT a column
    } as any);

    const insertCall = execCalls.find((c) => String(c.sql).startsWith('INSERT'));
    expect(insertCall).toBeTruthy();
    expect(insertCall.sql).not.toContain('streams');
    expect(insertCall.bind).toHaveLength(2); // id + name only
    expect(insertCall.bind).toContain('Form 1');
  });

  it('insertMany() succeeds and reports no errors with extra document keys', async () => {
    const { collection, execCalls } = makeHarness();

    const result = await collection.insertMany([
      { id: 'C1', name: 'Form 1', class_code: 'class_1', streams: [] } as any,
      { id: 'C2', name: 'Form 2', class_code: 'class_2', streams: [{ id: 3 }] } as any,
    ]);

    expect(result.errors).toHaveLength(0);
    expect(result.docs).toHaveLength(2);
    const insertCalls = execCalls.filter((c) => String(c.sql).startsWith('INSERT'));
    expect(insertCalls).toHaveLength(2);
    for (const call of insertCalls) {
      expect(call.sql).not.toContain('streams');
      expect(call.bind).toHaveLength(3); // id + name + class_code
    }
  });

  it('update() ignores non-column keys and does not fabricate SQL errors', async () => {
    const { collection, execCalls } = makeHarness();
    collection.findById = vi.fn().mockResolvedValue({ id: 'C1', name: 'Form 1' });

    await collection.update('C1', { name: 'Form 1 Renamed', streams: [{ id: 9 }] } as any);

    const updateCall = execCalls.find((c) => String(c.sql).startsWith('UPDATE'));
    expect(updateCall).toBeTruthy();
    expect(updateCall.sql).not.toContain('streams');
    expect(updateCall.bind[0]).toBe('Form 1 Renamed');
  });
});
