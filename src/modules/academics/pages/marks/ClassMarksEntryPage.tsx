// ABOUTME: The whole-class and single-student marks grids: every learner (or one learner) against
// ABOUTME: the class's subjects for one exam, with the teacher scope applied to subjects, learners and
// ABOUTME: writability. A cell saves to the canonical mark row on Save.

import React, { useEffect, useMemo, useState } from 'react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { printReport } from '@/components/reports';
import { currentPeriodOf, periodLabel } from '@/utils/academicLabels';
import type { MarkStatus } from '@/domain/assessment/engine';
import type { Id } from '@/domain/ids';

import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import { MarkEntryGrid } from './MarkEntryGrid';
import type { CellStatus, SchemeColumn, WorkflowState } from './types';
import { useClassMarkEntry } from './useClassMarkEntry';

export interface ClassMarksEntryPageContentProps {
  /** `class` shows every learner; `student` shows the chosen learner only. */
  readonly initialMode?: 'class' | 'student';
}

const statusFor = (entry: ReturnType<typeof useClassMarkEntry>, rowId: string, columnKey: string): CellStatus => {
  const view = entry.cellOf(rowId, columnKey);
  if (view.nonMember) {
    return { code: 'locked', label: 'Not registered', reason: view.reason, tone: 'info' };
  }
  if (view.invalid !== null) {
    return {
      code: view.invalid.startsWith('Above') ? 'out_of_range' : 'invalid',
      label: view.invalid,
      reason: view.invalid,
      tone: 'danger',
    };
  }
  if (view.readOnly) {
    return { code: 'locked', label: 'Read-only', reason: view.reason, tone: 'info' };
  }
  if (view.value.score.trim() === '' && view.value.status === 'present') {
    return { code: 'missing', label: 'Missing', reason: null, tone: 'warning' };
  }
  return { code: 'valid', label: 'Valid', reason: null, tone: 'success' };
};

const workflowOf = (status: string): WorkflowState => {
  if (status === 'published') return 'published';
  if (status === 'moderated') return 'moderated';
  if (status === 'closed') return 'locked';
  return 'open';
};

