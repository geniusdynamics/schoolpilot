// ABOUTME: The plan that turns the legacy subjects, papers, exam sessions and results into
// ABOUTME: canonical learning areas, components, assessments, marks and period results.

import type { Assessment, Component, LearningArea, Mark, PeriodResult } from '@/domain/schema';
import { generateUuidv7 } from '@/domain/ids';

import { canonicalTimestamp } from './001-legacy-calendar';
import type {
  CanonicalEnrolment,
  ExamPlanSource,
  LegacyMark,
  LegacyPaper,
  LegacyPaperSetting,
  LegacyResult,
  LegacySession,
} from './004-legacy-exams';
import {
  assessmentKindOf,
  assessmentStatusOf,
  componentCodeOf,
  interpretLegacyScore,
  learningAreaKindOf,
  markKey,
  periodResultKey,
} from './004-exam-rules';

/** The canonical entities migration M4 writes, and the one it states it does not. */
export const EXAM_ENTITIES = [
  'learning_area',
  'component',
  'assessment',
  'mark',
  'period_result',
  'result',
] as const;

export type ExamEntity = (typeof EXAM_ENTITIES)[number];

/** The entities the migration writes rows for. */
export type WrittenExamEntity = Exclude<ExamEntity, 'result'>;

/** A legacy row the plan could not map. */
export interface ExamUnmappableRow {
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly canonicalEntity: WrittenExamEntity;
  readonly reason: string;
  readonly detail?: string;
}

/** A problem the plan found. An error stops the migration; a warning is reported. */
export interface ExamIssue {
  readonly code: string;
  readonly severity: 'warning' | 'error';
  readonly entity: ExamEntity;
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly message: string;
}

/** The mapping between a legacy row and the canonical row it became. */
export interface ExamMapEntry {
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly canonicalEntity: ExamEntity;
  readonly canonicalId: string;
}

/** A canonical row the migration wrote, so the rollback knows what to remove. */
export interface CreatedExamRow {
  readonly entity: WrittenExamEntity;
  readonly id: string;
}

/** The rows one entity holds, counted before and after the migration. */
export type ExamCounts = Record<ExamEntity, number>;

/** Everything the plan decided. */
export interface ExamMigrationPlan {
  readonly referenceTimestamp: string;
  readonly learningAreas: readonly LearningArea[];
  readonly components: readonly Component[];
  readonly assessments: readonly Assessment[];
  readonly marks: readonly Mark[];
  readonly periodResults: readonly PeriodResult[];
  readonly mapping: readonly ExamMapEntry[];
  readonly unmappable: readonly ExamUnmappableRow[];
  readonly issues: readonly ExamIssue[];
  readonly assumptions: readonly string[];
  readonly created: readonly CreatedExamRow[];
  readonly counts: {
    readonly before: ExamCounts;
    readonly planned: ExamCounts;
  };
}

/** The options the plan needs. */
export interface ExamPlanOptions {
  /** The timestamp the canonical audit columns carry when the legacy row carries none. */
  readonly referenceTimestamp: string;
}

/** What the plan collects while it walks the legacy rows. */
interface PlanContext {
  readonly options: ExamPlanOptions;
  readonly mapping: ExamMapEntry[];
  readonly unmappable: ExamUnmappableRow[];
  readonly issues: ExamIssue[];
  readonly assumptions: string[];
}

function createPlanContext(options: ExamPlanOptions): PlanContext {
  return { options, mapping: [], unmappable: [], issues: [], assumptions: [] };
}

function addUnmappable(
  context: PlanContext,
  legacyTable: string,
  legacyId: string,
  entity: WrittenExamEntity,
  reason: string,
  detail?: string
): void {
  context.unmappable.push({
    legacyTable,
    legacyId,
    canonicalEntity: entity,
    reason,
    ...(detail === undefined ? {} : { detail }),
  });
}

