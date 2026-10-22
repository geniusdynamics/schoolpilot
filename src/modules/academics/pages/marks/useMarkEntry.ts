// ABOUTME: The state behind the mark entry grid: which group is marked, which columns the scheme
// ABOUTME: gives it, what each cell holds, what the engine says about it, what is waiting to be
// ABOUTME: saved, and who may write. The page and the table read this; neither writes a mark itself.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useEntityQuery } from '@/data/query';
import { MAX_LIMIT } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import type { MarkStatus } from '@/domain/assessment/engine';

import { useCanonicalAcademics } from '../../data/useCanonicalAcademics';
import type { WritableQueryRepository } from '../../data/canonicalRepository';
import { cellKey, checkScore, resolveScheme, type RowMark } from './scheme';
import { evaluateRow } from './verdict';
import { pasteSummary, planPaste, type PastePlan } from './paste';
import {
  PendingEditQueue,
  createStoragePendingEditStore,
  flushPendingEdits,
  type FlushReport,
  type PendingEdit,
} from './pendingEdits';
import {
  MarkWorkflow,
  assertOverrideReason,
  createStorageWorkflowStore,
  isReadOnly,
  requiresOverrideReason,
} from './workflow';
import {
  assertCanWrite,
  assertGroupInScope,
  resolveTeachingScope,
  type TeachingScope,
} from './teachingScope';
import {
  MarkEntryError,
  type CellEntry,
  type CellStatus,
  type GridRow,
  type SchemeColumn,
  type StoredMark,
  type WorkflowAuditEntry,
  type WorkflowState,
} from './types';

/** The number of learners one page of the grid renders. */
export const MARK_ENTRY_PAGE_SIZE = 40;

/** How long the grid waits after the last keystroke before it writes. */
export const MARK_ENTRY_DEBOUNCE_MS = 700;

/** The empty draft, shared so a memo does not allocate a new object on every render. */
const NO_ENTRIES: Readonly<Record<string, CellEntry>> = {};

/** The reason an override was granted, and the one assessment x group it applies to. */
export interface MarkOverride {
  readonly assessmentId: string;
  readonly teachingGroupId: string;
  readonly reason: string;
}

export interface MarkEntryOptions {
  readonly groupId: Id<'teaching_group'> | null;
  readonly periodId: Id<'academic_period'> | null;
  readonly actorId: string;
  readonly role: string | null;
  readonly pageSize?: number;
  readonly debounceMs?: number;
  /** Whether the connection is up; injected so a test can take the screen offline. */
  readonly isOnline?: () => boolean;
}

