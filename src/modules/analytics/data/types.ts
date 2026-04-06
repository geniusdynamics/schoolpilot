// ABOUTME: TypeScript interfaces for the Analytics module
// ABOUTME: The Analytics module does NOT create new collections - it computes from existing ones

// --- Analytics Period Types ---

export type AnalyticsPeriodType = 'term' | 'semester' | 'year' | 'custom';

export interface AnalyticsPeriod {
  type: AnalyticsPeriodType;
  startDate: string;
  endDate: string;
  name?: string | null;
  academicPeriodId?: number | null;
  academicPeriodName?: string | null;
}

// --- Teacher Analytics Types ---

export interface TeacherAnalytics {
  teacherId: string;
  teacherName: string;
  subjectId?: number | null;
  subjectName?: string | null;
  period: AnalyticsPeriod;
  passRates: SubjectPassRate[];
  classPerformance: ClassPerformance[];
  assignmentsCreated: number;
  assignmentsGraded: number;
  gradingTurnaroundDays: number;
  studentImprovement: number; // Percentage improvement over period
  consistentPerformers: number;
  strugglingStudents: number;
  syllabusCoverage: number; // Percentage
  topicsCovered: string[];
  topicsPending: string[];
  attendanceRate: number;
  lessonNotesCompleted: number;
  lessonNotesTotal: number;
}

// --- Subject Pass Rate Types ---

export interface SubjectPassRate {
  subjectId: number;
  subjectName: string;
  examCount: number;
  studentCount: number;
  passRate: number; // Percentage
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  medianScore: number;
  trend: 'up' | 'down' | 'stable';
  gradeDistribution: GradeDistribution[];
}

export interface GradeDistribution {
  grade: string;
  count: number;
  percentage: number;
}

// --- Class Performance Types ---

export interface ClassPerformance {
  classId: number;
  classStreamId?: number | null;
  className: string;
  streamName?: string | null;
  studentCount: number;
  averageScore: number;
  passRate: number;
  topPerformers: TopPerformer[];
  bottomPerformers: StrugglingStudent[];
  subjectBreakdown: SubjectBreakdown[];
  trend: 'up' | 'down' | 'stable';
  attendanceRate: number;
}

export interface TopPerformer {
  studentId: string;
  studentName: string;
  averageScore: number;
  rank: number;
}

export interface StrugglingStudent {
  studentId: string;
  studentName: string;
  averageScore: number;
  subjects: string[]; // Subjects where student is struggling
  trend: 'improving' | 'declining' | 'stable';
}

export interface SubjectBreakdown {
  subjectId: number;
  subjectName: string;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  studentCount: number;
}

// --- Analytics Dashboard Types ---

export interface AnalyticsDashboardData {
  period: AnalyticsPeriod;
  overview: AnalyticsOverview;
  topSubjects: SubjectPassRate[];
  bottomSubjects: SubjectPassRate[];
  topClasses: ClassPerformance[];
  bottomClasses: ClassPerformance[];
  recentTrends: TrendData[];
}

export interface AnalyticsOverview {
  totalStudents: number;
  totalTeachers: number;
  overallPassRate: number;
  overallAverageScore: number;
  totalExams: number;
  assignmentsPending: number;
  attendanceRate: number;
}

export interface TrendData {
  period: string;
  value: number;
  metric: 'passRate' | 'averageScore' | 'attendance';
}

// Type aliases for schema compatibility
export type TeacherAnalyticsType = TeacherAnalytics;
export type SubjectPassRateType = SubjectPassRate;
export type ClassPerformanceType = ClassPerformance;
export type AnalyticsPeriodTypeAlias = AnalyticsPeriod;
