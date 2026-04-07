export interface LessonPlan {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  gradeLevel: string;
  classStreamId: string;
  classStreamName: string;
  topic: string;
  objectives: string[];
  materials: string[];
  duration: number;
  created_at: string;
  updated_at: string;
}

export interface LessonPlanSubmission {
  id: string;
  lessonPlanId: string;
  studentId: string;
  studentName: string;
  status: string;
  submissionDate: string;
  score?: number | null;
  feedback?: string | null;
  maxScore: number;
}