function addIssue(
  context: PlanContext,
  severity: 'warning' | 'error',
  code: string,
  entity: ExamEntity,
  legacyTable: string,
  legacyId: string,
  message: string
): void {
  context.issues.push({ code, severity, entity, legacyTable, legacyId, message });
}

/** The key an assessment is unique under: one per session and learning area. */
function assessmentKey(sessionId: string, learningAreaId: string): string {
  return `${sessionId}\u0000${learningAreaId}`;
}

/** A session's assessment for one learning area, while the marks it holds are still read. */
interface AssessmentDraft {
  readonly assessment: Assessment;
  /** The sum of the configured papers' maxima; null when a paper states none. */
  maxScore: number | null;
  readonly classGroupIds: Set<string>;
  readonly levelIds: Set<string>;
}

/** The name an assessment takes: the session and the learning area it scores. */
function assessmentNameOf(session: LegacySession, learningArea: LearningArea): string {
  const sessionName = session.name ?? session.id;
  const full = `${sessionName} — ${learningArea.name}`;
  if (full.length <= 200) return full;
  return `${sessionName} — ${learningArea.code}`.slice(0, 200);
}

/** The learning area a legacy subject becomes, or null when it cannot be named. */
function planLearningAreas(
  source: ExamPlanSource,
  context: PlanContext
): {
  learningAreas: LearningArea[];
  learningAreaBySubject: Map<string, LearningArea>;
  learningAreaById: Map<string, LearningArea>;
} {
  const learningAreas: LearningArea[] = [];
  const learningAreaBySubject = new Map<string, LearningArea>();
  const learningAreaById = new Map<string, LearningArea>();
  const subjectByCode = new Map<string, string>();
  if (source.institutionId === null || source.programmeId === null) {
    return { learningAreas, learningAreaBySubject, learningAreaById };
  }

  for (const subject of source.subjects) {
    if (subject.id === '') continue;
    const name = subject.name;
    if (name === null) {
      addUnmappable(
        context,
        'subjects',
        subject.id,
        'learning_area',
        'the subject carries no name'
      );
      continue;
    }
    if (name.length > 200) {
      addUnmappable(
        context,
        'subjects',
        subject.id,
        'learning_area',
        `the subject name is longer than 200 characters: "${name.slice(0, 60)}…"`
      );
      continue;
    }
    const code = subject.code ?? subject.abbreviation;
    if (code === null) {
      addUnmappable(
        context,
        'subjects',
        subject.id,
        'learning_area',
        'the subject carries neither a subject code nor an abbreviation to use as its code'
      );
      continue;
    }
    if (code.length > 50) {
      addUnmappable(
        context,
        'subjects',
        subject.id,
        'learning_area',
        'the subject code is longer than 50 characters'
      );
      continue;
    }
    const heldBy = subjectByCode.get(code.toLowerCase());
    if (heldBy !== undefined) {
      addUnmappable(
        context,
        'subjects',
        subject.id,
        'learning_area',
        `the subject code "${code}" is already held by the subject "${heldBy}"`
      );
      continue;
    }
    subjectByCode.set(code.toLowerCase(), name);

    const row: LearningArea = {
      id: generateUuidv7(),
      institution_id: source.institutionId,
      programme_id: source.programmeId,
      code,
      name,
      short_name: subject.abbreviation ?? undefined,
      group: subject.grouping ?? undefined,
      kind: learningAreaKindOf(subject.isCompulsory),
      // The legacy subject is not scoped to a level or a pathway; the migration does not invent
      // one, and records that it left both empty.
      level_ids: [],
      pathway_ids: [],
      created_at: canonicalTimestamp(subject.createdAt, context.options.referenceTimestamp),
      updated_at: canonicalTimestamp(subject.updatedAt, context.options.referenceTimestamp),
    };
    learningAreas.push(row);
    learningAreaBySubject.set(subject.id, row);
    learningAreaById.set(row.id, row);
    context.mapping.push({
      legacyTable: 'subjects',
      legacyId: subject.id,
      canonicalEntity: 'learning_area',
      canonicalId: row.id,
    });
  }

  return { learningAreas, learningAreaBySubject, learningAreaById };
}

