// ABOUTME: Source-level guard for the academics module: no canonical collection is read through
// ABOUTME: the legacy contexts outside the pending list, no useAppData() write remains, and the
// ABOUTME: migrated screens choose their references through the canonical picker and form.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const MODULE_ROOT = join(process.cwd(), 'src', 'modules', 'academics');

/**
 * The legacy collections the canonical registry serves.
 *
 * A page that still reads one through a legacy hook reads canonical data through the old
 * context, which is what this check refuses.
 */
const CANONICAL_LEGACY_COLLECTIONS = [
  'subjects',
  'subject_papers',
  'exam_sessions',
  'exam_paper_settings',
  'grading_schemes',
  'student_exam_results',
  'class_subject_allocations',
  'teacher_subject_assignments',
  'student_subject_enrollments',
  'timetable_entries',
  'academic_years',
  'school_periods',
  'students',
  'class_streams',
  'classes',
  'staff',
  'departments',
  'student_attendance',
] as const;

/** The legacy collections the canonical registry does not model. */
const GAP_LEGACY_COLLECTIONS = [
  'lesson_plans',
  'lesson_notes',
  'weekly_plans',
  'assignments',
  'assignment_submissions',
  'board_exam_results',
  'result_distributions',
  'exam_tokens',
  'marks_entry_sessions',
  'school_events',
  'marks_cross_check_records',
  'structure_validation_records',
  'timetable_period_definitions',
  'education_system_configurations',
] as const;

/**
 * The files whose canonical read is still pending, each with the canonical entities that
 * serve the legacy collections it reads.
 */
const PENDING_CANONICAL_MIGRATION: Record<string, string> = {
  'data/useAcademicData.ts':
    'learning_area, component, assessment, grading_scale, result, teaching_group, teaching_assignment, teaching_group_member, timetable_entry, academic_year, academic_period',
  'hooks/useExamResultsHorizontal.ts': 'mark, result, learner, learning_area, component',
  'hooks/useTeacherAssignments.ts':
    'teaching_assignment, teaching_group, staff, class_group, level, learning_area, academic_year',
  'components/ExamSchedulingUI.tsx': 'assessment, class_group',
  'components/SchedulingCalendar.tsx': 'assessment, class_group, timetable_slot, staff',
  'pages/AcademicsDashboardPage.tsx':
    'learning_area, component, assessment, grading_scale, mark, teaching_group, timetable_entry, level, department',
  'pages/BoardExamResultsPage.tsx': 'learner, assessment, result',
  'pages/DistributeResultsPage.tsx': 'assessment, level, learner',
  'pages/EducationSystemsPage.tsx': 'programme, curriculum_pack, level',
  'pages/ExamAnalysisContent.tsx':
    'assessment, class_group, learner, mark, result, learning_area, component, teaching_group, academic_year, academic_period, grading_scale',
  'pages/ExamSchedulingPage.tsx': 'class_group, assessment',
  'pages/ExamSessionsPage.tsx': 'assessment',
  'pages/ExamTokensPage.tsx': 'assessment, teaching_assignment, learning_area, level',
  'pages/GradingSchemesPage.tsx': 'grading_scale',
  'pages/ReportCardsPage.tsx':
    'assessment, class_group, learner, mark, learning_area, component, grading_scale, attendance_session, academic_period',
  'pages/StudentExamAnalysisPage.tsx': 'learner, mark, assessment, component, grading_scale',
  'pages/TimetableEntriesPage.tsx': 'timetable_entry, teaching_group, timetable_slot',
};

/**
 * The files that read a legacy collection the registry does not model.
 *
 * They carry no inline marker because they are data hooks imported across the app; the list
 * names the missing entity here instead, so the gap is still visible in source.
 */
const GAP_FILES: Record<string, string> = {
  'data/useAssignmentsData.ts': 'assignment, assignment_submission',
  'data/lessonplans/useLessonPlansData.ts': 'weekly_plan, lesson_plan, lesson_note',
};

/** The screens this task moved onto the repository; each must use the canonical picker/form. */
const MIGRATED_PAGES = [
  'pages/SubjectsPage.tsx',
  'pages/SubjectPapersManagementPage.tsx',
  'pages/ClassSubjectAllocationsPage.tsx',
  'pages/TeacherSubjectAssignmentPage.tsx',
  'pages/StudentSubjectEnrollmentPage.tsx',
  'pages/StudentExamResultsEntryPage.tsx',
] as const;

