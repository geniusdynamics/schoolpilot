// ABOUTME: The pure analytics arithmetic: class, subject, teacher and period-trend summaries built
// ABOUTME: only from canonical marks and attendance rows. A metric the school never recorded is
// ABOUTME: returned as null, never as a made-up number.

import { classGroupLabel } from '@/utils/academicLabels';

import type {
  AnalyticsPeriod,
  AnalyticsResult,
  AnalyticsScopeOptions,
  ClassPerformance,
  LearnerPerformance,
  SubjectBreakdown,
  SubjectPerformance,
  TeacherAnalytics,
  TrendDirection,
  TrendMetric,
  TrendPoint,
  TrendSeries,
} from './analyticsTypes';

/** A year-scoped class group. */
export interface AnalyticsClassGroupRow {
  readonly id: string;
  readonly name: string;
  readonly level_id: string;
  readonly academic_year_id: string;
}

/** A level (grade) row. */
export interface AnalyticsLevelRow {
  readonly id: string;
  readonly name: string;
}

/** A learning area row. */
export interface AnalyticsLearningAreaRow {
  readonly id: string;
  readonly name: string;
}

/** A learner's enrolment in a class group for the year. */
export interface AnalyticsEnrolmentRow {
  readonly id: string;
  readonly learner_id: string;
  readonly class_group_id: string;
  readonly academic_year_id: string;
  readonly status: string;
}

/** The learner a result belongs to. */
export interface AnalyticsLearnerRow {
  readonly id: string;
  readonly given_name: string;
  readonly family_name: string;
}

/** An assessment, with the scope it covers and the maximum that turns a score into a percentage. */
export interface AnalyticsAssessmentRow {
  readonly id: string;
  readonly academic_period_id: string;
  readonly learning_area_ids: readonly string[];
  readonly class_group_ids: readonly string[];
  readonly level_ids: readonly string[];
  readonly max_score: number | null;
  readonly grading_scale_id: string | null;
}

/** A stored mark. */
export interface AnalyticsMarkRow {
  readonly id: string;
  readonly assessment_id: string;
  readonly enrolment_id: string;
  readonly learning_area_id: string;
  readonly score: string | null;
  readonly status_code: string;
}

/** A teaching group and the classes and teachers it covers. */
export interface AnalyticsTeachingGroupRow {
  readonly id: string;
  readonly academic_year_id: string;
  readonly learning_area_id: string;
  readonly class_group_ids: readonly string[];
  readonly teacher_ids: readonly string[];
}

/** A staff member's assignment to a teaching group. */
export interface AnalyticsTeachingAssignmentRow {
  readonly id: string;
  readonly staff_id: string;
  readonly teaching_group_id: string;
  readonly valid_from: string;
  readonly valid_to: string | null;
}

/** A staff member. */
export interface AnalyticsStaffRow {
  readonly id: string;
  readonly given_name: string;
  readonly family_name: string;
}

/** An academic period of the year. */
export interface AnalyticsPeriodRow {
  readonly id: string;
  readonly name: string;
  readonly academic_year_id: string;
  readonly start_date: string;
  readonly end_date: string;
}

/** One attendance register. */
export interface AnalyticsAttendanceSessionRow {
  readonly id: string;
  readonly class_group_id: string | null;
  readonly academic_period_id: string | null;
  readonly date: string;
}

/** One learner's mark in a register. */
export interface AnalyticsAttendanceMarkRow {
  readonly id: string;
  readonly attendance_session_id: string;
  readonly status: string;
}

/** A grading band. `is_pass` is the only signal that a band marks a pass. */
export interface AnalyticsGradingBandRow {
  readonly min: number;
  readonly max: number;
  readonly is_pass?: boolean;
}

/** A grading scale, reduced to the bands a pass rate needs. */
export interface AnalyticsGradingScaleRow {
  readonly id: string;
  readonly code: string;
  readonly bands: readonly AnalyticsGradingBandRow[];
}

