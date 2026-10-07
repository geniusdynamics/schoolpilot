import { logger } from '@/utils/logging';

/**
 * Analytics Engine Mock Plugin
 * 
 * Mock implementation of the AnalyticsEnginePlugin interface for development and testing.
 * Returns realistic but randomized data for teacher, class, and subject metrics.
 * All values are plausible but entirely simulated — no real data is accessed.
 */

import type {
  AnalyticsEnginePlugin,
  AnalyticsPeriod,
  TeacherAnalytics,
  ClassPerformance,
  SubjectPassRate,
  PluginManifest,
  PluginModule,
  PluginContext,
  ExportFormat,
} from '../../types';

// ============================================================================
// Helpers
// ============================================================================

/** Generate a random integer between min and max (inclusive) */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generate a random float between min and max, rounded to 1 decimal */
function randomFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

/** Pick a random element from an array */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick N random unique elements from an array */
function pickRandomMany<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

/** Generate a realistic pass rate between 60% and 95% */
function randomPassRate(): number {
  return randomFloat(60, 95);
}

/** Generate a realistic trend */
function randomTrend(): 'up' | 'down' | 'stable' {
  const r = Math.random();
  if (r < 0.4) return 'up';
  if (r < 0.7) return 'stable';
  return 'down';
}

/** Simulate async delay to mimic real computation latency */
function simulateDelay(minMs: number = 150, maxMs: number = 600): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_STUDENT_NAMES = [
  'Alice Mwangi', 'Brian Ochieng', 'Catherine Wanjiku', 'Daniel Kimani',
  'Elizabeth Akinyi', 'Francis Mutua', 'Grace Njeri', 'Hassan Ali',
  'Irene Wambui', 'James Kipchoge', 'Karen Auma', 'Leonard Otieno',
  'Mary Wangari', 'Nathan Wekesa', 'Olivia Adhiambo', 'Peter Maina',
  'Quincy Atieno', 'Rachel Chemutai', 'Samuel Kariuki', 'Teresa Nyambura',
];

const MOCK_SUBJECTS = [
  { id: 'math', name: 'Mathematics' },
  { id: 'eng', name: 'English' },
  { id: 'kis', name: 'Kiswahili' },
  { id: 'sci', name: 'Science' },
  { id: 'sst', name: 'Social Studies' },
  { id: 'cre', name: 'CRE' },
  { id: 'agr', name: 'Agriculture' },
  { id: 'art', name: 'Creative Arts' },
];

const MOCK_TOPICS = [
  'Algebra', 'Geometry', 'Calculus', 'Statistics', 'Number Theory',
  'Trigonometry', 'Probability', 'Fractions', 'Decimals', 'Percentages',
  'Linear Equations', 'Quadratic Equations', 'Matrices', 'Sets',
  'Graphs', 'Sequences', 'Series', 'Functions', 'Vectors', 'Measurement',
];

const MOCK_CLASSES = [
  { id: 'grade-1', name: 'Grade 1' },
  { id: 'grade-2', name: 'Grade 2' },
  { id: 'grade-3', name: 'Grade 3' },
  { id: 'grade-4', name: 'Grade 4' },
  { id: 'grade-5', name: 'Grade 5' },
  { id: 'grade-6', name: 'Grade 6' },
  { id: 'grade-7', name: 'Grade 7' },
  { id: 'grade-8', name: 'Grade 8' },
  { id: 'grade-9', name: 'Grade 9' },
];

// ============================================================================
// Mock Analytics Engine Plugin Implementation
// ============================================================================

