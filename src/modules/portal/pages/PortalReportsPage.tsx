// ABOUTME: The portal reports page: one card per reporting term, the published card's summary and the
// ABOUTME: learner's final results, and an explicit not-published state for a term with no card.

import { withPortalRepository } from '../data/withPortalRepository';

import React from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { ChartBarIcon, DocumentTextIcon } from '@/components/ui/icons';

import { PortalShell } from '../components/PortalShell';
import { usePortalReports } from '../data/usePortalSession';

export const PortalReportsContent: React.FC = () => {
  const { t } = useTranslation('portal');
  const { session, reports, loading, error } = usePortalReports();

  return (
    <PortalShell session={session} title={t('reports.title', 'Term reports')}>
      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        </Card>
      ) : null}

      {loading && reports.length === 0 ? (
        <div className="flex items-center justify-center py-10" role="status">
          <Spinner />
          <span className="ml-3 text-surface-muted-fg">{t('common.loading', 'Loading…')}</span>
        </div>
      ) : null}

      {!loading && reports.length === 0 ? (
        <Card className="border-slate-200 bg-surface-card">
          <div className="py-10 text-center">
            <ChartBarIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <h2 className="text-base font-medium text-surface-foreground">
              {t('reports.noTerms', 'The school has not opened a reporting term yet')}
            </h2>
            <p className="mt-1 text-sm text-surface-muted-fg">
              {t('reports.noTermsHelp', 'Term reports appear here once the school publishes them.')}
            </p>
          </div>
        </Card>
      ) : null}

      {reports.map((report) => (
        <Card
          key={report.periodId}
          title={report.periodName}
          className="border-slate-200 bg-surface-card"
          actions={
            report.state === 'published' ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                {t('reports.published', 'Published')}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-surface-accent px-2.5 py-1 text-xs font-medium text-surface-muted-fg">
                {t('reports.notPublished', 'Not published yet')}
              </span>
            )
          }
        >
          {report.state === 'published' ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-surface-muted-fg">
                <DocumentTextIcon className="h-4 w-4" />
                {t('reports.publishedOn', 'Published {{date}}', {
                  date: report.publishedAt ? report.publishedAt.slice(0, 10) : '—',
                })}
                {report.templateCode
                  ? ` · ${report.templateCode} v${report.templateVersion ?? ''}`.trimEnd()
                  : ''}
              </p>

              {report.results.length === 0 ? (
                <p className="text-sm text-surface-muted-fg">
                  {t(
                    'reports.noResults',
                    'The published card carries no final subject results for this term.'
                  )}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">
                      {t('reports.resultsCaption', 'Final results published for {{term}}', {
                        term: report.periodName,
                      })}
                    </caption>
                    <thead>
                      <tr className="border-b border-surface-border text-xs uppercase text-surface-muted-fg">
                        <th scope="col" className="py-2 pr-3">{t('results.subject', 'Subject')}</th>
                        <th scope="col" className="py-2 pr-3">{t('results.marks', 'Score')}</th>
                        <th scope="col" className="py-2 pr-3">{t('results.grade', 'Grade')}</th>
                        <th scope="col" className="py-2">{t('results.points', 'Points')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.results.map((result) => (
                        <tr
                          key={`${report.periodId}_${result.areaName}`}
                          className="border-b border-surface-border last:border-0"
                        >
                          <td className="py-2 pr-3">{result.areaName}</td>
                          <td className="py-2 pr-3">{result.score ?? '—'}</td>
                          <td className="py-2 pr-3">{result.grade ?? '—'}</td>
                          <td className="py-2">{result.points ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {report.hasPdf ? (
                <p className="text-xs text-surface-muted-fg">
                  {t('reports.pdfOnFile', 'A signed PDF copy of this report is on file with the school.')}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-surface-muted-fg">
              {t(
                'reports.notPublishedHelp',
                'This term has no published report yet. It appears here as soon as the school publishes it.'
              )}
            </p>
          )}
        </Card>
      ))}
    </PortalShell>
  );
};

const PortalReportsPage: React.FC = withPortalRepository(() => <PortalReportsContent />);

export default PortalReportsPage;
