// ABOUTME: Tests for distribution: the ordered print queue with per-learner status and retry, the
// ABOUTME: stored-PDF executor seam, and what the portal and SMS links do and do not carry.

import { describe, expect, it } from 'vitest';

import {
  buildPortalLink,
  buildPrintQueue,
  buildSmsLink,
  buildSmsNotice,
  createHubPdfExecutor,
  createUnavailablePdfExecutor,
  documentPrintUrl,
  orderPrintEntries,
  printBatchInBrowser,
  PrintQueue,
  renderQueuePdf,
  runPrintQueue,
  smsToken,
  type PrintQueueSource,
} from '../distribution';
import { HOSTS } from './fixtures';

const DOCUMENTS: readonly PrintQueueSource[] = [
  { documentId: 'RC-3', enrolmentId: 'e-3', learnerName: 'Chidi Nkemdirim', admissionNumber: 'ADM-003', house: 'Simba' },
  { documentId: 'RC-1', enrolmentId: 'e-1', learnerName: 'Amani Otieno', admissionNumber: 'ADM-001', house: 'Twiga' },
  { documentId: 'RC-2', enrolmentId: 'e-2', learnerName: 'Bello Mwangi', admissionNumber: 'ADM-002', house: 'Simba' },
];

describe('the print queue', () => {
  it('orders by admission number, surname or house', () => {
    expect(orderPrintEntries(buildPrintQueue(DOCUMENTS, 'admission'), 'admission').map((e) => e.documentId)).toEqual([
      'RC-1',
      'RC-2',
      'RC-3',
    ]);
    expect(orderPrintEntries(buildPrintQueue(DOCUMENTS, 'surname'), 'surname').map((e) => e.learnerName)).toEqual([
      'Bello Mwangi',
      'Chidi Nkemdirim',
      'Amani Otieno',
    ]);
    const byHouse = orderPrintEntries(buildPrintQueue(DOCUMENTS, 'house'), 'house');
    expect(byHouse[0].house).toBe('Simba');
    expect(byHouse[byHouse.length - 1].house).toBe('Twiga');
  });

  it('tracks per-learner status, attempts and a retry', () => {
    const queue = new PrintQueue(buildPrintQueue(DOCUMENTS, 'admission'));
    queue.start('RC-1');
    queue.succeed('RC-1');
    queue.start('RC-2');
    queue.fail('RC-2', 'the printer is out of paper');

    expect(queue.progress()).toEqual({ total: 3, done: 1, failed: 1, pending: 1, printing: 0 });
    const failed = queue.list().find((item) => item.documentId === 'RC-2');
    expect(failed?.attempts).toBe(1);
    expect(failed?.lastError).toBe('the printer is out of paper');

    expect(queue.retryFailed()).toBe(1);
    expect(queue.list().find((item) => item.documentId === 'RC-2')?.status).toBe('pending');
    expect(queue.list().find((item) => item.documentId === 'RC-2')?.lastError).toBeNull();
  });

  it('keeps going after one learner’s failure', async () => {
    const queue = new PrintQueue(buildPrintQueue(DOCUMENTS, 'admission'));
    const printed: string[] = [];
    const progress = await runPrintQueue(queue, async (item) => {
      printed.push(item.documentId);
      if (item.documentId === 'RC-2') throw new Error('jam');
    });

    expect(printed).toEqual(['RC-1', 'RC-2', 'RC-3']);
    expect(progress).toEqual({ total: 3, done: 2, failed: 1, pending: 0, printing: 0 });
    expect(queue.list().find((item) => item.documentId === 'RC-2')?.lastError).toBe('jam');
  });

  it('marks the whole batch on one browser print job, and all failed when the job throws', async () => {
    const queue = new PrintQueue(buildPrintQueue(DOCUMENTS, 'admission'));
    await printBatchInBrowser(queue, async () => undefined);
    expect(queue.progress().done).toBe(3);

    const failing = new PrintQueue(buildPrintQueue(DOCUMENTS, 'admission'));
    await printBatchInBrowser(failing, async () => {
      throw new Error('the dialog was blocked');
    });
    expect(failing.progress().failed).toBe(3);
    expect(failing.list()[0].lastError).toBe('the dialog was blocked');
  });
});