export const analyticsMockPlugin: AnalyticsEnginePlugin = {
  /**
   * Calculate mock analytics metrics for a teacher.
   * Returns realistic data including pass rates, class performance, assignments,
   * grading turnaround, student improvement, and syllabus coverage.
   */
  async calculateTeacherMetrics(
    teacherId: string,
    period: AnalyticsPeriod
  ): Promise<TeacherAnalytics> {
    logger.info('[Analytics Mock] calculateTeacherMetrics called:', { teacherId, period });
    await simulateDelay();

    const assignedSubjects = pickRandomMany(MOCK_SUBJECTS, randomInt(1, 4));
    const assignedClasses = pickRandomMany(MOCK_CLASSES, randomInt(1, 3));

    // Pass rates for each assigned subject
    const passRates: SubjectPassRate[] = assignedSubjects.map((subject) => ({
      subjectId: subject.id,
      subjectName: subject.name,
      examCount: randomInt(2, 8),
      studentCount: randomInt(25, 55),
      passRate: randomPassRate(),
      averageScore: randomFloat(55, 88),
      trend: randomTrend(),
    }));

    // Class performance for each assigned class
    const classPerformance: ClassPerformance[] = assignedClasses.map((cls) => {
      const studentCount = randomInt(30, 50);
      const streamCount = randomInt(1, 3);
      const avgScore = randomFloat(55, 85);
      const passRate = randomPassRate();

      return {
        classId: cls.id,
        className: cls.name,
        streamCount,
        studentCount,
        averageScore: avgScore,
        passRate,
        topPerformers: pickRandomMany(MOCK_STUDENT_NAMES, randomInt(3, 5)),
        bottomPerformers: pickRandomMany(MOCK_STUDENT_NAMES, randomInt(2, 4)),
      };
    });

    // Assignments and grading metrics
    const assignmentsCreated = randomInt(5, 30);
    const assignmentsGraded = randomInt(Math.floor(assignmentsCreated * 0.6), assignmentsCreated);
    const gradingTurnaroundDays = randomFloat(1, 7);

    // Student metrics
    const totalStudents = classPerformance.reduce((sum, c) => sum + c.studentCount, 0);
    const studentImprovement = randomFloat(2, 18);
    const consistentPerformers = randomInt(Math.floor(totalStudents * 0.15), Math.floor(totalStudents * 0.35));
    const strugglingStudents = randomInt(Math.floor(totalStudents * 0.05), Math.floor(totalStudents * 0.2));

    // Syllabus coverage
    const syllabusCoverage = randomFloat(60, 98);
    const topicsCovered = pickRandomMany(MOCK_TOPICS, randomInt(8, 16));
    const topicsPending = MOCK_TOPICS.filter((t) => !topicsCovered.includes(t));

    const result: TeacherAnalytics = {
      teacherId,
      teacherName: `Teacher ${teacherId}`,
      period,
      passRates,
      classPerformance,
      assignmentsCreated,
      assignmentsGraded,
      gradingTurnaroundDays,
      studentImprovement,
      consistentPerformers,
      strugglingStudents,
      syllabusCoverage,
      topicsCovered,
      topicsPending,
    };

    logger.info(`[Analytics Mock] Teacher ${teacherId}: ${passRates.length} subjects, ${classPerformance.length} classes, ${syllabusCoverage}% syllabus coverage`);

    return result;
  },

  /**
   * Calculate mock analytics metrics for a class.
   * Returns class-level performance data including average scores, pass rates,
   * and top/bottom performers.
   */
  async calculateClassMetrics(
    classId: string,
    period: AnalyticsPeriod
  ): Promise<ClassPerformance> {
    logger.info('[Analytics Mock] calculateClassMetrics called:', { classId, period });
    await simulateDelay();

    const cls = MOCK_CLASSES.find((c) => c.id === classId) || {
      id: classId,
      name: `Class ${classId}`,
    };

    const studentCount = randomInt(30, 50);
    const streamCount = randomInt(1, 3);
    const averageScore = randomFloat(55, 85);
    const passRate = randomPassRate();

    const result: ClassPerformance = {
      classId,
      className: cls.name,
      streamCount,
      studentCount,
      averageScore,
      passRate,
      topPerformers: pickRandomMany(MOCK_STUDENT_NAMES, randomInt(3, 5)),
      bottomPerformers: pickRandomMany(MOCK_STUDENT_NAMES, randomInt(2, 4)),
    };

    logger.info(`[Analytics Mock] Class ${classId}: ${studentCount} students, ${passRate}% pass rate, ${averageScore}% average`);

    return result;
  },

  /**
   * Calculate mock analytics metrics for a subject.
   * Returns subject-level pass rate data including exam counts, student counts,
   * average scores, and performance trends.
   */
  async calculateSubjectMetrics(
    subjectId: string,
    period: AnalyticsPeriod
  ): Promise<SubjectPassRate> {
    logger.info('[Analytics Mock] calculateSubjectMetrics called:', { subjectId, period });
    await simulateDelay();

    const subject = MOCK_SUBJECTS.find((s) => s.id === subjectId) || {
      id: subjectId,
      name: `Subject ${subjectId}`,
    };

    const result: SubjectPassRate = {
      subjectId,
      subjectName: subject.name,
      examCount: randomInt(2, 8),
      studentCount: randomInt(100, 400),
      passRate: randomPassRate(),
      averageScore: randomFloat(55, 88),
      trend: randomTrend(),
    };

    logger.info(`[Analytics Mock] Subject ${subjectId}: ${result.examCount} exams, ${result.studentCount} students, ${result.passRate}% pass rate, trend: ${result.trend}`);

    return result;
  },

  /**
   * Generate mock trend data for a teacher across multiple time periods.
   * Returns an array of metrics snapshots showing performance over time.
   */
  async generateTrends(
    teacherId: string,
    periods: AnalyticsPeriod[]
  ): Promise<any[]> {
    logger.info(`[Analytics Mock] generateTrends called: ${teacherId}, ${periods.length} periods`);
    await simulateDelay(200, 500);

    const trends = [];

    for (const period of periods) {
      // Generate slightly correlated metrics to simulate realistic trends
      const basePassRate = randomFloat(60, 90);
      const baseAverageScore = basePassRate - randomFloat(5, 15);

      trends.push({
        period,
        overallPassRate: randomFloat(basePassRate - 5, basePassRate + 5),
        overallAverageScore: randomFloat(baseAverageScore - 5, baseAverageScore + 5),
        assignmentsCreated: randomInt(5, 25),
        assignmentsGraded: randomInt(4, 24),
        gradingTurnaroundDays: randomFloat(1, 7),
        studentImprovement: randomFloat(0, 20),
        syllabusCoverage: randomFloat(50, 98),
        strugglingStudents: randomInt(2, 15),
        consistentPerformers: randomInt(5, 25),
        subjects: MOCK_SUBJECTS.slice(0, randomInt(2, 4)).map((subject) => ({
          subjectId: subject.id,
          subjectName: subject.name,
          passRate: randomFloat(basePassRate - 15, basePassRate + 10),
          averageScore: randomFloat(baseAverageScore - 10, baseAverageScore + 10),
          trend: randomTrend(),
        })),
      });
    }

    logger.info(`[Analytics Mock] Generated ${trends.length} trend snapshots for teacher ${teacherId}`);

    return trends;
  },

  /**
   * Export mock analytics report as a Blob.
   * Creates a text/JSON blob with the report data.
   */
  async exportReport(
    format: ExportFormat,
    data: any
  ): Promise<Blob> {
    logger.info(`[Analytics Mock] exportReport called: format=${format}`);
    await simulateDelay(100, 400);

    let content: string;
    let mimeType: string;

    switch (format) {
      case 'csv': {
        // Generate CSV from data
        if (Array.isArray(data)) {
          if (data.length === 0) {
            content = '';
          } else {
            const headers = Object.keys(data[0]).join(',');
            const rows = data.map((row: Record<string, any>) =>
              Object.values(row)
                .map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v))
                .join(',')
            );
            content = [headers, ...rows].join('\n');
          }
        } else {
          content = Object.entries(data)
            .map(([key, value]) => `${key},${value}`)
            .join('\n');
        }
        mimeType = 'text/csv';
        break;
      }

      case 'excel': {
        // For mock, use tab-separated values (TSV) to simulate Excel format
        if (Array.isArray(data)) {
          if (data.length === 0) {
            content = '';
          } else {
            const headers = Object.keys(data[0]).join('\t');
            const rows = data.map((row: Record<string, any>) =>
              Object.values(row).join('\t')
            );
            content = [headers, ...rows].join('\n');
          }
        } else {
          content = JSON.stringify(data, null, 2);
        }
        mimeType = 'application/vnd.ms-excel';
        break;
      }

      case 'pdf':
      default: {
        // Generate a readable text report
        const header = '='.repeat(60);
        const title = 'SchoolPilot Analytics Report';
        const generated = `Generated: ${new Date().toISOString()}`;

        content = [
          header,
          title,
          generated,
          header,
          '',
          JSON.stringify(data, null, 2),
          '',
          '='.repeat(60),
          'End of Report',
          '='.repeat(60),
        ].join('\n');
        mimeType = 'text/plain';
        break;
      }
    }

    logger.info(`[Analytics Mock] Report exported as ${format} (${content.length} bytes)`);

    return new Blob([content], { type: mimeType });
  },
};

