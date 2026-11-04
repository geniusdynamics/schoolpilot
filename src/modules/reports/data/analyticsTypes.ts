// ABOUTME: The row types the analytics screens render: class, subject, teacher and trend summaries
// ABOUTME: computed from canonical marks. A null metric means the school has no record for it.

/** An academic period, as the analytics screens label one. */
export interface AnalyticsPeriod {
  readonly id: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
}

/** Which way a metric moved between the last two periods that recorded it. */
export type TrendDirection = 'up' | 'down' | 'stable';

/** One learner's recorded average inside a class group. */
export interface LearnerPerformance {
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly averageScore: number | null;
  readonly marksRecorded: number;
  /** Position in the class group by recorded average, 1-based. */
  readonly rank: number;
}

/** One learning area's recorded performance inside a class group. */
export interface SubjectBreakdown {
  readonly subjectId: string;
  readonly subjectName: string;
  readonly averageScore: number | null;
  /** Null unless a grading scale band marks a pass. */
  readonly passRate: number | null;
  readonly marksRecorded: number;
  readonly studentCount: number;
}

/** A class group's recorded performance for the selected scope. */
export interface ClassPerformance {
  readonly classId: string;
  /** The grade or level the class belongs to. */
  readonly className: string;
  /** The stream or class group's own name, when it carries one. */
  readonly streamName: string | null;
  readonly averageScore: number | null;
  /** Null unless a grading scale band marks a pass. */
  readonly passRate: number | null;
  readonly studentCount: number;
  readonly marksRecorded: number;
  /** Assessments scoped to the group × active enrolments; null when either is unobtainable. */
  readonly marksExpected: number | null;
  readonly marksRecordedRate: number | null;
  /** Null when the scope has no attendance registers. */
  readonly attendanceRate: number | null;
  /** No canonical assignment entity exists, so this is always null. */
  readonly assignmentCompletionRate: number | null;
  readonly trend: TrendDirection | null;
  readonly subjectBreakdown: readonly SubjectBreakdown[];
  readonly topPerformers: readonly LearnerPerformance[];
  readonly bottomPerformers: readonly LearnerPerformance[];
}

/** A learning area's recorded performance across the selected scope. */
export interface SubjectPerformance {
  readonly subjectId: string;
  readonly subjectName: string;
  readonly averageScore: number | null;
  /** Null unless a grading scale band marks a pass. */
  readonly passRate: number | null;
  readonly totalStudents: number;
  readonly studentCount: number;
  readonly marksRecorded: number;
  /** Assessments that produced at least one recorded mark for this learning area. */
  readonly examCount: number;
  readonly highestScore: number | null;
  readonly medianScore: number | null;
  readonly lowestScore: number | null;
  readonly trend: TrendDirection | null;
}

/** A staff member's recorded performance from the teaching groups they run. */
export interface TeacherAnalytics {
  readonly teacherId: string;
  readonly teacherName: string;
  readonly subjects: readonly string[];
  readonly subjectIds: readonly string[];
  readonly classNames: readonly string[];
  readonly classIds: readonly string[];
  readonly totalClasses: number;
  readonly studentCount: number;
  readonly marksRecorded: number;
  readonly averageScore: number | null;
  /** Null unless a grading scale band marks a pass. */
  readonly passRate: number | null;
  /** Null when no attendance register is linked to this teacher's groups. */
  readonly attendanceRate: number | null;
  /** No canonical assignment entity exists, so this is always null. */
  readonly gradingBacklog: number | null;
}

/** The metrics the trends screen can plot. */
export type TrendMetric = 'performance' | 'passRate' | 'attendance';

/** One period's value for a trend metric. */
export interface TrendPoint {
  readonly periodId: string;
  readonly periodName: string;
  readonly value: number;
  /** The change from the previous plotted point; null on the first point. */
  readonly change: number | null;
  readonly marksRecorded: number;
}

/** One metric's series, with the reason it is empty when it is. */
export interface TrendSeries {
  readonly metric: TrendMetric;
  readonly label: string;
  /** One point per period that recorded the metric, in period order. */
  readonly points: readonly TrendPoint[];
  readonly notRecordedReason: string | null;
}

/** Everything the analytics hook computes for one scope. */
export interface AnalyticsResult {
  readonly classPerformances: readonly ClassPerformance[];
  readonly subjectPassRates: readonly SubjectPerformance[];
  readonly teacherAnalytics: readonly TeacherAnalytics[];
  readonly trends: Readonly<Record<TrendMetric, TrendSeries>>;
  readonly periods: readonly AnalyticsPeriod[];
  readonly selectedPeriod: AnalyticsPeriod | null;
  readonly hasRecordedMarks: boolean;
  readonly attendanceRecorded: boolean;
  readonly passRateRecorded: boolean;
}

/** The scope the analytics are computed for. An empty id means "all" at that level. */
export interface AnalyticsScopeOptions {
  readonly academicYearId?: string | null;
  readonly periodId?: string | null;
  readonly levelId?: string | null;
  readonly classGroupId?: string | null;
}
