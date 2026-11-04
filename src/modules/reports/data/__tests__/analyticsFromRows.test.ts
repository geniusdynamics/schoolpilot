// ABOUTME: Red-first arithmetic tests for analyticsFromRows: every class, subject, teacher and
// ABOUTME: trend number must come from recorded canonical marks, and an absent metric stays null.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyticsFromRows, type AnalyticsRows } from '../analyticsFromRows';

const YEAR = 'year-1';
const PERIOD_1 = 'period-1';
const PERIOD_2 = 'period-2';
const EAST = 'cg-east';
const WEST = 'cg-west';
const LEVEL = 'level-10';
const MATH = 'la-math';
const ENGLISH = 'la-english';
const AMINA = 'enrol-amina';
const BELLO = 'enrol-bello';
const CIKU = 'enrol-ciku';
const LEFT = 'enrol-left';
const ASSESSMENT_1 = 'assessment-1';
const ASSESSMENT_2 = 'assessment-2';
const TEACHER = 'staff-teacher';

function fixture(overrides: Partial<AnalyticsRows> = {}): AnalyticsRows {
  return {
    classGroups: [
      { id: EAST, name: 'East', level_id: LEVEL, academic_year_id: YEAR },
      { id: WEST, name: 'West', level_id: LEVEL, academic_year_id: YEAR },
    ],
    levels: [{ id: LEVEL, name: 'Grade 10' }],
    learningAreas: [
      { id: MATH, name: 'Mathematics' },
      { id: ENGLISH, name: 'English' },
    ],
    enrolments: [
      { id: AMINA, learner_id: 'learner-amina', class_group_id: EAST, academic_year_id: YEAR, status: 'active' },
      { id: BELLO, learner_id: 'learner-bello', class_group_id: EAST, academic_year_id: YEAR, status: 'active' },
      { id: CIKU, learner_id: 'learner-ciku', class_group_id: WEST, academic_year_id: YEAR, status: 'active' },
      { id: LEFT, learner_id: 'learner-left', class_group_id: EAST, academic_year_id: YEAR, status: 'left' },
    ],
    learners: [
      { id: 'learner-amina', given_name: 'Amina', family_name: 'Otieno' },
      { id: 'learner-bello', given_name: 'Bello', family_name: 'Mwangi' },
      { id: 'learner-ciku', given_name: 'Ciku', family_name: 'Wanjiru' },
      { id: 'learner-left', given_name: 'Left', family_name: 'Learner' },
    ],
    assessments: [
      {
        id: ASSESSMENT_1,
        academic_period_id: PERIOD_1,
        learning_area_ids: [MATH],
        class_group_ids: [EAST],
        level_ids: [],
        max_score: 100,
        grading_scale_id: null,
      },
    ],
    marks: [
      { id: 'mark-1', assessment_id: ASSESSMENT_1, enrolment_id: AMINA, learning_area_id: MATH, score: '40', status_code: 'present' },
      { id: 'mark-2', assessment_id: ASSESSMENT_1, enrolment_id: BELLO, learning_area_id: MATH, score: '80', status_code: 'present' },
      { id: 'mark-3', assessment_id: ASSESSMENT_1, enrolment_id: CIKU, learning_area_id: MATH, score: '90', status_code: 'present' },
      { id: 'mark-4', assessment_id: ASSESSMENT_1, enrolment_id: LEFT, learning_area_id: MATH, score: '100', status_code: 'present' },
      { id: 'mark-5', assessment_id: ASSESSMENT_1, enrolment_id: AMINA, learning_area_id: ENGLISH, score: '70', status_code: 'absent' },
    ],
    teachingGroups: [
      {
        id: 'tg-east-math',
        academic_year_id: YEAR,
        learning_area_id: MATH,
        class_group_ids: [EAST],
        teacher_ids: [TEACHER],
      },
    ],
    teachingAssignments: [],
    staff: [{ id: TEACHER, given_name: 'Grace', family_name: 'Wekesa' }],
    periods: [
      { id: PERIOD_1, name: 'Term 1', academic_year_id: YEAR, start_date: '2026-01-05', end_date: '2026-03-31' },
      { id: PERIOD_2, name: 'Term 2', academic_year_id: YEAR, start_date: '2026-04-05', end_date: '2026-07-31' },
    ],
    attendanceSessions: [],
    attendanceMarks: [],
    gradingScales: [],
    ...overrides,
  };
}

const scope = { academicYearId: YEAR, periodId: null, levelId: null, classGroupId: null };
const eastScope = { ...scope, classGroupId: EAST };

function east(rows: AnalyticsRows = fixture()) {
  return analyticsFromRows(rows, eastScope).classPerformances.find((row) => row.classId === EAST)!;
}

