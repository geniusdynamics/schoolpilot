// ABOUTME: Test harness for the receipt print surface: builds a real receipt document from the
// ABOUTME: fixtures and exposes the print entry point, so Playwright can print it and assert the page
// ABOUTME: box (A5/A4) or the roll width (thermal).

import { useEffect, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { ReceiptDocument } from '@/components/finance/receipts/ReceiptDocument';
import { ReceiptPrintSurface } from '@/components/finance/receipts/ReceiptPrintSurface';
import { buildReceiptDocument } from '@/components/finance/receipts/document';
import { beginPrint, endPrint, isPrinting } from '@/components/reports';
import {
  HOUSEHOLD_RECEIPT,
  LONG_ALLOCATION_RECEIPT,
  PREVIEW_VERIFICATION,
  SCHOOL,
  STANDARD_RECEIPT,
  UNALLOCATED_RECEIPT,
  VERIFICATION,
  VOID_RECEIPT,
} from '@/components/finance/receipts/__fixtures__/receipts';
import type { ReceiptTemplateKind } from '@/components/finance/receipts/types';

const params = new URLSearchParams(window.location.search);
const variant = params.get('variant') ?? 'standard';
const template = (params.get('template') ?? 'a4') as ReceiptTemplateKind;

const view =
  variant === 'household'
    ? HOUSEHOLD_RECEIPT
    : variant === 'long'
      ? LONG_ALLOCATION_RECEIPT
      : variant === 'void'
        ? VOID_RECEIPT
        : variant === 'unallocated'
          ? UNALLOCATED_RECEIPT
          : STANDARD_RECEIPT;

const verification =
  variant === 'preview'
    ? PREVIEW_VERIFICATION
    : variant === 'household' || variant === 'standard'
      ? VERIFICATION
      : null;

const model = buildReceiptDocument({
  view,
  template,
  school: SCHOOL,
  verification,
  footer: 'Thank you for your payment.',
  issuedAtLabel: '23 Oct 2026, 09:14',
});

declare global {
  interface Window {
    __receipt?: {
      ready: boolean;
      beginPrint: () => Promise<void>;
      endPrint: () => void;
      isPrinting: () => boolean;
    };
  }
}

function Harness(): ReactElement {
  useEffect(() => {
    const start = async (): Promise<void> => {
      await document.fonts.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (window.__receipt) window.__receipt.ready = true;
      document.documentElement.setAttribute('data-receipt-ready', 'true');
    };
    void start();
  }, []);

  return (
    <ReceiptPrintSurface>
      <ReceiptDocument model={model} toolbar={false} />
    </ReceiptPrintSurface>
  );
}

window.__receipt = {
  ready: false,
  beginPrint: () => beginPrint(),
  endPrint: () => endPrint(),
  isPrinting: () => isPrinting(),
};

createRoot(document.getElementById('harness-root') as HTMLElement).render(<Harness />);
