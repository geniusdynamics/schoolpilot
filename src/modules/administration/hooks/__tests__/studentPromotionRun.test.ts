// ABOUTME: Promotion run tests (SO-16): preview -> commit -> undo against collections with real provider semantics.
// ABOUTME: The in-memory collection mimics SQLite: `field = NULL` selectors never match, updates of missing ids throw.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  previewPromotion,
  commitPromotion,
  undoPromotion,
  getClassHistory,
  type PromotionCollections,
  type PromotionCollection,
} from '../useStudentPromotion';

type Row = Record<string, unknown> & { id: string };

/** In-memory collection with the same observable semantics as SQLiteWASMCollection. */
class SqlLikeCollection implements PromotionCollection {
  rows: Row[] = [];

  constructor(seed: Row[] = []) {
    this.rows = seed.map(r => ({ ...r }));
  }

  private matches(row: Row, selector: Record<string, unknown>): boolean {
    // SQL `col = ?` with a NULL parameter never matches, exactly like the SQLite provider.
    return Object.entries(selector).every(([k, v]) => v !== null && v !== undefined && row[k] === v);
  }

  async find(query: { selector?: Record<string, unknown> } = {}) {
    const rows = query.selector ? this.rows.filter(r => this.matches(r, query.selector!)) : this.rows;
    return rows.map(r => ({ ...r }));
  }

  async findOne(idOrQuery: string | { selector?: Record<string, unknown> }) {
    const row = typeof idOrQuery === 'string'
      ? this.rows.find(r => r.id === idOrQuery)
      : this.rows.find(r => this.matches(r, idOrQuery.selector || {}));
    return row ? { ...row } : null;
  }

  async insert(doc: Record<string, unknown>) {
    const row = { ...doc, id: String(doc.id) } as Row;
    this.rows.push(row);
    return { success: true, id: row.id, document: row };
  }

  async update(id: string, changes: Record<string, unknown>) {
    const row = this.rows.find(r => r.id === id);
    if (!row) throw new Error(`Document with id ${id} not found`);
    Object.assign(row, changes);
    return { success: true, modifiedCount: 1, document: { ...row } };
  }

  async remove(id: string) {
    const before = this.rows.length;
    this.rows = this.rows.filter(r => r.id !== id);
    return { success: true, deletedCount: before - this.rows.length };
  }
}

let students: SqlLikeCollection;
let history: SqlLikeCollection;
let classStreams: SqlLikeCollection;
let collections: PromotionCollections;

beforeEach(() => {
  classStreams = new SqlLikeCollection([
    { id: 'CS-G7-BLUE', name: 'Blue', class_id: 'C-G7' },
    { id: 'CS-G8-BLUE', name: 'Blue', class_id: 'C-G8' },
  ]);
  students = new SqlLikeCollection([
    { id: 'ST-1', first_name: 'Amani', last_name: 'Otieno', status: 'Active', current_class_stream_id: 'CS-G7-BLUE', admission_date: '2024-01-08' },
    { id: 'ST-2', first_name: 'Baraka', last_name: 'Mwangi', status: 'Active', current_class_stream_id: 'CS-G7-BLUE', admission_date: '2024-01-08' },
    { id: 'ST-3', first_name: 'Chebet', last_name: 'Kip', status: 'Suspended', current_class_stream_id: 'CS-G7-BLUE' },
    { id: 'ST-4', first_name: 'Dalia', last_name: 'Njeri', status: 'Active', current_class_stream_id: 'CS-G8-BLUE' },
  ]);
  // ST-2 already has an open history row; ST-1 has none (typical for seeded/imported learners).
  history = new SqlLikeCollection([
    { id: 'H-OLD', student_id: 'ST-2', class_stream_id: 'CS-G7-BLUE', academic_year_id: 'AY-2025', start_date: '2025-01-06', end_date: null, created_at: '2025-01-06T00:00:00.000Z' },
  ]);
  collections = { students, history, classStreams };
});