describe('class performance', () => {
  it('averages the recorded percentages and counts the recorded slots', () => {
    const row = east();
    expect(row.averageScore).toBe(60);
    expect(row.marksRecorded).toBe(2);
    expect(row.marksExpected).toBe(2);
    expect(row.marksRecordedRate).toBe(100);
    expect(row.studentCount).toBe(2);
    expect(row.className).toBe('Grade 10');
    expect(row.streamName).toBe('East');
  });

  it('changes when a real mark changes, because the number is the arithmetic', () => {
    const rows = fixture();
    const raised = fixture({
      marks: [
        ...rows.marks,
        { id: 'mark-raised', assessment_id: ASSESSMENT_1, enrolment_id: AMINA, learning_area_id: MATH, score: '100', status_code: 'present' },
      ],
    });
    expect(east(rows).averageScore).toBe(60);
    expect(east(raised).averageScore).toBe(73.3);
  });

  it('leaves an absent mark and an inactive enrolment out', () => {
    const row = east();
    // The absent English mark and the left learner's 100 are visible in the fixture but not counted.
    expect(row.marksRecorded).toBe(2);
    expect(row.averageScore).toBe(60);

    const cancelled = fixture({ marks: [] });
    expect(east(cancelled).averageScore).toBeNull();
    expect(east(cancelled).marksRecorded).toBe(0);
    expect(east(cancelled).marksRecordedRate).toBe(0);
  });

  it('counts a mark without a maximum as recorded but cannot average it', () => {
    const rows = fixture({
      assessments: [
        { id: ASSESSMENT_1, academic_period_id: PERIOD_1, learning_area_ids: [MATH], class_group_ids: [EAST], level_ids: [], max_score: null, grading_scale_id: null },
      ],
    });
    const row = east(rows);
    expect(row.marksRecorded).toBe(2);
    expect(row.marksRecordedRate).toBe(100);
    expect(row.averageScore).toBeNull();
  });

  it('omits the expected count when no assessment or no active enrolment exists', () => {
    const noAssessments = fixture({ assessments: [], marks: [] });
    const noEnrolments = fixture({ enrolments: [] });
    expect(east(noAssessments).marksExpected).toBeNull();
    expect(east(noAssessments).marksRecordedRate).toBeNull();
    expect(east(noEnrolments).marksExpected).toBeNull();
    expect(east(noEnrolments).marksRecordedRate).toBeNull();
  });
});

describe('subject performance', () => {
  it('reports a per-subject average and no pass rate without a pass band', () => {
    const result = analyticsFromRows(fixture(), eastScope);
    const maths = result.subjectPassRates.find((row) => row.subjectId === MATH)!;
    expect(maths.averageScore).toBe(60);
    expect(maths.marksRecorded).toBe(2);
    expect(maths.studentCount).toBe(2);
    expect(maths.passRate).toBeNull();
    expect(result.passRateRecorded).toBe(false);
  });

  it('reports a pass rate only when a grading scale band marks a pass', () => {
    const rows = fixture({
      assessments: [
        {
          id: ASSESSMENT_1,
          academic_period_id: PERIOD_1,
          learning_area_ids: [MATH],
          class_group_ids: [EAST],
          level_ids: [],
          max_score: 100,
          grading_scale_id: 'scale-pass',
        },
      ],
      gradingScales: [
        {
          id: 'scale-pass',
          code: 'PASS',
          bands: [
            { min: 50, max: 100, is_pass: true },
            { min: 0, max: 49.99, is_pass: false },
          ],
        },
      ],
    });
    const maths = analyticsFromRows(rows, eastScope).subjectPassRates.find((row) => row.subjectId === MATH)!;
    expect(maths.passRate).toBe(50);
  });

  it('reports highest, median and lowest from recorded percentages', () => {
    const maths = analyticsFromRows(fixture(), eastScope).subjectPassRates.find((row) => row.subjectId === MATH)!;
    expect(maths.highestScore).toBe(80);
    expect(maths.lowestScore).toBe(40);
    expect(maths.medianScore).toBe(60);
  });
});

describe('teacher analytics', () => {
  it('computes a teacher from the marks in their teaching groups', () => {
    const teacher = analyticsFromRows(fixture(), eastScope).teacherAnalytics.find((row) => row.teacherId === TEACHER)!;
    expect(teacher.teacherName).toBe('Grace Wekesa');
    expect(teacher.averageScore).toBe(60);
    expect(teacher.marksRecorded).toBe(2);
    expect(teacher.studentCount).toBe(2);
    expect(teacher.totalClasses).toBe(1);
    expect(teacher.subjects).toEqual(['Mathematics']);
    expect(teacher.classNames).toEqual(['Grade 10 · East']);
    expect(teacher.passRate).toBeNull();
    expect(teacher.attendanceRate).toBeNull();
    expect(teacher.gradingBacklog).toBeNull();
  });
});