export interface MarkEntryState {
  readonly isLoading: boolean;
  readonly groupName: string | null;
  readonly periodName: string | null;
  readonly scope: TeachingScope;
  readonly schemeCode: string;
  readonly schemeSource: 'programme' | 'assessments';
  readonly columns: readonly SchemeColumn[];
  readonly rows: readonly GridRow[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly setPage: (page: number) => void;
  readonly columnStates: Readonly<Record<string, WorkflowState>>;
  readonly editableColumns: ReadonlySet<string>;
  readonly focusedAssessmentId: string | null;
  readonly setFocusedAssessmentId: (id: string) => void;
  readonly workflowState: WorkflowState | null;
  readonly needsOverrideReason: boolean;
  readonly override: MarkOverride | null;
  readonly beginOverride: (assessmentId: string, reason: string) => void;
  readonly endOverride: () => void;
  readonly advance: (to: WorkflowState, reason?: string) => void;
  readonly entryOf: (rowIndex: number, columnIndex: number) => CellEntry;
  readonly statusOf: (rowIndex: number, columnIndex: number) => CellStatus;
  readonly originalOf: (rowIndex: number, columnIndex: number) => string | null;
  readonly setScore: (rowIndex: number, columnIndex: number, raw: string) => void;
  readonly setStatus: (rowIndex: number, columnIndex: number, status: MarkStatus) => void;
  readonly paste: (anchorRow: number, anchorColumn: number, text: string) => PastePlan;
  readonly flushNow: () => Promise<FlushReport>;
  readonly pendingCount: number;
  readonly offline: boolean;
  readonly saving: boolean;
  readonly refusal: string | null;
  readonly pasteMessage: string | null;
  /** Cells another writer changed after the teacher loaded them; the teacher's value won. */
  readonly conflicts: readonly string[];
  readonly summary: Readonly<
    Record<'valid' | 'missing' | 'invalid' | 'out_of_range' | 'incomplete_scheme' | 'locked' | 'moderated', number>
  >;
  readonly workflowAudit: readonly WorkflowAuditEntry[];
}

/** The mark a cell resolves to, keyed by assessment and enrolment. */
function storedKey(assessmentId: string, enrolmentId: string): string {
  return `${assessmentId}|${enrolmentId}`;
}

/** Today, clamped into a period, so membership is judged on a date the period covers. */
function membershipDate(period: { readonly start_date: string; readonly end_date: string } | undefined): string {
  const today = new Date().toISOString().slice(0, 10);
  if (!period) return today;
  if (today < period.start_date) return period.start_date;
  if (today > period.end_date) return period.end_date;
  return today;
}

function statusTone(code: CellStatus['code']): CellStatus['tone'] {
  switch (code) {
    case 'valid':
      return 'success';
    case 'missing':
      return 'warning';
    case 'locked':
    case 'moderated':
      return 'info';
    default:
      return 'danger';
  }
}

const STATUS_LABELS: Readonly<Record<CellStatus['code'], string>> = {
  valid: 'Valid',
  missing: 'Missing',
  invalid: 'Not a number',
  out_of_range: 'Out of range',
  incomplete_scheme: 'Scheme incomplete',
  locked: 'Locked',
  moderated: 'Moderated',
};

function cellStatus(code: CellStatus['code'], reason: string | null): CellStatus {
  return { code, label: STATUS_LABELS[code], reason, tone: statusTone(code) };
}

/**
 * The marks screen's data and behaviour.
 *
 * Reads go through the canonical repository; writes go through the durable queue so an edit is
 * never lost, and every write passes the scope guard and the lock guard before it reaches the
 * repository, whether it came from the grid or from the queue.
 */
export function useMarkEntry(options: MarkEntryOptions): MarkEntryState {
  const { groupId, periodId, actorId, role } = options;
  const pageSize = options.pageSize ?? MARK_ENTRY_PAGE_SIZE;
  const debounceMs = options.debounceMs ?? MARK_ENTRY_DEBOUNCE_MS;
  const isOnline = useMemo(
    () =>
      options.isOnline ??
      (() => typeof navigator === 'undefined' || navigator.onLine !== false),
    [options.isOnline]
  );

  const canonical = useCanonicalAcademics();
  const {
    repository,
    assessments,
    teachingGroups,
    teachingAssignments,
    teachingGroupMembers,
    marks,
    academicPeriods,
    classGroups,
    staff,
    learnerById,
    enrolmentById,
    institutionId,
    isLoading: canonicalLoading,
  } = canonical;

  const schemeQuery = useEntityQuery(repository, 'assessment_scheme', { limit: MAX_LIMIT });

  const group = useMemo(
    () => teachingGroups.find((row) => row.id === groupId) ?? null,
    [teachingGroups, groupId]
  );
  const period = useMemo(
    () => academicPeriods.find((row) => row.id === periodId) ?? null,
    [academicPeriods, periodId]
  );

  const scope = useMemo<TeachingScope>(
    () =>
      resolveTeachingScope({
        role,
        actorId,
        staff: staff.map((row) => ({ id: row.id, userId: row.user_id ?? null })),
        groups: teachingGroups.map((row) => ({
          id: row.id,
          teacherIds: row.teacher_ids ?? [],
          classGroupIds: row.class_group_ids ?? [],
        })),
        assignments: teachingAssignments.map((row) => ({
          staffId: row.staff_id,
          teachingGroupId: row.teaching_group_id,
          validFrom: row.valid_from,
          validTo: row.valid_to ?? null,
        })),
        classGroups: classGroups.map((row) => ({
          id: row.id,
          homeroomTeacherIds: row.homeroom_teacher_ids ?? [],
        })),
      }),
    [role, actorId, staff, teachingGroups, teachingAssignments, classGroups]
  );

  const groupLevelIds = useMemo(() => new Set(group?.level_ids ?? []), [group]);
  const groupClassIds = useMemo(() => new Set(group?.class_group_ids ?? []), [group]);

  /** The assessments of the period this group is marked on. */
  const periodAssessments = useMemo(() => {
    if (!group || !period) return [];
    return assessments.filter((assessment) => {
      if (assessment.academic_period_id !== period.id) return false;
      if (
        assessment.learning_area_ids.length > 0 &&
        !assessment.learning_area_ids.includes(group.learning_area_id)
      ) {
        return false;
      }
      if (
        assessment.level_ids.length > 0 &&
        !assessment.level_ids.some((id) => groupLevelIds.has(id))
      ) {
        return false;
      }
      if (
        assessment.class_group_ids.length > 0 &&
        !assessment.class_group_ids.some((id) => groupClassIds.has(id))
      ) {
        return false;
      }
      return true;
    });
  }, [assessments, group, period, groupLevelIds, groupClassIds]);

  const scheme = useMemo(
    () =>
      resolveScheme({
        assessments: periodAssessments.map((assessment) => ({
          id: assessment.id,
          name: assessment.name,
          slot: assessment.scheme_slot ?? null,
          kind: assessment.kind,
          max: assessment.max_score ?? null,
          status: assessment.status,
        })),
        schemes: (schemeQuery.data?.items ?? []).map((row) => ({
          id: row.id,
          programmeId: row.programme_id,
          levelIds: row.level_ids ?? [],
          version: row.version,
          definition: row.definition,
        })),
        levelId: group?.level_ids[0] ?? null,
        programmeId: group
          ? (classGroups.find((row) => group.class_group_ids.includes(row.id))?.programme_id ?? null)
          : null,
      }),
    [periodAssessments, schemeQuery.data, group, classGroups]
  );

  const columns = scheme.columns;

  const date = useMemo(() => membershipDate(period ?? undefined), [period]);

  const members = useMemo(() => {
    if (!group) return [];
    return teachingGroupMembers.filter(
      (member) =>
        member.teaching_group_id === group.id &&
        member.valid_from <= date &&
        (member.valid_to == null || member.valid_to >= date)
    );
  }, [teachingGroupMembers, group, date]);

  const rows = useMemo<GridRow[]>(
    () =>
      members.map((member) => {
        const enrolment = enrolmentById.get(member.enrolment_id);
        const learner = enrolment ? learnerById.get(enrolment.learner_id) : undefined;
        const name = learner
          ? [learner.given_name, learner.family_name].filter(Boolean).join(' ')
          : (enrolment?.learner_id ?? 'Unknown learner');
        return {
          enrolmentId: member.enrolment_id,
          learnerName: name,
          admissionNumber: learner?.admission_number ?? null,
        };
      }),
    [members, enrolmentById, learnerById]
  );

  const learningAreaId = group?.learning_area_id ?? null;

  /** The stored mark each cell resolves to. */
  const storedByCell = useMemo(() => {
    const map = new Map<string, StoredMark>();
    if (!learningAreaId) return map;
    const columnIds = new Set(columns.map((column) => column.assessmentId));
    for (const mark of marks) {
      if (mark.learning_area_id !== learningAreaId) continue;
      if (!columnIds.has(mark.assessment_id)) continue;
      map.set(storedKey(mark.assessment_id, mark.enrolment_id), {
        id: mark.id,
        rowVersion: mark.rowVersion,
        score: mark.score ?? null,
        status: mark.status_code,
      });
    }
    return map;
  }, [marks, learningAreaId, columns]);

  // ------------------------------------------------------------------ workflow

  const workflowKey = institutionId ?? 'institution';
  const workflow = useMemo(
    () =>
      new MarkWorkflow(
        createStorageWorkflowStore(
          `schoolpilot.marks.workflow.v1:${workflowKey}`,
          `schoolpilot.marks.workflow-audit.v1:${workflowKey}`
        )
      ),
    [workflowKey]
  );
  const queue = useMemo(
    () =>
      new PendingEditQueue(
        createStoragePendingEditStore(`schoolpilot.marks.pending.v1:${workflowKey}`)
      ),
    [workflowKey]
  );

  const [workflowRevision, setWorkflowRevision] = useState(0);
  const [focusedAssessmentId, setFocusedAssessmentId] = useState<string | null>(null);
  const [override, setOverride] = useState<MarkOverride | null>(null);

  const assessmentStatusOf = useCallback(
    (assessmentId: string | null): string =>
      assessments.find((row) => row.id === assessmentId)?.status ?? 'open',
    [assessments]
  );

  const columnStates = useMemo<Readonly<Record<string, WorkflowState>>>(() => {
    // The workflow is mutable state outside React; the revision is what makes this recompute.
    void workflowRevision;
    if (!group) return {};
    const states: Record<string, WorkflowState> = {};
    for (const column of columns) {
      if (!column.assessmentId) continue;
      states[column.key] = workflow.state(
        column.assessmentId,
        group.id,
        assessmentStatusOf(column.assessmentId)
      );
    }
    return states;
  }, [columns, group, workflow, assessmentStatusOf, workflowRevision]);

  const editableColumns = useMemo(() => {
    const editable = new Set<string>();
    for (const column of columns) {
      const state = columnStates[column.key] ?? 'open';
      const granted =
        override !== null &&
        group !== null &&
        column.assessmentId === override.assessmentId &&
        group.id === override.teachingGroupId;
      if (!isReadOnly(state) || granted) editable.add(column.key);
    }
    return editable;
  }, [columns, columnStates, override, group]);

  const activeAssessmentId = useMemo(() => {
    if (
      focusedAssessmentId !== null &&
      columns.some((column) => column.assessmentId === focusedAssessmentId)
    ) {
      return focusedAssessmentId;
    }
    return columns.find((column) => column.assessmentId !== null)?.assessmentId ?? null;
  }, [focusedAssessmentId, columns]);

  const workflowState =
    activeAssessmentId === null ? null : (columnStates[activeAssessmentId] ?? null);

  // ---------------------------------------------------------------------- draft

  const draftKey = `${group?.id ?? ''}|${period?.id ?? ''}|${columns
    .map((column) => column.key)
    .join(',')}`;
  const [draft, setDraft] = useState<{ key: string; entries: Record<string, CellEntry> }>({
    key: '',
    entries: {},
  });
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pasteMessage, setPasteMessage] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<readonly string[]>([]);
  const [pendingCount, setPendingCount] = useState(() => queue.size());
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(() => !isOnline());
  const [page, setPageState] = useState(0);