/** Every canonical row the analytics computation reads. */
export interface AnalyticsRows {
  readonly classGroups: readonly AnalyticsClassGroupRow[];
  readonly levels: readonly AnalyticsLevelRow[];
  readonly learningAreas: readonly AnalyticsLearningAreaRow[];
  readonly enrolments: readonly AnalyticsEnrolmentRow[];
  readonly learners: readonly AnalyticsLearnerRow[];
  readonly assessments: readonly AnalyticsAssessmentRow[];
  readonly marks: readonly AnalyticsMarkRow[];
  readonly teachingGroups: readonly AnalyticsTeachingGroupRow[];
  readonly teachingAssignments: readonly AnalyticsTeachingAssignmentRow[];
  readonly staff: readonly AnalyticsStaffRow[];
  readonly periods: readonly AnalyticsPeriodRow[];
  readonly attendanceSessions: readonly AnalyticsAttendanceSessionRow[];
  readonly attendanceMarks: readonly AnalyticsAttendanceMarkRow[];
  readonly gradingScales: readonly AnalyticsGradingScaleRow[];
}

interface RecordedMark {
  readonly mark: AnalyticsMarkRow;
  readonly assessment: AnalyticsAssessmentRow;
  readonly enrolment: AnalyticsEnrolmentRow;
  readonly group: AnalyticsClassGroupRow;
  /** The percentage the mark is worth, or null when the assessment declares no maximum. */
  readonly percent: number | null;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

const mean = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const numeric = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || `${value}`.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? round1((sorted[middle - 1] + sorted[middle]) / 2) : round1(sorted[middle]);
};

/** An assessment with no class group list covers every class at the levels it names. */
function assessmentCoversGroup(
  assessment: AnalyticsAssessmentRow,
  group: AnalyticsClassGroupRow
): boolean {
  if (assessment.class_group_ids.length > 0) {
    return assessment.class_group_ids.includes(group.id);
  }
  return assessment.level_ids.length === 0 || assessment.level_ids.includes(group.level_id);
}

function percentageOf(score: number, maxScore: number | null): number | null {
  if (maxScore === null || maxScore <= 0) return null;
  return round1((score / maxScore) * 100);
}

/**
 * A pass rate is reported only when every contributing mark shares one grading scale and that
 * scale has a band marked as a pass. The canonical band carries no pass marker, so a school that
 * has not declared one gets null rather than a threshold this code invented.
 */
function passRateOf(
  marks: readonly RecordedMark[],
  scalesById: ReadonlyMap<string, AnalyticsGradingScaleRow>
): number | null {
  const usable = marks.flatMap((mark) =>
    mark.percent === null
      ? []
      : [{ percent: mark.percent, scaleId: mark.assessment.grading_scale_id }]
  );
  if (usable.length === 0) return null;

  const scaleIds = new Set(usable.map((mark) => mark.scaleId));
  if (scaleIds.size !== 1) return null;
  const scaleId = [...scaleIds][0];
  if (scaleId === null) return null;
  const scale = scalesById.get(scaleId);
  if (scale === undefined) return null;

  const passBands = scale.bands.filter((band) => band.is_pass === true);
  if (passBands.length === 0) return null;

  const passed = usable.filter((mark) =>
    passBands.some((band) => mark.percent >= band.min && mark.percent <= band.max)
  ).length;
  return round1((passed / usable.length) * 100);
}

/** The recordable marks of a scope, with the percentage each one is worth. */
function recordedMarksOf(
  rows: AnalyticsRows,
  groups: readonly AnalyticsClassGroupRow[],
  enrolments: readonly AnalyticsEnrolmentRow[],
  yearPeriodIds: ReadonlySet<string>
): RecordedMark[] {
  const groupById = new Map(groups.map((group) => [group.id, group] as const));
  const enrolmentById = new Map(enrolments.map((enrolment) => [enrolment.id, enrolment] as const));
  const assessmentById = new Map(
    rows.assessments
      .filter((assessment) => yearPeriodIds.has(assessment.academic_period_id))
      .map((assessment) => [assessment.id, assessment] as const)
  );

  const recorded: RecordedMark[] = [];
  for (const mark of rows.marks) {
    if (mark.status_code !== 'present') continue;
    const score = numeric(mark.score);
    if (score === null) continue;

    const enrolment = enrolmentById.get(mark.enrolment_id);
    if (enrolment === undefined) continue;
    const group = groupById.get(enrolment.class_group_id);
    if (group === undefined) continue;
    const assessment = assessmentById.get(mark.assessment_id);
    if (assessment === undefined) continue;
    if (!assessmentCoversGroup(assessment, group)) continue;

    recorded.push({
      mark,
      assessment,
      enrolment,
      group,
      percent: percentageOf(score, assessment.max_score),
    });
  }
  return recorded;
}

