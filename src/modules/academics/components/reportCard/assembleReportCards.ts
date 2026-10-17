// ABOUTME: Pure assembly of term report cards from existing records: school profile, learners, exam results,
// ABOUTME: grading scheme, attendance and school periods. One card per active learner in a stream (or one learner).

import { formatSchoolAddress, formatSchoolContact, type SchoolProfile } from '@/hooks/useSchoolProfile';

type Id = string | number;

export interface RcStudent { id: Id; admission_no?: string | null; first_name?: string | null; middle_name?: string | null; last_name?: string | null; status?: string | null; current_class_stream_id?: Id | null }
export interface RcClassStream { id: Id; name?: string | null; class_name?: string | null; class_teacher_name?: string | null }
export interface RcPaperSetting { id: Id; subject_paper_id?: Id | null; marks_out_of?: number | null; weight_percentage?: number | null; subject_name?: string | null }
export interface RcExamSession { id: Id; name?: string | null; school_period_id?: Id | null; school_period_name?: string | null; paper_settings?: RcPaperSetting[] | null }
export interface RcPaperMark { paper_setting_id: Id; score?: number | null }
export interface RcResult { id: Id; student_id: Id; exam_session_id: Id; marks?: RcPaperMark[] | null; mean_grade?: string | null; stream_rank?: number | null; overall_comment?: string | null }
export interface RcSubject { id: Id; name?: string | null; abbreviation?: string | null }
export interface RcSubjectPaper { id: Id; subject_id: Id }
export interface RcGradeLevel { grade: string; min_score: number; max_score?: number | null; comment?: string | null }
export interface RcGradingScheme { id: Id; is_default?: boolean | null; levels?: RcGradeLevel[] | null }
export interface RcAttendance { id?: Id; student_id: Id; date: string; status: string }
export interface RcSchoolPeriod { id: Id; name?: string | null; start_date?: string | null; end_date?: string | null }

export interface ReportCardSources {
  school: SchoolProfile | null;
  students: RcStudent[];
  classStreams: RcClassStream[];
  examSession: RcExamSession | null;
  results: RcResult[];
  subjects: RcSubject[];
  subjectPapers: RcSubjectPaper[];
  gradingSchemes: RcGradingScheme[];
  attendance: RcAttendance[];
  schoolPeriods: RcSchoolPeriod[];
  classStreamId: Id;
  /** Print only this learner (still ranked against the whole stream). */
  studentId?: Id | null;
  /** Used when the learner's result carries no comment of its own. */
  classTeacherRemark?: string;
  headTeacherRemark?: string;
  /** Overrides the start of the following school period. */
  nextTermDate?: string | null;
}

export interface ReportCardSubjectLine { subjectId: string; name: string; score: number; grade: string | null; remark: string | null }

export interface ReportCardData {
  school: { name: string; address: string; contact: string; motto: string | null; logo: string | null; headTeacherName: string | null };
  learner: { id: string; name: string; admissionNo: string; className: string };
  classTeacherName: string | null;
  term: { name: string; examName: string; startDate: string | null; endDate: string | null };
  subjects: ReportCardSubjectLine[];
  total: number | null;
  average: number | null;
  meanGrade: string | null;
  position: number | null;
  classSize: number;
  attendance: { daysOpen: number; present: number; absent: number; late: number };
  comments: { classTeacher: string; headTeacher: string };
  nextTermDate: string | null;
}

const key = (id: Id | null | undefined) => (id === null || id === undefined ? '' : String(id));
const round2 = (n: number) => Math.round(n * 100) / 100;
const PRESENT = new Set(['present', 'late']);

function pickScheme(schemes: RcGradingScheme[]): RcGradeLevel[] {
  const scheme = schemes.find((s) => s.is_default) ?? schemes[0];
  return [...(scheme?.levels ?? [])].sort((a, b) => b.min_score - a.min_score);
}

function gradeFor(levels: RcGradeLevel[], score: number): RcGradeLevel | null {
  return levels.find((l) => score >= l.min_score && (l.max_score === null || l.max_score === undefined || score <= l.max_score + 0.005))
    ?? levels.find((l) => score >= l.min_score) ?? null;
}

/** Weighted subject scores: (score / marks_out_of) * weight_percentage, summed per subject. */
function subjectScores(result: RcResult | undefined, settings: Map<string, RcPaperSetting>, paperToSubject: Map<string, string>): Map<string, number> {
  const scores = new Map<string, number>();
  for (const mark of result?.marks ?? []) {
    if (mark.score === null || mark.score === undefined || Number.isNaN(Number(mark.score))) continue;
    const setting = settings.get(key(mark.paper_setting_id));
    if (!setting) continue;
    const subjectId = paperToSubject.get(key(setting.subject_paper_id)) ?? (setting.subject_name ? `name:${setting.subject_name}` : null);
    if (!subjectId) continue;
    const outOf = Number(setting.marks_out_of) || 100;
    const weight = Number(setting.weight_percentage) || 100;
    scores.set(subjectId, (scores.get(subjectId) ?? 0) + (Number(mark.score) / outOf) * weight);
  }
  return scores;
}

function summariseAttendance(records: RcAttendance[], start: string | null, end: string | null) {
  const byDate = new Map<string, { present: boolean; late: boolean }>();
  for (const r of records) {
    const date = String(r.date ?? '').slice(0, 10);
    if (!date || (start && date < start) || (end && date > end)) continue;
    const status = String(r.status ?? '').toLowerCase();
    const day = byDate.get(date) ?? { present: false, late: false };
    if (PRESENT.has(status)) day.present = true;
    if (status === 'late') day.late = true;
    byDate.set(date, day);
  }
  const days = Array.from(byDate.values());
  const present = days.filter((d) => d.present).length;
  return { daysOpen: days.length, present, absent: days.length - present, late: days.filter((d) => d.late).length };
}