  const draftEntries = useMemo(
    () => (draft.key === draftKey ? draft.entries : NO_ENTRIES),
    [draft, draftKey]
  );

  const entryOf = useCallback(
    (rowIndex: number, columnIndex: number): CellEntry => {
      const row = rows[rowIndex];
      const column = columns[columnIndex];
      if (!row || !column) return { score: '', status: 'present' };
      const key = `${row.enrolmentId}|${column.key}`;
      const drafted = draftEntries[key];
      if (drafted) return drafted;
      const stored = column.assessmentId
        ? storedByCell.get(storedKey(column.assessmentId, row.enrolmentId))
        : undefined;
      return stored
        ? { score: stored.score ?? '', status: stored.status }
        : { score: '', status: 'present' };
    },
    [rows, columns, draftEntries, storedByCell]
  );

  /** The stored value of a cell, which is what a write's conflict check compares against. */
  const storedScoreOf = useCallback(
    (rowIndex: number, columnIndex: number): string | null => {
      const row = rows[rowIndex];
      const column = columns[columnIndex];
      if (!row || !column?.assessmentId) return null;
      return storedByCell.get(storedKey(column.assessmentId, row.enrolmentId))?.score ?? null;
    },
    [rows, columns, storedByCell]
  );

  /** The marks one learner's row contributes to the engine; a blank present cell contributes none. */
  const marksForRow = useCallback(
    (rowIndex: number): RowMark[] => {
      const row = rows[rowIndex];
      if (!row) return [];
      const result: RowMark[] = [];
      columns.forEach((column, columnIndex) => {
        if (!column.assessmentId) return;
        const entry = entryOf(rowIndex, columnIndex);
        const check = entry.score.trim() === '' ? null : checkScore(entry.score, column.max);
        const hasScore = check !== null && check.ok;
        if (!hasScore && entry.status === 'present') return;
        result.push({
          slot: column.slot,
          assessment: column.assessmentId,
          score: hasScore ? check.score : undefined,
          maxScore: column.max === null ? undefined : String(column.max),
          status: entry.status,
        });
      });
      return result;
    },
    [rows, columns, entryOf]
  );