/** A group's recorded marks, reduced to the figures every class row shows. */
function classSummary(
  groupMarks: readonly RecordedMark[],
  expected: number | null,
  scalesById: ReadonlyMap<string, AnalyticsGradingScaleRow>
): { averageScore: number | null; passRate: number | null; marksRecorded: number; marksRecordedRate: number | null } {
  const percentages = groupMarks.flatMap((mark) => (mark.percent === null ? [] : [mark.percent]));
  const recordedSlots = new Set(groupMarks.map((mark) => `${mark.assessment.id}|${mark.enrolment.id}`));
  const marksRecorded = recordedSlots.size;
  return {
    averageScore: percentages.length === 0 ? null : round1(mean(percentages)),
    passRate: passRateOf(groupMarks, scalesById),
    marksRecorded,
    marksRecordedRate: expected === null ? null : round1((marksRecorded / expected) * 100),
  };
}

/** One learning area's contribution to a class, from that class's own marks. */
function subjectBreakdownOf(
  groupMarks: readonly RecordedMark[],
  areaName: (id: string) => string,
  scalesById: ReadonlyMap<string, AnalyticsGradingScaleRow>
): SubjectBreakdown[] {
  const byArea = new Map<string, RecordedMark[]>();
  for (const mark of groupMarks) {
    const list = byArea.get(mark.mark.learning_area_id) ?? [];
    list.push(mark);
    byArea.set(mark.mark.learning_area_id, list);
  }
  return [...byArea.entries()]
    .map(([subjectId, marks]) => {
      const percentages = marks.flatMap((mark) => (mark.percent === null ? [] : [mark.percent]));
      return {
        subjectId,
        subjectName: areaName(subjectId),
        averageScore: percentages.length === 0 ? null : round1(mean(percentages)),
        passRate: passRateOf(marks, scalesById),
        marksRecorded: marks.length,
        studentCount: new Set(marks.map((mark) => mark.enrolment.id)).size,
      };
    })
    .sort((left, right) => left.subjectName.localeCompare(right.subjectName));
}

/** The learners of a class, ordered by the average of the marks they actually have. */
function learnersOf(
  groupMarks: readonly RecordedMark[],
  learnerName: (enrolmentId: string) => string
): { topPerformers: LearnerPerformance[]; bottomPerformers: LearnerPerformance[] } {
  const byEnrolment = new Map<string, number[]>();
  for (const mark of groupMarks) {
    if (mark.percent === null) continue;
    const values = byEnrolment.get(mark.enrolment.id) ?? [];
    values.push(mark.percent);
    byEnrolment.set(mark.enrolment.id, values);
  }

  const rows = [...byEnrolment.entries()]
    .map(([enrolmentId, values]) => ({
      enrolmentId,
      learnerName: learnerName(enrolmentId),
      averageScore: round1(mean(values)),
      marksRecorded: values.length,
    }))
    .sort(
      (left, right) =>
        (right.averageScore ?? 0) - (left.averageScore ?? 0) ||
        left.learnerName.localeCompare(right.learnerName)
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    topPerformers: rows.slice(0, 5),
    bottomPerformers: [...rows].reverse().slice(0, 5),
  };
}

