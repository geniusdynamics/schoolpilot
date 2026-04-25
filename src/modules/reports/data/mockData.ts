// ABOUTME: Provides initial mock data for entities specific to the Reports module.
// ABOUTME: This data is used in "demo" mode and for seeding RxDB in "production" mode.

import { GradeBreakdown, ClassChartData } from './types';

// === MOCK DATA EXPORTS FOR REPORTS PAGES ===

// Source: ClassListsPage.tsx
export const initialMockGradeBreakdownData: GradeBreakdown[] = [
  {
    form: 'Form 1 Alpha',
    grades: { A: 0, 'A-': 6, 'B+': 4, B: 4, 'B-': 3, 'C+': 2, C: 6, 'C-': 4, 'D+': 3, D: 4, 'D-': 1, E: 0, X: 0, Y: 0 },
    entries: 37,
    meanMarks: 47.3,
    meanMarksDeviation: -2.39,
    meanPoints: 7.0811,
    meanPointsDeviation: 1.4739,
    grade: 'C+',
    subjectTeacher: 'Oscar, Faith',
    tscNo: '123456',
  },
  {
    form: 'Form 1 Moxie',
    grades: { A: 0, 'A-': 4, 'B+': 1, B: 4, 'B-': 2, 'C+': 5, C: 3, 'C-': 6, 'D+': 2, D: 1, 'D-': 1, E: 0, X: 0, Y: 0 },
    entries: 29,
    meanMarks: 46.4,
    meanMarksDeviation: 2.3027,
    meanPoints: 6.9655,
    meanPointsDeviation: 2.1507,
    grade: 'C+',
    subjectTeacher: 'Ciku, Betty',
    tscNo: '123456, 649563',
  },
  {
    form: 'Form 1 North',
    grades: { A: 0, 'A-': 2, 'B+': 0, B: 0, 'B-': 0, 'C+': 0, C: 1, 'C-': 0, 'D+': 0, D: 1, 'D-': 1, E: 1, X: 0, Y: 0 },
    entries: 6,
    meanMarks: 43,
    meanMarksDeviation: 0,
    meanPoints: 6.1667,
    meanPointsDeviation: 0,
    grade: 'C',
    subjectTeacher: '-',
    tscNo: '',
  },
  {
    form: 'Form 1',
    grades: { A: 0, 'A-': 12, 'B+': 5, B: 8, 'B-': 5, 'C+': 7, C: 10, 'C-': 10, 'D+': 6, D: 6, 'D-': 3, E: 0, X: 0, Y: 0 },
    entries: 72,
    meanMarks: 46.6,
    meanMarksDeviation: -0.3664,
    meanPoints: 6.9583,
    meanPointsDeviation: 1.7402,
    grade: 'C+',
    subjectTeacher: '',
    tscNo: '',
    isSummary: true,
  },
];

export const initialMockClassChartData: ClassChartData[] = [
  { name: 'Form 1 Alpha', mean: 47.3 },
  { name: 'Form 1 Moxie', mean: 46.4 },
  { name: 'Form 1 North', mean: 43 },
];
