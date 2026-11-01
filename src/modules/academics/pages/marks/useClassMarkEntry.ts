// ABOUTME: The data and save path of the whole-class marks grid. It builds the learners x subjects
// ABOUTME: matrix from the class's teaching groups, resolves the teacher's scope, and writes each
// ABOUTME: dirty cell to the canonical mark row on Save.

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { RepositoryRow } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import { useCanonicalSessionActor } from '@/data/useCanonicalSessionActor';

import { useCanonicalAcademics } from '../../data/useCanonicalAcademics';
import type { MarkStatus } from '@/domain/assessment/engine';
import {
  buildClassGrid,
  cellKey,
  type ClassGrid,
  type GridAssessment,
} from './classGrid';
import { decimalString } from './scheme';
import { resolveTeachingScope, type TeachingScope } from './teachingScope';

export interface ClassMarkEntryOptions {
  readonly periodId: Id<'academic_period'> | null;
  readonly levelId: Id<'level'> | null;
  readonly classGroupId: Id<'class_group'> | null;
  readonly examKey: string | null;
  readonly learningAreaId: string | null;
  readonly search: string;
  readonly actorId?: string;
  readonly role?: string | null;
}

export interface CellValue {
  readonly score: string;
  readonly status: MarkStatus;
}

export interface CellView {
  readonly value: CellValue;
  readonly stored: boolean;
  readonly invalid: string | null;
  readonly nonMember: boolean;
  readonly readOnly: boolean;
  readonly reason: string | null;
  readonly max: number | null;
}