  const verdicts = useMemo(
    () => rows.map((_, rowIndex) => evaluateRow(scheme.definition, marksForRow(rowIndex))),
    [rows, scheme.definition, marksForRow]
  );

  const statusOf = useCallback(
    (rowIndex: number, columnIndex: number): CellStatus => {
      const row = rows[rowIndex];
      const column = columns[columnIndex];
      if (!row || !column) return cellStatus('valid', null);
      const entry = entryOf(rowIndex, columnIndex);

      if (column.max === null) {
        return cellStatus(
          'incomplete_scheme',
          'The scheme does not declare a maximum for this column, so no score can be accepted.'
        );
      }
      if (entry.score.trim() !== '') {
        const check = checkScore(entry.score, column.max);
        if (!check.ok) {
          return cellStatus(check.code === 'out_of_range' ? 'out_of_range' : 'invalid', check.message);
        }
      }

      const verdict = verdicts[rowIndex];
      const key = cellKey(column.slot, column.assessmentId ?? column.slot);
      const blocked = verdict?.blocked.get(key);
      if (blocked !== undefined) return cellStatus('incomplete_scheme', blocked);

      // A slot with no mark carries no assessment id, so the engine flags it by slot alone.
      const flaggedMissing =
        verdict?.missing.has(key) === true ||
        verdict?.missing.has(cellKey(column.slot, column.slot)) === true;

      const state = columnStates[column.key] ?? 'open';
      if (state === 'locked' || state === 'published') {
        return cellStatus(
          'locked',
          `Marks for this assessment are ${state}. A change needs a reason and is audited.`
        );
      }
      if (state === 'moderated') {
        return cellStatus(
          'moderated',
          'These marks are moderated. The original and the moderated value are both kept.'
        );
      }

      if (entry.score.trim() === '' && entry.status === 'present') {
        return cellStatus(
          'missing',
          flaggedMissing
            ? 'This assessment has no mark. The scheme needs it before the learner can be graded.'
            : 'No mark has been entered for this assessment.'
        );
      }
      return cellStatus('valid', null);
    },
    [rows, columns, entryOf, verdicts, columnStates]
  );

