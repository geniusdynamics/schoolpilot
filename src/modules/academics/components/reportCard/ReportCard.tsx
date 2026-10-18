// ABOUTME: One printable A4 term report card: school header, learner details, subject grades, attendance,
// ABOUTME: class teacher and head teacher comments and next term date. Breaks onto a new page when printed.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/format';
import type { ReportCardData } from './assembleReportCards';

interface ReportCardProps {
  card: ReportCardData;
}

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <span className="text-xs uppercase tracking-wide text-surface-muted-fg">{label}</span>
    <div className="font-semibold text-surface-foreground">{value}</div>
  </div>
);

const ReportCard: React.FC<ReportCardProps> = ({ card }) => {
  const { t } = useTranslation('academics');
  const dash = '—';

  return (
    <article
      data-testid="report-card"
      className="report-card bg-white text-black border border-surface-border rounded-lg p-6 mb-6 break-after-page print:border-0 print:rounded-none print:m-0 print:p-0"
    >
      <header className="text-center border-b border-surface-border pb-3 mb-4">
        {card.school.logo && <img src={card.school.logo} alt="" className="mx-auto mb-2 h-16 w-16 object-contain" />}
        <h2 className="text-xl font-bold">{card.school.name || t('reportCards.schoolNotSet', 'School profile not set')}</h2>
        {card.school.address && <p className="text-sm">{card.school.address}</p>}
        {card.school.contact && <p className="text-sm">{card.school.contact}</p>}
        {card.school.motto && <p className="text-sm italic">{card.school.motto}</p>}
        <p className="mt-2 text-base font-semibold uppercase">{t('reportCards.cardTitle', 'Term Report Card')}</p>
        <p className="text-sm">{[card.term.name, card.term.examName].filter(Boolean).join(' · ')}</p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Field label={t('reportCards.learner', 'Learner')} value={card.learner.name} />
        <Field label={t('reportCards.admissionNo', 'Adm. No.')} value={card.learner.admissionNo || dash} />
        <Field label={t('reportCards.class', 'Class')} value={card.learner.className || dash} />
        <Field
          label={t('reportCards.position', 'Position')}
          value={card.position ? t('reportCards.positionOf', '{{position}} of {{size}}', { position: card.position, size: card.classSize }) : dash}
        />
      </section>

      <table className="w-full text-sm border-collapse mb-4">
        <thead>
          <tr className="border-b-2 border-surface-border text-left">
            <th className="py-1 pr-2">{t('reportCards.subject', 'Subject')}</th>
            <th className="py-1 pr-2 text-right">{t('reportCards.score', 'Score')}</th>
            <th className="py-1 pr-2 text-center">{t('reportCards.grade', 'Grade')}</th>
            <th className="py-1">{t('reportCards.remark', 'Remark')}</th>
          </tr>
        </thead>
        <tbody>
          {card.subjects.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-2 text-center">{t('reportCards.noResults', 'No results recorded for this exam.')}</td>
            </tr>
          ) : (
            card.subjects.map((s) => (
              <tr key={s.subjectId} className="border-b border-surface-border">
                <td className="py-1 pr-2">{s.name}</td>
                <td className="py-1 pr-2 text-right">{s.score}</td>
                <td className="py-1 pr-2 text-center font-semibold">{s.grade ?? dash}</td>
                <td className="py-1">{s.remark ?? ''}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <section className="grid grid-cols-3 gap-3 mb-4">
        <Field label={t('reportCards.total', 'Total')} value={card.total ?? dash} />
        <Field label={t('reportCards.average', 'Average')} value={card.average ?? dash} />
        <Field label={t('reportCards.meanGrade', 'Mean grade')} value={card.meanGrade ?? dash} />
      </section>

      <section data-testid="report-attendance" className="mb-4 text-sm">
        <span className="font-semibold">{t('reportCards.attendance', 'Attendance')}: </span>
        {card.attendance.daysOpen > 0
          ? t('reportCards.attendanceSummary', 'Present {{present}} of {{days}} days, absent {{absent}}, late {{late}}', {
            present: card.attendance.present, days: card.attendance.daysOpen, absent: card.attendance.absent, late: card.attendance.late,
          })
          : t('reportCards.noAttendance', 'Not recorded')}
      </section>

      <section className="mb-3 text-sm">
        <p className="font-semibold">
          {t('reportCards.classTeacherComment', "Class teacher's comment")}
          {card.classTeacherName ? ` (${card.classTeacherName})` : ''}
        </p>
        <p className="min-h-[1.5rem] border-b border-dotted border-surface-border">{card.comments.classTeacher}</p>
      </section>
      <section className="mb-4 text-sm">
        <p className="font-semibold">
          {t('reportCards.headTeacherComment', "Head teacher's comment")}
          {card.school.headTeacherName ? ` (${card.school.headTeacherName})` : ''}
        </p>
        <p className="min-h-[1.5rem] border-b border-dotted border-surface-border">{card.comments.headTeacher}</p>
      </section>

      <footer className="flex justify-between text-sm">
        <p data-testid="report-next-term">
          <span className="font-semibold">{t('reportCards.nextTerm', 'Next term begins')}: </span>
          {card.nextTermDate ? formatDate(card.nextTermDate) : t('reportCards.toBeAnnounced', 'To be announced')}
        </p>
        <p>{t('reportCards.signature', 'Signature & stamp')}: ____________</p>
      </footer>
    </article>
  );
};

export default ReportCard;
