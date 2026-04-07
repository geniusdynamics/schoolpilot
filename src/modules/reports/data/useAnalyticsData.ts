import { useState, useEffect } from 'react';

interface ClassPerformance {
  classId: string;
  className: string;
  streamName?: string | null;
  averageScore: number;
  passRate: number;
  totalStudents: number;
  submittedCount: number;
  gradedCount: number;
  attendanceRate: number;
  assignmentCompletionRate: number;
}

interface SubjectPassRate {
  subjectId: string;
  subjectName: string;
  averageScore: number;
  passRate: number;
  totalStudents: number;
  submittedCount: number;
}

interface TeacherAnalytics {
  teacherId: string;
  teacherName: string;
  totalClasses: number;
  averageScore: number;
  passRate: number;
  studentCount: number;
  assignmentCompletionRate: number;
}

interface AnalyticsPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface UseAnalyticsDataReturn {
  classPerformances: ClassPerformance[];
  subjectPassRates: SubjectPassRate[];
  teacherAnalytics: TeacherAnalytics[];
  loading: boolean;
  selectedPeriod: AnalyticsPeriod | null;
  setSelectedPeriod: (period: AnalyticsPeriod | null) => void;
  availablePeriods: AnalyticsPeriod[];
}

const mockPeriods: AnalyticsPeriod[] = [
  {
    id: 'period-1',
    name: 'First Term',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
  },
  {
    id: 'period-2',
    name: 'Second Term',
    startDate: '2024-04-01',
    endDate: '2024-06-30',
  },
  {
    id: 'period-3',
    name: 'Third Term',
    startDate: '2024-07-01',
    endDate: '2024-09-30',
  },
];

const mockClassPerformances: ClassPerformance[] = [
  {
    classId: 'class-1',
    className: 'Grade 10A',
    streamName: 'Science',
    averageScore: 78.5,
    passRate: 85,
    totalStudents: 45,
    submittedCount: 42,
    gradedCount: 40,
    attendanceRate: 92,
    assignmentCompletionRate: 88,
  },
  {
    classId: 'class-2',
    className: 'Grade 10B',
    streamName: 'Arts',
    averageScore: 72.3,
    passRate: 78,
    totalStudents: 48,
    submittedCount: 45,
    gradedCount: 43,
    attendanceRate: 89,
    assignmentCompletionRate: 82,
  },
  {
    classId: 'class-3',
    className: 'Grade 11A',
    streamName: 'Science',
    averageScore: 81.2,
    passRate: 88,
    totalStudents: 52,
    submittedCount: 50,
    gradedCount: 48,
    attendanceRate: 94,
    assignmentCompletionRate: 91,
  },
];

const mockSubjectPassRates: SubjectPassRate[] = [
  {
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    averageScore: 75.8,
    passRate: 82,
    totalStudents: 95,
    submittedCount: 92,
  },
  {
    subjectId: 'sci-101',
    subjectName: 'Science',
    averageScore: 79.4,
    passRate: 87,
    totalStudents: 92,
    submittedCount: 89,
  },
  {
    subjectId: 'eng-101',
    subjectName: 'English',
    averageScore: 73.2,
    passRate: 80,
    totalStudents: 97,
    submittedCount: 95,
  },
  {
    subjectId: 'soc-101',
    subjectName: 'Social Studies',
    averageScore: 76.6,
    passRate: 84,
    totalStudents: 93,
    submittedCount: 91,
  },
];

const mockTeacherAnalytics: TeacherAnalytics[] = [
  {
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    totalClasses: 12,
    averageScore: 77.5,
    passRate: 84,
    studentCount: 180,
    assignmentCompletionRate: 86,
  },
  {
    teacherId: 'teacher-2',
    teacherName: 'Jane Doe',
    totalClasses: 10,
    averageScore: 79.8,
    passRate: 86,
    studentCount: 150,
    assignmentCompletionRate: 88,
  },
  {
    teacherId: 'teacher-3',
    teacherName: 'Michael Brown',
    totalClasses: 14,
    averageScore: 75.2,
    passRate: 81,
    studentCount: 210,
    assignmentCompletionRate: 83,
  },
];

export function useAnalyticsData(): UseAnalyticsDataReturn {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        setLoading(false);
      } catch (err) {
        console.error('Failed to load analytics data:', err);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return {
    classPerformances: mockClassPerformances,
    subjectPassRates: mockSubjectPassRates,
    teacherAnalytics: mockTeacherAnalytics,
    loading,
    selectedPeriod,
    setSelectedPeriod,
    availablePeriods: mockPeriods,
  };
}

export default useAnalyticsData;