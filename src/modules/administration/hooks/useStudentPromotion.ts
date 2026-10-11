// ABOUTME: Student promotion runs (SO-16): preview -> commit -> undo over students and student_class_history
// ABOUTME: Pure run functions take collections (testable with real provider semantics); the hook binds them to the database

import { useCallback, useMemo } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { AuditLoggerService } from '../services/AuditLoggerService';
import { logger } from '@/utils/logging';

/** The slice of ICollection a promotion run needs. */
export interface PromotionCollection {
  find(query?: { selector?: Record<string, unknown> }): Promise<unknown[]>;
  findOne(idOrQuery: string | { selector?: Record<string, unknown> }): Promise<unknown>;
  insert(doc: Record<string, unknown>): Promise<unknown>;
  update(id: string, changes: Record<string, unknown>): Promise<unknown>;
  remove(id: string): Promise<unknown>;
}

export interface PromotionCollections {
  students: PromotionCollection;
  history: PromotionCollection;
  classStreams: PromotionCollection;
}

export interface ClassHistoryEntry {
  id: string;
  student_id: string;
  class_stream_id: string;
  academic_year_id?: string | null;
  start_date: string;
  end_date?: string | null;
  created_at?: string;
}

export interface PromotionStudentLike {
  id: string | number;
  first_name?: string | null;
  last_name?: string | null;
  admission_no?: string | null;
  status?: string | null;
  current_class_stream_id?: string | number | null;
}

export interface PromotionPreviewRow {
  studentId: string;
  studentName: string;
  admissionNo: string;
  fromClassStreamId: string | null;
  toClassStreamId: string;
  eligible: boolean;
  reason?: string;
}

export interface PromotionRunEntry {
  studentId: string;
  previousClassStreamId: string | null;
  newClassStreamId: string;
  newHistoryId: string;
  /** History rows closed by this run; re-opened on undo. */
  closedHistoryIds: string[];
}

export interface PromotionFailure {
  studentId: string;
  reason: string;
}

export interface PromotionRun {
  academicYearId: string;
  promotionDate: string;
  entries: PromotionRunEntry[];
  failures: PromotionFailure[];
}

export type PromotionAudit = (
  studentId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
) => Promise<unknown>;

const BLOCKED_STATUSES = ['Suspended', 'Transferred', 'Graduated', 'Withdrawn'];

const idOf = (value: unknown): string | null =>
  value === null || value === undefined || value === '' ? null : String(value);

const isOpen = (entry: { end_date?: unknown }) =>
  entry.end_date === null || entry.end_date === undefined || entry.end_date === '';