/** The mean per period of the marks that carry a percentage. */
function meansByPeriod(
  marks: readonly RecordedMark[],
  periods: readonly AnalyticsPeriodRow[]
): Map<string, number> {
  const byPeriod = new Map<string, number[]>();
  for (const mark of marks) {
    if (mark.percent === null) continue;
    const values = byPeriod.get(mark.assessment.academic_period_id) ?? [];
    values.push(mark.percent);
    byPeriod.set(mark.assessment.academic_period_id, values);
  }
  const means = new Map<string, number>();
  for (const period of periods) {
    const values = byPeriod.get(period.id);
    if (values !== undefined && values.length > 0) means.set(period.id, round1(mean(values)));
  }
  return means;
}

/** Which way a metric moved between the two most recent periods that recorded it. */
function trendOf(
  means: ReadonlyMap<string, number>,
  periods: readonly AnalyticsPeriodRow[],
  selectedPeriodId: string | null
): TrendDirection | null {
  const points = periods
    .filter((period) => means.has(period.id))
    .map((period) => ({ id: period.id, value: means.get(period.id) as number }));
  if (points.length < 2) return null;

  const currentIndex =
    selectedPeriodId === null ? points.length - 1 : points.findIndex((point) => point.id === selectedPeriodId);
  if (currentIndex <= 0) return null;

  const change = points[currentIndex].value - points[currentIndex - 1].value;
  if (change > 1) return 'up';
  if (change < -1) return 'down';
  return 'stable';
}

/** One point per period that recorded the metric, in period order. */
function pointsOf(
  values: ReadonlyMap<string, { readonly value: number; readonly marksRecorded: number }>,
  periods: readonly AnalyticsPeriodRow[]
): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (const period of periods) {
    const recorded = values.get(period.id);
    if (recorded === undefined) continue;
    const previous = points[points.length - 1];
    points.push({
      periodId: period.id,
      periodName: period.name,
      value: recorded.value,
      change: previous === undefined ? null : round1(recorded.value - previous.value),
      marksRecorded: recorded.marksRecorded,
    });
  }
  return points;
}

function seriesOf(
  metric: TrendMetric,
  label: string,
  points: TrendPoint[],
  notRecordedReason: string | null
): TrendSeries {
  return { metric, label, points, notRecordedReason: points.length === 0 ? notRecordedReason : null };
}

function emptyTrends(hasPassBand: boolean): Record<TrendMetric, TrendSeries> {
  return {
    performance: seriesOf('performance', 'Performance', [], 'No recorded marks in this year yet.'),
    passRate: seriesOf(
      'passRate',
      'Pass rate',
      [],
      hasPassBand
        ? 'No recorded marks in this year yet.'
        : 'No grading scale in use marks a pass, so a pass rate is not recorded.'
    ),
    attendance: seriesOf(
      'attendance',
      'Attendance',
      [],
      'No attendance registers have been recorded for this scope.'
    ),
  };
}

function emptyResult(hasPassBand: boolean): AnalyticsResult {
  return {
    classPerformances: [],
    subjectPassRates: [],
    teacherAnalytics: [],
    trends: emptyTrends(hasPassBand),
    periods: [],
    selectedPeriod: null,
    hasRecordedMarks: false,
    attendanceRecorded: false,
    passRateRecorded: false,
  };
}

/** Whether a register belongs to the periods the caller scoped. */
function sessionInPeriods(
  session: AnalyticsAttendanceSessionRow,
  periodIds: ReadonlySet<string>,
  periods: readonly AnalyticsPeriodRow[]
): boolean {
  if (session.academic_period_id !== null) return periodIds.has(session.academic_period_id);
  if (periodIds.size === periods.length) return true;
  return periods.some(
    (period) =>
      periodIds.has(period.id) &&
      session.date >= period.start_date &&
      session.date <= period.end_date
  );
}

/** The period a register belongs to, by its own id or by the date it covers. */
function periodOfSession(
  session: AnalyticsAttendanceSessionRow,
  periods: readonly AnalyticsPeriodRow[]
): string | null {
  if (session.academic_period_id !== null) return session.academic_period_id;
  return (
    periods.find((period) => session.date >= period.start_date && session.date <= period.end_date)
      ?.id ?? null
  );
}

