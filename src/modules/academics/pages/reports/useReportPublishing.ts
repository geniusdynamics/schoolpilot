// ABOUTME: The state behind the report publishing page: generate a batch from the results screen's
// ABOUTME: computation, review and exclude learners, publish immutable snapshots, re-issue them as
// ABOUTME: linked versions, and drive the print queue, the stored-PDF path and the distribution links.

import { useRef, useState } from 'react';

import type {
  ReportAttendance,
  ReportComment,
  ReportLocaleBundles,
  ReportSchool,
  ReportTemplate,
  ReportTerm,
} from '@/domain/reports/types';

import type { AreaSource, GradeOverrideView, LearnerResultRow } from '../results';
import { generateBatch } from './assembly';
import type { GenerateOptions } from './assembly';
import {
  buildPrintQueue,
  printBatchInBrowser,
  PrintQueue,
  renderQueuePdf,
} from './distribution';
import type { ReportPdfExecutor } from './distribution';
import { ReportPublisher, reviewBatch } from './publish';
import type { PublicationStore } from './publish';
import { documentIdFor } from './snapshot';
import type {
  GenerationBatch,
  PdfRenderOutcome,
  PrintOrder,
  Publication,
  ReviewedBatch,
} from './types';
import { ReportPublishError } from './types';

export interface ReportHosts {
  readonly verification: string;
  readonly portal: string;
  readonly short: string;
}

export interface ReportPublishingOptions {
  readonly actorId: string;
  readonly periodId: string | null;
  readonly classGroupName: string | null;
  readonly periodName: string | null;
  readonly rows: readonly LearnerResultRow[];
  readonly areas: readonly AreaSource[];
  readonly overrideOf: (enrolmentId: string) => GradeOverrideView | null;
  /** The class group a learner's enrolment belongs to; a learner outside the actor's reach is flagged. */
  readonly classGroupOf: (enrolmentId: string) => string | null;
  readonly reachableClassIds: ReadonlySet<string>;
  readonly school: ReportSchool;
  readonly term: ReportTerm | null;
  readonly template: ReportTemplate | null;
  readonly templateVersion: string;
  readonly locales: ReportLocaleBundles;
  readonly locale: string;
  readonly defaultLocale: string;
  readonly hosts: ReportHosts;
  readonly secret: string;
  readonly store: PublicationStore;
  readonly pdfExecutor: ReportPdfExecutor;
  readonly appBaseUrl: string;
  readonly now?: () => string;
  /** The browser print job for a whole batch; injected so a page test does not open a dialog. */
  readonly printAll?: () => Promise<void>;
  readonly attendanceOf?: (enrolmentId: string) => ReportAttendance | null;
  readonly commentsOf?: (enrolmentId: string) => readonly ReportComment[] | null;
}

export interface ReportPublishingState {
  readonly batch: GenerationBatch | null;
  readonly excluded: ReadonlySet<string>;
  readonly review: ReviewedBatch | null;
  readonly publications: readonly Publication[];
  readonly queue: PrintQueue | null;
  readonly queueOrder: PrintOrder;
  readonly pdfOutcomes: readonly PdfRenderOutcome[];
  readonly busy: boolean;
  readonly notice: string | null;
  readonly error: string | null;
  generate: () => void;
  toggleExcluded: (enrolmentId: string) => void;
  setQueueOrder: (order: PrintOrder) => void;
  publish: () => Promise<void>;
  reissue: (publicationId: string, reason: string) => Promise<void>;
  printAll: () => Promise<void>;
  renderPdf: () => Promise<void>;
  retryFailed: () => void;
  reset: () => void;
}

function messageOf(error: unknown, fallback: string): string {
  if (error instanceof ReportPublishError) return error.message;
  return error instanceof Error ? error.message : fallback;
}

/**
 * The report publishing page's state.
 *
 * Every rule lives in the services (`generateBatch`, `reviewBatch`, `ReportPublisher`,
 * `PrintQueue`); this hook holds the state those services are driven with, so a page test can hand
 * in a fake store, a fake executor and a fake printer and assert the same behaviour.
 */