/** The read-only screen this task moved onto the repository; it chooses no reference. */
const MIGRATED_READ_ONLY = ['components/AcademicModuleStatus.tsx'] as const;

/** The legacy write helpers of the academics data layer; none may remain in a consumer. */
const LEGACY_WRITE_HELPERS = [
  'addSubject',
  'updateSubject',
  'deleteSubject',
  'addSubjectPaper',
  'updateSubjectPaper',
  'deleteSubjectPaper',
  'addExamSession',
  'updateExamSession',
  'deleteExamSession',
  'addExamPaperSetting',
  'updateExamPaperSetting',
  'deleteExamPaperSetting',
  'addGradingScheme',
  'updateGradingScheme',
  'deleteGradingScheme',
  'saveStudentExamResult',
  'addClassSubjectAllocation',
  'updateClassSubjectAllocation',
  'deleteClassSubjectAllocation',
  'addTeacherSubjectAssignment',
  'updateTeacherSubjectAssignment',
  'deleteTeacherSubjectAssignment',
  'addStudentSubjectEnrollment',
  'updateStudentSubjectEnrollment',
  'deleteStudentSubjectEnrollment',
  'addTimetableEntry',
  'updateTimetableEntry',
  'deleteTimetableEntry',
] as const;

interface SourceFile {
  readonly path: string;
  readonly text: string;
  /** The path relative to `src/modules/academics`, with forward slashes. */
  readonly modulePath: string;
}

/** Every source file of the module, tests excluded. */
function sourceFiles(): SourceFile[] {
  const found: SourceFile[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) {
        if (entry === '__tests__') continue;
        walk(path);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      found.push({
        path,
        text: readFileSync(path, 'utf8'),
        modulePath: relative(MODULE_ROOT, path).split(sep).join('/'),
      });
    }
  };
  walk(MODULE_ROOT);
  return found;
}

/** The names a `useAppData()` call reads. */
function appDataNames(source: string): string[] {
  const names: string[] = [];
  const destructured = /\{([^{}]*)\}\s*=\s*useAppData\(\)/g;
  let match = destructured.exec(source);
  while (match) {
    for (const part of (match[1] ?? '').split(',')) {
      const name = part.split('=')[0]?.split(':')[0]?.trim();
      if (name) names.push(name);
    }
    match = destructured.exec(source);
  }
  const member = /useAppData\(\)\.(\w+)/g;
  match = member.exec(source);
  while (match) {
    names.push(match[1] as string);
    match = member.exec(source);
  }
  return names;
}

/** The names an academic data context call reads, through its assigned variable. */
function academicContextNames(source: string): string[] {
  const names: string[] = [];
  const assigned = /(?:const|let)\s+(\w+)\s*=\s*useAcademicDataContext\(\)/g;
  let match = assigned.exec(source);
  while (match) {
    const holder = match[1] as string;
    const members = new RegExp(`\\b${holder}\\.(\\w+)`, 'g');
    let member = members.exec(source);
    while (member) {
      names.push(member[1] as string);
      member = members.exec(source);
    }
    match = assigned.exec(source);
  }
  return names;
}

/** The collections a `useDatabaseCollection` call reads. */
function collectionsByName(source: string): string[] {
  const names: string[] = [];
  for (const line of source.split('\n')) {
    if (!line.includes('useDatabaseCollection')) continue;
    const match = /\(\s*'([^']+)'/.exec(line);
    if (match) names.push(match[1] as string);
  }
  return names;
}

/** Every legacy read the file performs. */
function legacyReads(source: string): string[] {
  return [
    ...appDataNames(source),
    ...academicContextNames(source),
    ...collectionsByName(source),
  ];
}

const files = sourceFiles();
const byPath = new Map(files.map((file) => [file.modulePath, file] as const));

