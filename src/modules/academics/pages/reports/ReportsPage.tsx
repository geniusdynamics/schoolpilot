// ABOUTME: Report publishing: bulk generate a class's reports from the computed results and the
// ABOUTME: pack's template, review them, publish an immutable snapshot, and distribute it through the
// ABOUTME: print queue, stored PDFs, the guardian portal link and the SMS link.

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { EntityPicker } from '@/components/ui/EntityPicker';
import Spinner from '@/components/ui/Spinner';
import { ReportDocument, ReportPrintSurface, printReport } from '@/components/reports';
import { useAuth } from '@/contexts/AuthContext';
import { useLookup } from '@/data/query';
import type { AggregationDefinition } from '@/domain/assessment/aggregation';
import type { GradingScaleDefinition } from '@/domain/assessment/scales';
import type { ReportSchool } from '@/domain/reports/types';
import type { Id } from '@/domain/ids';

import { CanonicalRepositoryProvider, useWritableRepository } from '../../data/canonicalRepository';
import { useCanonicalAcademics } from '../../data/useCanonicalAcademics';
import type { WorkflowStore } from '../marks/workflow';
import { defaultAggregation, describeAggregation } from '../results';
import { useResults } from '../results';
import { documentModel } from './snapshot';
import { DistributionPanel } from './DistributionPanel';
import { ReviewPanel } from './ReviewPanel';
import { PACK_DEFAULT_LOCALE, PACK_LOCALES, PACK_REPORT_TEMPLATES, PACK_VERSION, findTemplate } from './data/packReports';
import {
  createHubPdfExecutor,
  createUnavailablePdfExecutor,
  type ReportPdfExecutor,
} from './distribution';
import { createRepositoryPublicationStore, type PublicationStore } from './publish';
import { useReportPublishing } from './useReportPublishing';
import type { ReportHosts } from './useReportPublishing';

/** A development fallback for the signing key and the hosts; a deployment sets the environment. */
const DEV_SIGNING_SECRET = 'schoolpilot-report-signing-dev';
const DEV_HOSTS: ReportHosts = {
  verification: 'https://verify.schoolpilot.app',
  portal: 'https://portal.schoolpilot.app',
  short: 'https://sp.app',
};

