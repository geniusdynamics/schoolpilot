// ABOUTME: The distribution step: the ordered print queue with per-learner status and retry, the
// ABOUTME: stored-PDF path, the guardian-portal link, the SMS link and what each one carries.

import { useState, type ReactNode } from 'react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';

import { buildSmsNotice, type PrintQueue, type ReportPdfExecutor } from './distribution';
import type { PdfRenderOutcome, PrintOrder, PrintQueueEntry, PrintStatus, Publication } from './types';

const STATUS_VARIANT: Readonly<Record<PrintStatus, 'secondary' | 'info' | 'success' | 'danger'>> = {
  pending: 'secondary',
  printing: 'info',
  done: 'success',
  failed: 'danger',
};

export interface DistributionPanelProps {
  readonly publications: readonly Publication[];
  readonly queue: PrintQueue | null;
  readonly order: PrintOrder;
  readonly pdfOutcomes: readonly PdfRenderOutcome[];
  readonly pdfExecutor: ReportPdfExecutor;
  readonly schoolName: string;
  readonly busy: boolean;
  readonly onOrder: (order: PrintOrder) => void;
  readonly onPrint: () => void;
  readonly onRenderPdf: () => void;
  readonly onRetryFailed: () => void;
  readonly onReissue: (publicationId: string, reason: string) => void;
}

function latestByEnrolment(publications: readonly Publication[]): Publication[] {
  const byEnrolment = new Map<string, Publication>();
  for (const publication of publications) {
    const current = byEnrolment.get(publication.enrolmentId);
    if (current === undefined || publication.version > current.version) {
      byEnrolment.set(publication.enrolmentId, publication);
    }
  }
  return [...byEnrolment.values()].sort((left, right) =>
    left.documentId.localeCompare(right.documentId)
  );
}

