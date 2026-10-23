// ABOUTME: Report cards v0: pick an exam session and a class stream (optionally one learner), preview a printable
// ABOUTME: term report per learner built from existing results, attendance and the school profile, then print them all.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { PrinterIcon } from '@/components/ui/icons';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { useSchoolProfile } from '@/hooks/useSchoolProfile';
import { ReportCard, assembleReportCards } from '../components/reportCard';
import type {
  RcAttendance, RcClassStream, RcExamSession, RcGradingScheme, RcResult, RcSchoolPeriod, RcStudent, RcSubject, RcSubjectPaper,
} from '../components/reportCard/assembleReportCards';

// While printing, show only the report cards (not the app shell) and start each card on a new page.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #report-cards-print, #report-cards-print * { visibility: visible !important; }
  #report-cards-print { position: absolute; left: 0; top: 0; width: 100%; }
  #report-cards-print .report-card { break-after: page; page-break-after: always; }
  @page { size: A4; margin: 12mm; }
}`;

const fieldClass = 'w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-surface-foreground';

export const ReportCardsPageContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const { profile, loading: schoolLoading } = useSchoolProfile();
  const examSessions = useDatabaseCollection<RcExamSession>('exam_sessions');
  const classStreams = useDatabaseCollection<RcClassStream>('class_streams');
  const students = useDatabaseCollection<RcStudent>('students');
  const results = useDatabaseCollection<RcResult>('student_exam_results');
  const subjects = useDatabaseCollection<RcSubject>('subjects');
  const subjectPapers = useDatabaseCollection<RcSubjectPaper>('subject_papers');
  const gradingSchemes = useDatabaseCollection<RcGradingScheme>('grading_schemes');
  const attendance = useDatabaseCollection<RcAttendance>('student_attendance');
  const schoolPeriods = useDatabaseCollection<RcSchoolPeriod>('school_periods');

  const [examSessionId, setExamSessionId] = useState('');
  const [classStreamId, setClassStreamId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [classTeacherRemark, setClassTeacherRemark] = useState('');
  const [headTeacherRemark, setHeadTeacherRemark] = useState('');
  const [nextTermDate, setNextTermDate] = useState('');

  const loading = schoolLoading || examSessions.loading || classStreams.loading || students.loading;
  const examSession = examSessions.data.find((s) => String(s.id) === examSessionId) ?? null;
  const streamLabel = (s: RcClassStream) => [s.class_name, s.name].filter(Boolean).join(' ');
  const classLearners = useMemo(
    () => students.data
      .filter((s) => classStreamId && String(s.current_class_stream_id ?? '') === classStreamId && (s.status ?? 'Active') === 'Active')
      .sort((a, b) => String(a.admission_no ?? '').localeCompare(String(b.admission_no ?? ''), undefined, { numeric: true })),
    [students.data, classStreamId],
  );

  const cards = useMemo(() => {
    if (!examSession || !classStreamId) return [];
    return assembleReportCards({
      school: profile,
      students: students.data,
      classStreams: classStreams.data,
      examSession,
      results: results.data,
      subjects: subjects.data,
      subjectPapers: subjectPapers.data,
      gradingSchemes: gradingSchemes.data,
      attendance: attendance.data,
      schoolPeriods: schoolPeriods.data,
      classStreamId,
      studentId: studentId || null,
      classTeacherRemark,
      headTeacherRemark,
      nextTermDate: nextTermDate || null,
    });
  }, [
    examSession, classStreamId, profile, students.data, classStreams.data, results.data, subjects.data, subjectPapers.data,
    gradingSchemes.data, attendance.data, schoolPeriods.data, studentId, classTeacherRemark, headTeacherRemark, nextTermDate,
  ]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      <style>{PRINT_CSS}</style>
      <div className="no-print print:hidden space-y-3">
        <PageHeaderWithTabs title={t('reportCards.title', 'Report Cards')} />
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="rc-exam" className="block text-sm font-medium text-surface-foreground mb-1">{t('reportCards.exam', 'Exam')}</label>
              <select id="rc-exam" className={fieldClass} value={examSessionId} onChange={(e) => setExamSessionId(e.target.value)}>
                <option value="">{t('reportCards.selectExam', '-- Select an exam --')}</option>
                {examSessions.data.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="rc-class" className="block text-sm font-medium text-surface-foreground mb-1">{t('reportCards.class', 'Class')}</label>
              <select id="rc-class" className={fieldClass} value={classStreamId} onChange={(e) => { setClassStreamId(e.target.value); setStudentId(''); }}>
                <option value="">{t('reportCards.selectClass', '-- Select a class --')}</option>
                {classStreams.data.map((s) => <option key={String(s.id)} value={String(s.id)}>{streamLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="rc-learner" className="block text-sm font-medium text-surface-foreground mb-1">{t('reportCards.learner', 'Learner')}</label>
              <select id="rc-learner" className={fieldClass} value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!classStreamId}>
                <option value="">{t('reportCards.wholeClass', 'Whole class')}</option>
                {classLearners.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {[s.admission_no, [s.first_name, s.last_name].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="rc-class-remark" className="block text-sm font-medium text-surface-foreground mb-1">
                {t('reportCards.classTeacherComment', "Class teacher's comment")}
              </label>
              <textarea
                id="rc-class-remark" rows={2} className={fieldClass} value={classTeacherRemark}
                placeholder={t('reportCards.classTeacherHint', 'Used where a learner has no comment of their own')}
                onChange={(e) => setClassTeacherRemark(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="rc-head-remark" className="block text-sm font-medium text-surface-foreground mb-1">
                {t('reportCards.headTeacherComment', "Head teacher's comment")}
              </label>
              <textarea id="rc-head-remark" rows={2} className={fieldClass} value={headTeacherRemark} onChange={(e) => setHeadTeacherRemark(e.target.value)} />
            </div>
            <div>
              <label htmlFor="rc-next-term" className="block text-sm font-medium text-surface-foreground mb-1">
                {t('reportCards.nextTerm', 'Next term begins')}
              </label>
              <input id="rc-next-term" type="date" className={fieldClass} value={nextTermDate} onChange={(e) => setNextTermDate(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => window.print()} disabled={cards.length === 0} className="print-button">
              <PrinterIcon className="w-4 h-4 mr-2" />
              {t('reportCards.print', 'Print {{count}} report cards', { count: cards.length })}
            </Button>
          </div>
        </Card>
        {cards.length === 0 && (
          <p className="text-center text-surface-muted-fg">
            {examSession && classStreamId
              ? t('reportCards.noLearners', 'No active learners in this class.')
              : t('reportCards.choose', 'Choose an exam and a class to prepare report cards.')}
          </p>
        )}
      </div>

      <div id="report-cards-print">
        {cards.map((card) => <ReportCard key={card.learner.id} card={card} />)}
      </div>
    </div>
  );
};

const ReportCardsPage: React.FC = () => <ReportCardsPageContent />;

export default ReportCardsPage;
