// ABOUTME: The portal attendance page: the term summary a guardian or learner checks, and the register
// ABOUTME: marks behind it. Plain tables, no grid: this is read on a phone over a slow connection.

import { withPortalRepository } from '../data/withPortalRepository';

import React from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { CalendarDaysIcon } from '@/components/ui/icons';

import { PortalShell } from '../components/PortalShell';
import { usePortalAttendance } from '../data/usePortalSession';

const STATUS_CLASS: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-800',
  absent: 'bg-rose-100 text-rose-800',
  late: 'bg-amber-100 text-amber-800',
  excused: 'bg-primary-100 text-primary-800',
  medical: 'bg-primary-100 text-primary-800',
  exeat: 'bg-primary-100 text-primary-800',
  suspended: 'bg-surface-accent text-surface-muted-fg',
};

const statusLabel = (status: string): string => status.replace(/_/g, ' ');

export const PortalAttendanceContent: React.FC = () => {
  const { t } = useTranslation('portal');
  const { session, summary, records, loading, error } = usePortalAttendance();

  return (
    <PortalShell session={session} title={t('attendance.title', 'Attendance')}>
      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        </Card>
      ) : null}

      {loading && !summary ? (
        <div className="flex items-center justify-center py-10" role="status">
          <Spinner />
          <span className="ml-3 text-surface-muted-fg">{t('common.loading', 'Loading…')}</span>
        </div>
      ) : null}

      {summary && summary.total === 0 ? (
        <Card className="border-slate-200 bg-surface-card">
          <div className="py-10 text-center">
            <CalendarDaysIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <h2 className="text-base font-medium text-surface-foreground">
              {t('attendance.noRecords', 'No attendance recorded yet this term')}
            </h2>
            <p className="mt-1 text-sm text-surface-muted-fg">
              {summary.periodName
                ? t('attendance.noRecordsTerm', 'Nothing has been registered for {{term}}.', {
                    term: summary.periodName,
                  })
                : t('attendance.noRecordsAtAll', 'The school has not opened a register for this term.')}
            </p>
          </div>
        </Card>
      ) : null}

      {summary && summary.total > 0 ? (
        <>
          <Card className="border-slate-200 bg-surface-card">
            <p className="text-xs uppercase tracking-wide text-surface-muted-fg">
              {summary.periodName}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-semibold text-surface-foreground">
                  {summary.percentage === null ? '—' : `${summary.percentage}%`}
                </p>
                <p className="text-xs text-surface-muted-fg">
                  {t('attendance.percentage', 'Attendance')}
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-emerald-700">{summary.present}</p>
                <p className="text-xs text-surface-muted-fg">{t('attendance.present', 'Present')}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-rose-700">{summary.absent}</p>
                <p className="text-xs text-surface-muted-fg">{t('attendance.absent', 'Absent')}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-amber-700">{summary.late}</p>
                <p className="text-xs text-surface-muted-fg">{t('attendance.late', 'Late')}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-primary-700">{summary.excused}</p>
                <p className="text-xs text-surface-muted-fg">
                  {t('attendance.excused', 'Excused')}
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-surface-foreground">{summary.other}</p>
                <p className="text-xs text-surface-muted-fg">
                  {t('attendance.other', 'Other absence')}
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-surface-foreground">{summary.total}</p>
                <p className="text-xs text-surface-muted-fg">
                  {t('attendance.totalDays', 'Sessions')}
                </p>
              </div>
            </div>
          </Card>

          <Card title={t('attendance.records', 'Register marks')} className="border-slate-200 bg-surface-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  {t('attendance.tableCaption', 'Attendance marks for the term, newest first')}
                </caption>
                <thead>
                  <tr className="border-b border-surface-border text-xs uppercase text-surface-muted-fg">
                    <th scope="col" className="py-2 pr-3">{t('attendance.date', 'Date')}</th>
                    <th scope="col" className="py-2 pr-3">{t('attendance.period', 'Session')}</th>
                    <th scope="col" className="py-2 pr-3">{t('attendance.status', 'Status')}</th>
                    <th scope="col" className="py-2">{t('attendance.remarks', 'Reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-surface-border last:border-0">
                      <td className="py-2 pr-3">{record.date}</td>
                      <td className="py-2 pr-3">{record.session}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            STATUS_CLASS[record.status] ?? STATUS_CLASS.suspended
                          }`}
                        >
                          {statusLabel(record.status)}
                          {record.minutesLate ? ` · ${record.minutesLate} min` : ''}
                        </span>
                      </td>
                      <td className="py-2">{record.reason ? statusLabel(record.reason) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </PortalShell>
  );
};

const PortalAttendancePage: React.FC = withPortalRepository(() => <PortalAttendanceContent />);

export default PortalAttendancePage;