/** The component each legacy paper becomes, keyed by the paper's legacy id. */
function planComponents(
  source: ExamPlanSource,
  learningAreaBySubject: ReadonlyMap<string, LearningArea>,
  context: PlanContext
): { components: Component[]; componentByPaper: Map<string, Component> } {
  const components: Component[] = [];
  const componentByPaper = new Map<string, Component>();
  const ordinalBySubject = new Map<string, number>();
  if (source.institutionId === null) return { components, componentByPaper };

  // The papers are in legacy id order, so a paper's code is its order within its subject.
  for (const paper of source.papers) {
    if (paper.id === '') continue;
    const subjectId = paper.subjectId;
    if (subjectId === null) {
      addUnmappable(
        context,
        'subject_papers',
        paper.id,
        'component',
        'the paper names no subject'
      );
      continue;
    }
    const learningArea = learningAreaBySubject.get(subjectId);
    if (learningArea === undefined) {
      addUnmappable(
        context,
        'subject_papers',
        paper.id,
        'component',
        `the paper's subject "${subjectId}" did not become a learning area`
      );
      continue;
    }
    const name = paper.name;
    if (name === null) {
      addUnmappable(
        context,
        'subject_papers',
        paper.id,
        'component',
        'the paper carries no name'
      );
      continue;
    }
    if (name.length > 200) {
      addUnmappable(
        context,
        'subject_papers',
        paper.id,
        'component',
        'the paper name is longer than 200 characters'
      );
      continue;
    }

    const ordinal = (ordinalBySubject.get(subjectId) ?? 0) + 1;
    ordinalBySubject.set(subjectId, ordinal);
    const row: Component = {
      id: generateUuidv7(),
      institution_id: source.institutionId,
      learning_area_id: learningArea.id,
      code: componentCodeOf(ordinal),
      name,
      kind: 'paper',
      // The paper's maximum and weight are the session's, not the paper's: two sessions can mark
      // the same paper out of different totals, so neither is written on the component.
      created_at: canonicalTimestamp(paper.createdAt, context.options.referenceTimestamp),
      updated_at: canonicalTimestamp(paper.updatedAt, context.options.referenceTimestamp),
    };
    components.push(row);
    componentByPaper.set(paper.id, row);
    context.mapping.push({
      legacyTable: 'subject_papers',
      legacyId: paper.id,
      canonicalEntity: 'component',
      canonicalId: row.id,
    });
  }

  return { components, componentByPaper };
}

/** The component a paper setting configures, or undefined when the setting cannot resolve one. */
function resolveSettingComponent(
  setting: LegacyPaperSetting,
  paperById: ReadonlyMap<string, LegacyPaper>,
  componentByPaper: ReadonlyMap<string, Component>,
  context: PlanContext
): Component | undefined {
  if (setting.paperId === null) {
    addIssue(
      context,
      'warning',
      'paper_setting_without_paper',
      'assessment',
      'exam_sessions',
      setting.id,
      `the paper setting "${setting.id}" of the session "${setting.sessionId}" names no paper`
    );
    return undefined;
  }
  const paper = paperById.get(setting.paperId);
  if (paper === undefined) {
    addIssue(
      context,
      'warning',
      'paper_setting_without_paper',
      'assessment',
      'exam_sessions',
      setting.id,
      `the paper setting "${setting.id}" of the session "${setting.sessionId}" names the paper "${setting.paperId}", which the legacy database does not hold`
    );
    return undefined;
  }
  const component = componentByPaper.get(paper.id);
  if (component === undefined) {
    addIssue(
      context,
      'warning',
      'paper_setting_without_component',
      'assessment',
      'exam_sessions',
      setting.id,
      `the paper setting "${setting.id}" of the session "${setting.sessionId}" names the paper "${paper.name ?? paper.id}", which did not become a component`
    );
    return undefined;
  }
  return component;
}

