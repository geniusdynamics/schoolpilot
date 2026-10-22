// ABOUTME: Test harness for report publishing: it publishes a real snapshot through ReportPublisher,
// ABOUTME: proves the frozen content cannot be changed, and mounts either the published document or
// ABOUTME: the unpublished preview so Playwright can print and assert both.

import { useEffect, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { ReportDocument } from '@/components/reports/ReportDocument';
import { ReportPrintSurface } from '@/components/reports/ReportPrintSurface';
import { beginPrint, endPrint, isPrinting } from '@/components/reports/print';
import { canonicalJson } from '@/domain/curriculum/registry/json';
import type { ReportDocumentModel } from '@/domain/reports/types';

import { generateBatch } from '@/modules/academics/pages/reports/assembly';
import {
  createMemoryPublicationStore,
  ReportPublisher,
  reviewBatch,
} from '@/modules/academics/pages/reports/publish';
import { documentIdFor, documentModel } from '@/modules/academics/pages/reports/snapshot';
import type { Publication } from '@/modules/academics/pages/reports/types';
import {
  AREAS,
  AT,
  HOSTS,
  LOCALES,
  SCHOOL,
  SECRET,
  TEMPLATE,
  TEMPLATE_VERSION,
  computeRows,
} from '@/modules/academics/pages/reports/__tests__/fixtures';

const params = new URLSearchParams(window.location.search);
const variant = params.get('doc') ?? 'published';

declare global {
  interface Window {
    __publish?: {
      ready: boolean;
      documentId: string;
      immutable: boolean;
      version: number;
      previewQr: boolean;
      publishedQr: boolean;
      beginPrint: () => Promise<void>;
      endPrint: () => void;
      isPrinting: () => boolean;
    };
  }
}

interface Harness {
  readonly published: Publication;
  readonly preview: ReportDocumentModel;
  readonly immutable: boolean;
}

/** Publishes through the real service, then tries to change what was published. */
async function build(): Promise<Harness> {
  let sequence = 0;
  const store = createMemoryPublicationStore();
  const batch = generateBatch({
    areas: AREAS,
    rows: computeRows(),
    template: structuredClone(TEMPLATE),
    templateVersion: TEMPLATE_VERSION,
    locales: LOCALES,
    locale: 'en',
    defaultLocale: 'en',
    school: SCHOOL,
    term: { name: 'Term 1', year: '2026' },
    periodId: 'period-1',
    verificationHost: HOSTS.verification,
    documentIdFor: () => documentIdFor((sequence += 1)),
    now: () => AT,
  });
  const publisher = new ReportPublisher({
    store,
    secret: SECRET,
    verificationHost: HOSTS.verification,
    portalHost: HOSTS.portal,
    shortHost: HOSTS.short,
    now: () => AT,
    newId: () => `pub-${(sequence += 1)}`,
    newDocumentId: () => documentIdFor((sequence += 1)),
  });

  const review = reviewBatch(batch, { reviewedBy: 'harness', reviewedAt: AT });
  const [published] = await publisher.publish(review);
  const before = canonicalJson(published);

  // Change the source batch: the frozen snapshot must not move.
  const first = batch.reports[0];
  (first.card.results?.rows[0].cells as { total?: string }).total = '0';
  (batch.template.blocks as { type: string }[]).length = 1;
  const reread = await publisher.read(published.id);

  return {
    published,
    preview: documentModel(batch.reports[0].previewDocument),
    immutable: reread !== null && canonicalJson(reread) === before,
  };
}

function Harness(): ReactElement {
  const [harness, setHarness] = useState<Harness | null>(null);

  useEffect(() => {
    let cancelled = false;
    void build().then((built) => {
      if (cancelled) return;
      setHarness(built);
      window.__publish = {
        ready: true,
        documentId: built.published.documentId,
        immutable: built.immutable,
        version: built.published.version,
        previewQr: hasQr(built.preview),
        publishedQr: hasQr(documentModel(built.published.document)),
        beginPrint: () => beginPrint(),
        endPrint: () => endPrint(),
        isPrinting: () => isPrinting(),
      };
      document.documentElement.setAttribute('data-report-ready', 'true');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (harness === null) return <div>preparing</div>;
  const model =
    variant === 'preview' ? harness.preview : documentModel(harness.published.document);

  return (
    <ReportPrintSurface>
      <ReportDocument model={model} toolbar={false} />
    </ReportPrintSurface>
  );
}

function hasQr(model: ReportDocumentModel): boolean {
  const block = model.blocks.find((entry) => entry.kind === 'verification');
  return block?.kind === 'verification' ? block.payload.qr !== null : false;
}

createRoot(document.getElementById('harness-root') as HTMLElement).render(<Harness />);