export const ClassMarksEntryPageContent: React.FC<ClassMarksEntryPageContentProps> = ({
  initialMode = 'class',
}) => {
  const toast = useToast();
  const [mode, setMode] = useState<'class' | 'student'>(initialMode);
  const [periodId, setPeriodId] = useState<Id<'academic_period'> | null>(null);
  const [levelId, setLevelId] = useState<Id<'level'> | null>(null);
  const [classGroupId, setClassGroupId] = useState<Id<'class_group'> | null>(null);
  const [examKey, setExamKey] = useState<string | null>(null);
  const [learningAreaId, setLearningAreaId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const entry = useClassMarkEntry({
    periodId,
    levelId,
    classGroupId,
    examKey,
    learningAreaId,
    search,
  });

  useEffect(() => {
    if (periodId !== null) return;
    const current = currentPeriodOf(entry.periodOptions);
    if (current) setPeriodId(current.id as Id<'academic_period'>);
  }, [periodId, entry.periodOptions]);

  const selectedExam = examKey ?? entry.grid.examKeys[0]?.key ?? '';
  const classOptions = useMemo(
    () =>
      entry.classGroupOptions.filter(
        (group) =>
          entry.reachableClassGroupIds.has(group.id) &&
          (levelId === null || group.levelId === levelId)
      ),
    [entry.classGroupOptions, entry.reachableClassGroupIds, levelId]
  );

  const rows = useMemo(
    () => (mode === 'student' ? entry.grid.rows.filter((row) => row.id === studentId) : entry.grid.rows),
    [mode, studentId, entry.grid.rows]
  );

  const columns = useMemo<SchemeColumn[]>(
    () =>
      entry.grid.columns.map((column) => ({
        key: column.key,
        assessmentId: column.assessmentId,
        slot: column.assessmentName ?? column.learningAreaName,
        label: column.label,
        max: column.max,
        kind: 'learning_area',
        assessmentStatus: column.assessmentStatus,
      })),
    [entry.grid.columns]
  );

  const columnStates = useMemo<Record<string, WorkflowState>>(
    () =>
      Object.fromEntries(
        entry.grid.columns.map((column) => [column.key, workflowOf(column.assessmentStatus)])
      ),
    [entry.grid.columns]
  );

  const editableColumns = useMemo(
    () =>
      new Set(
        entry.grid.columns
          .filter(
            (column) =>
              entry.scope.canWrite &&
              column.assessmentId !== null &&
              (column.assessmentStatus === 'open' || column.assessmentStatus === 'draft')
          )
          .map((column) => column.key)
      ),
    [entry.grid.columns, entry.scope.canWrite]
  );

  const save = async () => {
    const result = await entry.saveAll();
    if (result.failed === 0) {
      toast.showSuccess(`${result.saved} mark(s) saved.`);
    } else {
      toast.showError(`${result.saved} saved, ${result.failed} failed. ${result.firstError ?? ''}`);
    }
  };

  const onPaste = (anchorRow: number, anchorColumn: number, text: string) => {
    const matrix = text
      .replace(/\r/g, '')
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => line.split('\t'));
    matrix.forEach((cells, rowOffset) => {
      const row = rows[anchorRow + rowOffset];
      if (!row) return;
      cells.forEach((cell, columnOffset) => {
        const column = columns[anchorColumn + columnOffset];
        if (!column || !editableColumns.has(column.key)) return;
        entry.setScore(row.id, column.key, cell.trim());
      });
    });
    toast.showInfo?.(`${matrix.length} pasted row(s); review and save.`);
  };

  const { cellOf } = entry;
  const summary = useMemo(() => {
    let valid = 0;
    let missing = 0;
    let invalid = 0;
    let notMember = 0;
    for (const row of rows) {
      for (const column of columns) {
        const view = cellOf(row.id, column.key);
        if (view.nonMember) notMember += 1;
        else if (view.invalid !== null) invalid += 1;
        else if (view.value.score.trim() === '' && view.value.status === 'present') missing += 1;
        else valid += 1;
      }
    }
    return { valid, missing, invalid, notMember };
  }, [rows, columns, cellOf]);

  if (entry.isLoading && entry.grid.rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card
        title={mode === 'class' ? 'Class marks grid' : 'Student marks grid'}
        info="Learners down, the class's subjects across. Choose an exam slot and filter to one subject if needed. Save writes the canonical mark rows; a subject teacher sees only their assigned subjects and a class teacher sees the class read-only."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setMode(mode === 'class' ? 'student' : 'class')}>
              {mode === 'class' ? 'Single student' : 'Whole class'}
            </Button>
            <Button variant="secondary" onClick={() => void printReport()}>
              Print
            </Button>
            <Button onClick={() => void save()} loading={entry.saving} disabled={entry.dirtyCount === 0}>
              Save {entry.dirtyCount > 0 ? `(${entry.dirtyCount})` : ''}
            </Button>
          </div>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Period</span>
            <select
              value={periodId ?? ''}
              onChange={(event) => {
                setPeriodId((event.target.value || null) as Id<'academic_period'> | null);
                setPage(0);
              }}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">Select a period</option>
              {entry.periodOptions.map((period) => (
                <option key={period.id} value={period.id}>
                  {periodLabel({ name: period.name, academicYear: period.academicYear })}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Level / class</span>
            <select
              value={levelId ?? ''}
              onChange={(event) => {
                setLevelId((event.target.value || null) as Id<'level'> | null);
                setClassGroupId(null);
                setStudentId(null);
              }}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All levels</option>
              {entry.levelOptions.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Class / stream</span>
            <select
              value={classGroupId ?? ''}
              onChange={(event) => {
                setClassGroupId((event.target.value || null) as Id<'class_group'> | null);
                setStudentId(null);
                setPage(0);
              }}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All streams in scope</option>
              {classOptions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Exam</span>
            <select
              value={selectedExam}
              onChange={(event) => {
                setExamKey(event.target.value || null);
                setPage(0);
              }}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All exam slots</option>
              {entry.grid.examKeys.map((exam) => (
                <option key={exam.key} value={exam.key}>
                  {exam.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Subject</span>
            <select
              value={learningAreaId ?? ''}
              onChange={(event) => {
                setLearningAreaId(event.target.value || null);
                setPage(0);
              }}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All subjects</option>
              {entry.grid.columns.map((column) => (
                <option key={column.learningAreaId} value={column.learningAreaId}>
                  {column.learningAreaName}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or admission number"
              className="w-full rounded-md border border-surface-border px-3 py-2"
            />
          </label>

          {mode === 'student' ? (
            <label className="text-sm">
              <span className="mb-1 block font-medium text-surface-foreground">Student</span>
              <select
                value={studentId ?? ''}
                onChange={(event) => setStudentId(event.target.value || null)}
                className="w-full rounded-md border border-surface-border px-3 py-2"
              >
                <option value="">Select a learner</option>
                {entry.grid.rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.learnerName} {row.admissionNumber ? `(${row.admissionNumber})` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="flex items-end text-sm text-surface-muted-fg">
            {entry.scope.reason}
          </div>
        </div>

        {!entry.canWrite ? (
          <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {entry.scope.reason}
          </p>
        ) : null}

        {entry.grid.columns.length === 0 || entry.grid.rows.length === 0 ? (
          <p className="py-8 text-center text-surface-muted-fg">
            {periodId === null
              ? 'Choose a period to load the class and its subjects.'
              : entry.grid.rows.length === 0
                ? 'No active learner is in the selected class or scope.'
                : 'No assessment is set up for this exam slot and class. Create the assessments in Exam setup first.'}
          </p>
        ) : mode === 'student' && rows.length === 0 ? (
          <p className="py-8 text-center text-surface-muted-fg">
            Choose a learner above to see every subject of this class in one grid.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="success" size="sm">Valid: {summary.valid}</Badge>
              <Badge variant="warning" size="sm">Missing: {summary.missing}</Badge>
              <Badge variant="danger" size="sm">Invalid: {summary.invalid}</Badge>
              <Badge variant="info" size="sm">Not registered: {summary.notMember}</Badge>
              <span className="text-surface-muted-fg">
                {rows.length} learner(s) × {columns.length} subject(s)
              </span>
            </div>

            <MarkEntryGrid
              columns={columns}
              rows={rows.map((row) => ({
                enrolmentId: row.enrolmentId,
                learnerName: row.learnerName,
                admissionNumber: row.admissionNumber,
              }))}
              page={page}
              pageSize={30}
              onPageChange={setPage}
              entryOf={(rowIndex, columnIndex) => {
                const row = rows[rowIndex];
                const column = columns[columnIndex];
                return row && column
                  ? entry.cellOf(row.id, column.key).value
                  : { score: '', status: 'present' };
              }}
              statusOf={(rowIndex, columnIndex) => {
                const row = rows[rowIndex];
                const column = columns[columnIndex];
                return row && column
                  ? statusFor(entry, row.id, column.key)
                  : { code: 'locked', label: 'Unavailable', reason: null, tone: 'info' };
              }}
              originalOf={() => null}
              editableColumns={editableColumns}
              columnStates={columnStates}
              canWrite={entry.canWrite}
              canEditCell={(rowIndex, columnIndex) => {
                const row = rows[rowIndex];
                const column = columns[columnIndex];
                return row !== undefined && column !== undefined
                  ? !entry.cellOf(row.id, column.key).readOnly
                  : false;
              }}
              onScore={(rowIndex, columnIndex, raw) => {
                const row = rows[rowIndex];
                const column = columns[columnIndex];
                if (row && column) entry.setScore(row.id, column.key, raw);
              }}
              onStatus={(rowIndex, columnIndex, status: MarkStatus) => {
                const row = rows[rowIndex];
                const column = columns[columnIndex];
                if (row && column) entry.setStatus(row.id, column.key, status);
              }}
              onPaste={onPaste}
              emptyMessage="Choose a period and a class to load the grid."
            />
          </>
        )}
      </Card>
    </div>
  );
};

const ClassMarksEntryPage: React.FC<ClassMarksEntryPageContentProps> = (props) => (
  <CanonicalRepositoryProvider>
    <ClassMarksEntryPageContent {...props} />
  </CanonicalRepositoryProvider>
);

export default ClassMarksEntryPage;
