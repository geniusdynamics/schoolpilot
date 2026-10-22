// ABOUTME: Distribution of a published report: the ordered print queue with per-learner status and
// ABOUTME: retry, the headless-Chromium PDF executor seam, and the portal and SMS links — none of
// ABOUTME: which carries learner data beyond an opaque document id and its signature.

import { sha256Hex } from '@/domain/curriculum/registry';
import { normaliseVerificationHost } from '@/domain/reports';

import type {
  DistributionLink,
  PdfRenderOutcome,
  PrintOrder,
  PrintQueueEntry,
  PrintQueueProgress,
  SmsNotice,
} from './types';

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function base64urlFromHex(hex: string): string {
  const bytes: number[] = [];
  for (let index = 0; index < hex.length; index += 2) {
    bytes.push(parseInt(hex.slice(index, index + 2), 16));
  }
  let out = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0;
    out += BASE64URL[a >> 2];
    out += BASE64URL[((a & 0x03) << 4) | (b >> 4)];
    if (index + 1 < bytes.length) out += BASE64URL[((b & 0x0f) << 2) | (c >> 6)];
    if (index + 2 < bytes.length) out += BASE64URL[c & 0x3f];
  }
  return out;
}

/** The shareable guardian-portal link to one published snapshot. */
export function buildPortalLink(input: {
  readonly host: string;
  readonly documentId: string;
  readonly signature: string;
}): DistributionLink {
  const host = normaliseVerificationHost(input.host);
  return {
    kind: 'portal',
    url: `${host}/r/${input.documentId}?sig=${input.signature}`,
    resolvesTo: 'the published snapshot for that document, for the guardian who holds the link',
  };
}

/**
 * The opaque short code the SMS link carries.
 *
 * It is derived from the document id and the signature, so it is stable and reveals nothing: no
 * learner name, no admission number, no mark and no fee amount. The SMS gateway resolves the code
 * to the portal link server-side, so the link in the message is a token, not the portal URL.
 */
export function smsToken(documentId: string, signature: string): string {
  return base64urlFromHex(sha256Hex(`sms|${documentId}|${signature}`)).slice(0, 12);
}

/** The short link the SMS carries; it resolves to the portal link at the gateway. */
export function buildSmsLink(input: {
  readonly host: string;
  readonly documentId: string;
  readonly signature: string;
}): DistributionLink {
  const host = normaliseVerificationHost(input.host);
  const token = smsToken(input.documentId, input.signature);
  return {
    kind: 'sms',
    url: `${host}/s/${token}`,
    resolvesTo: 'the guardian-portal link for that document, resolved by the SMS gateway',
  };
}

/**
 * The SMS the school sends.
 *
 * It names the school and the notice and nothing else. It deliberately carries no learner name, no
 * admission number, no grade, no mark and no fee amount, and the link is an opaque token, so a
 * forwarded message reveals nothing about the learner.
 */
export function buildSmsNotice(input: {
  readonly schoolName: string;
  readonly link: string;
  readonly to?: string | null;
}): SmsNotice {
  return {
    to: input.to ?? null,
    body: `${input.schoolName}: a term report is ready. Open the secure link to view it. ${input.link}`,
    link: input.link,
  };
}

// -------------------------------------------------------------- print queue

function admissionKey(entry: PrintQueueEntry): string {
  return entry.admissionNumber ?? '\uffff';
}

function surnameKey(entry: PrintQueueEntry): string {
  const parts = entry.learnerName.trim().split(/\s+/);
  return parts.length === 0 ? '' : parts[parts.length - 1].toLocaleLowerCase();
}

/** Orders a batch print run the way spec 07 §6 names: admission number, surname or house. */
export function orderPrintEntries(
  entries: readonly PrintQueueEntry[],
  order: PrintOrder
): PrintQueueEntry[] {
  const sorted = [...entries];
  sorted.sort((left, right) => {
    if (order === 'house') {
      const house = (left.house ?? '\uffff').localeCompare(right.house ?? '\uffff');
      if (house !== 0) return house;
    } else if (order === 'admission') {
      const admission = admissionKey(left).localeCompare(admissionKey(right));
      if (admission !== 0) return admission;
    } else {
      const surname = surnameKey(left).localeCompare(surnameKey(right));
      if (surname !== 0) return surname;
    }
    return left.learnerName.localeCompare(right.learnerName);
  });
  return sorted;
}