const newId = () => `sch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

/** Build the preview of moving every learner of a class stream to a target stream. Writes nothing. */
export function previewPromotion(
  students: PromotionStudentLike[],
  sourceClassStreamId: string,
  targetClassStreamId: string,
  onlyStudentIds?: string[]
): PromotionPreviewRow[] {
  return students
    .filter(s => idOf(s.current_class_stream_id) === sourceClassStreamId)
    .filter(s => !onlyStudentIds || onlyStudentIds.includes(String(s.id)))
    .map(s => {
      const status = s.status ?? '';
      let reason: string | undefined;
      if (BLOCKED_STATUSES.includes(status)) reason = `Status is ${status}`;
      else if (sourceClassStreamId === targetClassStreamId) reason = 'Already in the target class';
      return {
        studentId: String(s.id),
        studentName: [s.first_name, s.last_name].filter(Boolean).join(' '),
        admissionNo: s.admission_no ?? '',
        fromClassStreamId: idOf(s.current_class_stream_id),
        toClassStreamId: targetClassStreamId,
        eligible: !reason,
        reason,
      };
    });
}

/** All history rows of a learner, most recent first (open row before closed rows on the same date). */
export async function getClassHistory(
  history: PromotionCollection,
  studentId: string
): Promise<ClassHistoryEntry[]> {
  const rows = (await history.find({ selector: { student_id: studentId } })) as ClassHistoryEntry[];
  return [...rows].sort((a, b) => {
    const byStart = String(b.start_date ?? '').localeCompare(String(a.start_date ?? ''));
    if (byStart !== 0) return byStart;
    return Number(isOpen(b)) - Number(isOpen(a));
  });
}

async function promoteOne(
  collections: PromotionCollections,
  row: PromotionPreviewRow,
  academicYearId: string,
  promotionDate: string,
  audit?: PromotionAudit
): Promise<PromotionRunEntry> {
  const student = (await collections.students.findOne(row.studentId)) as Record<string, unknown> | null;
  if (!student) throw new Error('Student not found');
  const previousClassStreamId = idOf(student.current_class_stream_id);
  if (previousClassStreamId !== row.fromClassStreamId) throw new Error('Class changed since the preview');
  if (!(await collections.classStreams.findOne(row.toClassStreamId))) throw new Error('Target class not found');

  // Find open rows in code: a `end_date = NULL` selector never matches on SQL providers.
  const existing = await getClassHistory(collections.history, row.studentId);
  const closedHistoryIds: string[] = [];
  for (const entry of existing.filter(isOpen)) {
    await collections.history.update(entry.id, { end_date: promotionDate });
    closedHistoryIds.push(entry.id);
  }

  // Learners without history (seeded/imported) get a closed row for the class they leave, so undo and reports can see it.
  if (closedHistoryIds.length === 0 && previousClassStreamId) {
    const backfillId = newId();
    await collections.history.insert({
      id: backfillId,
      student_id: row.studentId,
      class_stream_id: previousClassStreamId,
      start_date: String(student.admission_date || student.created_at || promotionDate).slice(0, 10),
      end_date: promotionDate,
      created_at: new Date().toISOString(),
    });
    closedHistoryIds.push(backfillId);
  }

  const newHistoryId = newId();
  await collections.history.insert({
    id: newHistoryId,
    student_id: row.studentId,
    class_stream_id: row.toClassStreamId,
    academic_year_id: academicYearId || null,
    start_date: promotionDate,
    end_date: null,
    created_at: new Date().toISOString(),
  });
  await collections.students.update(row.studentId, { current_class_stream_id: row.toClassStreamId });
  await audit?.(row.studentId, { current_class_stream_id: previousClassStreamId }, { current_class_stream_id: row.toClassStreamId });

  return { studentId: row.studentId, previousClassStreamId, newClassStreamId: row.toClassStreamId, newHistoryId, closedHistoryIds };
}

/** Commit the eligible rows of a preview. Each learner is promoted independently; failures are reported, not thrown. */
export async function commitPromotion(
  collections: PromotionCollections,
  rows: PromotionPreviewRow[],
  options: { academicYearId: string; promotionDate: string },
  audit?: PromotionAudit
): Promise<PromotionRun> {
  const run: PromotionRun = { ...options, entries: [], failures: [] };
  for (const row of rows.filter(r => r.eligible)) {
    try {
      run.entries.push(await promoteOne(collections, row, options.academicYearId, options.promotionDate, audit));
    } catch (error) {
      run.failures.push({ studentId: row.studentId, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return run;
}

/** Undo a committed run: restore each learner's previous class and history. Learners moved since are left alone. */
export async function undoPromotion(
  collections: PromotionCollections,
  run: PromotionRun,
  audit?: PromotionAudit
): Promise<{ restored: number; failures: PromotionFailure[] }> {
  let restored = 0;
  const failures: PromotionFailure[] = [];
  for (const entry of run.entries) {
    try {
      const student = (await collections.students.findOne(entry.studentId)) as Record<string, unknown> | null;
      if (!student) throw new Error('Student not found');
      if (idOf(student.current_class_stream_id) !== entry.newClassStreamId) {
        throw new Error('Learner was moved after this promotion');
      }
      await collections.students.update(entry.studentId, { current_class_stream_id: entry.previousClassStreamId });
      await collections.history.remove(entry.newHistoryId);
      for (const id of entry.closedHistoryIds) {
        await collections.history.update(id, { end_date: null });
      }
      await audit?.(entry.studentId, { current_class_stream_id: entry.newClassStreamId }, { current_class_stream_id: entry.previousClassStreamId });
      restored += 1;
    } catch (error) {
      failures.push({ studentId: entry.studentId, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return { restored, failures };
}

interface UseStudentPromotionReturn {
  /** True once the students, history and class stream collections are available. */
  ready: boolean;
  commit: (rows: PromotionPreviewRow[], options: { academicYearId: string; promotionDate: string }) => Promise<PromotionRun>;
  undo: (run: PromotionRun) => Promise<{ restored: number; failures: PromotionFailure[] }>;
  getStudentClassHistory: (studentId: string) => Promise<ClassHistoryEntry[]>;
}

/** Binds the promotion run functions to the live database collections and the audit log. */
export function useStudentPromotion(): UseStudentPromotionReturn {
  const students = useDatabaseCollection<Record<string, unknown>>('students');
  const history = useDatabaseCollection<Record<string, unknown>>('student_class_history');
  const classStreams = useDatabaseCollection<Record<string, unknown>>('class_streams');

  const collections = useMemo<PromotionCollections | null>(() => {
    if (!students.collection || !history.collection || !classStreams.collection) return null;
    return {
      students: students.collection as unknown as PromotionCollection,
      history: history.collection as unknown as PromotionCollection,
      classStreams: classStreams.collection as unknown as PromotionCollection,
    };
  }, [students.collection, history.collection, classStreams.collection]);

  const audit = useCallback<PromotionAudit>(async (studentId, before, after) => {
    try {
      await AuditLoggerService.getInstance().logUpdate('students', studentId, before, after);
    } catch (error) {
      logger.warn('[useStudentPromotion] Audit log failed:', error);
    }
  }, []);

  const requireCollections = useCallback(() => {
    if (!collections) throw new Error('Database collections are not ready');
    return collections;
  }, [collections]);

  const commit = useCallback(
    (rows: PromotionPreviewRow[], options: { academicYearId: string; promotionDate: string }) =>
      commitPromotion(requireCollections(), rows, options, audit),
    [requireCollections, audit]
  );

  const undo = useCallback(
    (run: PromotionRun) => undoPromotion(requireCollections(), run, audit),
    [requireCollections, audit]
  );

  const getStudentClassHistory = useCallback(
    async (studentId: string) => (collections ? getClassHistory(collections.history, studentId) : []),
    [collections]
  );

  return { ready: collections !== null, commit, undo, getStudentClassHistory };
}

export default useStudentPromotion;