  const summary = useMemo(() => {
    const counts = {
      valid: 0,
      missing: 0,
      invalid: 0,
      out_of_range: 0,
      incomplete_scheme: 0,
      locked: 0,
      moderated: 0,
    };
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
        counts[statusOf(rowIndex, columnIndex).code] += 1;
      }
    }
    return counts;
  }, [rows, columns, statusOf]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);

  const setPage = useCallback(
    (next: number) => {
      setPageState(Math.max(0, Math.min(next, Math.max(0, Math.ceil(rows.length / pageSize) - 1))));
      setRefusal(null);
    },
    [rows.length, pageSize]
  );

  // ------------------------------------------------------------------- writing

  /** A stable way for the write path to tell React the mutable workflow changed. */
  const bumpWorkflow = useCallback(() => setWorkflowRevision((current) => current + 1), []);

  /** A stable way for the write path to report a cell another writer moved meanwhile. */
  const noteConflict = useCallback(
    (message: string) => setConflicts((current) => [...current, message]),
    []
  );

  /** The latest values the write path needs, so a queued flush is never a stale closure. */
  const contextRef = useRef({
    repository,
    group,
    columns,
    scope,
    workflow,
    queue,
    actorId,
    assessmentStatusOf,
    bumpWorkflow,
    noteConflict,
    isOnline,
  });

  useEffect(() => {
    contextRef.current = {
      repository,
      group,
      columns,
      scope,
      workflow,
      queue,
      actorId,
      assessmentStatusOf,
      bumpWorkflow,
      noteConflict,
      isOnline,
    };
  }, [
    repository,
    group,
    columns,
    scope,
    workflow,
    queue,
    actorId,
    assessmentStatusOf,
    bumpWorkflow,
    noteConflict,
    isOnline,
  ]);

  const findStoredMark = useCallback(
    async (repositoryIn: WritableQueryRepository, edit: PendingEdit) => {
      const found = await repositoryIn.list('mark', {
        where: {
          assessment_id: edit.assessmentId,
          enrolment_id: edit.enrolmentId,
          learning_area_id: edit.learningAreaId,
        },
        limit: 1,
      });
      return found.items[0] ?? null;
    },
    []
  );

  const writeEdit = useCallback(
    async (edit: PendingEdit): Promise<void> => {
      const current = contextRef.current;
      const groupRow = current.group;
      if (!groupRow) throw new MarkEntryError('not_ready', 'No teaching group is selected.');
      // Offline the edit stays in the durable queue and is replayed on reconnect; it is not lost.
      if (!current.isOnline()) {
        throw new MarkEntryError(
          'offline',
          'Offline: the edit is kept and sent when the connection returns.'
        );
      }
      assertCanWrite(current.scope);
      assertGroupInScope(current.scope, groupRow.id);

      const status = current.assessmentStatusOf(edit.assessmentId);
      const state = current.workflow.state(edit.assessmentId, groupRow.id, status);
      // The rule the acceptance names: a locked (or moderated, or published) cell needs a reason,
      // and that is decided here, not by whether the input was rendered read-only.
      assertOverrideReason(state, edit.reason);

      const repositoryIn = current.repository;
      const existing = await findStoredMark(repositoryIn, edit);
      const reason = edit.reason ?? undefined;

      if (existing) {
        if (
          edit.baseScore !== null &&
          existing.score !== edit.baseScore &&
          existing.score !== (edit.score ?? undefined)
        ) {
          const column = current.columns.find((entry) => entry.assessmentId === edit.assessmentId);
          current.noteConflict(
            `Another teacher changed ${column?.label ?? edit.assessmentId} after this cell was loaded; your value replaced theirs.`
          );
        }
        await repositoryIn.update(
          'mark',
          asId<'mark'>(existing.id),
          {
            ...(edit.score === null ? {} : { score: edit.score }),
            status_code: edit.status,
            version: existing.version + 1,
            entered_at: new Date().toISOString(),
          },
          { expectedVersion: existing.rowVersion, ...(reason === undefined ? {} : { reason }) }
        );
        if (reason !== undefined) {
          const column = current.columns.find((entry) => entry.assessmentId === edit.assessmentId);
          current.workflow.moderate(edit.assessmentId, groupRow.id, `${edit.enrolmentId}|${column?.key ?? edit.assessmentId}`, {
            original: existing.score ?? '',
            moderated: edit.score ?? '',
            reason,
            actorId: current.actorId,
            at: new Date().toISOString(),
          });
          current.bumpWorkflow();
        }
        return;
      }

      try {
        await repositoryIn.create(
          'mark',
          {
            institution_id: groupRow.institution_id,
            assessment_id: asId<'assessment'>(edit.assessmentId),
            enrolment_id: asId<'enrolment'>(edit.enrolmentId),
            learning_area_id: asId<'learning_area'>(edit.learningAreaId),
            status_code: edit.status,
            ...(edit.score === null ? {} : { score: edit.score }),
            version: 1,
            entered_at: new Date().toISOString(),
          },
          reason === undefined ? undefined : { reason }
        );
      } catch (error) {
        // Another writer created the row between the read and the create: update it instead, so the
        // edit lands once rather than being retried forever.
        const raced = await findStoredMark(repositoryIn, edit);
        if (!raced) throw error;
        await repositoryIn.update(
          'mark',
          asId<'mark'>(raced.id),
          {
            ...(edit.score === null ? {} : { score: edit.score }),
            status_code: edit.status,
            version: raced.version + 1,
            entered_at: new Date().toISOString(),
          },
          { expectedVersion: raced.rowVersion, ...(reason === undefined ? {} : { reason }) }
        );
      }
    },
    [findStoredMark]
  );

  const flush = useCallback(async (): Promise<FlushReport> => {
    setSaving(true);
    try {
      const report = await flushPendingEdits(contextRef.current.queue, writeEdit);
      setPendingCount(contextRef.current.queue.size());
      return report;
    } finally {
      setSaving(false);
    }
  }, [writeEdit]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushRef.current();
    }, debounceMs);
  }, [debounceMs]);

  // A reconnect, or a screen that opens with edits left behind, writes them before anything else.
  useEffect(() => {
    const onOnline = () => {
      setOffline(false);
      void flushRef.current();
    };
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    if (contextRef.current.queue.size() > 0) void flushRef.current();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  // ------------------------------------------------------------------ mutation

  const refusalFor = useCallback(
    (column: SchemeColumn): string | null => {
      const state = columnStates[column.key] ?? 'open';
      const granted =
        override !== null &&
        group !== null &&
        column.assessmentId === override.assessmentId &&
        group.id === override.teachingGroupId;
      if (isReadOnly(state) && !granted) {
        return `Marks for this assessment are ${state}. A change needs a reason and is audited.`;
      }
      return null;
    },
    [columnStates, override, group]
  );

  const draftCell = useCallback(
    (rowIndex: number, columnIndex: number, patch: Partial<CellEntry>) => {
      const row = rows[rowIndex];
      const column = columns[columnIndex];
      if (!row || !column) return null;
      const cell = `${row.enrolmentId}|${column.key}`;
      const previous = entryOf(rowIndex, columnIndex);
      const next: CellEntry = { ...previous, ...patch };
      setDraft((current) => ({
        key: draftKey,
        entries: { ...(current.key === draftKey ? current.entries : {}), [cell]: next },
      }));
      return { row, column, next, previous };
    },
    [rows, columns, entryOf, draftKey]
  );

  const guard = useCallback(
    (column: SchemeColumn): boolean => {
      if (!group) return false;
      try {
        assertGroupInScope(scope, group.id);
        assertCanWrite(scope);
      } catch (error) {
        setRefusal(error instanceof Error ? error.message : 'This mark cannot be changed.');
        return false;
      }
      const refused = refusalFor(column);
      if (refused !== null) {
        setRefusal(refused);
        return false;
      }
      setRefusal(null);
      return true;
    },
    [group, scope, refusalFor]
  );

  const enqueueCell = useCallback(
    (
      rowIndex: number,
      columnIndex: number,
      row: GridRow,
      column: SchemeColumn,
      values: { readonly score: string | null; readonly status: MarkStatus }
    ) => {
      if (!group || !column.assessmentId || !learningAreaId) return;
      const granted =
        override !== null &&
        group.id === override.teachingGroupId &&
        column.assessmentId === override.assessmentId;
      queue.enqueue({
        institutionId: group.institution_id,
        assessmentId: column.assessmentId,
        enrolmentId: row.enrolmentId,
        learningAreaId,
        markId: storedByCell.get(storedKey(column.assessmentId, row.enrolmentId))?.id ?? null,
        baseScore: storedScoreOf(rowIndex, columnIndex),
        score: values.score,
        status: values.status,
        reason: granted ? override.reason : null,
      });
      setPendingCount(queue.size());
      scheduleFlush();
    },
    [group, learningAreaId, override, queue, storedByCell, storedScoreOf, scheduleFlush]
  );

  const setScore = useCallback(
    (rowIndex: number, columnIndex: number, raw: string) => {
      const row = rows[rowIndex];
      const column = columns[columnIndex];
      if (!row || !column) return;
      if (!guard(column)) return;

      const next = draftCell(rowIndex, columnIndex, { score: raw });
      if (!next) return;

      const check = checkScore(raw, column.max);
      if (!check.ok) {
        // The cell keeps what was typed so the teacher can see it and the reason; nothing is queued.
        return;
      }
      enqueueCell(rowIndex, columnIndex, row, column, {
        score: check.score,
        status: next.next.status,
      });
    },
    [rows, columns, guard, draftCell, enqueueCell]
  );

  const setStatus = useCallback(
    (rowIndex: number, columnIndex: number, status: MarkStatus) => {
      const row = rows[rowIndex];
      const column = columns[columnIndex];
      if (!row || !column) return;
      if (!guard(column)) return;

      const next = draftCell(rowIndex, columnIndex, { status });
      if (!next) return;

      const score = next.next.score.trim();
      const check = score === '' ? null : checkScore(score, column.max);
      if (check !== null && !check.ok) return;

      enqueueCell(rowIndex, columnIndex, row, column, {
        score: check !== null && check.ok ? check.score : null,
        status,
      });
    },
    [rows, columns, guard, draftCell, enqueueCell]
  );

  const paste = useCallback(
    (anchorRow: number, anchorColumn: number, text: string): PastePlan => {
      const plan = planPaste(text, anchorRow, anchorColumn, {
        rowCount: rows.length,
        columnCount: columns.length,
        maxFor: (columnIndex) => columns[columnIndex]?.max ?? null,
        blockedReason: (_rowIndex, columnIndex) => {
          const column = columns[columnIndex];
          if (!column) return 'That column is not part of this grid.';
          return refusalFor(column);
        },
      });

      if (group) {
        try {
          assertGroupInScope(scope, group.id);
          assertCanWrite(scope);
        } catch (error) {
          setRefusal(error instanceof Error ? error.message : 'This mark cannot be changed.');
          return plan;
        }
      }

      for (const entry of plan.accepted) {
        const row = rows[entry.rowIndex];
        const column = columns[entry.columnIndex];
        if (!row || !column) continue;
        const previous = entryOf(entry.rowIndex, entry.columnIndex);
        const cell = `${row.enrolmentId}|${column.key}`;
        setDraft((current) => ({
          key: draftKey,
          entries: {
            ...(current.key === draftKey ? current.entries : {}),
            [cell]: { ...previous, score: entry.score },
          },
        }));
        enqueueCell(entry.rowIndex, entry.columnIndex, row, column, {
          score: entry.score,
          status: previous.status,
        });
      }

      if (plan.accepted.length > 0) scheduleFlush();
      setPasteMessage(pasteSummary(plan));
      setRefusal(null);
      return plan;
    },
    [
      rows,
      columns,
      refusalFor,
      group,
      scope,
      entryOf,
      draftKey,
      enqueueCell,
      scheduleFlush,
    ]
  );

  const beginOverride = useCallback(
    (assessmentId: string, reason: string) => {
      if (!group) return;
      if (reason.trim() === '') {
        setRefusal('An override needs a reason.');
        return;
      }
      setRefusal(null);
      setOverride({ assessmentId, teachingGroupId: group.id, reason: reason.trim() });
    },
    [group]
  );

  const endOverride = useCallback(() => setOverride(null), []);

  const advance = useCallback(
    (to: WorkflowState, reason?: string) => {
      if (!group || activeAssessmentId === null) return;
      try {
        workflow.advance(activeAssessmentId, group.id, assessmentStatusOf(activeAssessmentId), to, {
          actorId,
          at: new Date().toISOString(),
          reason: reason ?? null,
        });
        setRefusal(null);
        if (!requiresOverrideReason(to)) setOverride(null);
        setWorkflowRevision((current) => current + 1);
      } catch (error) {
        setRefusal(error instanceof Error ? error.message : 'The workflow was not changed.');
      }
    },
    [group, activeAssessmentId, workflow, assessmentStatusOf, actorId]
  );

  const moderations = useMemo(() => {
    // The workflow is mutable state outside React; the revision is what makes this recompute.
    void workflowRevision;
    if (!group || activeAssessmentId === null) return {};
    return workflow.moderations(activeAssessmentId, group.id);
  }, [workflow, group, activeAssessmentId, workflowRevision]);

  const originalOf = useCallback(
    (rowIndex: number, columnIndex: number): string | null => {
      const row = rows[rowIndex];
      const column = columns[columnIndex];
      if (!row || !column) return null;
      const record = moderations[`${row.enrolmentId}|${column.key}`];
      return record?.original ?? null;
    },
    [rows, columns, moderations]
  );

  const workflowAudit = useMemo(() => {
    // The workflow is mutable state outside React; the revision is what makes this recompute.
    void workflowRevision;
    return group ? workflow.audit(undefined, group.id) : [];
  }, [workflow, group, workflowRevision]);

  return {
    isLoading: canonicalLoading || schemeQuery.status === 'loading',
    groupName: group?.name ?? null,
    periodName: period?.name ?? null,
    scope,
    schemeCode: scheme.code,
    schemeSource: scheme.source,
    columns,
    rows,
    page: currentPage,
    pageCount,
    pageSize,
    setPage,
    columnStates,
    editableColumns,
    focusedAssessmentId: activeAssessmentId,
    setFocusedAssessmentId,
    workflowState,
    needsOverrideReason: workflowState !== null && requiresOverrideReason(workflowState),
    override,
    beginOverride,
    endOverride,
    advance,
    entryOf,
    statusOf,
    originalOf,
    setScore,
    setStatus,
    paste,
    flushNow: flush,
    pendingCount,
    offline,
    saving,
    refusal,
    pasteMessage,
    conflicts,
    summary,
    workflowAudit,
  };
}
