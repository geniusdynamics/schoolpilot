// ABOUTME: Guards the demo seed's Kenyan calendar, financial-year links and real guardian relationships.
// ABOUTME: Sweeps every schema-declared ref and proves idempotent re-seeding on the real SQLite provider.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IDatabaseProvider } from '../interfaces';
import { collectionsDefinition } from '../collections';
import { SQLiteWASMProvider } from '../SQLiteWASMProvider';
import { seedProviderWithDemoData } from '../demoDataSeed';

type Row = Record<string, any>;

class MemoryCollection {
  private rows: Row[] = [];

  constructor(
    private readonly collectionName: string,
    readonly schema: { primaryKey?: string } = { primaryKey: 'id' }
  ) {}

  async insert(doc: Row) {
    const normalized = { ...doc, id: String(doc.id ?? `${this.collectionName}-${this.rows.length + 1}`) };
    this.rows.push(normalized);
    return { id: normalized.id, doc: normalized, ok: true };
  }

  async insertMany(docs: Row[]) {
    for (const doc of docs) {
      await this.insert(doc);
    }
    return { docs: [], errors: [] };
  }

  async find() {
    return [...this.rows];
  }

  async count() {
    return this.rows.length;
  }

  async remove(id: string) {
    this.rows = this.rows.filter((row) => String(row.id) !== String(id));
    return { id, ok: true };
  }

  async removeMany() {
    const deletedCount = this.rows.length;
    this.rows = [];
    return Array.from({ length: deletedCount }, () => ({ ok: true }));
  }

  async clear() {
    this.rows = [];
  }
}

class MemoryProvider {
  readonly name = 'demo-integrity-memory';
  readonly version = '1.0.0';
  private readonly collections = new Map<string, MemoryCollection>();

  async createCollection(name: string, schema: { primaryKey?: string }) {
    const collection = new MemoryCollection(name, schema);
    this.collections.set(name, collection);
    return collection;
  }

  getCollection(name: string) {
    return this.collections.get(name) ?? null;
  }

  async snapshotIds(): Promise<Map<string, string[]>> {
    const snapshot = new Map<string, string[]>();
    for (const [name, collection] of this.collections.entries()) {
      const primaryKey = collection.schema?.primaryKey ?? 'id';
      const rows = await collection.find();
      snapshot.set(name, rows.map((row) => String(row[primaryKey] ?? row.id)).sort());
    }
    return snapshot;
  }
}

const asProvider = (provider: MemoryProvider): IDatabaseProvider =>
  provider as unknown as IDatabaseProvider;

type SeedVolume = 'tiny' | 'small' | 'medium' | 'large' | 'enterprise';

/** Every supported volume; large/enterprise use factor 1 but still run the full checks. */
const SUPPORTED_VOLUMES: SeedVolume[] = ['tiny', 'small', 'medium', 'large', 'enterprise'];

/** ceil(27 stock levels × volume factor): tiny 0.2 → 6, small 0.5 → 14, the rest → 27. */
const EXPECTED_STOCK_ROWS: Record<SeedVolume, number> = {
  tiny: 6,
  small: 14,
  medium: 27,
  large: 27,
  enterprise: 27
};

const seed = (provider: IDatabaseProvider, clearExisting = true, volume: SeedVolume = 'medium') =>
  seedProviderWithDemoData(provider, { volume, clearExisting });

const rowsOf = async (provider: IDatabaseProvider, collectionName: string): Promise<Row[]> => {
  const collection = provider.getCollection(collectionName);
  return collection ? collection.find() : [];
};

const studentName = (student: Row): string =>
  `${String(student.first_name ?? '')} ${String(student.last_name ?? '')}`.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Every foreign key the schema declares, child collection + column + parent
 * collection. Derived from the real collection definitions so a new `ref` is
 * covered without editing this test.
 */
const schemaDeclaredRefs = (): Array<{ child: string; column: string; parent: string }> => {
  const refs: Array<{ child: string; column: string; parent: string }> = [];

  for (const [child, definition] of Object.entries(collectionsDefinition)) {
    for (const [column, property] of Object.entries(definition.schema?.properties ?? {})) {
      const ref = (property as { ref?: unknown })?.ref;
      if (typeof ref === 'string' && ref.length > 0) {
        refs.push({ child, column, parent: ref });
      }
    }
  }

  return refs;
};