/** The fields a print queue entry needs from a published document. */
export interface PrintQueueSource {
  readonly documentId: string;
  readonly enrolmentId: string;
  readonly learnerName?: string;
  readonly admissionNumber?: string | null;
  readonly house?: string | null;
}

/** Builds the queue for a batch: one entry per published document, in print order. */
export function buildPrintQueue(
  documents: readonly PrintQueueSource[],
  order: PrintOrder = 'admission'
): PrintQueueEntry[] {
  const entries: PrintQueueEntry[] = documents.map((document) => ({
    documentId: document.documentId,
    enrolmentId: document.enrolmentId,
    learnerName: document.learnerName ?? document.enrolmentId,
    admissionNumber: document.admissionNumber ?? null,
    house: document.house ?? null,
    status: 'pending',
    attempts: 0,
    lastError: null,
  }));
  return orderPrintEntries(entries, order);
}

/**
 * A print run's state.
 *
 * One learner's failure is recorded against that learner and never stops the run: the queue keeps
 * its order, the failed entry keeps its reason and attempt count, and `retry` puts it back in.
 */
export class PrintQueue {
  private entries: PrintQueueEntry[];

  constructor(entries: readonly PrintQueueEntry[]) {
    this.entries = entries.map((entry) => ({ ...entry }));
  }

  list(): readonly PrintQueueEntry[] {
    return this.entries;
  }

  progress(): PrintQueueProgress {
    const count = (status: PrintQueueEntry['status']): number =>
      this.entries.filter((entry) => entry.status === status).length;
    return {
      total: this.entries.length,
      done: count('done'),
      failed: count('failed'),
      pending: count('pending'),
      printing: count('printing'),
    };
  }

  next(): PrintQueueEntry | null {
    return this.entries.find((entry) => entry.status === 'pending') ?? null;
  }

  private patch(documentId: string, change: Partial<PrintQueueEntry>): void {
    this.entries = this.entries.map((entry) =>
      entry.documentId === documentId ? { ...entry, ...change } : entry
    );
  }

  start(documentId: string): void {
    this.patch(documentId, { status: 'printing', attempts: this.attemptsOf(documentId) + 1 });
  }

  succeed(documentId: string): void {
    this.patch(documentId, { status: 'done', lastError: null });
  }

  fail(documentId: string, error: string): void {
    this.patch(documentId, { status: 'failed', lastError: error });
  }

  /** Puts a failed entry back into the queue for one more attempt. */
  retry(documentId: string): void {
    this.patch(documentId, { status: 'pending', lastError: null });
  }

  /** Puts every failed entry back; returns how many were requeued. */
  retryFailed(): number {
    const failed = this.entries.filter((entry) => entry.status === 'failed').length;
    for (const entry of this.entries) {
      if (entry.status === 'failed') this.patch(entry.documentId, { status: 'pending', lastError: null });
    }
    return failed;
  }

  private attemptsOf(documentId: string): number {
    return this.entries.find((entry) => entry.documentId === documentId)?.attempts ?? 0;
  }
}

/**
 * Runs the queue through a printer.
 *
 * Sequential by design: the browser's print dialog is one job at a time, and a per-learner failure
 * must not lose the rest of the batch. A printer that throws is recorded against its learner.
 */
export async function runPrintQueue(
  queue: PrintQueue,
  print: (entry: PrintQueueEntry) => Promise<void>
): Promise<PrintQueueProgress> {
  for (;;) {
    const entry = queue.next();
    if (entry === null) break;
    queue.start(entry.documentId);
    try {
      await print(entry);
      queue.succeed(entry.documentId);
    } catch (error) {
      queue.fail(entry.documentId, error instanceof Error ? error.message : String(error));
    }
  }
  return queue.progress();
}

/**
 * Prints a whole batch in one job.
 *
 * DR-05 prefers one document for a class over one per learner: 30 sheets in one print job carry the
 * font and furniture once (≈1.15 MB) against ≈9 MB for 30 separate files. The queue therefore marks
 * every pending entry together, and a job that throws marks them all failed with the same reason.
 */
