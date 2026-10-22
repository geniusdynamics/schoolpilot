// ABOUTME: Test harness for the report print surface: builds a real document from the fixtures and
// ABOUTME: exposes the print entry point, so Playwright can print it and assert the page box.

import { useEffect, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ReportDocument } from '@/components/reports/ReportDocument';
import { ReportPrintSurface } from '@/components/reports/ReportPrintSurface';
import { beginPrint, endPrint, isPrinting } from '@/components/reports/print';
import { resolveDocument } from '@/domain/reports/document';
import {
  A5_TEMPLATE,
  EMPTY_CARD,
  FULL_CARD,
  LANDSCAPE_TEMPLATE,
  LOCALES,
  LONG_COMMENT_CARD,
  PRIMARY_TERM_TEMPLATE,
  RTL_CARD,
  SENIOR_TERM_TEMPLATE,
  VERIFICATION,
  WIDE_CARD,
} from '@/domain/reports/__fixtures__/cards';
import type { FitResult } from '@/domain/reports/fit';

const params = new URLSearchParams(window.location.search);
const variant = params.get('variant') ?? 'full';
const pageSize = params.get('page') ?? 'A4';

const template =
  pageSize === 'A5'
    ? A5_TEMPLATE
    : pageSize === 'landscape'
      ? LANDSCAPE_TEMPLATE
      : variant === 'wide'
        ? SENIOR_TERM_TEMPLATE
        : PRIMARY_TERM_TEMPLATE;

const card =
  variant === 'long'
    ? LONG_COMMENT_CARD
    : variant === 'rtl'
      ? RTL_CARD
      : variant === 'wide'
        ? WIDE_CARD
        : variant === 'empty'
          ? EMPTY_CARD
          : FULL_CARD;

const model = resolveDocument({
  template,
  card,
  locales: LOCALES,
  locale: variant === 'rtl' ? 'ar' : 'en',
  defaultLocale: 'en',
  documentId: 'RC-2026-000123',
  issuedAt: '2026-10-21',
  verification: VERIFICATION,
  pagination: variant === 'wide' ? 'flow' : 'sheet',
});

declare global {
  interface Window {
    __report?: {
      ready: boolean;
      fit: FitResult | null;
      beginPrint: () => Promise<void>;
      endPrint: () => void;
      isPrinting: () => boolean;
    };
  }
}

function Harness(): ReactElement {
  const [fit, setFit] = useState<FitResult | null>(null);

  useEffect(() => {
    if (!window.__report) return;
    window.__report.fit = fit;
  }, [fit]);

  useEffect(() => {
    const start = async (): Promise<void> => {
      await document.fonts.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (window.__report) window.__report.ready = true;
      document.documentElement.setAttribute('data-report-ready', 'true');
    };
    void start();
  }, []);

  return (
    <ReportPrintSurface>
      <ReportDocument model={model} onFit={setFit} toolbar={false} />
    </ReportPrintSurface>
  );
}

window.__report = {
  ready: false,
  fit: null,
  beginPrint: () => beginPrint(),
  endPrint: () => endPrint(),
  isPrinting: () => isPrinting(),
};

createRoot(document.getElementById('harness-root') as HTMLElement).render(<Harness />);