describe('the distribution links', () => {
  it('builds a portal link and an SMS link with no learner data in them', () => {
    const signature = '6Kq2x0Yb8m3TfWc';
    const portal = buildPortalLink({ host: HOSTS.portal, documentId: 'RC-2026-000123', signature });
    expect(portal.url).toBe(`${HOSTS.portal}/r/RC-2026-000123?sig=${signature}`);

    const sms = buildSmsLink({ host: HOSTS.short, documentId: 'RC-2026-000123', signature });
    expect(sms.url).toBe(`${HOSTS.short}/s/${smsToken('RC-2026-000123', signature)}`);
    expect(smsToken('RC-2026-000123', signature)).toMatch(/^[A-Za-z0-9_-]{12}$/);

    for (const url of [portal.url, sms.url]) {
      expect(url).not.toContain('Amani');
      expect(url).not.toContain('ADM-001');
      expect(url).not.toContain('88');
    }
  });

  it('keeps the SMS to the school, the notice and the opaque link', () => {
    const link = `${HOSTS.short}/s/abcDEF123456`;
    const notice = buildSmsNotice({ schoolName: 'Riverside Academy', link, to: '+254700000000' });
    expect(notice.link).toBe(link);
    expect(notice.body).toContain('Riverside Academy');
    expect(notice.body).toContain(link);
    expect(notice.body).not.toMatch(/Amani|ADM-|grade|mark|fee/i);
  });

  it('normalises the host and refuses a broken one', () => {
    const link = buildPortalLink({ host: `${HOSTS.portal}/`, documentId: 'RC-1', signature: 'abcdefgh' });
    expect(link.url.startsWith(`${HOSTS.portal}/r/`)).toBe(true);
    expect(() => buildPortalLink({ host: 'not-a-url', documentId: 'RC-1', signature: 'abcdefgh' })).toThrow();
  });
});

describe('the stored-PDF executor', () => {
  it('is unavailable in a deployment with no print worker, and says why', async () => {
    const executor = createUnavailablePdfExecutor('no headless browser here');
    expect(executor.available).toBe(false);
    expect(executor.kind).toBe('none');
    const outcome = await executor.render({
      documentId: 'RC-1',
      documentUrl: documentPrintUrl('https://school.example', 'RC-1'),
      printBackground: true,
      preferCSSPageSize: true,
    });
    expect(outcome).toEqual({ ok: false, documentId: 'RC-1', reason: 'no headless browser here' });
  });

  it('posts the document URL to the hub worker and receives PDF bytes', async () => {
    const requests: { url: string; body: unknown }[] = [];
    const executor = createHubPdfExecutor({
      endpoint: 'https://hub.example/print',
      fetchImpl: (async (url: string, init?: { body?: string }) => {
        requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
        return {
          ok: true,
          status: 200,
          async arrayBuffer() {
            return new Uint8Array([1, 2, 3, 4]).buffer;
          },
        };
      }) as unknown as typeof fetch,
    });

    expect(executor.available).toBe(true);
    expect(executor.kind).toBe('headless-chromium');
    const outcome = await executor.render({
      documentId: 'RC-1',
      documentUrl: 'https://school.example/print/reports/RC-1',
      printBackground: true,
      preferCSSPageSize: true,
    });
    expect(outcome).toEqual({ ok: true, documentId: 'RC-1', bytesLength: 4 });
    expect(requests[0].url).toBe('https://hub.example/print');
    expect(requests[0].body).toMatchObject({
      documentUrl: 'https://school.example/print/reports/RC-1',
      printBackground: true,
      preferCSSPageSize: true,
    });
  });

  it('reports a worker that answers with an error, and one that cannot be reached', async () => {
    const failing = createHubPdfExecutor({
      endpoint: 'https://hub.example/print',
      fetchImpl: (async () => ({ ok: false, status: 503 })) as unknown as typeof fetch,
    });
    expect(
      await failing.render({
        documentId: 'RC-1',
        documentUrl: 'u',
        printBackground: true,
        preferCSSPageSize: true,
      })
    ).toEqual({ ok: false, documentId: 'RC-1', reason: 'the print worker answered 503' });

    const unreachable = createHubPdfExecutor({
      endpoint: 'https://hub.example/print',
      fetchImpl: (async () => {
        throw new Error('connect ECONNREFUSED');
      }) as unknown as typeof fetch,
    });
    const outcome = await unreachable.render({
      documentId: 'RC-2',
      documentUrl: 'u',
      printBackground: true,
      preferCSSPageSize: true,
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toContain('ECONNREFUSED');
  });

  it('renders every document in the queue, keeping a per-learner outcome', async () => {
    const executor = createHubPdfExecutor({
      endpoint: 'https://hub.example/print',
      fetchImpl: (async (_url: string, init?: { body?: string }) => {
        const body = JSON.parse(String(init?.body)) as { documentId: string };
        if (body.documentId === 'RC-2') return { ok: false, status: 500 };
        return { ok: true, status: 200, async arrayBuffer() { return new Uint8Array([1]).buffer; } };
      }) as unknown as typeof fetch,
    });
    const outcomes = await renderQueuePdf(
      [{ documentId: 'RC-1' }, { documentId: 'RC-2' }, { documentId: 'RC-3' }],
      executor,
      'https://school.example'
    );
    expect(outcomes.map((outcome) => outcome.ok)).toEqual([true, false, true]);
    expect(documentPrintUrl('https://school.example/', 'RC-1')).toBe(
      'https://school.example/print/reports/RC-1'
    );
  });
});