/**
 * Returns one line per non-null schema-declared foreign key whose parent row is
 * missing. Reads every child and parent collection from the provider itself, so
 * a failed insert (dropped column, type mismatch) surfaces here.
 */
const findOrphanReferences = async (provider: IDatabaseProvider): Promise<string[]> => {
  const rowsByCollection = new Map<string, Row[]>();
  const load = async (collectionName: string): Promise<Row[]> => {
    if (!rowsByCollection.has(collectionName)) {
      rowsByCollection.set(collectionName, await rowsOf(provider, collectionName));
    }
    return rowsByCollection.get(collectionName)!;
  };

  const violations: string[] = [];

  for (const { child, column, parent } of schemaDeclaredRefs()) {
    const childRows = await load(child);
    if (childRows.length === 0) {
      continue;
    }

    const parentIds = new Set((await load(parent)).map((row) => String(row.id)));

    for (const row of childRows) {
      const foreignKey = row[column];
      if (foreignKey === null || foreignKey === undefined || foreignKey === '') {
        continue;
      }
      if (!parentIds.has(String(foreignKey))) {
        violations.push(
          `${child}.${column}=${foreignKey} has no ${parent} row (row ${row.id ?? row.student_id ?? '?'})`
        );
      }
    }
  }

  return violations;
};

const collectionCounts = async (provider: IDatabaseProvider): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  for (const [name, collection] of provider.getAllCollections()) {
    counts[name] = await collection.count();
  }
  return counts;
};

const primaryKeysByCollection = async (
  provider: IDatabaseProvider
): Promise<Record<string, string[]>> => {
  const snapshot: Record<string, string[]> = {};
  for (const [name, collection] of provider.getAllCollections()) {
    const primaryKey = collection.schema?.primaryKey ?? 'id';
    const rows = await collection.find({});
    snapshot[name] = rows.map((row) => String((row as Row)[primaryKey] ?? '')).sort();
  }
  return snapshot;
};

const stockLevelKeys = async (provider: IDatabaseProvider): Promise<string[]> => {
  const rows = await rowsOf(provider, 'stock_levels');
  return rows.map((row) => String(row.compositeId ?? '')).sort();
};

