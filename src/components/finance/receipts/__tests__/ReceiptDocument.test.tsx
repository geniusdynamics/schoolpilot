// ABOUTME: The receipt page frame: the per-template `@page` rule (and none for the roll), the printed
// ABOUTME: figures, the allocation total inside `tbody`, and the preview that draws no verification code.

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { buildReceiptDocument } from '../document';
import { ReceiptDocument } from '../ReceiptDocument';
import {
  HOUSEHOLD_RECEIPT,
  LONG_ALLOCATION_RECEIPT,
  PREVIEW_VERIFICATION,
  SCHOOL,
  STANDARD_RECEIPT,
  VERIFICATION,
  VOID_RECEIPT,
} from '../__fixtures__/receipts';

const renderTemplate = (
  template: 'thermal' | 'a5' | 'a4',
  options: Partial<Parameters<typeof buildReceiptDocument>[0]> = {}
) => {
  const model = buildReceiptDocument({ view: STANDARD_RECEIPT, template, school: SCHOOL, ...options });
  return render(<ReceiptDocument model={model} toolbar={false} />);
};

const root = (container: HTMLElement) => container.querySelector('.receipt-document') as HTMLElement;

describe('ReceiptDocument', () => {
  it('renders one sheet with the template geometry', () => {
    const { container } = renderTemplate('a4');
    expect(container.querySelectorAll('.receipt-sheet')).toHaveLength(1);
    expect(root(container).getAttribute('data-template')).toBe('a4');
    expect(root(container).getAttribute('data-page')).toBe('A4-portrait');
    expect(root(container).getAttribute('data-content-width-mm')).toBe('186');
    expect(root(container).getAttribute('data-document-id')).toBe('RCT/2027/000123');
  });

  it('emits an @page rule for A5 and A4', () => {
    const a5 = renderTemplate('a5');
    const a5css = a5.container.querySelector('style')?.textContent ?? '';
    expect(a5css).toContain('size: A5 portrait;');
    expect(a5css).toContain('@bottom-left');
    expect(a5css).toContain('counter(pages)');

    const a4 = renderTemplate('a4');
    expect(a4.container.querySelector('style')?.textContent ?? '').toContain('size: A4 portrait;');
  });

  it('emits no @page rule and a 72 mm roll width for thermal', () => {
    const { container } = renderTemplate('thermal');
    expect(container.querySelector('style')).toBeNull();
    expect(root(container).getAttribute('data-page')).toBe('roll');
    expect(root(container).getAttribute('data-roll-width-mm')).toBe('72');
    expect(root(container).getAttribute('data-content-width-mm')).toBe('72');
  });

  it('prints the identity, the amount in figures and words, and the balance', () => {
    const { container } = renderTemplate('a4');
    const text = container.textContent ?? '';
    expect(text).toContain('Riverside Academy');
    expect(text).toContain('RCT/2027/000123');
    expect(text).toContain('five thousand shillings');
    expect(text).toContain('J. Mwangi');
    expect(text).toContain('Grace Achieng');
    expect(text).toContain('Amina Achieng');
    expect(container.querySelector('[data-receipt-block="balance"]')?.textContent).toContain('Balance after');
  });

  it('puts the allocation total inside tbody, never a tfoot', () => {
    const { container } = renderTemplate('a4');
    const table = container.querySelector('.receipt-table');
    expect(table?.querySelector('tfoot')).toBeNull();
    const total = table?.querySelector('tbody tr.receipt-table__total');
    expect(total).toBeTruthy();
    expect(total?.textContent).toContain('5,000.00');
  });

  it('shows the unallocated message rather than an empty table', () => {
    const { container } = renderTemplate('a4', { view: { ...STANDARD_RECEIPT, allocationByVoteHead: [] } });
    expect(container.querySelector('.receipt-table')).toBeNull();
    expect(container.textContent).toContain('Unallocated (learner credit)');
  });

  it('keeps the allocation block flow-able so a long list can break', () => {
    const { container } = renderTemplate('thermal', { view: LONG_ALLOCATION_RECEIPT });
    const block = container.querySelector('[data-receipt-block="allocation"]');
    expect(block?.className).toContain('receipt-block--flow');
    expect(container.querySelectorAll('.receipt-table tbody tr')).toHaveLength(61);
  });

  it('draws the verification QR for a published receipt', () => {
    const { container } = renderTemplate('a4', { verification: VERIFICATION });
    const block = container.querySelector('[data-receipt-block="verification"]');
    expect(block?.getAttribute('data-preview')).toBe('false');
    expect(block?.querySelector('svg')).toBeTruthy();
    expect(block?.textContent).toContain('RCP-2026-000123');
  });

  it('draws no code and shows the preview banner for an unpublished receipt', () => {
    const { container } = renderTemplate('thermal', { verification: PREVIEW_VERIFICATION });
    expect(container.querySelector('.receipt-preview-banner')).toBeTruthy();
    expect(container.querySelector('[data-receipt-block="verification"] svg')).toBeNull();
    expect(container.querySelector('[data-receipt-block="verification"]')?.getAttribute('data-preview')).toBe('true');
  });

  it('marks a voided receipt', () => {
    const { container } = renderTemplate('a4', { view: VOID_RECEIPT });
    expect(container.querySelector('.receipt-void')?.textContent).toContain('VOID');
  });

  it('lists every learner on a household receipt', () => {
    const { container } = renderTemplate('a4', { view: HOUSEHOLD_RECEIPT });
    expect(container.textContent).toContain('Amina Achieng, Brian Achieng');
    expect(container.textContent).toContain('MPESA-QK41H8T2ZP');
  });

  it('shows the print toolbar on screen only when asked', () => {
    const model = buildReceiptDocument({ view: STANDARD_RECEIPT, template: 'a4', school: SCHOOL });
    const withToolbar = render(<ReceiptDocument model={model} />);
    expect(withToolbar.container.querySelector('.receipt-toolbar')).toBeTruthy();
    expect(withToolbar.container.querySelector('.receipt-toolbar')?.className).toContain('receipt-screen-only');

    const withoutToolbar = render(<ReceiptDocument model={model} toolbar={false} />);
    expect(withoutToolbar.container.querySelector('.receipt-toolbar')).toBeNull();
  });
});