/**
 * The assessments the sessions' paper settings imply.
 *
 * A setting contributes its component to the assessment of its session and learning area. A
 * session whose school period M1 did not map writes no assessment, and the plan reports one
 * unmappable row per learning area the session configured, so the count says exactly how many
 * assessments were lost.
 */
function planAssessments(
  source: ExamPlanSource,
  learningAreaById: ReadonlyMap<string, LearningArea>,
  componentByPaper: ReadonlyMap<string, Component>,
  paperById: ReadonlyMap<string, LegacyPaper>,
  context: PlanContext
): { drafts: Map<string, AssessmentDraft> } {
  const drafts = new Map<string, AssessmentDraft>();
  if (source.institutionId === null) return { drafts };

  for (const session of source.sessions) {
    if (session.id === '') continue;
    if (session.settings.length === 0) {
      addIssue(
        context,
        'warning',
        'session_without_papers',
        'assessment',
        'exam_sessions',
        session.id,
        `the exam session "${session.name ?? session.id}" configures no paper, so it has no assessment`
      );
      continue;
    }

    const resolved: { setting: LegacyPaperSetting; component: Component }[] = [];
    for (const setting of session.settings) {
      const component = resolveSettingComponent(setting, paperById, componentByPaper, context);
      if (component !== undefined) resolved.push({ setting, component });
    }
    if (resolved.length === 0) continue;

    const academicPeriodId =
      session.periodId === null ? undefined : source.periodByLegacyId.get(session.periodId);
    if (academicPeriodId === undefined) {
      const reported = new Map<string, Component>();
      for (const entry of resolved) {
        reported.set(entry.component.learning_area_id, entry.component);
      }
      for (const component of reported.values()) {
        const learningArea = learningAreaById.get(component.learning_area_id);
        addUnmappable(
          context,
          'exam_sessions',
          session.id,
          'assessment',
          session.periodId === null
            ? 'the exam session names no school period'
            : `the school period "${session.periodId}" is not one migration M1 mapped`,
          `the assessment of "${learningArea?.name ?? component.name}" is not written, and neither is any mark of it`
        );
      }
      continue;
    }

    const sessionName = session.name ?? session.id;
    const kind = assessmentKindOf(sessionName);
    if (!kind.matched) {
      context.assumptions.push(
        `assessment.kind of "${sessionName}" is end_term: the session name names no other kind`
      );
    }
    const status = assessmentStatusOf(session.status);
    if (!status.matched) {
      context.assumptions.push(
        `assessment.status of "${sessionName}" is closed: the legacy status "${session.status ?? '(none)'}" is not one the migration recognises`
      );
    }

    for (const entry of resolved) {
      const learningArea = learningAreaById.get(entry.component.learning_area_id);
      if (learningArea === undefined) continue;
      const key = assessmentKey(session.id, learningArea.id);
      const existing = drafts.get(key);
      if (existing !== undefined) {
        if (existing.assessment.component_ids.includes(entry.component.id)) {
          addIssue(
            context,
            'warning',
            'paper_setting_duplicate',
            'assessment',
            'exam_sessions',
            entry.setting.id,
            `the session "${sessionName}" configures the paper "${entry.component.name}" twice; the assessment holds it once`
          );
          continue;
        }
        existing.maxScore =
          existing.maxScore === null || entry.setting.marksOutOf === null
            ? null
            : existing.maxScore + entry.setting.marksOutOf;
        existing.assessment.component_ids.push(entry.component.id);
        continue;
      }

      const assessment: Assessment = {
        id: generateUuidv7(),
        institution_id: source.institutionId,
        academic_period_id: academicPeriodId,
        kind: kind.kind,
        name: assessmentNameOf(session, learningArea),
        level_ids: [],
        class_group_ids: [],
        learning_area_ids: [learningArea.id],
        component_ids: [entry.component.id],
        status: status.status,
        created_at: canonicalTimestamp(session.createdAt, context.options.referenceTimestamp),
        updated_at: canonicalTimestamp(session.updatedAt, context.options.referenceTimestamp),
      };
      drafts.set(key, {
        assessment,
        maxScore: entry.setting.marksOutOf,
        classGroupIds: new Set<string>(),
        levelIds: new Set<string>(),
      });
    }
  }

  return { drafts };
}