describe('demo seed integrity in memory (SO-35)', () => {
  it('uses a January-November academic calendar with three non-overlapping terms inside every year', async () => {
    const provider = new MemoryProvider();
    await seed(asProvider(provider));

    const years = await rowsOf(asProvider(provider), 'academic_years');
    const terms = await rowsOf(asProvider(provider), 'school_periods');

    expect(years.length).toBeGreaterThan(0);
    expect(terms.length).toBe(years.length * 3);

    for (const year of years) {
      const start = new Date(String(year.start_date));
      const end = new Date(String(year.end_date));

      expect(start.getUTCMonth(), `${year.name} must start in January`).toBe(0);
      expect(end.getUTCMonth(), `${year.name} must end in November`).toBe(10);
      expect(start.getUTCFullYear()).toBe(end.getUTCFullYear());
    }

    for (const year of years) {
      const yearTerms = terms
        .filter((term) => String(term.academic_year_id) === String(year.id))
        .sort((left, right) => String(left.start_date).localeCompare(String(right.start_date)));

      expect(yearTerms, `year ${year.name} must have Term 1-3`).toHaveLength(3);
      expect(yearTerms.map((term) => String(term.period_definition_id))).toEqual(['1', '2', '3']);

      for (const term of yearTerms) {
        expect(String(term.start_date) >= String(year.start_date), `${term.name} starts before its year`).toBe(true);
        expect(String(term.end_date) <= String(year.end_date), `${term.name} ends after its year`).toBe(true);
        expect(String(term.start_date) <= String(term.end_date)).toBe(true);
      }

      for (let index = 1; index < yearTerms.length; index++) {
        expect(
          String(yearTerms[index].start_date) > String(yearTerms[index - 1].end_date),
          `${yearTerms[index].name} overlaps ${yearTerms[index - 1].name}`
        ).toBe(true);
      }
    }
  });

  it('seeds financial years that cover every term', async () => {
    const provider = new MemoryProvider();
    await seed(asProvider(provider));

    const financialYears = await rowsOf(asProvider(provider), 'financial_years');
    const terms = await rowsOf(asProvider(provider), 'school_periods');

    expect(financialYears.length).toBeGreaterThan(0);
    expect(terms.length).toBeGreaterThan(0);

    const byId = new Map(financialYears.map((year) => [String(year.id), year]));

    for (const term of terms) {
      const financialYear = byId.get(String(term.financial_year_id));
      expect(financialYear, `${term.name} references missing FY ${term.financial_year_id}`).toBeDefined();
      expect(String(term.start_date) >= String(financialYear!.start_date), `${term.name} starts before its FY`).toBe(true);
      expect(String(term.end_date) <= String(financialYear!.end_date), `${term.name} ends after its FY`).toBe(true);
      expect(['Open', 'Closed', 'Archived']).toContain(financialYear!.status);
    }

    expect(financialYears.some((year) => year.status === 'Open')).toBe(true);
  });

  it('links every student to a distinct guardian person through a real relationship row', async () => {
    const provider = new MemoryProvider();
    await seed(asProvider(provider));

    const students = await rowsOf(asProvider(provider), 'students');
    const guardians = await rowsOf(asProvider(provider), 'parents_guardians');
    const relationships = await rowsOf(asProvider(provider), 'student_guardian_relationships');

    expect(students.length).toBeGreaterThan(0);
    expect(guardians.length).toBeGreaterThan(0);
    expect(relationships.length).toBeGreaterThanOrEqual(students.length);

    const studentsById = new Map(students.map((student) => [String(student.id), student]));
    const guardiansById = new Map(guardians.map((guardian) => [String(guardian.id), guardian]));
    const childrenByGuardian = new Map<string, Set<string>>();

    for (const relationship of relationships) {
      const student = studentsById.get(String(relationship.student_id));
      const guardian = guardiansById.get(String(relationship.guardian_id));

      expect(student, `relationship ${relationship.id} points at a missing student`).toBeDefined();
      expect(guardian, `relationship ${relationship.id} points at a missing guardian`).toBeDefined();
      expect(String(relationship.guardian_id), `${studentName(student!)} is their own guardian`).not.toBe(String(student!.id));
      expect(String(guardian!.name).trim().toLowerCase()).not.toBe(studentName(student!));

      const children = childrenByGuardian.get(String(guardian!.id)) ?? new Set<string>();
      children.add(String(student!.id));
      childrenByGuardian.set(String(guardian!.id), children);
    }

    for (const student of students) {
      const linked = relationships.some((relationship) => String(relationship.student_id) === String(student.id));
      expect(linked, `${studentName(student)} has no guardian`).toBe(true);

      const embedded = student.primary_guardian as Row | null | undefined;
      if (embedded) {
        expect(String(embedded.id)).not.toBe(String(student.id));
        expect(String(embedded.name).trim().toLowerCase()).not.toBe(studentName(student));
      }
    }

    // A guardian can be the parent of several children (siblings share a person).
    expect(Array.from(childrenByGuardian.values()).some((children) => children.size > 1)).toBe(true);
  });

  it('gives every seeded row a primary key and resolves every non-null schema ref', async () => {
    const provider = new MemoryProvider();
    await seed(asProvider(provider));

    const rowsByCollection = new Map<string, Row[]>();
    const load = async (collectionName: string): Promise<Row[]> => {
      if (!rowsByCollection.has(collectionName)) {
        rowsByCollection.set(collectionName, await rowsOf(asProvider(provider), collectionName));
      }
      return rowsByCollection.get(collectionName)!;
    };

    const duplicateIds: string[] = [];
    for (const collectionName of new Set(schemaDeclaredRefs().flatMap((ref) => [ref.child, ref.parent]))) {
      const rows = await load(collectionName);
      const ids = rows.map((row) => String(row.id));
      const unique = new Set(ids);
      if (unique.size !== ids.length) {
        duplicateIds.push(`${collectionName}: ${ids.length - unique.size} duplicate id(s)`);
      }
      if (ids.some((id) => id === '' || id === 'undefined' || id === 'null')) {
        duplicateIds.push(`${collectionName}: row without a usable id`);
      }
    }
    expect(duplicateIds, duplicateIds.join('\n')).toEqual([]);

    expect(await findOrphanReferences(asProvider(provider)), findOrphanHint()).toEqual([]);
  });

  it('uses deterministic ids and a second seed run creates no duplicate rows', async () => {
    const provider = new MemoryProvider();
    await seed(asProvider(provider));

    const firstSnapshot = await provider.snapshotIds();
    expect(firstSnapshot.size).toBeGreaterThan(0);

    const generatedId = /_[1-9]\d{12,}_[a-z0-9]+$/i;
    const unstableIds: string[] = [];
    for (const [collectionName, ids] of firstSnapshot.entries()) {
      for (const id of ids) {
        if (generatedId.test(id)) {
          unstableIds.push(`${collectionName}.${id}`);
        }
      }
    }
    expect(unstableIds, `timestamp/random ids in seed: ${unstableIds.slice(0, 5).join(', ')}`).toEqual([]);

    const stats = await seed(asProvider(provider), false);

    expect(stats.totalRecords, `a second seed run inserted rows: ${JSON.stringify(stats.insertedCounts)}`).toBe(0);
    expect(stats.insertedCounts, 'a second seed run queued rows').toEqual({});
    const secondSnapshot = await provider.snapshotIds();
    expect(secondSnapshot).toEqual(firstSnapshot);

    const freshProvider = new MemoryProvider();
    await seed(asProvider(freshProvider));

    expect(await freshProvider.snapshotIds(), 'ids changed between seed runs').toEqual(firstSnapshot);
  });
});

