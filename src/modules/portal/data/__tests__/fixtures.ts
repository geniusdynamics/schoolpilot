// ABOUTME: Canonical rows and login shapes the portal tests share, in the fields the portal reads.
// ABOUTME: Ids are UUIDv7-shaped so the same fixtures work against the repository double and the real schema.

export const IDS = {
  institution: '00000000-0000-7000-8000-000000000001',
  login: '5b1c1f6e-2a7e-4a1e-9a2f-1a2b3c4d5e6f',
  canonicalUser: '00000000-0000-7000-8000-0000000000aa',
  guardianUser: '00000000-0000-7000-8000-0000000000bb',
  learnerA: '00000000-0000-7000-8000-0000000000a1',
  learnerB: '00000000-0000-7000-8000-0000000000a2',
  learnerOther: '00000000-0000-7000-8000-0000000000a3',
  guardian: '00000000-0000-7000-8000-0000000000c1',
  otherGuardian: '00000000-0000-7000-8000-0000000000c2',
  linkA: '00000000-0000-7000-8000-0000000000d1',
  linkB: '00000000-0000-7000-8000-0000000000d2',
  otherLink: '00000000-0000-7000-8000-0000000000d3',
  enrolmentA: '00000000-0000-7000-8000-0000000000e1',
  enrolmentB: '00000000-0000-7000-8000-0000000000e2',
  classGroup: '00000000-0000-7000-8000-0000000000f1',
  termOne: '00000000-0000-7000-8000-000000001001',
  termTwo: '00000000-0000-7000-8000-000000001002',
  reportCard: '00000000-0000-7000-8000-000000002001',
  otherReportCard: '00000000-0000-7000-8000-000000002002',
  result: '00000000-0000-7000-8000-000000003001',
  resultOther: '00000000-0000-7000-8000-000000003002',
  learningArea: '00000000-0000-7000-8000-000000004001',
  sessionOne: '00000000-0000-7000-8000-000000005001',
  sessionTwo: '00000000-0000-7000-8000-000000005002',
  markPresent: '00000000-0000-7000-8000-000000006001',
  markLate: '00000000-0000-7000-8000-000000006002',
  markAbsent: '00000000-0000-7000-8000-000000006003',
  markOtherLearner: '00000000-0000-7000-8000-000000006004',
  noticeRead: '00000000-0000-7000-8000-000000007001',
  noticeUnread: '00000000-0000-7000-8000-000000007002',
  noticeStudents: '00000000-0000-7000-8000-000000007003',
  noticeExpired: '00000000-0000-7000-8000-000000007004',
} as const;

export const TERM_ONE = {
  id: IDS.termOne,
  name: 'Term 1 2026',
  start_date: '2026-01-05',
  end_date: '2026-04-03',
  is_reporting: true,
} as const;

export const TERM_TWO = {
  id: IDS.termTwo,
  name: 'Term 2 2026',
  start_date: '2026-05-04',
  end_date: '2026-08-07',
  is_reporting: true,
} as const;

export const LEARNER_A = {
  id: IDS.learnerA,
  institution_id: IDS.institution,
  admission_number: 'ADM/2026/001',
  given_name: 'Amina',
  family_name: 'Wanjiku',
  status: 'enrolled',
} as const;

export const LEARNER_B = {
  id: IDS.learnerB,
  institution_id: IDS.institution,
  admission_number: 'ADM/2026/002',
  given_name: 'Baraka',
  family_name: 'Wanjiku',
  status: 'enrolled',
} as const;

export const LEARNER_OTHER = {
  id: IDS.learnerOther,
  institution_id: IDS.institution,
  admission_number: 'ADM/2026/009',
  given_name: 'Chipo',
  family_name: 'Otieno',
  status: 'enrolled',
} as const;

export const GUARDIAN = {
  id: IDS.guardian,
  institution_id: IDS.institution,
  given_name: 'Grace',
  family_name: 'Mwangi',
} as const;

export const OTHER_GUARDIAN = {
  id: IDS.otherGuardian,
  institution_id: IDS.institution,
  given_name: 'Peter',
  family_name: 'Otieno',
} as const;

export const LINK_A = {
  id: IDS.linkA,
  institution_id: IDS.institution,
  learner_id: IDS.learnerA,
  guardian_id: IDS.guardian,
  receives_reports: true,
  receives_sms: true,
  preferred_channel: 'sms',
  preferred_language: 'sw',
} as const;

export const LINK_B = {
  id: IDS.linkB,
  institution_id: IDS.institution,
  learner_id: IDS.learnerB,
  guardian_id: IDS.guardian,
  receives_reports: true,
  receives_sms: false,
  preferred_channel: 'portal',
  preferred_language: 'en',
} as const;

export const OTHER_LINK = {
  id: IDS.otherLink,
  institution_id: IDS.institution,
  learner_id: IDS.learnerOther,
  guardian_id: IDS.otherGuardian,
  receives_reports: true,
  receives_sms: true,
  preferred_channel: 'sms',
} as const;

