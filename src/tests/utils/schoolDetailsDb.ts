// ABOUTME: In-memory stand-in for databaseService exposing live school_details (and optional extra) collections.
// ABOUTME: Tests mock '@/services/database/databaseService' with createFakeDatabaseService() to drive school-profile readers.

type Row = Record<string, any>;
type Listener = () => void;

export interface FakeCollection {
  rows: Map<string, Row>;
  find: (query?: unknown) => Promise<Row[]>;
  findById: (id: string) => Promise<Row | null>;
  insert: (doc: Row) => Promise<Row>;
  update: (id: string, patch: Row) => Promise<Row>;
  remove: (id: string) => Promise<boolean>;
  subscribeToChanges: () => { subscribe: (fn: Listener) => { unsubscribe: () => void } };
  /** Replace the contents and notify subscribers, like a write from elsewhere in the app. */
  seed: (rows: Row[]) => void;
  /** How many live subscriptions are open (a reader has finished loading once this is > 0). */
  listenerCount: () => number;
}

function createCollection(): FakeCollection {
  const rows = new Map<string, Row>();
  const listeners = new Set<Listener>();
  const notify = () => listeners.forEach((l) => l());
  let seq = 0;
  return {
    rows,
    find: async () => Array.from(rows.values()),
    findById: async (id) => rows.get(String(id)) ?? null,
    insert: async (doc) => {
      const id = String(doc.id ?? `row-${++seq}`);
      rows.set(id, { ...doc, id });
      notify();
      return rows.get(id)!;
    },
    update: async (id, patch) => {
      const existing = rows.get(String(id));
      if (!existing) throw new Error(`row ${id} not found`);
      rows.set(String(id), { ...existing, ...patch });
      notify();
      return rows.get(String(id))!;
    },
    remove: async (id) => {
      const had = rows.delete(String(id));
      notify();
      return had;
    },
    subscribeToChanges: () => ({
      subscribe: (fn) => {
        listeners.add(fn);
        return { unsubscribe: () => listeners.delete(fn) };
      },
    }),
    seed: (next) => {
      rows.clear();
      next.forEach((r) => rows.set(String(r.id), { ...r }));
      notify();
    },
    listenerCount: () => listeners.size,
  };
}

/** Builds a fake databaseService whose getCollection returns live in-memory collections by name. */
export function createFakeDatabaseService(names: string[] = ['school_details']) {
  const collections: Record<string, FakeCollection> = {};
  names.forEach((n) => { collections[n] = createCollection(); });
  let idSeq = 0;
  const db = { getCollection: (name: string) => collections[name] ?? null };
  return {
    collections,
    databaseService: {
      getDatabase: async () => db,
      generateId: () => `generated-${++idSeq}`,
    },
  };
}