/** Everything a legacy mark resolves to. */
interface MarkResolution {
  readonly enrolment: CanonicalEnrolment;
  readonly draft: AssessmentDraft;
  readonly component: Component;
}

/** Resolves a legacy mark to the enrolment, assessment and component it belongs to. */
function resolveMark(
  mark: LegacyMark,
  source: ExamPlanSource,
  resultById: ReadonlyMap<string, LegacyResult>,
  settingById: ReadonlyMap<string, LegacyPaperSetting>,
  drafts: ReadonlyMap<string, AssessmentDraft>,
  paperById: ReadonlyMap<string, LegacyPaper>,
  componentByPaper: ReadonlyMap<string, Component>,
  context: PlanContext
): MarkResolution | undefined {
  const result = resultById.get(mark.resultId);
  if (result === undefined) {
    addUnmappable(
      context,
      mark.legacyTable,
      mark.id,
      'mark',
      `the result "${mark.resultId}" is not one the legacy database holds`
    );
    return undefined;
  }
  if (mark.paperSettingId === null) {
    addUnmappable(
      context,
      mark.legacyTable,
      mark.id,
      'mark',
      'the mark names no paper setting'
    );
    return undefined;
  }
  const setting = settingById.get(mark.paperSettingId);
  if (setting === undefined) {
    addUnmappable(
      context,
      mark.legacyTable,
      mark.id,
      'mark',
      `the paper setting "${mark.paperSettingId}" is not configured in any exam session`,
      `the mark belongs to the result "${mark.resultId}"`
    );
    return undefined;
  }
  if (result.sessionId !== null && setting.sessionId !== result.sessionId) {
    addUnmappable(
      context,
      mark.legacyTable,
      mark.id,
      'mark',
      `the paper setting belongs to the session "${setting.sessionId}", not to the result's session "${result.sessionId}"`
    );
    return undefined;
  }
  const component = resolveSettingComponent(setting, paperById, componentByPaper, context);
  if (component === undefined) {
    addUnmappable(
      context,
      mark.legacyTable,
      mark.id,
      'mark',
      `the paper setting "${setting.id}" does not resolve to a paper of the migration`,
      `the mark belongs to the result "${mark.resultId}"`
    );
    return undefined;
  }
  if (result.studentId === null) {
    addUnmappable(
      context,
      mark.legacyTable,
      mark.id,
      'mark',
      `the result "${result.id}" names no learner`
    );
    return undefined;
  }
  const enrolment = source.enrolmentByStudent.get(result.studentId);
  if (enrolment === undefined) {
    addUnmappable(
      context,
      mark.legacyTable,
      mark.id,
      'mark',
      `the learner "${result.studentId}" has no enrolment migration M3 wrote`,
      `the mark of the result "${result.id}" cannot be attached to a learner who is not enrolled`
    );
    return undefined;
  }
  const draft = drafts.get(assessmentKey(setting.sessionId, component.learning_area_id));
  if (draft === undefined) {
    addUnmappable(
      context,
      mark.legacyTable,
      mark.id,
      'mark',
      `the session "${setting.sessionId}" has no assessment the mark can belong to`,
      'the session was reported when its assessment could not be written'
    );
    return undefined;
  }
  return { enrolment, draft, component };
}