describe('previewPromotion', () => {
  it('lists every learner of the class with eligibility, without writing anything', () => {
    const rows = previewPromotion(students.rows, 'CS-G7-BLUE', 'CS-G8-BLUE');

    expect(rows.map(r => [r.studentId, r.eligible])).toEqual([
      ['ST-1', true],
      ['ST-2', true],
      ['ST-3', false],
    ]);
    expect(rows[2].reason).toMatch(/Suspended/);
    expect(rows[0].fromClassStreamId).toBe('CS-G7-BLUE');
    expect(history.rows).toHaveLength(1);
  });
});

describe('commitPromotion', () => {
  it('promotes a class to the next level and records history entries', async () => {
    const rows = previewPromotion(students.rows, 'CS-G7-BLUE', 'CS-G8-BLUE');
    const run = await commitPromotion(collections, rows, { academicYearId: 'AY-2026', promotionDate: '2026-01-05' });

    expect(run.entries.map(e => e.studentId)).toEqual(['ST-1', 'ST-2']);
    expect(run.failures).toEqual([]);

    const st1 = await students.findOne('ST-1');
    const st2 = await students.findOne('ST-2');
    const st3 = await students.findOne('ST-3');
    expect(st1?.current_class_stream_id).toBe('CS-G8-BLUE');
    expect(st2?.current_class_stream_id).toBe('CS-G8-BLUE');
    expect(st3?.current_class_stream_id).toBe('CS-G7-BLUE');

    // The previously open row is closed on the promotion date (not left open by a NULL selector).
    expect(history.rows.find(r => r.id === 'H-OLD')?.end_date).toBe('2026-01-05');

    const h1 = await getClassHistory(history, 'ST-1');
    expect(h1.map(e => [e.class_stream_id, e.end_date ?? null])).toEqual([
      ['CS-G8-BLUE', null],
      ['CS-G7-BLUE', '2026-01-05'],
    ]);
    expect(h1[0].academic_year_id).toBe('AY-2026');

    const h2 = await getClassHistory(history, 'ST-2');
    expect(h2.map(e => e.class_stream_id)).toEqual(['CS-G8-BLUE', 'CS-G7-BLUE']);
  });

  it('refuses a target stream that does not exist', async () => {
    const rows = previewPromotion(students.rows, 'CS-G7-BLUE', 'CS-MISSING');
    const run = await commitPromotion(collections, rows, { academicYearId: 'AY-2026', promotionDate: '2026-01-05' });

    expect(run.entries).toEqual([]);
    expect(run.failures.length).toBe(2);
    expect((await students.findOne('ST-1'))?.current_class_stream_id).toBe('CS-G7-BLUE');
  });
});

describe('undoPromotion', () => {
  it('restores the previous class and history exactly as before the run', async () => {
    const historyBefore = JSON.stringify(history.rows);
    const rows = previewPromotion(students.rows, 'CS-G7-BLUE', 'CS-G8-BLUE');
    const run = await commitPromotion(collections, rows, { academicYearId: 'AY-2026', promotionDate: '2026-01-05' });

    const result = await undoPromotion(collections, run);

    expect(result.restored).toBe(2);
    expect(result.failures).toEqual([]);
    expect((await students.findOne('ST-1'))?.current_class_stream_id).toBe('CS-G7-BLUE');
    expect((await students.findOne('ST-2'))?.current_class_stream_id).toBe('CS-G7-BLUE');

    // ST-2: the original open row is open again and the promotion row is gone.
    expect(history.rows.filter(r => r.student_id === 'ST-2')).toEqual(JSON.parse(historyBefore));
    // ST-1: only the (re-opened) record of the class it is in remains.
    const h1 = await getClassHistory(history, 'ST-1');
    expect(h1.map(e => [e.class_stream_id, e.end_date ?? null])).toEqual([['CS-G7-BLUE', null]]);
  });

  it('does not overwrite a learner who was moved again after the run', async () => {
    const rows = previewPromotion(students.rows, 'CS-G7-BLUE', 'CS-G8-BLUE');
    const run = await commitPromotion(collections, rows, { academicYearId: 'AY-2026', promotionDate: '2026-01-05' });
    await students.update('ST-1', { current_class_stream_id: 'CS-G7-BLUE' });

    const result = await undoPromotion(collections, run);

    expect(result.restored).toBe(1);
    expect(result.failures.map(f => f.studentId)).toEqual(['ST-1']);
  });
});