// ============================================================================
// Plugin Manifest
// ============================================================================

export const analyticsMockManifest: PluginManifest = {
  id: 'com.schoolpilot.analytics-mock',
  name: 'Analytics Engine (Mock)',
  version: '1.0.0',
  type: 'integration',
  category: 'builtin',
  entry: './index.ts',
  description: 'Mock analytics engine for development and testing. Provides simulated teacher, class, and subject metrics with realistic randomized data without requiring the Go WASM engine.',
  author: 'SchoolPilot3 Team',
  license: 'MIT',

  provides: [
    'analytics.teacher',
    'analytics.class',
    'analytics.subject',
    'analytics.trends',
    'analytics.export',
  ],

  settings: [
    {
      key: 'passRateMin',
      label: 'Minimum Pass Rate',
      type: 'number',
      defaultValue: 60,
      description: 'Minimum pass rate percentage for mock data (0-100)',
      validation: { min: 0, max: 100 },
    },
    {
      key: 'passRateMax',
      label: 'Maximum Pass Rate',
      type: 'number',
      defaultValue: 95,
      description: 'Maximum pass rate percentage for mock data (0-100)',
      validation: { min: 0, max: 100 },
    },
  ],

  privileges: {
    dataRead: ['students', 'teachers', 'classes', 'subjects', 'exams', 'assignments'],
    dataWrite: [],
    uiInject: false,
    menuModify: false,
    settingsAccess: true,
    networkAccess: false,
    fileSystemAccess: false,
    executeCode: false,
  },
};

// ============================================================================
// Plugin Module
// ============================================================================

const module: PluginModule = {
  async activate(context: PluginContext) {
    logger.info('[Analytics Mock Plugin] Activating...');
    logger.info('[Analytics Mock Plugin] This is a MOCK engine — all analytics data is simulated.');
    logger.info('[Analytics Mock Plugin] Subjects:', MOCK_SUBJECTS.map((s) => s.name).join(', '));
  },

  async deactivate() {
    logger.info('[Analytics Mock Plugin] Deactivated.');
  },
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  manifest: analyticsMockManifest,
  module,
  plugin: analyticsMockPlugin,
};