const findOrphanHint = (): string =>
  'schema-declared foreign keys must point at a seeded parent row';

/**
 * The same integrity checks against the provider used by the application. The
 * in-memory provider above preserves camelCase keys and never touches SQLite;
 * this block is what proves the real write path (column sanitisation included).
 * Every supported volume runs the full sweep and both re-seed checks.
 */
describe.each(SUPPORTED_VOLUMES)(
  'demo seed integrity on the real SQLite provider at volume %s (SO-35)',
  (volume) => {
    let provider: SQLiteWASMProvider;

    beforeAll(async () => {
      vi.stubEnv('VITE_DB_ALLOW_MEMORY', 'true');
      provider = new SQLiteWASMProvider({ name: `demo_seed_integrity_${volume}`, version: 1 });
      await provider.initialize();
      await seed(provider, true, volume);
    }, 120000);

    afterAll(async () => {
      await provider.destroy();
      vi.unstubAllEnvs();
    }, 30000);

    it('seeds every schema-declared foreign key with an existing parent', async () => {
      expect(schemaDeclaredRefs().length).toBeGreaterThan(100);

      const violations = await findOrphanReferences(provider);
      expect(violations, violations.slice(0, 20).join('\n')).toEqual([]);
    });

    it('stores stock level primary keys and keeps them stable across a re-seed', async () => {
      const firstKeys = await stockLevelKeys(provider);

      expect(firstKeys).toHaveLength(EXPECTED_STOCK_ROWS[volume]);
      expect(firstKeys.filter((key) => key === '' || key === 'undefined')).toEqual([]);
      expect(new Set(firstKeys).size).toBe(firstKeys.length);
      expect(firstKeys.every((key) => /^INV\d{3}-\d+$/.test(key))).toBe(true);

      const second = await seed(provider, false, volume);

      expect(second.insertedCounts, 'a second seed run queued rows').toEqual({});
      expect(second.totalRecords).toBe(0);
      expect(await stockLevelKeys(provider)).toEqual(firstKeys);
    });

    it('a second seed inserts no rows in any collection', async () => {
      const firstCounts = await collectionCounts(provider);
      expect(Object.keys(firstCounts).length).toBeGreaterThan(100);

      const second = await seed(provider, false, volume);

      expect(second.insertedCounts, `a second seed run inserted rows: ${JSON.stringify(second.insertedCounts)}`).toEqual({});
      expect(second.totalRecords).toBe(0);
      expect(await collectionCounts(provider), 'row counts changed on a re-seed').toEqual(firstCounts);
    });

    it('rebuilds the same primary keys on a fresh provider', async () => {
      const fresh = new SQLiteWASMProvider({ name: `demo_seed_integrity_${volume}_fresh`, version: 1 });
      await fresh.initialize();
      try {
        await seed(fresh, true, volume);
        expect(await primaryKeysByCollection(fresh), `ids changed between ${volume} seed runs`).toEqual(
          await primaryKeysByCollection(provider)
        );
      } finally {
        await fresh.destroy();
      }
    }, 120000);
  }
);