export function useReportPublishing(options: ReportPublishingOptions): ReportPublishingState {
  const [batch, setBatch] = useState<GenerationBatch | null>(null);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [publications, setPublications] = useState<readonly Publication[]>([]);
  const [queue, setQueue] = useState<PrintQueue | null>(null);
  const [queueOrder, setQueueOrder] = useState<PrintOrder>('admission');
  const [pdfOutcomes, setPdfOutcomes] = useState<readonly PdfRenderOutcome[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sequence = useRef(0);
  const now = options.now ?? (() => new Date().toISOString());

  const publisher = (): ReportPublisher =>
    new ReportPublisher({
      store: options.store,
      secret: options.secret,
      verificationHost: options.hosts.verification,
      portalHost: options.hosts.portal,
      shortHost: options.hosts.short,
      now,
      newId: () => `pub-${(sequence.current += 1)}`,
      newDocumentId: () => documentIdFor((sequence.current += 1)),
    });

  const generateOptions = (): GenerateOptions | null => {
    if (options.template === null || options.periodId === null) return null;
    return {
      areas: options.areas,
      rows: options.rows,
      template: options.template,
      templateVersion: options.templateVersion,
      locales: options.locales,
      locale: options.locale,
      defaultLocale: options.defaultLocale,
      school: options.school,
      term: options.term,
      periodId: options.periodId,
      verificationHost: options.hosts.verification,
      documentIdFor: () => documentIdFor((sequence.current += 1)),
      now,
      moderationOf: options.overrideOf,
      ...(options.attendanceOf === undefined ? {} : { attendanceOf: options.attendanceOf }),
      ...(options.commentsOf === undefined ? {} : { commentsOf: options.commentsOf }),
      outsideScope: outsideScopeSet(options),
    };
  };

  const review: ReviewedBatch | null =
    batch === null
      ? null
      : reviewBatch(batch, {
          reviewedBy: options.actorId,
          reviewedAt: now(),
          excluded,
        });

  const generate = (): void => {
    const generateOptionsValue = generateOptions();
    if (generateOptionsValue === null) {
      setError('Choose a period, a class group and a report template first.');
      return;
    }
    setError(null);
    setNotice(null);
    setBatch(generateBatch(generateOptionsValue));
    setExcluded(new Set());
    setPublications([]);
    setQueue(null);
    setPdfOutcomes([]);
  };

  const toggleExcluded = (enrolmentId: string): void => {
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(enrolmentId)) next.delete(enrolmentId);
      else next.add(enrolmentId);
      return next;
    });
  };

  const reload = async (publisherValue: ReportPublisher): Promise<void> => {
    if (options.periodId === null || options.template === null) return;
    const records = await publisherValue.all();
    setPublications(
      records.filter(
        (record) => record.periodId === options.periodId && record.templateCode === options.template?.code
      )
    );
  };

  const publish = async (): Promise<void> => {
    if (review === null) {
      setError('Generate and review a batch before publishing.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const publisherValue = publisher();
      const created = await publisherValue.publish(review);
      await reload(publisherValue);
      setNotice(`${created.length} report${created.length === 1 ? '' : 's'} published and frozen.`);
      setQueue(new PrintQueue(buildPrintQueue(created, queueOrder)));
    } catch (caught) {
      setError(messageOf(caught, 'The batch could not be published.'));
    } finally {
      setBusy(false);
    }
  };

  const reissue = async (publicationId: string, reason: string): Promise<void> => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const publisherValue = publisher();
      const created = await publisherValue.reissue({ publicationId, reason, actorId: options.actorId });
      await reload(publisherValue);
      setNotice(`Version ${created.version} issued; the earlier version stays readable.`);
    } catch (caught) {
      setError(messageOf(caught, 'The report could not be re-issued.'));
    } finally {
      setBusy(false);
    }
  };

  const printAll = async (): Promise<void> => {
    if (queue === null) return;
    setBusy(true);
    setError(null);
    try {
      const print = options.printAll ?? (async () => undefined);
      await printBatchInBrowser(queue, print);
      setQueue(new PrintQueue(queue.list()));
      setNotice('The batch was sent to the printer.');
    } catch (caught) {
      setError(messageOf(caught, 'The batch could not be printed.'));
    } finally {
      setBusy(false);
    }
  };

  const renderPdf = async (): Promise<void> => {
    if (queue === null) return;
    setBusy(true);
    setError(null);
    try {
      const outcomes = await renderQueuePdf(queue.list(), options.pdfExecutor, options.appBaseUrl);
      for (const outcome of outcomes) {
        if (outcome.ok) queue.succeed(outcome.documentId);
        else queue.fail(outcome.documentId, outcome.reason);
      }
      setQueue(new PrintQueue(queue.list()));
      setPdfOutcomes(outcomes);
      const failed = outcomes.filter((outcome) => !outcome.ok).length;
      setNotice(
        failed === 0
          ? `${outcomes.length} PDF${outcomes.length === 1 ? '' : 's'} stored.`
          : `${outcomes.length - failed} PDF(s) stored; ${failed} could not be produced.`
      );
    } catch (caught) {
      setError(messageOf(caught, 'The PDFs could not be produced.'));
    } finally {
      setBusy(false);
    }
  };

  const retryFailed = (): void => {
    if (queue === null) return;
    queue.retryFailed();
    setQueue(new PrintQueue(queue.list()));
    setNotice('Failed learners are back in the queue.');
  };

  const reset = (): void => {
    setBatch(null);
    setExcluded(new Set());
    setPublications([]);
    setQueue(null);
    setPdfOutcomes([]);
    setNotice(null);
    setError(null);
  };

  return {
    batch,
    excluded,
    review,
    publications,
    queue,
    queueOrder,
    pdfOutcomes,
    busy,
    notice,
    error,
    generate,
    toggleExcluded,
    setQueueOrder: (order) => {
      setQueueOrder(order);
      if (queue !== null) setQueue(new PrintQueue(buildPrintQueue(queue.list(), order)));
    },
    publish,
    reissue,
    printAll,
    renderPdf,
    retryFailed,
    reset,
  };
}

/** The learners the actor's teaching groups do not reach. Empty when the caller scopes upstream. */
function outsideScopeSet(options: ReportPublishingOptions): ReadonlySet<string> {
  const outside = new Set<string>();
  for (const row of options.rows) {
    const classGroupId = options.classGroupOf(row.enrolmentId);
    if (classGroupId !== null && !options.reachableClassIds.has(classGroupId)) {
      outside.add(row.enrolmentId);
    }
  }
  return outside;
}