const fullName = (s: RcStudent) => [s.first_name, s.middle_name, s.last_name].map((p) => (p ?? '').trim()).filter(Boolean).join(' ');

export function assembleReportCards(src: ReportCardSources): ReportCardData[] {
  const session = src.examSession;
  if (!session) return [];
  const streamKey = key(src.classStreamId);
  const stream = src.classStreams.find((s) => key(s.id) === streamKey);
  const className = [stream?.class_name, stream?.name].map((p) => (p ?? '').trim()).filter(Boolean).join(' ');

  const levels = pickScheme(src.gradingSchemes);
  const settings = new Map((session.paper_settings ?? []).map((ps) => [key(ps.id), ps]));
  const paperToSubject = new Map(src.subjectPapers.map((sp) => [key(sp.id), key(sp.subject_id)]));
  const subjectOrder = new Map(src.subjects.map((s, i) => [key(s.id), i]));
  const subjectName = new Map(src.subjects.map((s) => [key(s.id), String(s.name ?? s.abbreviation ?? '')]));

  const period = src.schoolPeriods.find((p) => key(p.id) === key(session.school_period_id)) ?? null;
  const termStart = period?.start_date ? String(period.start_date).slice(0, 10) : null;
  const termEnd = period?.end_date ? String(period.end_date).slice(0, 10) : null;
  const following = termEnd
    ? src.schoolPeriods
      .map((p) => String(p.start_date ?? '').slice(0, 10))
      .filter((d) => d && d > termEnd)
      .sort()[0] ?? null
    : null;
  const nextTermDate = src.nextTermDate || following;

  const learners = src.students
    .filter((s) => key(s.current_class_stream_id) === streamKey && (s.status ?? 'Active') === 'Active')
    .sort((a, b) => String(a.admission_no ?? '').localeCompare(String(b.admission_no ?? ''), undefined, { numeric: true }));
  const learnerKeys = new Set(learners.map((s) => key(s.id)));

  const resultByStudent = new Map<string, RcResult>();
  for (const r of src.results) {
    if (key(r.exam_session_id) === key(session.id) && learnerKeys.has(key(r.student_id))) resultByStudent.set(key(r.student_id), r);
  }
  const attendanceByStudent = new Map<string, RcAttendance[]>();
  for (const a of src.attendance) {
    const k = key(a.student_id);
    if (!learnerKeys.has(k)) continue;
    const list = attendanceByStudent.get(k) ?? [];
    list.push(a);
    attendanceByStudent.set(k, list);
  }

  const school = {
    name: src.school?.name?.trim() ?? '',
    address: formatSchoolAddress(src.school),
    contact: formatSchoolContact(src.school),
    motto: src.school?.motto ?? null,
    logo: src.school?.logo_path ?? null,
    headTeacherName: src.school?.head_teacher_name ?? src.school?.principal ?? null,
  };

  const cards: ReportCardData[] = learners.map((s) => {
    const result = resultByStudent.get(key(s.id));
    const scores = subjectScores(result, settings, paperToSubject);
    const subjects: ReportCardSubjectLine[] = Array.from(scores.entries())
      .map(([subjectId, raw]) => {
        const score = round2(raw);
        const level = gradeFor(levels, score);
        return { subjectId, name: subjectName.get(subjectId) ?? subjectId.replace(/^name:/, ''), score, grade: level?.grade ?? null, remark: level?.comment ?? null };
      })
      .sort((a, b) => (subjectOrder.get(a.subjectId) ?? 1e9) - (subjectOrder.get(b.subjectId) ?? 1e9) || a.name.localeCompare(b.name));
    const total = subjects.length ? round2(subjects.reduce((sum, l) => sum + l.score, 0)) : null;
    const average = total !== null ? round2(total / subjects.length) : null;
    return {
      school,
      learner: { id: key(s.id), name: fullName(s), admissionNo: String(s.admission_no ?? ''), className },
      classTeacherName: stream?.class_teacher_name ?? null,
      term: { name: String(period?.name ?? session.school_period_name ?? ''), examName: String(session.name ?? ''), startDate: termStart, endDate: termEnd },
      subjects,
      total,
      average,
      meanGrade: result?.mean_grade || (average !== null ? gradeFor(levels, average)?.grade ?? null : null),
      position: result?.stream_rank ?? null,
      classSize: learners.length,
      attendance: summariseAttendance(attendanceByStudent.get(key(s.id)) ?? [], termStart, termEnd),
      comments: {
        classTeacher: result?.overall_comment?.trim() || src.classTeacherRemark?.trim() || '',
        headTeacher: src.headTeacherRemark?.trim() || '',
      },
      nextTermDate,
    };
  });

  // Rank by total within the stream where no rank was stored (ties share a position).
  if (cards.some((c) => c.position === null && c.total !== null)) {
    const totals = cards.map((c) => c.total).filter((t): t is number => t !== null).sort((a, b) => b - a);
    for (const c of cards) {
      if (c.position === null && c.total !== null) c.position = totals.indexOf(c.total) + 1;
    }
  }

  const only = key(src.studentId);
  return only ? cards.filter((c) => c.learner.id === only) : cards;
}