function envText(name: string): string | null {
  const value = import.meta.env[name] as string | undefined;
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** The login the page acts for; a page rendered outside the app shell has no session. */
function useSessionActor(): { actorId: string; role: string | null } {
  try {
    const auth = useAuth();
    return { actorId: auth.user?.id ?? '', role: auth.user?.role ?? null };
  } catch {
    return { actorId: '', role: null };
  }
}

export interface ReportsPageContentProps {
  /** Overrides the session, so a page test can act as a named teacher. */
  readonly actorId?: string;
  readonly role?: string | null;
  readonly aggregation?: AggregationDefinition;
  readonly scales?: readonly GradingScaleDefinition[];
  readonly workflowStore?: WorkflowStore;
  readonly now?: () => string;
  /** Injected publishing dependencies, so a page test drives a fake store and executor. */
  readonly store?: PublicationStore;
  readonly pdfExecutor?: ReportPdfExecutor;
  readonly hosts?: ReportHosts;
  readonly signingSecret?: string;
  readonly appBaseUrl?: string;
  readonly printAll?: () => Promise<void>;
}

const ReportsInner: React.FC<ReportsPageContentProps> = ({
  actorId: givenActorId,
  role: givenRole,
  aggregation: givenAggregation,
  scales: givenScales,
  workflowStore,
  now,
  store,
  pdfExecutor,
  hosts,
  signingSecret,
  appBaseUrl,
  printAll,
}) => {
  const { t } = useTranslation('academics');
  const session = useSessionActor();
  const actorId = givenActorId ?? session.actorId;
  const role = givenRole === undefined ? session.role : givenRole;

  const repository = useWritableRepository();
  const canonical = useCanonicalAcademics();
  const periodLookup = useLookup(repository, 'academic_period', { label: (row) => row.name });
  const classLookup = useLookup(repository, 'class_group', { label: (row) => row.name });

  const [periodId, setPeriodId] = useState<Id<'academic_period'> | null>(null);
  const [classGroupId, setClassGroupId] = useState<Id<'class_group'> | null>(null);
  const [templateCode, setTemplateCode] = useState<string>(PACK_REPORT_TEMPLATES[0]?.code ?? '');
  const [showPreview, setShowPreview] = useState(false);

  // The period the calendar marks current is the one a school almost always wants.
  useEffect(() => {
    if (periodId !== null) return;
    const current = periodLookup.options.find((row) => row.status === 'current') ?? periodLookup.options[0];
    if (current) setPeriodId(current.id);
  }, [periodId, periodLookup.options]);

  const aggregation = useMemo(() => givenAggregation ?? defaultAggregation(), [givenAggregation]);
  const results = useResults({
    actorId,
    role,
    periodId,
    classGroupId,
    aggregation,
    ...(givenScales === undefined ? {} : { extraScales: givenScales }),
    ...(workflowStore === undefined ? {} : { workflowStore }),
    ...(now === undefined ? {} : { now }),
  });

  const institution = canonical.institutions[0] ?? null;

  useEffect(() => {
    if (classGroupId !== null) return;
    const first = classLookup.options.find((row) => results.reachableClassIds.has(row.id));
    if (first) setClassGroupId(first.id);
  }, [classGroupId, classLookup.options, results.reachableClassIds]);
  const locale = useMemo(() => {
    const preferred = institution?.default_locale ?? PACK_DEFAULT_LOCALE;
    return PACK_LOCALES[preferred] === undefined ? PACK_DEFAULT_LOCALE : preferred;
  }, [institution]);

  const school: ReportSchool = useMemo(
    () => ({
      name: institution?.name ?? '',
      motto: institution?.motto ?? null,
      address: [institution?.county, institution?.region].filter(Boolean).join(' · ') || null,
      contact: institution?.short_name ?? null,
      logo: null,
    }),
    [institution]
  );

  const term = useMemo(
    () => ({ name: results.periodName, year: null }),
    [results.periodName]
  );

  const template = useMemo(() => findTemplate(templateCode), [templateCode]);

  const publicationStore: PublicationStore = useMemo(
    () =>
      store ??
      createRepositoryPublicationStore(repository, institution?.id ?? ''),
    [store, repository, institution]
  );

  const executor: ReportPdfExecutor = useMemo(() => {
    if (pdfExecutor !== undefined) return pdfExecutor;
    const endpoint = envText('VITE_REPORT_PDF_ENDPOINT');
    return endpoint === null
      ? createUnavailablePdfExecutor(
          'this deployment has no headless print worker, so PDFs are produced by the browser dialog'
        )
      : createHubPdfExecutor({ endpoint });
  }, [pdfExecutor]);

  const resolvedHosts: ReportHosts = useMemo(
    () => ({
      verification: hosts?.verification ?? envText('VITE_REPORT_VERIFY_HOST') ?? DEV_HOSTS.verification,
      portal: hosts?.portal ?? envText('VITE_REPORT_PORTAL_HOST') ?? DEV_HOSTS.portal,
      short: hosts?.short ?? envText('VITE_REPORT_SHORT_HOST') ?? DEV_HOSTS.short,
    }),
    [hosts]
  );

  const publishing = useReportPublishing({
    actorId,
    periodId,
    classGroupName: results.classGroupName,
    periodName: results.periodName,
    rows: results.rows,
    areas: results.areas,
    overrideOf: results.overrideOf,
    classGroupOf: (enrolmentId) => canonical.enrolmentById.get(enrolmentId)?.class_group_id ?? null,
    reachableClassIds: results.reachableClassIds,
    school,
    term,
    template,
    templateVersion: PACK_VERSION,
    locales: PACK_LOCALES,
    locale,
    defaultLocale: PACK_DEFAULT_LOCALE,
    hosts: resolvedHosts,
    secret: signingSecret ?? envText('VITE_REPORT_SIGNING_SECRET') ?? DEV_SIGNING_SECRET,
    store: publicationStore,
    pdfExecutor: executor,
    appBaseUrl: appBaseUrl ?? (typeof window === 'undefined' ? '' : window.location.origin),
    ...(now === undefined ? {} : { now }),
    printAll: printAll ?? (() => printReport()),
  });

  const stateNotice = (title: string, body: string) => (
    <div className="py-8 text-center" role="status">
      <p className="font-medium text-surface-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-xl text-sm text-surface-muted-fg">{body}</p>
    </div>
  );

  const previewDocument =
    publishing.publications.length > 0
      ? publishing.publications[publishing.publications.length - 1].document
      : (publishing.batch?.reports[0]?.previewDocument ?? null);

  return (
    <div className="space-y-6">
      <Card
        title={t('reports.title', 'Report publishing')}
        subtitle={t(
          'reports.subtitle',
          'Generate a class’s reports from the computed results, review them, then publish a snapshot that never changes.'
        )}
      >
        <div className="grid grid-cols-1 gap-4 rounded-md border border-surface-border bg-surface-muted p-4 md:grid-cols-3">
          <EntityPicker
            label={t('reports.period', 'Period')}
            value={periodId}
            onChange={setPeriodId}
            lookup={periodLookup}
            placeholder="Select a period"
            allowClear
          />
          <EntityPicker
            label={t('reports.classGroup', 'Class group')}
            value={classGroupId}
            onChange={setClassGroupId}
            lookup={classLookup}
            filter={(row) => results.reachableClassIds.has(row.id)}
            placeholder="Select a class group"
            allowClear
            helperText={results.scope.reason}
          />
          <label className="text-sm">
            <span className="block font-medium text-surface-foreground">
              {t('reports.template', 'Report template')}
            </span>
            <select
              className="mt-1 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-surface-foreground"
              value={templateCode}
              onChange={(event) => setTemplateCode(event.target.value)}
              aria-label="Report template"
            >
              {PACK_REPORT_TEMPLATES.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-surface-muted-fg">
              From the installed pack, version {PACK_VERSION}.
            </span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={publishing.generate}
            disabled={publishing.busy || periodId === null || classGroupId === null || template === null}
            data-testid="generate-batch"
          >
            {t('reports.generate', 'Generate reports')}
          </Button>
          {publishing.batch === null ? null : (
            <span className="text-sm text-surface-muted-fg" data-testid="batch-progress">
              {publishing.batch.progress.done} of {publishing.batch.progress.total} prepared
              {publishing.batch.progress.failed === 0
                ? ''
                : `, ${publishing.batch.progress.failed} could not be prepared`}
            </span>
          )}
          {results.state === 'ready' ? (
            <Badge variant="secondary" size="sm">
              Aggregate: {describeAggregation(aggregation)}
            </Badge>
          ) : null}
        </div>

        {publishing.notice === null ? null : (
          <p role="status" className="mt-3 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">
            {publishing.notice}
          </p>
        )}
        {publishing.error === null ? null : (
          <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {publishing.error}
          </p>
        )}

        {results.state === 'loading' ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : results.state === 'error' ? (
          <p role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            The school’s records could not be read, so reports cannot be prepared. Reload the page.
          </p>
        ) : periodId === null || classGroupId === null ? (
          stateNotice('Choose a period and a class group', 'Reports are generated per class group and period.')
        ) : results.state === 'no-scope' ? (
          stateNotice('No reports to prepare', results.scope.reason)
        ) : results.state === 'outside-scope' ? (
          stateNotice('This class group is outside your scope', results.scope.reason)
        ) : results.state === 'no-areas' ? (
          stateNotice(
            'No learning area is marked for this class yet',
            'A teaching group with an assessment is needed before reports can be prepared.'
          )
        ) : results.state === 'no-learners' ? (
          stateNotice('No learners are enrolled in this class yet', 'Add learners before reports can be prepared.')
        ) : null}
      </Card>

      <Card
        title={t('reports.review', 'Review before publish')}
        subtitle={t('reports.reviewSubtitle', 'Nothing publishes until a reviewer has seen this.')}
      >
        <ReviewPanel
          review={publishing.review}
          onToggle={publishing.toggleExcluded}
          busy={publishing.busy}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => void publishing.publish()}
            disabled={
              publishing.busy ||
              publishing.review === null ||
              publishing.review.summary.included === 0
            }
            data-testid="publish-batch"
          >
            {t('reports.publish', 'Publish {{count}} reports', {
              count: publishing.review?.summary.included ?? 0,
            })}
          </Button>
          <span className="text-sm text-surface-muted-fg">
            Publishing freezes the exact content: later mark changes, moderation or a template edit
            cannot alter what is published.
          </span>
        </div>
      </Card>

      <Card
        title={t('reports.distribution', 'Distribution')}
        subtitle={t('reports.distributionSubtitle', 'Print queue, stored PDFs, the portal link and SMS.')}
      >
        <DistributionPanel
          publications={publishing.publications}
          queue={publishing.queue}
          order={publishing.queueOrder}
          pdfOutcomes={publishing.pdfOutcomes}
          pdfExecutor={executor}
          schoolName={school.name}
          busy={publishing.busy}
          onOrder={publishing.setQueueOrder}
          onPrint={() => void publishing.printAll()}
          onRenderPdf={() => void publishing.renderPdf()}
          onRetryFailed={publishing.retryFailed}
          onReissue={(publicationId, reason) => void publishing.reissue(publicationId, reason)}
        />
      </Card>

      {previewDocument === null ? null : (
        <Card
          title={t('reports.preview', 'Preview')}
          subtitle={t(
            'reports.previewSubtitle',
            'A published document carries a valid signed QR; an unpublished preview does not.'
          )}
        >
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setShowPreview((current) => !current)} data-testid="toggle-preview">
              {showPreview ? 'Hide preview' : 'Show preview'}
            </Button>
            <span className="text-sm text-surface-muted-fg">
              {previewDocument.preview
                ? 'Unpublished preview — the verification block is marked not valid.'
                : `Published document ${previewDocument.documentId}.`}
            </span>
          </div>
          {showPreview ? (
            <ReportPrintSurface>
              <ReportDocument model={documentModel(previewDocument)} toolbar={false} />
            </ReportPrintSurface>
          ) : null}
        </Card>
      )}
    </div>
  );
};

export const ReportsPageContent: React.FC<ReportsPageContentProps> = (props) => (
  <CanonicalRepositoryProvider>
    <ReportsInner {...props} />
  </CanonicalRepositoryProvider>
);

export default ReportsPageContent;