describe('trends', () => {
  it('plots one point per period that recorded marks, labelled by the period name', () => {
    const rows = fixture({
      assessments: [
        ...fixture().assessments,
        {
          id: ASSESSMENT_2,
          academic_period_id: PERIOD_2,
          learning_area_ids: [MATH],
          class_group_ids: [EAST],
          level_ids: [],
          max_score: 100,
          grading_scale_id: null,
        },
      ],
      marks: [
        ...fixture().marks,
        { id: 'mark-term-2', assessment_id: ASSESSMENT_2, enrolment_id: AMINA, learning_area_id: MATH, score: '90', status_code: 'present' },
      ],
    });
    const series = analyticsFromRows(rows, eastScope).trends.performance;
    expect(series.points.map((point) => [point.periodName, point.value])).toEqual([
      ['Term 1', 60],
      ['Term 2', 90],
    ]);
    expect(series.points[0].change).toBeNull();
    expect(series.points[1].change).toBe(30);
  });

  it('renders an honest empty series when no period recorded a mark', () => {
    const result = analyticsFromRows(fixture({ marks: [] }), eastScope);
    expect(result.trends.performance.points).toEqual([]);
    expect(result.trends.performance.notRecordedReason).toMatch(/No recorded marks/i);
    expect(result.hasRecordedMarks).toBe(false);
  });

  it('never supplies a pass-rate series when no band marks a pass', () => {
    const result = analyticsFromRows(fixture(), eastScope);
    expect(result.trends.passRate.points).toEqual([]);
    expect(result.trends.passRate.notRecordedReason).toMatch(/marks a pass/i);
  });
});

describe('attendance', () => {
  it('is null when no canonical attendance rows exist', () => {
    const result = analyticsFromRows(fixture(), eastScope);
    expect(east().attendanceRate).toBeNull();
    expect(result.attendanceRecorded).toBe(false);
    expect(result.trends.attendance.points).toEqual([]);
  });

  it('is computed from present and late marks when registers exist', () => {
    const rows = fixture({
      attendanceSessions: [
        { id: 'session-1', class_group_id: EAST, academic_period_id: PERIOD_1, date: '2026-01-06' },
        { id: 'session-2', class_group_id: EAST, academic_period_id: PERIOD_1, date: '2026-01-07' },
      ],
      attendanceMarks: [
        { id: 'am-1', attendance_session_id: 'session-1', status: 'present' },
        { id: 'am-2', attendance_session_id: 'session-1', status: 'late' },
        { id: 'am-3', attendance_session_id: 'session-2', status: 'absent' },
        { id: 'am-4', attendance_session_id: 'session-2', status: 'present' },
      ],
    });
    const result = analyticsFromRows(rows, eastScope);
    expect(east(rows).attendanceRate).toBe(75);
    expect(result.attendanceRecorded).toBe(true);
    expect(result.trends.attendance.points.map((point) => point.value)).toEqual([75]);
  });
});

describe('scope', () => {
  it('narrows the averages to the chosen period and class group', () => {
    const rows = fixture();
    const term1 = analyticsFromRows(rows, { ...scope, periodId: PERIOD_1 }).classPerformances.find((row) => row.classId === EAST)!;
    const term2 = analyticsFromRows(rows, { ...scope, periodId: PERIOD_2 }).classPerformances.find((row) => row.classId === EAST)!;
    expect(term1.averageScore).toBe(60);
    expect(term2.averageScore).toBeNull();

    const westRows = fixture({
      assessments: [
        ...fixture().assessments,
        {
          id: 'assessment-west',
          academic_period_id: PERIOD_1,
          learning_area_ids: [MATH],
          class_group_ids: [WEST],
          level_ids: [],
          max_score: 100,
          grading_scale_id: null,
        },
      ],
      marks: [
        ...fixture().marks,
        { id: 'mark-west', assessment_id: 'assessment-west', enrolment_id: CIKU, learning_area_id: MATH, score: '90', status_code: 'present' },
      ],
    });
    const west = analyticsFromRows(westRows, { ...scope, classGroupId: WEST }).classPerformances;
    expect(west.map((row) => row.classId)).toEqual([WEST]);
    expect(west[0].averageScore).toBe(90);
  });

  it('returns nothing when no academic year is chosen', () => {
    const result = analyticsFromRows(fixture(), { ...scope, academicYearId: null });
    expect(result.classPerformances).toEqual([]);
    expect(result.subjectPassRates).toEqual([]);
    expect(result.trends.performance.points).toEqual([]);
  });
});

describe('no fabricated analytics remain in the production path', () => {
  const sources = [
    join(process.cwd(), 'src/modules/reports/data/analyticsFromRows.ts'),
    join(process.cwd(), 'src/modules/reports/data/useAnalyticsData.ts'),
    join(process.cwd(), 'src/modules/reports/pages/analytics/AnalyticsTrendsPage.tsx'),
  ];

  it('imports no random or sine generator and no mock arrays', () => {
    for (const source of sources) {
      const text = readFileSync(source, 'utf8');
      expect(text, source).not.toMatch(/Math\.random/);
      expect(text, source).not.toMatch(/Math\.sin/);
      expect(text, source).not.toMatch(/mockClassPerformances|mockSubjectPassRates|mockTeacherAnalytics/);
    }
  });
});
