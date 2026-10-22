// ABOUTME: The page frame: one sheet, the per-template @page rule, the document footer, and the
// ABOUTME: render-time fit check that compacts before it reports an overflow.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { resolveDocument } from '@/domain/reports/document';
import { FULL_CARD, LOCALES, PRIMARY_TERM_TEMPLATE, VERIFICATION } from '@/domain/reports/__fixtures__/cards';
import { ReportDocument } from '../ReportDocument';

const model = resolveDocument({
  template: PRIMARY_TERM_TEMPLATE,
  card: FULL_CARD,
  locales: LOCALES,
  locale: 'en',
  defaultLocale: 'en',
  documentId: 'RC-2026-000123',
  issuedAt: '2026-10-21',
  verification: VERIFICATION,
});

/**
 * jsdom does not lay anything out, so the fit check is driven by a scripted sheet height. The height
 * depends on the density the document currently has, which is what a real browser reports.
 */
function stubSheetHeight(fullPx: number, compactPx: number): void {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get(this: HTMLElement) {
      const root = this.closest?.('.report-document');
      return root?.getAttribute('data-density') === 'compact' ? compactPx : fullPx;
    },
  });
}

afterEach(() => {
  delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
});

const documentElement = (container: HTMLElement) => container.querySelector('.report-document') as HTMLElement;

describe('ReportDocument', () => {
  it('renders one sheet with the template page box', () => {
    const { container } = render(<ReportDocument model={model} toolbar={false} />);
    expect(container.querySelectorAll('.report-sheet')).toHaveLength(1);
    const root = documentElement(container);
    expect(root.getAttribute('data-page')).toBe('A4-portrait');
    expect(root.getAttribute('data-content-height-mm')).toBe('267');
    expect(root.getAttribute('data-layout')).toBe('full');
    expect(root.getAttribute('data-document-id')).toBe('RC-2026-000123');
  });

  it('emits the per-template @page rule and the furniture', () => {
    const { container } = render(<ReportDocument model={model} toolbar={false} />);
    const css = container.querySelector('style')?.textContent ?? '';
    expect(css).toContain('size: A4 portrait;');
    expect(css).toContain('margin: 14mm 12mm 16mm 12mm;');
    expect(css).toContain('@bottom-left');
    // A one-sheet card does not number pages across a batch.
    expect(css).not.toContain('counter(pages)');
  });

  it('writes the document identity into the sheet footer', () => {
    const { container } = render(<ReportDocument model={model} toolbar={false} />);
    const footer = container.querySelector('.report-sheet__footer');
    expect(footer).toHaveTextContent('Document RC-2026-000123');
    expect(footer).toHaveTextContent('Issued 2026-10-21');
  });

  it('shows the print toolbar on screen only', () => {
    const { container, rerender } = render(<ReportDocument model={model} />);
    expect(container.querySelector('.report-toolbar')).toBeTruthy();
    expect(container.querySelector('.report-toolbar')?.className).toContain('report-screen-only');
    rerender(<ReportDocument model={model} toolbar={false} />);
    expect(container.querySelector('.report-toolbar')).toBeNull();
  });

  it('applies the compact density when the card is taller than the box', () => {
    // 1050 px ≈ 277.8 mm > 267 mm, then 990 px ≈ 261.9 mm at compact.
    stubSheetHeight(1050, 990);
    const onFit = vi.fn();
    const { container } = render(<ReportDocument model={model} toolbar={false} onFit={onFit} />);
    const root = documentElement(container);
    expect(root.getAttribute('data-density')).toBe('compact');
    expect(root.getAttribute('data-overflow')).toBe('false');
    expect(root.getAttribute('data-height-mm')).toBe('261.9');
    // React's strict mode may mount the effect twice; the final measurement is what counts.
    expect(onFit).toHaveBeenCalled();
    expect(onFit.mock.calls[onFit.mock.calls.length - 1][0]).toMatchObject({ density: 'compact', overflow: false });
  });

  it('marks a card that still overflows and exposes the measured height', () => {
    stubSheetHeight(1050, 1100);
    const { container } = render(<ReportDocument model={model} toolbar={false} />);
    const root = documentElement(container);
    expect(root.getAttribute('data-density')).toBe('compact');
    expect(root.getAttribute('data-overflow')).toBe('true');
    expect(root.getAttribute('data-height-mm')).toBe('291');
  });

  it('stays at full density when the card fits', () => {
    stubSheetHeight(900, 900);
    const { container } = render(<ReportDocument model={model} toolbar={false} />);
    const root = documentElement(container);
    expect(root.getAttribute('data-density')).toBe('full');
    expect(root.getAttribute('data-overflow')).toBe('false');
    expect(root.getAttribute('data-height-mm')).toBe('238.1');
  });

  it('uses the spacing multiplier for the density rather than changing type size', () => {
    stubSheetHeight(900, 900);
    const { container } = render(<ReportDocument model={model} toolbar={false} />);
    const style = documentElement(container).getAttribute('style') ?? '';
    expect(style).toContain('--report-base: 8.5pt');
    expect(style).toContain('--report-space: 1');
    expect(style).toContain('--report-sheet-height: 267mm');
  });

  it('renders an A5 document at the reduced layout', () => {
    const a5 = resolveDocument({
      template: { ...PRIMARY_TERM_TEMPLATE, page: { size: 'A5' } },
      card: FULL_CARD,
      locales: LOCALES,
      documentId: 'RC-2026-000123',
      verification: VERIFICATION,
    });
    const { container } = render(<ReportDocument model={a5} toolbar={false} />);
    const root = documentElement(container);
    expect(root.getAttribute('data-page')).toBe('A5-portrait');
    expect(root.getAttribute('data-layout')).toBe('reduced');
    expect(root.getAttribute('data-content-height-mm')).toBe('188');
    expect(container.querySelector('[data-block="co_curricular"]')).toBeNull();
  });
});