describe('the academics module reads canonical data through the repository', () => {
  it('finds the source files of the module', () => {
    expect(files.length).toBeGreaterThan(60);
  });

  it('reads no canonical collection through a legacy context outside the pending list', () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.modulePath in PENDING_CANONICAL_MIGRATION) continue;
      for (const name of legacyReads(file.text)) {
        if ((CANONICAL_LEGACY_COLLECTIONS as readonly string[]).includes(name)) {
          offenders.push(`${file.modulePath} reads ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('names the canonical entity behind every pending migration', () => {
    for (const [file, entities] of Object.entries(PENDING_CANONICAL_MIGRATION)) {
      expect(entities.length, `${file} must name its canonical entities`).toBeGreaterThan(0);
      expect(byPath.has(file), `${file} must exist`).toBe(true);
    }
  });

  it('leaves no useAppData() write in the module', () => {
    const writeVerb = /^(add|update|delete|save|create|remove)[A-Z]/;
    const offenders: string[] = [];
    for (const file of files) {
      for (const name of appDataNames(file.text)) {
        if (writeVerb.test(name)) offenders.push(`${file.modulePath} writes ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('leaves no legacy academics write helper in a consumer', () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.modulePath in PENDING_CANONICAL_MIGRATION) continue;
      if (file.modulePath === 'data/useAcademicData.ts') continue;
      if (file.modulePath === 'data/appDataAugmentation.ts') continue; // the interface declaration
      for (const helper of LEGACY_WRITE_HELPERS) {
        if (new RegExp(`\\b${helper}\\s*\\(`).test(file.text)) {
          offenders.push(`${file.modulePath} calls ${helper}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('marks every legacy read that stays with a gap or a pending migration', () => {
    const unmarked: string[] = [];
    for (const file of files) {
      const reads = legacyReads(file.text);
      if (reads.length === 0) continue;
      if (file.modulePath in PENDING_CANONICAL_MIGRATION) continue;
      if (file.modulePath in GAP_FILES) continue;
      if (!/GAP\(P1-E02\)/.test(file.text)) unmarked.push(file.modulePath);
    }
    expect(unmarked).toEqual([]);
  });

  it('names the entity every gap file lacks', () => {
    for (const [file, entities] of Object.entries(GAP_FILES)) {
      expect(entities.length, `${file} must name its missing entities`).toBeGreaterThan(0);
      expect(byPath.has(file), `${file} must exist`).toBe(true);
    }
  });

  it('keeps every gap read on a collection the registry does not model', () => {
    const known = [
      ...(CANONICAL_LEGACY_COLLECTIONS as readonly string[]),
      ...(GAP_LEGACY_COLLECTIONS as readonly string[]),
    ];
    const offenders: string[] = [];
    for (const file of files) {
      if (!/GAP\(P1-E02\)/.test(file.text) && !(file.modulePath in GAP_FILES)) continue;
      for (const name of legacyReads(file.text)) {
        if (!known.includes(name)) continue; // a loading flag or a handler, not a collection
        if ((GAP_LEGACY_COLLECTIONS as readonly string[]).includes(name)) continue;
        offenders.push(`${file.modulePath} reads ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('binds every screen this task migrated to the canonical picker and form', () => {
    for (const page of [...MIGRATED_PAGES, ...MIGRATED_READ_ONLY]) {
      const file = byPath.get(page);
      expect(file, `${page} must exist`).toBeTruthy();
      if (!file) continue;
      expect(file.text, `${page} must not read a legacy context`).not.toMatch(
        /useAppData\(|useAcademicDataContext\(|useDatabaseCollection/
      );
    }
    for (const page of MIGRATED_PAGES) {
      const file = byPath.get(page);
      expect(file?.text, `${page} must choose references with a picker`).toMatch(
        /EntityPicker|widget: 'entity'/
      );
    }
  });

  it('gives every file it added two ABOUTME lines', () => {
    const added = files.filter((file) => /canonicalRepository|useCanonicalAcademics|data\/errors/.test(file.modulePath));
    expect(added.length).toBeGreaterThan(0);
    for (const file of added) {
      const head = file.text.split('\n').slice(0, 2);
      expect(head[0]?.startsWith('// ABOUTME:'), `${file.modulePath} needs an ABOUTME line`).toBe(true);
      expect(head[1]?.startsWith('// ABOUTME:'), `${file.modulePath} needs a second ABOUTME line`).toBe(true);
    }
  });
});