/** The canonical marks the legacy marks become. */
function planMarks(
  source: ExamPlanSource,
  drafts: ReadonlyMap<string, AssessmentDraft>,
  paperById: ReadonlyMap<string, LegacyPaper>,
  componentByPaper: ReadonlyMap<string, Component>,
  context: PlanContext
): Mark[] {
  const marks: Mark[] = [];
  const writtenByKey = new Map<string, LegacyMark>();
  if (source.institutionId === null) return marks;

  const resultById = new Map(source.results.map((result) => [result.id, result]));
  const settingById = new Map<string, LegacyPaperSetting>();
  for (const session of source.sessions) {
    for (const setting of session.settings) settingById.set(setting.id, setting);
  }

  for (const mark of source.marks) {
    const resolved = resolveMark(
      mark,
      source,
      resultById,
      settingById,
      drafts,
      paperById,
      componentByPaper,
      context
    );
    if (resolved === undefined) continue;

    const score = interpretLegacyScore(mark.score);
    if (score.kind === 'level' && (score.rubricLevel ?? '').length > 100) {
      addUnmappable(
        context,
        mark.legacyTable,
        mark.id,
        'mark',
        'the score is neither a number nor a status, and is too long to be a rubric level'
      );
      continue;
    }

    const key = markKey(
      resolved.draft.assessment.id,
      resolved.enrolment.id,
      resolved.component.learning_area_id,
      resolved.component.id
    );
    const held = writtenByKey.get(key);
    if (held !== undefined) {
      addUnmappable(
        context,
        mark.legacyTable,
        mark.id,
        'mark',
        'the mark is a duplicate for the same learner, assessment, learning area and component',
        `the mark read from "${held.legacyTable}" ("${held.id}") already holds this paper for the learner`
      );
      continue;
    }
    writtenByKey.set(key, mark);

    if (score.kind === 'level') {
      addIssue(
        context,
        'warning',
        'mark_score_not_numeric',
        'mark',
        mark.legacyTable,
        mark.id,
        `the score "${mark.score ?? ''}" is not a number; it is kept as the mark's rubric level and the raw score is not invented`
      );
    }
    if (score.kind === 'none') {
      addIssue(
        context,
        'warning',
        'mark_without_score',
        'mark',
        mark.legacyTable,
        mark.id,
        'the mark carries no score; it is written as incomplete'
      );
    }

    const row: Mark = {
      id: generateUuidv7(),
      institution_id: source.institutionId,
      assessment_id: resolved.draft.assessment.id,
      enrolment_id: resolved.enrolment.id,
      learning_area_id: resolved.component.learning_area_id,
      component_id: resolved.component.id,
      ...(score.score === undefined ? {} : { score: score.score }),
      ...(score.rubricLevel === undefined ? {} : { rubric_level: score.rubricLevel }),
      status_code: score.status,
      version: 1,
      created_at: canonicalTimestamp(mark.createdAt, context.options.referenceTimestamp),
      updated_at: canonicalTimestamp(mark.updatedAt, context.options.referenceTimestamp),
    };
    marks.push(row);
    context.mapping.push({
      legacyTable: mark.legacyTable,
      legacyId: mark.id,
      canonicalEntity: 'mark',
      canonicalId: row.id,
    });

    resolved.draft.classGroupIds.add(resolved.enrolment.classGroupId);
    resolved.draft.levelIds.add(resolved.enrolment.levelId);
  }

  return marks;
}

