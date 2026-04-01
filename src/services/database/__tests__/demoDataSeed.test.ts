import { beforeEach, describe, expect, it } from 'vitest';
import type { CollectionSchema, ICollection, IDatabaseProvider } from '../interfaces';
import { hasRequiredSchoolData, seedProviderWithDemoData } from '../demoDataSeed';

class MemoryCollection<T extends { id?: string }> implements ICollection<T> {
  private rows: T[] = [];

  constructor(private readonly name: string) {}

  async insert(doc: T) {
    const normalized = { ...doc, id: String(doc.id ?? `${this.name}-${this.rows.length + 1}`) } as T;
    this.rows.push(normalized);
    return { success: true, id: normalized.id as string, document: normalized };
  }

  async insertMany(docs: T[]) {
    for (const doc of docs) {
      await this.insert(doc);
    }
    return docs.map((doc, index) => ({ success: true, id: String(doc.id ?? `${this.name}-${index + 1}`), document: doc }));
  }

  async find() { return [...this.rows]; }
  async findOne(query: any) { return this.rows.find((row) => Object.entries(query?.selector || {}).every(([key, value]) => (row as any)[key] === value)) || null; }
  async findById(id: string) { return this.rows.find((row) => String(row.id) === String(id)) || null; }
  async count() { return this.rows.length; }
  async exists(id: string) { return this.rows.some((row) => String(row.id) === String(id)); }
  async update() { return { success: true, modifiedCount: 0, document: null }; }
  async updateMany() { return { success: true, modifiedCount: 0, documents: [] }; }
  async upsert(doc: T) { return this.insert(doc); }
  async remove(id: string) { this.rows = this.rows.filter((row) => String(row.id) !== String(id)); return { success: true, deletedCount: 1 }; }
  async removeMany() { const deletedCount = this.rows.length; this.rows = []; return { success: true, deletedCount }; }
  async createIndex() {}
  subscribe() { return { unsubscribe() {} } as any; }
  subscribeToChanges() { return { subscribe() {} } as any; }
  async close() {}
  async destroy() {}
}

class MemoryProvider implements IDatabaseProvider {
  readonly name = 'memory-demo';
  readonly version = '1.0.0';
  private readonly collections = new Map<string, MemoryCollection<any>>();

  constructor(collectionNames: string[]) {
    collectionNames.forEach((name) => this.collections.set(name, new MemoryCollection(name)));
  }

  async initialize() {}
  async close() {}
  getStatus() { return {} as any; }
  getCapabilities() { return {} as any; }
  getConfig() { return { name: this.name, version: 1 }; }
  async executeQuery() { return []; }
  createQueryBuilder() { return {} as any; }
  async backup() { return new Blob(); }
  async restore() {}
  async compact() {}
  async destroy() {}
  isAvailable() { return true; }
  getHealthStatus() { return {} as any; }
  setNetworkState() {}
  configureNetwork() {}
  getNetworkConfiguration() { return {} as any; }
  async syncToRemote() {}
  async syncFromRemote() {}
  async createCollection(name: string, _schema: CollectionSchema) {
    const collection = new MemoryCollection(name);
    this.collections.set(name, collection);
    return collection;
  }
  getCollection(name: string) { return this.collections.get(name) || null; }
  getAllCollections() { return this.collections; }
  async removeCollection(name: string) { this.collections.delete(name); }
  async hasCollection(name: string) { return this.collections.has(name); }
  async transaction<TResult>(callback: any): Promise<TResult> { return callback({ id: 'tx', commit: async () => {}, rollback: async () => {} }); }
}

describe('demoDataSeed', () => {
  let provider: MemoryProvider;

  beforeEach(() => {
    provider = new MemoryProvider([
      'students',
      'staff',
      'classes',
      'class_streams',
      'departments',
      'designations',
      'student_categories',
      'dormitories',
      'academic_years',
      'school_periods',
      'subjects'
    ]);
  });

  it('hydrates required school collections from schema-aligned mock data', async () => {
    expect(await hasRequiredSchoolData(provider)).toBe(false);

    const stats = await seedProviderWithDemoData(provider, {
      modules: ['administration', 'academics'],
      volume: 'small',
      clearExisting: true
    });

    expect(stats.totalRecords).toBeGreaterThan(0);
    expect(stats.tablesGenerated).toContain('students');
    expect(stats.tablesGenerated).toContain('staff');
    expect(stats.tablesGenerated).toContain('classes');
    expect(stats.tablesGenerated).toContain('class_streams');
    expect(await hasRequiredSchoolData(provider)).toBe(true);
  });

  it('falls back to per-record deletion when removeMany partially clears and then reports missing docs', async () => {
    const studentsCollection = provider.getCollection('students') as any;

    await studentsCollection.insert({ id: 'legacy-1', first_name: 'Legacy' });
    await studentsCollection.insert({ id: 'legacy-2', first_name: 'Legacy' });

    studentsCollection.removeMany = async () => {
      studentsCollection.rows = studentsCollection.rows.slice(1);
      throw new Error('Failed to remove multiple documents from students: Failed to remove document from students: missing');
    };

    const stats = await seedProviderWithDemoData(provider, {
      modules: ['administration', 'academics'],
      volume: 'small',
      clearExisting: true
    });

    const students = await studentsCollection.find();

    expect(stats.tablesGenerated).toContain('students');
    expect(students.some((row: { id?: string }) => row.id === 'legacy-1')).toBe(false);
    expect(students.some((row: { id?: string }) => row.id === 'legacy-2')).toBe(false);
    expect(students.length).toBeGreaterThan(0);
  });
});