export async function printBatchInBrowser(
  queue: PrintQueue,
  printAll: () => Promise<void>
): Promise<PrintQueueProgress> {
  const affected = queue
    .list()
    .filter((entry) => entry.status === 'pending' || entry.status === 'failed')
    .map((entry) => entry.documentId);
  try {
    await printAll();
    for (const documentId of affected) queue.succeed(documentId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    for (const documentId of affected) queue.fail(documentId, reason);
  }
  return queue.progress();
}

// ------------------------------------------------------------ PDF executor

/** The URL a headless print worker loads. The document route renders the published snapshot. */
export function documentPrintUrl(baseUrl: string, documentId: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/print/reports/${documentId}`;
}

export interface PdfRenderRequest {
  readonly documentId: string;
  /** The absolute URL of the document to print; the worker loads exactly this. */
  readonly documentUrl: string;
  /** DR-05: headless printing must pass `printBackground` or the tints disappear. */
  readonly printBackground: true;
  /** DR-05: without this, the worker's default Letter page wins over the template's `@page`. */
  readonly preferCSSPageSize: true;
}

/**
 * The stored-PDF executor seam of DR-05.
 *
 * It is an executor, not a renderer: it loads the same document URL the browser prints and returns
 * the bytes Chromium produced. Topology A (a single offline device) has no browser binary to drive
 * from the app, so the default executor is unavailable and the app prints through the dialog; a hub
 * or cloud deployment supplies a reachable endpoint.
 */
export interface ReportPdfExecutor {
  readonly kind: 'headless-chromium' | 'none';
  readonly available: boolean;
  readonly unavailableReason: string | null;
  render(request: PdfRenderRequest): Promise<PdfRenderOutcome>;
}

/** The executor for a deployment with no headless browser: it refuses and says why. */
export function createUnavailablePdfExecutor(reason: string): ReportPdfExecutor {
  return {
    kind: 'none',
    available: false,
    unavailableReason: reason,
    async render(request) {
      return { ok: false, documentId: request.documentId, reason };
    },
  };
}

/**
 * The hub/cloud executor: it POSTs the document URL to a print worker and receives PDF bytes.
 *
 * The worker is the headless Chromium of DR-05 — `page.pdf()` with `printBackground` and
 * `preferCSSPageSize` and `document.fonts.ready` awaited before printing. It is a separate service,
 * so nothing here adds a browser dependency to the client bundle.
 */
export function createHubPdfExecutor(options: {
  readonly endpoint: string;
  readonly fetchImpl?: typeof fetch;
}): ReportPdfExecutor {
  const doFetch = options.fetchImpl ?? globalThis.fetch;
  return {
    kind: 'headless-chromium',
    available: typeof doFetch === 'function',
    unavailableReason:
      typeof doFetch === 'function' ? null : 'no fetch implementation is available in this runtime',
    async render(request) {
      if (typeof doFetch !== 'function') {
        return { ok: false, documentId: request.documentId, reason: 'no fetch implementation is available' };
      }
      try {
        const response = await doFetch(options.endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/pdf' },
          body: JSON.stringify(request),
        });
        if (!response.ok) {
          return {
            ok: false,
            documentId: request.documentId,
            reason: `the print worker answered ${response.status}`,
          };
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        return { ok: true, documentId: request.documentId, bytesLength: bytes.byteLength };
      } catch (error) {
        return {
          ok: false,
          documentId: request.documentId,
          reason: `the print worker could not be reached: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  };
}

/** Renders every published document to a stored PDF, keeping a per-learner outcome. */
export async function renderQueuePdf(
  documents: readonly { readonly documentId: string }[],
  executor: ReportPdfExecutor,
  baseUrl: string
): Promise<PdfRenderOutcome[]> {
  const outcomes: PdfRenderOutcome[] = [];
  for (const document of documents) {
    outcomes.push(
      await executor.render({
        documentId: document.documentId,
        documentUrl: documentPrintUrl(baseUrl, document.documentId),
        printBackground: true,
        preferCSSPageSize: true,
      })
    );
  }
  return outcomes;
}