export interface ClassMarkEntryState {
  readonly isLoading: boolean;
  readonly grid: ClassGrid;
  readonly scope: TeachingScope;
  readonly periodName: string | null;
  readonly periodOptions: readonly { readonly id: string; readonly name: string; readonly status: string }[];
  readonly levelOptions: readonly { readonly id: string; readonly name: string }[];
  readonly classGroupOptions: readonly {
    readonly id: string;
    readonly name: string;
    readonly levelId: string;
    /** `Grade 7 · A`: a stream name alone repeats across levels, so every picker says the level too. */
    readonly label: string;
  }[];
  readonly reachableClassGroupIds: ReadonlySet<string>;
  readonly canWrite: boolean;
  readonly cellOf: (rowId: string, columnKey: string) => CellView;
  readonly setScore: (rowId: string, columnKey: string, raw: string) => void;
  readonly setStatus: (rowId: string, columnKey: string, status: MarkStatus) => void;
  readonly saveAll: () => Promise<{ saved: number; failed: number; firstError: string | null }>;
  readonly dirtyCount: number;
  readonly saving: boolean;
  readonly summary: { readonly valid: number; readonly missing: number; readonly invalid: number; readonly notMember: number };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function membershipDate(period: { readonly start_date: string; readonly end_date: string } | undefined): string {
  const day = today();
  if (!period) return day;
  if (day < period.start_date) return period.start_date;
  if (day > period.end_date) return period.end_date;
  return day;
}

const cellMarkKey = (assessmentId: string, enrolmentId: string, learningAreaId: string): string =>
  `${assessmentId}|${enrolmentId}|${learningAreaId}`;

const EMPTY_ENTRIES: Readonly<Record<string, CellValue>> = {};

/** The user-facing name of a mark status. */
export const MARK_STATUS_OPTIONS: readonly MarkStatus[] = [
  'present',
  'absent',
  'exempt',
  'incomplete',
  'malpractice',
];

export function useClassMarkEntry(options: ClassMarkEntryOptions): ClassMarkEntryState {
  const canonical = useCanonicalAcademics();
  const session = useCanonicalSessionActor();
  const actorId = options.actorId ?? session.actorId;
  const role = options.role === undefined ? session.role : options.role;

  const scope = useMemo<TeachingScope>(
    () =>
      resolveTeachingScope({
        role,
        actorId,
        staff: canonical.staff.map((row) => ({ id: row.id, userId: row.user_id ?? null })),
        groups: canonical.teachingGroups.map((row) => ({
          id: row.id,
          teacherIds: row.teacher_ids ?? [],
          classGroupIds: row.class_group_ids ?? [],
        })),
        assignments: canonical.teachingAssignments.map((row) => ({
          staffId: row.staff_id,
          teachingGroupId: row.teaching_group_id,
          validFrom: row.valid_from,
          validTo: row.valid_to ?? null,
        })),
        classGroups: canonical.classGroups.map((row) => ({
          id: row.id,
          homeroomTeacherIds: row.homeroom_teacher_ids ?? [],
        })),
      }),
    [role, actorId, canonical.staff, canonical.teachingGroups, canonical.teachingAssignments, canonical.classGroups]
  );

  const period = canonical.academicPeriods.find((row) => row.id === options.periodId) ?? null;
  const at = membershipDate(period ?? undefined);

  const assessments = useMemo<readonly GridAssessment[]>(
    () =>
      canonical.assessments
        .filter(
          (row) =>
            (options.periodId === null || row.academic_period_id === options.periodId) &&
            row.status !== 'draft'
        )
        .map((row) => ({
          id: row.id,
          name: row.name,
          kind: row.kind,
          slot: row.scheme_slot ?? null,
          learningAreaIds: row.learning_area_ids ?? [],
          classGroupIds: row.class_group_ids ?? [],
          levelIds: row.level_ids ?? [],
          maxScore: row.max_score ?? null,
          status: row.status,
        })),
    [canonical.assessments, options.periodId]
  );

  const grid = useMemo<ClassGrid>(
    () =>
      buildClassGrid({
        assessments,
        groups: canonical.teachingGroups.map((row) => ({
          id: row.id,
          learningAreaId: row.learning_area_id,
          classGroupIds: row.class_group_ids ?? [],
        })),
        enrolments: canonical.enrolments.map((row) => ({
          id: row.id,
          learnerId: row.learner_id,
          classGroupId: row.class_group_id,
          status: row.status,
        })),
        learners: canonical.learners.map((row) => ({
          id: row.id,
          name:
            `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim() ||
            row.admission_number,
          admissionNumber: row.admission_number,
        })),
        memberships: canonical.teachingGroupMembers.map((row) => ({
          teachingGroupId: row.teaching_group_id,
          enrolmentId: row.enrolment_id,
          validFrom: row.valid_from,
          validTo: row.valid_to ?? null,
        })),
        classGroups: canonical.classGroups.map((row) => ({
          id: row.id,
          name: row.name,
          levelId: row.level_id,
        })),
        learningAreaNames: new Map(
          canonical.learningAreas.map((row) => [row.id, row.name] as const)
        ),
        scope,
        periodId: options.periodId,
        levelId: options.levelId,
        classGroupId: options.classGroupId,
        examKey: options.examKey,
        learningAreaId: options.learningAreaId,
        search: options.search,
        at,
      }),
    [
      assessments,
      canonical.teachingGroups,
      canonical.enrolments,
      canonical.learners,
      canonical.teachingGroupMembers,
      canonical.classGroups,
      canonical.learningAreas,
      scope,
      options.periodId,
      options.levelId,
      options.classGroupId,
      options.examKey,
      options.learningAreaId,
      options.search,
      at,
    ]
  );

  const stored = useMemo(() => {
    const byCell = new Map<string, RepositoryRow<'mark'>>();
    const assessmentIds = new Set(grid.columns.map((column) => column.assessmentId).filter(Boolean));
    for (const mark of canonical.marks) {
      if (!assessmentIds.has(mark.assessment_id)) continue;
      byCell.set(
        cellMarkKey(mark.assessment_id, mark.enrolment_id, mark.learning_area_id),
        mark
      );
    }
    return byCell;
  }, [canonical.marks, grid.columns]);

  // A write is reflected locally at once; the canonical query catches up in the background.
  const [written, setWritten] = useState<ReadonlyMap<string, RepositoryRow<'mark'>>>(new Map());
  const [draft, setDraft] = useState<{
    readonly key: string;
    readonly entries: Readonly<Record<string, CellValue>>;
  }>({ key: '', entries: EMPTY_ENTRIES });
  const [saving, setSaving] = useState(false);
  const [writtenKey, setWrittenKey] = useState('');

  const gridKey = `${options.periodId ?? ''}|${options.levelId ?? ''}|${options.classGroupId ?? ''}|${options.examKey ?? ''}|${options.learningAreaId ?? ''}`;
  useEffect(() => {
    setDraft({ key: gridKey, entries: EMPTY_ENTRIES });
    setWritten(new Map());
    setWrittenKey(gridKey);
  }, [gridKey]);
  const currentWritten = useMemo(
    () => (writtenKey === gridKey ? written : new Map<string, RepositoryRow<'mark'>>()),
    [writtenKey, gridKey, written]
  );

  const markOf = useCallback(
    (rowId: string, columnKey: string): RepositoryRow<'mark'> | null => {
      const column = grid.columns.find((candidate) => candidate.key === columnKey);
      if (!column?.assessmentId) return null;
      const key = cellMarkKey(column.assessmentId, rowId, column.learningAreaId);
      return currentWritten.get(key) ?? stored.get(key) ?? null;
    },
    [grid.columns, currentWritten, stored]
  );

  const entries = draft.key === gridKey ? draft.entries : EMPTY_ENTRIES;

  const cellOf = useCallback(
    (rowId: string, columnKey: string): CellView => {
      const column = grid.columns.find((candidate) => candidate.key === columnKey);
      const storedMark = markOf(rowId, columnKey);
      const entry = entries[cellKey(rowId, columnKey)] ?? {
        score: storedMark?.score ?? '',
        status: storedMark?.status_code ?? 'present',
      };
      const nonMember = grid.nonMembership.has(cellKey(rowId, columnKey));
      const assessmentOpen = column?.assessmentStatus === 'open' || column?.assessmentStatus === 'draft';
      const readOnly = !scope.canWrite || !assessmentOpen || nonMember || column?.assessmentId === null;
      const numeric = entry.score.trim() === '' ? null : decimalString(entry.score);
      let invalid: string | null = null;
      if (entry.score.trim() !== '' && numeric === null) invalid = 'Not a number';
      if (numeric !== null && column && column.max !== null && Number(numeric) > column.max) {
        invalid = `Above the maximum of ${column.max}`;
      }
      return {
        value: entry,
        stored: storedMark !== null,
        invalid,
        nonMember,
        readOnly,
        max: column?.max ?? null,
        reason: nonMember
          ? 'Not registered for this subject'
          : !assessmentOpen
            ? 'The assessment is not open for entry'
            : !scope.canWrite
              ? scope.reason
              : null,
      };
    },
    [grid.columns, grid.nonMembership, markOf, entries, scope]
  );

  const setCell = useCallback(
    (rowId: string, columnKey: string, patch: Partial<CellValue>) => {
      const view = cellOf(rowId, columnKey);
      if (view.readOnly) return;
      setDraft((current) => {
        const base = current.key === gridKey ? current.entries : {};
        const key = cellKey(rowId, columnKey);
        return {
          key: gridKey,
          entries: {
            ...base,
            [key]: {
              score: view.value.score,
              status: view.value.status,
              ...patch,
            },
          },
        };
      });
    },
    [cellOf, gridKey]
  );

  const setScore = useCallback(
    (rowId: string, columnKey: string, raw: string) => setCell(rowId, columnKey, { score: raw }),
    [setCell]
  );
  const setStatus = useCallback(
    (rowId: string, columnKey: string, status: MarkStatus) => setCell(rowId, columnKey, { status }),
    [setCell]
  );

  const summary = useMemo(() => {
    let valid = 0;
    let missing = 0;
    let invalid = 0;
    let notMember = 0;
    for (const row of grid.rows) {
      for (const column of grid.columns) {
        const view = cellOf(row.id, column.key);
        if (view.nonMember) notMember += 1;
        else if (view.invalid) invalid += 1;
        else if (view.value.score.trim() === '' && view.value.status === 'present') missing += 1;
        else valid += 1;
      }
    }
    return { valid, missing, invalid, notMember };
  }, [grid.rows, grid.columns, cellOf]);

  const dirtyCount = Object.keys(entries).length;

  const saveAll = useCallback(async () => {
    if (!scope.canWrite) {
      return { saved: 0, failed: 0, firstError: scope.reason };
    }
    setSaving(true);
    let saved = 0;
    let failed = 0;
    let firstError: string | null = null;
    const nextWritten = new Map(currentWritten);
    for (const row of grid.rows) {
      for (const column of grid.columns) {
        const key = cellKey(row.id, column.key);
        const entry = entries[key];
        if (!entry) continue;
        const view = cellOf(row.id, column.key);
        if (view.readOnly || view.invalid) continue;
        if (!column.assessmentId || !canonical.institutionId) continue;
        const existing = markOf(row.id, column.key);
        try {
          const payload = {
            institution_id: asId<'institution'>(canonical.institutionId),
            assessment_id: asId<'assessment'>(column.assessmentId),
            enrolment_id: asId<'enrolment'>(row.enrolmentId),
            learning_area_id: asId<'learning_area'>(column.learningAreaId),
            status_code: entry.status,
            ...(entry.score.trim() === '' ? {} : { score: entry.score.trim() }),
            version: existing ? existing.version + 1 : 1,
            entered_at: new Date().toISOString(),
          };
          const mark = existing
            ? await canonical.repository.update('mark', existing.id, payload, {
                expectedVersion: existing.rowVersion,
              })
            : await canonical.repository.create('mark', payload);
          nextWritten.set(
            cellMarkKey(column.assessmentId, row.enrolmentId, column.learningAreaId),
            mark
          );
          saved += 1;
        } catch (error) {
          failed += 1;
          if (firstError === null) {
            firstError = error instanceof Error ? error.message : String(error);
          }
        }
      }
    }
    setWritten(nextWritten);
    setWrittenKey(gridKey);
    setDraft({ key: gridKey, entries: {} });
    setSaving(false);
    return { saved, failed, firstError };
  }, [scope, grid.rows, grid.columns, entries, cellOf, markOf, canonical.repository, canonical.institutionId, currentWritten, gridKey]);

  const reachableClassGroupIds = useMemo(() => {
    if (scope.mode === 'all') return new Set(canonical.classGroups.map((row) => row.id));
    const ids = new Set<string>();
    for (const group of canonical.teachingGroups) {
      if (!scope.groupIds.has(group.id)) continue;
      for (const classGroupId of group.class_group_ids ?? []) ids.add(classGroupId);
    }
    return ids;
  }, [scope, canonical.classGroups, canonical.teachingGroups]);

  return {
    isLoading: canonical.isLoading,
    grid,
    scope,
    periodName: period?.name ?? null,
    periodOptions: canonical.academicPeriods.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
    })),
    levelOptions: canonical.levels.map((row) => ({ id: row.id, name: row.name })),
    classGroupOptions: canonical.classGroups.map((row) => {
      const level = canonical.levels.find((candidate) => candidate.id === row.level_id);
      return {
        id: row.id,
        name: row.name,
        levelId: row.level_id,
        label: level === undefined ? row.name : `${level.name} · ${row.name}`,
      };
    }),
    reachableClassGroupIds,
    canWrite: scope.canWrite,
    cellOf,
    setScore,
    setStatus,
    saveAll,
    dirtyCount,
    saving,
    summary,
  };
}
