// ABOUTME: The receipt document builder: the three profile geometries (a 72 mm roll, the measured A5
// ABOUTME: and A4 page boxes), the printed figures taken from the payments view, and the verification
// ABOUTME: state — a signed QR when published, no code at all when not.

import { describe, expect, it } from 'vitest';

import {
  buildReceiptDocument,
  isRoll,
  RECEIPT_PROFILES,
  THERMAL_PRINT_WIDTH_MM,
  THERMAL_ROLL_WIDTH_MM,
} from '../document';
import {
  PREVIEW_VERIFICATION,
  SCHOOL,
  STANDARD_RECEIPT,
  UNALLOCATED_RECEIPT,
  VERIFICATION,
} from '../__fixtures__/receipts';

const build = (overrides: Partial<Parameters<typeof buildReceiptDocument>[0]> = {}) =>
  buildReceiptDocument({ view: STANDARD_RECEIPT, template: 'a4', school: SCHOOL, ...overrides });

describe('receipt profiles', () => {
  it('gives thermal a roll width and no page box', () => {
    const model = build({ template: 'thermal' });
    expect(model.kind).toBe('thermal');
    expect(model.page).toBeNull();
    expect(model.furniture).toBeNull();
    expect(model.rollWidthMm).toBe(THERMAL_PRINT_WIDTH_MM);
    expect(model.contentWidthMm).toBe(THERMAL_PRINT_WIDTH_MM);
    expect(isRoll(model)).toBe(true);
    // The roll is 80 mm; only 72 mm of it is printable.
    expect(THERMAL_ROLL_WIDTH_MM).toBe(80);
  });

  it('gives A5 the measured page box and content width', () => {
    const model = build({ template: 'a5' });
    expect(model.page?.size).toBe('A5');
    expect(model.page?.orientation).toBe('portrait');
    expect(model.contentWidthMm).toBe(130);
    expect(model.rollWidthMm).toBeNull();
    expect(model.furniture?.pageNumbers).toBe(true);
    expect(isRoll(model)).toBe(false);
  });

  it('gives A4 the measured page box and content width', () => {
    const model = build({ template: 'a4' });
    expect(model.page?.size).toBe('A4');
    expect(model.contentWidthMm).toBe(186);
    expect(model.rollWidthMm).toBeNull();
  });

  it('names each profile', () => {
    expect(RECEIPT_PROFILES.thermal.pageSize).toBeNull();
    expect(RECEIPT_PROFILES.a5.pageSize).toBe('A5');
    expect(RECEIPT_PROFILES.a4.pageSize).toBe('A4');
  });
});

describe('receipt data', () => {
  it('prints every figure from the payments receipt view and invents nothing', () => {
    const model = build();
    expect(model.view).toBe(STANDARD_RECEIPT);
    expect(model.documentId).toBe('RCT/2027/000123');
    expect(model.view.amountInWords).toBe('five thousand shillings');
    expect(model.view.channelLabel).toBe('Cash');
    expect(model.view.balanceAfter.amount_minor).toBe(1_250_000);
    expect(model.view.cashier).toBe('J. Mwangi');
    expect(model.issuedAtLabel).toBe(STANDARD_RECEIPT.issuedAt);
  });

  it('keeps an unallocated receipt readable rather than blank', () => {
    const model = build({ view: UNALLOCATED_RECEIPT });
    expect(model.view.allocationByVoteHead).toHaveLength(0);
  });

  it('lets a caller format the issue date without changing the view', () => {
    const model = build({ issuedAtLabel: '23 Oct 2026, 09:14' });
    expect(model.issuedAtLabel).toBe('23 Oct 2026, 09:14');
    expect(model.view.issuedAt).toBe(STANDARD_RECEIPT.issuedAt);
  });
});

describe('receipt verification', () => {
  it('draws a QR for a signed, published receipt', () => {
    const model = build({ verification: VERIFICATION });
    expect(model.verification.preview).toBe(false);
    expect(model.verification.qr).not.toBeNull();
    expect(model.verification.url).toContain('?sig=6Kq2x0Yb8m3TfWc');
    expect(model.verification.qrSizeMm).toBeGreaterThanOrEqual(16);
  });

  it('carries no personal data in the link', () => {
    const model = build({ verification: VERIFICATION });
    const url = model.verification.url ?? '';
    for (const personal of [STANDARD_RECEIPT.payer, STANDARD_RECEIPT.learners[0] as string, '5000', '500000']) {
      expect(url).not.toContain(personal);
    }
    // The human receipt number is not the document id either: it carries a `/` the pattern rejects.
    expect(url).not.toContain('RCT/2027/000123');
    expect(url).toContain('RCP-2026-000123');
  });

  it('draws no code for an unpublished receipt', () => {
    const model = build({ verification: PREVIEW_VERIFICATION });
    expect(model.verification.preview).toBe(true);
    expect(model.verification.qr).toBeNull();
    expect(model.verification.url).toContain('preview=1');
    expect(model.preview).toBe(true);
  });

  it('is a preview when no verification target is configured at all', () => {
    const model = build();
    expect(model.verification.preview).toBe(true);
    expect(model.verification.qr).toBeNull();
    expect(model.verification.url).toBeNull();
  });

  it('refuses a receipt number as the document id, because the link pattern rejects its separator', () => {
    const model = build({
      verification: { host: 'https://verify.schoolpilot.app', signature: '6Kq2x0Yb8m3TfWc' },
    });
    expect(model.verification.preview).toBe(true);
    expect(model.verification.qr).toBeNull();
  });

  it('treats a forced preview as a preview even with a signature', () => {
    const model = build({ verification: { ...VERIFICATION, preview: true } });
    expect(model.verification.preview).toBe(true);
    expect(model.verification.qr).toBeNull();
  });
});
