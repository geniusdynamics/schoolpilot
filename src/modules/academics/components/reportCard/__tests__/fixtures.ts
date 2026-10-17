// ABOUTME: Shared report-card fixtures: a school, a term with a following term, a stream, an exam session and results.
// ABOUTME: buildClassFixture(n) scales the class to n learners for the 40-learner print timing test.

import type { ReportCardSources } from '../assembleReportCards';

const SUBJECTS = [
  { id: 'sub-eng', name: 'English', abbreviation: 'ENG' },
  { id: 'sub-mat', name: 'Mathematics', abbreviation: 'MAT' },
  { id: 'sub-sci', name: 'Science', abbreviation: 'SCI' },
];

export const STREAM_ID = '874b9758-1c2d-4e5f-8a9b-0c1d2e3f4a5b';

export function buildClassFixture(learners = 2): ReportCardSources {
  const streamId = STREAM_ID;
  const inClass = Array.from({ length: learners }, (_, i) => ({
    id: `stu-${i + 1}`,
    admission_no: `ADM${String(i + 1).padStart(3, '0')}`,
    first_name: `Learner${i + 1}`,
    last_name: 'Pupil',
    status: 'Active',
    current_class_stream_id: streamId,
  }));
  // Another stream's learner and a leaver in this stream are never printed.
  const students = [
    ...inClass,
    { id: 'stu-other', admission_no: 'ADM900', first_name: 'Other', last_name: 'Stream', status: 'Active', current_class_stream_id: 'stream-2' },
    { id: 'stu-left', admission_no: 'ADM901', first_name: 'Gone', last_name: 'Away', status: 'Graduated', current_class_stream_id: streamId },
  ];

  // English has two papers weighted 50/50 out of 50; Maths and Science one paper out of 100.
  const paperSettings = [
    { id: 'ps-eng1', subject_paper_id: 'sp-eng1', marks_out_of: 50, weight_percentage: 50 },
    { id: 'ps-eng2', subject_paper_id: 'sp-eng2', marks_out_of: 50, weight_percentage: 50 },
    { id: 'ps-mat', subject_paper_id: 'sp-mat', marks_out_of: 100, weight_percentage: 100 },
    { id: 'ps-sci', subject_paper_id: 'sp-sci', marks_out_of: 100, weight_percentage: 100 },
  ];
  const subjectPapers = [
    { id: 'sp-eng1', subject_id: 'sub-eng' },
    { id: 'sp-eng2', subject_id: 'sub-eng' },
    { id: 'sp-mat', subject_id: 'sub-mat' },
    { id: 'sp-sci', subject_id: 'sub-sci' },
  ];

  const results = inClass.map((s, i) => ({
    id: `res-${i + 1}`,
    student_id: s.id,
    exam_session_id: 'session-1',
    // Learner 1: ENG 40/50*50 + 30/50*50 = 70, MAT 85, SCI 55 -> total 210, average 70
    marks: [
      { paper_setting_id: 'ps-eng1', score: 40 - (i % 5) },
      { paper_setting_id: 'ps-eng2', score: 30 },
      { paper_setting_id: 'ps-mat', score: 85 - (i % 7) },
      { paper_setting_id: 'ps-sci', score: 55 },
    ],
    overall_comment: i === 0 ? 'A focused and helpful learner.' : undefined,
  }));

  const attendance: ReportCardSources['attendance'] = [];
  const days = ['2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09'];
  inClass.forEach((s, i) => {
    days.forEach((date, d) => {
      const status = i === 0 && d === 1 ? 'Absent' : i === 0 && d === 2 ? 'Late' : 'Present';
      attendance.push({ id: `att-${s.id}-${d}`, student_id: s.id, date, status });
    });
    // Two sessions on the same day count once; a record outside the term is ignored.
    attendance.push({ id: `att-${s.id}-pm`, student_id: s.id, date: days[0], status: 'Present' });
    attendance.push({ id: `att-${s.id}-old`, student_id: s.id, date: '2025-11-20', status: 'Absent' });
  });

  return {
    school: { id: 'school-1', name: 'Greenfields Academy', postal_address: 'P.O. Box 1', town: 'Nairobi', telephone: '0700 000 000', email: 'info@greenfields.ke', motto: 'Strive' },
    students,
    classStreams: [
      { id: streamId, name: 'Blue', class_name: 'Grade 7', class_teacher_name: 'Mrs Wanjiru' },
      { id: 'stream-2', name: 'Red', class_name: 'Grade 7' },
    ],
    examSession: { id: 'session-1', name: 'End of Term 1', school_period_id: 'term-1', paper_settings: paperSettings },
    results,
    subjects: SUBJECTS,
    subjectPapers,
    gradingSchemes: [
      {
        id: 'gs-1', is_default: true,
        levels: [
          { grade: 'A', min_score: 80, max_score: 100, comment: 'Excellent' },
          { grade: 'B', min_score: 65, max_score: 79.99, comment: 'Good' },
          { grade: 'C', min_score: 50, max_score: 64.99, comment: 'Fair' },
          { grade: 'D', min_score: 0, max_score: 49.99, comment: 'Needs improvement' },
        ],
      },
    ],
    attendance,
    schoolPeriods: [
      { id: 'term-2', name: 'Term 2 2026', start_date: '2026-05-04', end_date: '2026-08-07' },
      { id: 'term-1', name: 'Term 1 2026', start_date: '2026-01-05', end_date: '2026-04-03' },
      { id: 'term-3', name: 'Term 3 2026', start_date: '2026-08-31', end_date: '2026-10-30' },
    ],
    classStreamId: streamId,
  };
}