export const ENROLMENT_A = {
  id: IDS.enrolmentA,
  institution_id: IDS.institution,
  learner_id: IDS.learnerA,
  class_group_id: IDS.classGroup,
  status: 'active',
  start_date: '2026-01-05',
} as const;

export const ENROLMENT_B = {
  id: IDS.enrolmentB,
  institution_id: IDS.institution,
  learner_id: IDS.learnerB,
  class_group_id: IDS.classGroup,
  status: 'active',
  start_date: '2026-01-05',
} as const;

export const CLASS_GROUP = { id: IDS.classGroup, name: 'Form 1', stream: 'North' } as const;

export const REPORT_CARD = {
  id: IDS.reportCard,
  institution_id: IDS.institution,
  enrolment_id: IDS.enrolmentA,
  academic_period_id: IDS.termOne,
  template_code: 'termly',
  template_version: '1',
  version: 1,
  snapshot: { title: 'Term 1 report' },
  published_at: '2026-04-10T09:00:00.000Z',
} as const;

export const OTHER_REPORT_CARD = {
  id: IDS.otherReportCard,
  institution_id: IDS.institution,
  enrolment_id: IDS.enrolmentB,
  academic_period_id: IDS.termOne,
  template_code: 'termly',
  template_version: '1',
  version: 1,
  snapshot: { title: 'Term 1 report' },
  published_at: '2026-04-10T09:00:00.000Z',
} as const;

export const RESULT = {
  id: IDS.result,
  institution_id: IDS.institution,
  enrolment_id: IDS.enrolmentA,
  academic_period_id: IDS.termOne,
  learning_area_id: IDS.learningArea,
  score: 82,
  grade: 'A-',
  points: 11,
  is_final: true,
} as const;

export const DRAFT_RESULT = {
  ...RESULT,
  id: IDS.resultOther,
  score: 40,
  grade: 'D',
  is_final: false,
} as const;

export const LEARNING_AREA = {
  id: IDS.learningArea,
  institution_id: IDS.institution,
  code: 'MAT',
  name: 'Mathematics',
} as const;

export const SESSION_ONE = {
  id: IDS.sessionOne,
  institution_id: IDS.institution,
  academic_period_id: IDS.termOne,
  date: '2026-02-02',
  session: 'am',
} as const;

export const SESSION_TWO = {
  id: IDS.sessionTwo,
  institution_id: IDS.institution,
  academic_period_id: IDS.termOne,
  date: '2026-02-03',
  session: 'am',
} as const;

export const MARK_PRESENT = {
  id: IDS.markPresent,
  institution_id: IDS.institution,
  attendance_session_id: IDS.sessionOne,
  learner_id: IDS.learnerA,
  status: 'present',
} as const;

export const MARK_LATE = {
  id: IDS.markLate,
  institution_id: IDS.institution,
  attendance_session_id: IDS.sessionTwo,
  learner_id: IDS.learnerA,
  status: 'late',
  minutes_late: 12,
} as const;

export const MARK_ABSENT = {
  id: IDS.markAbsent,
  institution_id: IDS.institution,
  attendance_session_id: IDS.sessionTwo,
  learner_id: IDS.learnerA,
  status: 'excused',
  reason: 'illness',
} as const;

export const MARK_OTHER_LEARNER = {
  id: IDS.markOtherLearner,
  institution_id: IDS.institution,
  attendance_session_id: IDS.sessionOne,
  learner_id: IDS.learnerOther,
  status: 'absent',
  reason: 'illness',
} as const;

export const NOTICES = [
  {
    id: IDS.noticeRead,
    title: 'Half-term break',
    content: 'School closes on Friday.',
    priority: 'high',
    audience: 'parents',
    authorId: 'staff-1',
    authorName: 'The Head',
    publishedAt: '2026-02-01T08:00:00.000Z',
    isPublished: true,
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
    readBy: [IDS.canonicalUser],
  },
  {
    id: IDS.noticeUnread,
    title: 'Fee reminder',
    content: 'Term fees are due.',
    priority: 'urgent',
    audience: 'all',
    authorId: 'staff-1',
    authorName: 'The Bursar',
    publishedAt: '2026-02-02T08:00:00.000Z',
    isPublished: true,
    createdAt: '2026-02-02T08:00:00.000Z',
    updatedAt: '2026-02-02T08:00:00.000Z',
    readBy: [],
  },
  {
    id: IDS.noticeStudents,
    title: 'Clubs sign-up',
    content: 'Choose a club this week.',
    priority: 'low',
    audience: 'students',
    authorId: 'staff-2',
    authorName: 'The Deputy',
    publishedAt: '2026-02-03T08:00:00.000Z',
    isPublished: true,
    createdAt: '2026-02-03T08:00:00.000Z',
    updatedAt: '2026-02-03T08:00:00.000Z',
    readBy: [],
  },
  {
    id: IDS.noticeExpired,
    title: 'Old notice',
    content: 'This has expired.',
    priority: 'low',
    audience: 'all',
    authorId: 'staff-1',
    authorName: 'The Head',
    publishedAt: '2026-01-01T08:00:00.000Z',
    expiresAt: '2026-01-31T00:00:00.000Z',
    isPublished: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
    readBy: [],
  },
] as const;