/** The distribution controls and the record of what each channel carries. */
export function DistributionPanel({
  publications,
  queue,
  order,
  pdfOutcomes,
  pdfExecutor,
  schoolName,
  busy,
  onOrder,
  onPrint,
  onRenderPdf,
  onRetryFailed,
  onReissue,
}: DistributionPanelProps): ReactNode {
  const [reissueFor, setReissueFor] = useState<Publication | null>(null);
  const [reason, setReason] = useState('');

  if (publications.length === 0) {
    return (
      <p className="text-sm text-surface-muted-fg" data-testid="distribution-empty">
        Publish a batch to distribute it: print queue, stored PDFs, the guardian portal and SMS.
      </p>
    );
  }

  const latest = latestByEnrolment(publications);
  const sample = latest[0];
  const smsNotice = buildSmsNotice({ schoolName, link: sample.smsUrl });

  const queueRow = (entry: PrintQueueEntry): ReactNode => (
    <tr key={entry.documentId} className="border-b border-surface-border">
      <td className="px-2 py-2">{entry.learnerName}</td>
      <td className="px-2 py-2 font-mono text-xs" data-testid={`queue-document-${entry.documentId}`}>
        {entry.documentId}
      </td>
      <td className="px-2 py-2">
        <Badge variant={STATUS_VARIANT[entry.status]} size="sm">
          {entry.status}
        </Badge>
        {entry.lastError === null ? null : (
          <span className="mt-1 block text-xs text-surface-muted-fg">{entry.lastError}</span>
        )}
      </td>
      <td className="px-2 py-2 text-right">{entry.attempts}</td>
    </tr>
  );

  return (
    <div className="space-y-6" data-testid="distribution-panel">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block font-medium text-surface-foreground">Print order</span>
          <select
            className="mt-1 rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
            value={order}
            onChange={(event) => onOrder(event.target.value as PrintOrder)}
            disabled={busy}
            aria-label="Print order"
          >
            <option value="admission">Admission number</option>
            <option value="surname">Surname</option>
            <option value="house">House</option>
          </select>
        </label>
        <Button onClick={onPrint} disabled={busy || queue === null} data-testid="print-batch">
          Print the batch
        </Button>
        <Button variant="outline" onClick={onRenderPdf} disabled={busy || queue === null} data-testid="store-pdfs">
          Store PDFs
        </Button>
        <Button variant="outline" onClick={onRetryFailed} disabled={busy || queue === null} data-testid="retry-failed">
          Retry failed
        </Button>
      </div>

      <p className="text-sm text-surface-muted-fg" data-testid="pdf-executor">
        {pdfExecutor.available
          ? `Stored PDFs use the ${pdfExecutor.kind} executor: the same document HTML and CSS, printed with printBackground and preferCSSPageSize.`
          : `Stored PDFs are unavailable here: ${pdfExecutor.unavailableReason ?? 'no print worker is configured'}. The batch prints through the browser dialog instead, from the same document.`}
      </p>

      {queue === null ? null : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" data-testid="print-queue">
            <caption className="pb-2 text-left text-surface-muted-fg">
              Print queue — {queue.progress().done} of {queue.progress().total} done, {queue.progress().failed} failed.
            </caption>
            <thead>
              <tr className="border-b border-surface-border">
                <th scope="col" className="px-2 py-2 text-left font-semibold">Learner</th>
                <th scope="col" className="px-2 py-2 text-left font-semibold">Document</th>
                <th scope="col" className="px-2 py-2 text-left font-semibold">Status</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">Attempts</th>
              </tr>
            </thead>
            <tbody>{queue.list().map(queueRow)}</tbody>
          </table>
        </div>
      )}

      {pdfOutcomes.length === 0 ? null : (
        <ul className="text-sm" data-testid="pdf-outcomes">
          {pdfOutcomes.map((outcome) => (
            <li key={outcome.documentId}>
              {outcome.ok
                ? `${outcome.documentId}: stored ${outcome.bytesLength} bytes`
                : `${outcome.documentId}: ${outcome.reason}`}
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" data-testid="published-table">
          <caption className="pb-2 text-left text-surface-muted-fg">
            Published snapshots. A QR on a printed card carries the verification link; a re-issue
            issues a new version and the earlier one stays readable.
          </caption>
          <thead>
            <tr className="border-b border-surface-border">
              <th scope="col" className="px-2 py-2 text-left font-semibold">Learner</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">Document</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">Version</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">Verification link</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {latest.map((publication) => (
              <tr key={publication.id} className="border-b border-surface-border align-top">
                <td className="px-2 py-2">{publication.content.card.learner.name}</td>
                <td className="px-2 py-2 font-mono text-xs">{publication.documentId}</td>
                <td className="px-2 py-2">
                  v{publication.version}
                  {publication.supersedes === null ? null : (
                    <span className="mt-1 block text-xs text-surface-muted-fg">
                      supersedes {publication.supersedes}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-xs">
                  <a href={publication.verificationUrl} className="break-all text-primary-700 underline">
                    {publication.verificationUrl}
                  </a>
                </td>
                <td className="px-2 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReissueFor(publication);
                      setReason('');
                    }}
                    aria-label={`Re-issue ${publication.content.card.learner.name}`}
                  >
                    Re-issue
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-md border border-surface-border bg-surface-muted p-3 text-sm" data-testid="portal-link">
          <p className="font-medium">Guardian portal link</p>
          <p className="mt-1 break-all font-mono text-xs">{sample.portalUrl}</p>
          <p className="mt-1 text-surface-muted-fg">
            Resolves to the published snapshot for that document. The link carries the opaque
            document id and its signature, and nothing about the learner.
          </p>
        </div>
        <div className="rounded-md border border-surface-border bg-surface-muted p-3 text-sm" data-testid="sms-link">
          <p className="font-medium">SMS</p>
          <p className="mt-1 break-all font-mono text-xs">{smsNotice.link}</p>
          <p className="mt-1 text-surface-muted-fg">{smsNotice.body}</p>
          <p className="mt-1 text-surface-muted-fg">
            The SMS carries the school name, a neutral notice and an opaque short link. It carries no
            learner name, admission number, grade, mark or fee amount, and the link itself holds no
            learner data: the gateway resolves the token to the portal link.
          </p>
        </div>
      </div>

      <Modal
        isOpen={reissueFor !== null}
        onClose={() => setReissueFor(null)}
        title={reissueFor === null ? 'Re-issue' : `Re-issue ${reissueFor.content.card.learner.name}`}
        subtitle="A re-issue adds a new version linked to the original. The original stays readable and never changes."
        size="sm"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setReissueFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (reissueFor === null) return;
                onReissue(reissueFor.id, reason);
                setReissueFor(null);
              }}
              disabled={reason.trim() === ''}
            >
              Issue a new version
            </Button>
          </div>
        }
      >
        {reissueFor === null ? null : (
          <div className="space-y-4">
            <p className="text-sm text-surface-foreground">
              Version {reissueFor.version} of {reissueFor.documentId}. A new version keeps the same
              frozen content and gets a fresh signature and document id.
            </p>
            <label className="block text-sm font-medium text-surface-foreground" htmlFor="reissue-reason">
              Reason (required)
            </label>
            <Textarea
              id="reissue-reason"
              className="mt-1"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="For example: the printed copy was lost and a signed duplicate is required."
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