/** The period results the legacy results become. */
function planPeriodResults(source: ExamPlanSource, context: PlanContext): PeriodResult[] {
  const periodResults: PeriodResult[] = [];
  const writtenByKey = new Map<string, LegacyResult>();
  if (source.institutionId === null) return periodResults;

  const sessionById = new Map(source.sessions.map((session) => [session.id, session]));

  for (const result of source.results) {
    if (result.id === '') continue;
    if (result.studentId === null) {
      addUnmappable(
        context,
        'student_exam_results',
        result.id,
        'period_result',
        'the result names no learner'
      );
      continue;
    }
    const enrolment = source.enrolmentByStudent.get(result.studentId);
    if (enrolment === undefined) {
      addUnmappable(
        context,
        'student_exam_results',
        result.id,
        'period_result',
        `the learner "${result.studentId}" has no enrolment migration M3 wrote`
      );
      continue;
    }
    const session = result.sessionId === null ? undefined : sessionById.get(result.sessionId);
    if (session === undefined) {
      addUnmappable(
        context,
        'student_exam_results',
        result.id,
        'period_result',
        `the exam session "${result.sessionId ?? ''}" is not one the legacy database holds`
      );
      continue;
    }
    const academicPeriodId =
      session.periodId === null ? undefined : source.periodByLegacyId.get(session.periodId);
    if (academicPeriodId === undefined) {
      addUnmappable(
        context,
        'student_exam_results',
        result.id,
        'period_result',
        `the exam session "${session.name ?? session.id}" has no academic period migration M1 mapped`
      );
      continue;
    }

    const total = result.totalMarks;
    const grade =
      result.meanGrade !== null && result.meanGrade.length <= 50 ? result.meanGrade : undefined;
    if (result.meanGrade !== null && grade === undefined) {
      addIssue(
        context,
        'warning',
        'mean_grade_too_long',
        'period_result',
        'student_exam_results',
        result.id,
        'the mean grade is longer than 50 characters and is not carried'
      );
    }
    const position = result.classRank !== null && result.classRank >= 1 ? result.classRank : undefined;
    const comment =
      result.comment !== null && result.comment.length <= 2000 ? result.comment : undefined;
    if (result.comment !== null && comment === undefined) {
      addIssue(
        context,
        'warning',
        'comment_too_long',
        'period_result',
        'student_exam_results',
        result.id,
        'the overall comment is longer than 2000 characters and is not carried'
      );
    }
    if (total === null && grade === undefined && position === undefined && comment === undefined) {
      addUnmappable(
        context,
        'student_exam_results',
        result.id,
        'period_result',
        'the result carries no total, grade, rank or comment to migrate'
      );
      continue;
    }

    const key = periodResultKey(enrolment.id, academicPeriodId);
    const held = writtenByKey.get(key);
    if (held !== undefined) {
      addUnmappable(
        context,
        'student_exam_results',
        result.id,
        'period_result',
        'the academic period already holds a result for this learner',
        `the result "${held.id}" was written for the same learner and period`
      );
      continue;
    }
    writtenByKey.set(key, result);

    const row: PeriodResult = {
      id: generateUuidv7(),
      institution_id: source.institutionId,
      enrolment_id: enrolment.id,
      academic_period_id: academicPeriodId,
      aggregates: {
        ...(total === null ? {} : { total }),
        ...(grade === undefined ? {} : { mean_grade: grade }),
        ...(position === undefined ? {} : { position }),
      },
      ...(comment === undefined ? {} : { class_teacher_comment: comment }),
      created_at: canonicalTimestamp(result.createdAt, context.options.referenceTimestamp),
      updated_at: canonicalTimestamp(result.updatedAt, context.options.referenceTimestamp),
    };
    periodResults.push(row);
    context.mapping.push({
      legacyTable: 'student_exam_results',
      legacyId: result.id,
      canonicalEntity: 'period_result',
      canonicalId: row.id,
    });
  }

  return periodResults;
}

/** The counts of the legacy rows that could become a row of each entity. */
function legacyCounts(
  source: ExamPlanSource,
  componentByPaper: ReadonlyMap<string, Component>
): ExamCounts {
  return {
    learning_area: source.subjects.filter((subject) => subject.id !== '').length,
    component: source.papers.filter((paper) => paper.id !== '').length,
    assessment: countImpliedAssessments(source, componentByPaper),
    mark: source.marks.length,
    period_result: source.results.length,
    result: 0,
  };
}

/**
 * How many assessments the legacy settings imply: one per session and learning area whose paper
 * became a component. A session whose period M1 did not map is counted too, and the migration
 * reports exactly those pairs as unmappable, so `before = after + unmapped` holds.
 */
function countImpliedAssessments(
  source: ExamPlanSource,
  componentByPaper: ReadonlyMap<string, Component>
): number {
  const pairs = new Set<string>();
  for (const session of source.sessions) {
    for (const setting of session.settings) {
      const component = setting.paperId === null ? undefined : componentByPaper.get(setting.paperId);
      if (component === undefined) continue;
      pairs.add(assessmentKey(session.id, component.learning_area_id));
    }
  }
  return pairs.size;
}