/** Present and late both mean the learner attended. */
function attended(status: string): boolean {
  return status === 'present' || status === 'late';
}

/**
 * Computes every analytics row from canonical records.
 *
 * `averageScore` is the mean percentage of recorded marks, never a mean of pre-averaged guesses.
 * A metric with no canonical record stays null, and the screens render "Not recorded" for it.
 */
export function analyticsFromRows(
  rows: AnalyticsRows,
  options: AnalyticsScopeOptions = {}
): AnalyticsResult {
  const hasPassBand = rows.gradingScales.some((scale) =>
    scale.bands.some((band) => band.is_pass === true)
  );
  const academicYearId = options.academicYearId ?? null;
  if (academicYearId === null || academicYearId === '') return emptyResult(hasPassBand);

  const allPeriods = rows.periods
    .filter((period) => period.academic_year_id === academicYearId)
    .sort(
      (left, right) =>
        left.start_date.localeCompare(right.start_date) || left.name.localeCompare(right.name)
    );
  const periods: AnalyticsPeriod[] = allPeriods.map((period) => ({
    id: period.id,
    name: period.name,
    startDate: period.start_date,
    endDate: period.end_date,
  }));

  const requestedPeriod =
    options.periodId == null || options.periodId === ''
      ? null
      : (allPeriods.find((period) => period.id === options.periodId) ?? null);
  const unmatchedPeriod = options.periodId != null && options.periodId !== '' && requestedPeriod === null;
  const periodIdsInScope = new Set(
    unmatchedPeriod ? [] : requestedPeriod === null ? allPeriods.map((period) => period.id) : [requestedPeriod.id]
  );

  const groups = rows.classGroups
    .filter((group) => group.academic_year_id === academicYearId)
    .filter((group) => options.levelId == null || options.levelId === '' || group.level_id === options.levelId)
    .filter((group) => options.classGroupId == null || options.classGroupId === '' || group.id === options.classGroupId)
    .sort((left, right) => left.name.localeCompare(right.name));

  if (groups.length === 0) {
    return {
      ...emptyResult(hasPassBand),
      periods,
      selectedPeriod:
        requestedPeriod === null
          ? null
          : {
              id: requestedPeriod.id,
              name: requestedPeriod.name,
              startDate: requestedPeriod.start_date,
              endDate: requestedPeriod.end_date,
            },
    };
  }

  const groupIds = new Set(groups.map((group) => group.id));
  const levelById = new Map(rows.levels.map((level) => [level.id, level] as const));
  const areaById = new Map(rows.learningAreas.map((area) => [area.id, area] as const));
  const learnerById = new Map(rows.learners.map((learner) => [learner.id, learner] as const));
  const enrolmentById = new Map(rows.enrolments.map((enrolment) => [enrolment.id, enrolment] as const));
  const scaleById = new Map(rows.gradingScales.map((scale) => [scale.id, scale] as const));

  const areaName = (id: string): string => areaById.get(id)?.name ?? id;
  const groupLabel = (group: AnalyticsClassGroupRow): string =>
    classGroupLabel({ gradeLevel: levelById.get(group.level_id)?.name, name: group.name });
  const learnerName = (enrolmentId: string): string => {
    const enrolment = enrolmentById.get(enrolmentId);
    const learner = enrolment === undefined ? undefined : learnerById.get(enrolment.learner_id);
    if (learner === undefined) return enrolmentId;
    const name = [learner.given_name, learner.family_name].filter(Boolean).join(' ');
    return name === '' ? enrolmentId : name;
  };

  const activeEnrolments = rows.enrolments.filter(
    (enrolment) =>
      enrolment.academic_year_id === academicYearId &&
      enrolment.status === 'active' &&
      groupIds.has(enrolment.class_group_id)
  );
  const activeByGroup = new Map<string, number>();
  for (const enrolment of activeEnrolments) {
    activeByGroup.set(enrolment.class_group_id, (activeByGroup.get(enrolment.class_group_id) ?? 0) + 1);
  }

  const yearPeriodIds = new Set(allPeriods.map((period) => period.id));
  const yearRecorded = recordedMarksOf(rows, groups, activeEnrolments, yearPeriodIds);
  const yearAssessments = rows.assessments.filter((assessment) =>
    yearPeriodIds.has(assessment.academic_period_id)
  );
  const scopedAssessments = yearAssessments.filter((assessment) =>
    periodIdsInScope.has(assessment.academic_period_id)
  );
  const periodRecorded = yearRecorded.filter((mark) =>
    periodIdsInScope.has(mark.assessment.academic_period_id)
  );

  // ---- attendance -------------------------------------------------------------------------
  const sessionById = new Map(rows.attendanceSessions.map((session) => [session.id, session] as const));
  const attendanceBySession = new Map<string, { total: number; attended: number }>();
  for (const mark of rows.attendanceMarks) {
    const session = sessionById.get(mark.attendance_session_id);
    if (session === undefined) continue;
    if (session.class_group_id === null || !groupIds.has(session.class_group_id)) continue;
    const current = attendanceBySession.get(session.id) ?? { total: 0, attended: 0 };
    current.total += 1;
    if (attended(mark.status)) current.attended += 1;
    attendanceBySession.set(session.id, current);
  }

  const attendanceOf = (filter: (session: AnalyticsAttendanceSessionRow) => boolean) => {
    let total = 0;
    let present = 0;
    for (const session of rows.attendanceSessions) {
      if (session.class_group_id === null || !groupIds.has(session.class_group_id)) continue;
      if (!filter(session)) continue;
      const counts = attendanceBySession.get(session.id);
      if (counts === undefined) continue;
      total += counts.total;
      present += counts.attended;
    }
    return { total, rate: total === 0 ? null : round1((present / total) * 100) };
  };

  const yearAttendance = attendanceOf((session) => sessionInPeriods(session, yearPeriodIds, allPeriods));

  const attendanceByPeriod = new Map<string, { total: number; present: number }>();
  for (const session of rows.attendanceSessions) {
    if (session.class_group_id === null || !groupIds.has(session.class_group_id)) continue;
    if (!sessionInPeriods(session, yearPeriodIds, allPeriods)) continue;
    const periodId = periodOfSession(session, allPeriods);
    if (periodId === null) continue;
    const counts = attendanceBySession.get(session.id);
    if (counts === undefined) continue;
    const current = attendanceByPeriod.get(periodId) ?? { total: 0, present: 0 };
    current.total += counts.total;
    current.present += counts.attended;
    attendanceByPeriod.set(periodId, current);
  }

  // ---- class rows ---------------------------------------------------------------------------
  const classPerformances: ClassPerformance[] = groups.map((group) => {
    const groupMarks = periodRecorded.filter((mark) => mark.group.id === group.id);
    const expectedAssessments = scopedAssessments.filter((assessment) =>
      assessmentCoversGroup(assessment, group)
    ).length;
    const enrolments = activeByGroup.get(group.id) ?? 0;
    const expected = expectedAssessments > 0 && enrolments > 0 ? expectedAssessments * enrolments : null;
    const summary = classSummary(groupMarks, expected, scaleById);
    const attendance = attendanceOf(
      (session) =>
        session.class_group_id === group.id &&
        sessionInPeriods(session, periodIdsInScope, allPeriods)
    );
    const performed = learnersOf(groupMarks, learnerName);
    const grade = levelById.get(group.level_id)?.name ?? group.name;

    return {
      classId: group.id,
      className: grade,
      streamName: group.name,
      averageScore: summary.averageScore,
      passRate: summary.passRate,
      studentCount: enrolments,
      marksRecorded: summary.marksRecorded,
      marksExpected: expected,
      marksRecordedRate: summary.marksRecordedRate,
      attendanceRate: attendance.rate,
      assignmentCompletionRate: null,
      trend: trendOf(
        meansByPeriod(
          yearRecorded.filter((mark) => mark.group.id === group.id),
          allPeriods
        ),
        allPeriods,
        requestedPeriod === null ? null : requestedPeriod.id
      ),
      subjectBreakdown: subjectBreakdownOf(groupMarks, areaName, scaleById),
      topPerformers: performed.topPerformers,
      bottomPerformers: performed.bottomPerformers,
    };
  });

  // ---- subject rows -------------------------------------------------------------------------
  const marksByArea = new Map<string, RecordedMark[]>();
  for (const mark of periodRecorded) {
    const list = marksByArea.get(mark.mark.learning_area_id) ?? [];
    list.push(mark);
    marksByArea.set(mark.mark.learning_area_id, list);
  }

  const subjectPassRates: SubjectPerformance[] = [...marksByArea.entries()]
    .map(([subjectId, marks]) => {
      const percentages = marks.flatMap((mark) => (mark.percent === null ? [] : [mark.percent]));
      return {
        subjectId,
        subjectName: areaName(subjectId),
        averageScore: percentages.length === 0 ? null : round1(mean(percentages)),
        passRate: passRateOf(marks, scaleById),
        totalStudents: new Set(marks.map((mark) => mark.enrolment.id)).size,
        studentCount: new Set(marks.map((mark) => mark.enrolment.id)).size,
        marksRecorded: marks.length,
        examCount: new Set(marks.map((mark) => mark.assessment.id)).size,
        highestScore: percentages.length === 0 ? null : round1(Math.max(...percentages)),
        medianScore: median(percentages),
        lowestScore: percentages.length === 0 ? null : round1(Math.min(...percentages)),
        trend: trendOf(
          meansByPeriod(
            yearRecorded.filter((mark) => mark.mark.learning_area_id === subjectId),
            allPeriods
          ),
          allPeriods,
          requestedPeriod === null ? null : requestedPeriod.id
        ),
      };
    })
    .sort((left, right) => left.subjectName.localeCompare(right.subjectName));

  // ---- teacher rows -------------------------------------------------------------------------
  const yearGroups = rows.teachingGroups.filter(
    (group) =>
      group.academic_year_id === academicYearId &&
      group.class_group_ids.some((classGroupId) => groupIds.has(classGroupId))
  );
  const groupById = new Map(yearGroups.map((group) => [group.id, group] as const));
  const groupIdsByTeacher = new Map<string, Set<string>>();
  const addGroup = (staffId: string, groupId: string) => {
    const current = groupIdsByTeacher.get(staffId) ?? new Set<string>();
    current.add(groupId);
    groupIdsByTeacher.set(staffId, current);
  };
  for (const group of yearGroups) {
    for (const teacherId of group.teacher_ids) addGroup(teacherId, group.id);
  }
  for (const assignment of rows.teachingAssignments) {
    if (!groupById.has(assignment.teaching_group_id)) continue;
    addGroup(assignment.staff_id, assignment.teaching_group_id);
  }

  const teacherAnalytics: TeacherAnalytics[] = [...groupIdsByTeacher.entries()]
    .map(([teacherId, teacherGroupIds]) => {
      const teacherGroups = [...teacherGroupIds]
        .map((groupId) => groupById.get(groupId))
        .filter((group): group is AnalyticsTeachingGroupRow => group !== undefined);
      const pairs = new Set<string>();
      const classIds = new Set<string>();
      const subjectIds = new Set<string>();
      for (const group of teacherGroups) {
        subjectIds.add(group.learning_area_id);
        for (const classGroupId of group.class_group_ids) {
          if (!groupIds.has(classGroupId)) continue;
          classIds.add(classGroupId);
          pairs.add(`${classGroupId}|${group.learning_area_id}`);
        }
      }

      const seen = new Set<string>();
      const teacherMarks = periodRecorded.filter((mark) => {
        if (!pairs.has(`${mark.group.id}|${mark.mark.learning_area_id}`)) return false;
        if (seen.has(mark.mark.id)) return false;
        seen.add(mark.mark.id);
        return true;
      });
      const percentages = teacherMarks.flatMap((mark) =>
        mark.percent === null ? [] : [mark.percent]
      );
      const staff = rows.staff.find((candidate) => candidate.id === teacherId);
      const name = staff === undefined ? teacherId : [staff.given_name, staff.family_name].filter(Boolean).join(' ');
      const classNamesById = [...classIds]
        .map((classId) => groups.find((group) => group.id === classId))
        .filter((group): group is AnalyticsClassGroupRow => group !== undefined)
        .map((group) => ({ id: group.id, label: groupLabel(group) }))
        .sort((left, right) => left.label.localeCompare(right.label));
      const subjectNamesById = [...subjectIds]
        .map((subjectId) => ({ id: subjectId, name: areaName(subjectId) }))
        .sort((left, right) => left.name.localeCompare(right.name));

      return {
        teacherId,
        teacherName: name === '' ? teacherId : name,
        subjects: subjectNamesById.map((subject) => subject.name),
        subjectIds: subjectNamesById.map((subject) => subject.id),
        classNames: classNamesById.map((group) => group.label),
        classIds: classNamesById.map((group) => group.id),
        totalClasses: classIds.size,
        studentCount: new Set(teacherMarks.map((mark) => mark.enrolment.id)).size,
        marksRecorded: teacherMarks.length,
        averageScore: percentages.length === 0 ? null : round1(mean(percentages)),
        passRate: passRateOf(teacherMarks, scaleById),
        // A register names the class it covers, not the teacher of a subject group, so no
        // attendance figure is claimed per teacher.
        attendanceRate: null,
        gradingBacklog: null,
      };
    })
    .sort((left, right) => left.teacherName.localeCompare(right.teacherName));

  // ---- trends -------------------------------------------------------------------------------
  const performanceValues = new Map<string, { value: number; marksRecorded: number }>();
  const passValues = new Map<string, { value: number; marksRecorded: number }>();
  for (const period of allPeriods) {
    const marks = yearRecorded.filter(
      (mark) => mark.assessment.academic_period_id === period.id
    );
    const percentages = marks.flatMap((mark) => (mark.percent === null ? [] : [mark.percent]));
    if (percentages.length > 0) {
      performanceValues.set(period.id, {
        value: round1(mean(percentages)),
        marksRecorded: marks.length,
      });
    }
    const passRate = passRateOf(marks, scaleById);
    if (passRate !== null) {
      passValues.set(period.id, {
        value: passRate,
        marksRecorded: marks.filter((mark) => mark.percent !== null).length,
      });
    }
  }

  const attendanceValues = new Map<string, { value: number; marksRecorded: number }>();
  for (const [periodId, counts] of attendanceByPeriod) {
    if (counts.total === 0) continue;
    attendanceValues.set(periodId, {
      value: round1((counts.present / counts.total) * 100),
      marksRecorded: counts.total,
    });
  }

  const trends: Record<TrendMetric, TrendSeries> = {
    performance: seriesOf(
      'performance',
      'Performance',
      pointsOf(performanceValues, allPeriods),
      'No recorded marks in this year yet.'
    ),
    passRate: seriesOf(
      'passRate',
      'Pass rate',
      pointsOf(passValues, allPeriods),
      hasPassBand
        ? 'No recorded marks in this year yet.'
        : 'No grading scale in use marks a pass, so a pass rate is not recorded.'
    ),
    attendance: seriesOf(
      'attendance',
      'Attendance',
      pointsOf(attendanceValues, allPeriods),
      'No attendance registers have been recorded for this scope.'
    ),
  };

  const passRateRecorded =
    classPerformances.some((row) => row.passRate !== null) ||
    subjectPassRates.some((row) => row.passRate !== null) ||
    teacherAnalytics.some((row) => row.passRate !== null) ||
    trends.passRate.points.length > 0;

  return {
    classPerformances,
    subjectPassRates,
    teacherAnalytics,
    trends,
    periods,
    selectedPeriod:
      requestedPeriod === null
        ? null
        : {
            id: requestedPeriod.id,
            name: requestedPeriod.name,
            startDate: requestedPeriod.start_date,
            endDate: requestedPeriod.end_date,
          },
    hasRecordedMarks: yearRecorded.length > 0,
    attendanceRecorded: yearAttendance.total > 0,
    passRateRecorded,
  };
}