/** Builds the plan migration M4 writes. */
export function planExamMigration(
  source: ExamPlanSource,
  options: ExamPlanOptions
): ExamMigrationPlan {
  const context = createPlanContext(options);

  if (source.institutionId === null) {
    addIssue(
      context,
      'error',
      'no_institution',
      'learning_area',
      'institution',
      '',
      'the database holds no canonical institution; migration M1 has to run first'
    );
  }
  if (source.programmeId === null) {
    addIssue(
      context,
      'error',
      'no_programme',
      'learning_area',
      'programme',
      '',
      'the database holds no canonical programme; migration M2 has to run first'
    );
  }

  const { learningAreas, learningAreaBySubject, learningAreaById } = planLearningAreas(
    source,
    context
  );
  const { components, componentByPaper } = planComponents(source, learningAreaBySubject, context);
  const paperById = new Map(source.papers.map((paper) => [paper.id, paper]));
  const { drafts } = planAssessments(
    source,
    learningAreaById,
    componentByPaper,
    paperById,
    context
  );
  const marks = planMarks(source, drafts, paperById, componentByPaper, context);

  // The class groups and levels an assessment applies to are the ones its marks' enrolments sit
  // in: the legacy session names no class, so the marks are the only statement of its scope.
  const assessments: Assessment[] = [];
  for (const draft of drafts.values()) {
    draft.assessment.class_group_ids = [...draft.classGroupIds].sort();
    draft.assessment.level_ids = [...draft.levelIds].sort();
    if (draft.maxScore !== null) draft.assessment.max_score = draft.maxScore;
    assessments.push(draft.assessment);
  }

  const periodResults = planPeriodResults(source, context);

  if (source.sessions.length === 0) {
    addIssue(
      context,
      'warning',
      'no_sessions',
      'assessment',
      'exam_sessions',
      '',
      'the legacy database holds no exam session; there is no assessment to migrate'
    );
  }
  if (source.marks.length > 0) {
    context.assumptions.push(
      'mark.score carries the legacy score as it was entered; the migration does not scale, round or grade it'
    );
  }
  if (source.results.length > 0) {
    context.assumptions.push(
      'student_exam_results.stream_rank was not carried: period_result holds one position and the migration kept class_rank'
    );
    context.assumptions.push(
      'period_result.class_teacher_comment carries student_exam_results.overall_comment, the only comment the legacy result holds'
    );
    context.assumptions.push(
      'no result row is written: the legacy result carries an overall total and mean grade, not a per-learning-area score the canonical result could hold'
    );
  }
  context.assumptions.push(
    'learning_area.level_ids and learning_area.pathway_ids are empty: the legacy subject is not scoped to a level or a pathway'
  );

  const created: CreatedExamRow[] = [
    ...learningAreas.map((row) => ({ entity: 'learning_area' as const, id: row.id })),
    ...components.map((row) => ({ entity: 'component' as const, id: row.id })),
    ...assessments.map((row) => ({ entity: 'assessment' as const, id: row.id })),
    ...marks.map((row) => ({ entity: 'mark' as const, id: row.id })),
    ...periodResults.map((row) => ({ entity: 'period_result' as const, id: row.id })),
  ];

  return {
    referenceTimestamp: options.referenceTimestamp,
    learningAreas,
    components,
    assessments,
    marks,
    periodResults,
    mapping: context.mapping,
    unmappable: context.unmappable,
    issues: context.issues,
    assumptions: context.assumptions,
    created,
    counts: {
      before: legacyCounts(source, componentByPaper),
      planned: {
        learning_area: learningAreas.length,
        component: components.length,
        assessment: assessments.length,
        mark: marks.length,
        period_result: periodResults.length,
        result: 0,
      },
    },
  };
}
