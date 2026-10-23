// ABOUTME: Resolves a receipt document from the payments module's `ReceiptView`, a school profile and
// ABOUTME: a verification target: the profile geometry (a 72 mm roll, or the measured A5/A4 page box),
// ABOUTME: the printed labels, and the signed QR link. Pure — it reads no store, no clock and no DOM.

import { qrMatrix } from '@/domain/reports/qr';
import { resolvePageGeometry } from '@/domain/reports/page';
import { buildVerificationLink, qrSizeMmFor, VerificationLinkError } from '@/domain/reports/verification';
import type { ReportPageFurniture } from '@/domain/reports/types';

import type {
  ReceiptDocumentInput,
  ReceiptDocumentModel,
  ReceiptLabels,
  ReceiptTemplateKind,
  ReceiptVerification,
  ReceiptVerificationConfig,
} from './types';

/**
 * The 80 mm thermal roll, measured the way a receipt printer's own documentation states it: the roll
 * is 80 mm wide and the print head reaches 72 mm of it (576 dots at 203 dpi). The 4 mm bands at each
 * edge are the unprintable margins, not a design choice.
 */
export const THERMAL_ROLL_WIDTH_MM = 80;
export const THERMAL_PRINT_WIDTH_MM = 72;
export const THERMAL_MARGIN_MM = 4;

export interface ReceiptProfile {
  readonly kind: ReceiptTemplateKind;
  /** The page size the `@page` rule declares, or null for thermal (a roll has no page box). */
  readonly pageSize: 'A5' | 'A4' | null;
  /** Thermal only: the printable roll width. Null for a sheet. */
  readonly rollWidthMm: number | null;
}

/** The three profiles of spec 05 §5.2. */
export const RECEIPT_PROFILES: Readonly<Record<ReceiptTemplateKind, ReceiptProfile>> = {
  thermal: { kind: 'thermal', pageSize: null, rollWidthMm: THERMAL_PRINT_WIDTH_MM },
  a5: { kind: 'a5', pageSize: 'A5', rollWidthMm: null },
  a4: { kind: 'a4', pageSize: 'A4', rollWidthMm: null },
};

/** The English copy of a receipt. A caller may override any line; nothing here is receipt data. */
export const RECEIPT_LABELS: ReceiptLabels = {
  title: 'Official receipt',
  receiptNo: 'Receipt no.',
  date: 'Date',
  cashier: 'Cashier',
  payer: 'Payer',
  learner: 'Learner',
  amount: 'Amount',
  inWords: 'In words',
  channel: 'Channel',
  reference: 'Reference',
  none: '—',
  allocation: 'Allocation',
  unallocated: 'Unallocated (learner credit)',
  total: 'Total',
  balanceAfter: 'Balance after',
  verify: 'Scan to verify this receipt',
  preview: 'PREVIEW — not valid for verification',
  previewBanner: 'PREVIEW — not valid for verification',
  voided: 'VOID — this receipt has been reversed',
  rollWidth: '80 mm thermal',
  document: 'Receipt',
};

const NO_VERIFICATION: ReceiptVerification = {
  url: null,
  preview: true,
  qr: null,
  qrSizeMm: 16,
  documentId: null,
};

/**
 * Resolves the verification state, exactly as the report document does (DR-05 §QR verification):
 * an unpublished receipt draws no QR and says so, and a receipt with no opaque, pattern-valid
 * document id is treated as unpublished rather than pointed at an address the verifier cannot
 * resolve.
 */
function resolveVerification(
  config: ReceiptVerificationConfig | null | undefined,
  receiptNumber: string
): ReceiptVerification {
  const host = config?.host?.trim() ?? '';
  if (host === '') return NO_VERIFICATION;
  const documentId = config?.documentId?.trim() ?? '';
  if (documentId === '') {
    // The receipt number is not an acceptable id (`RCT/2027/000123` fails the link's pattern), so a
    // caller that has not supplied one gets a preview, never a code that looks valid.
    return { ...NO_VERIFICATION, documentId: receiptNumber };
  }
  try {
    const link = buildVerificationLink({
      host,
      documentId,
      signature: config?.signature,
      preview: config?.preview,
    });
    if (link.preview) return { ...NO_VERIFICATION, url: link.url, documentId };
    const qr = qrMatrix(link.url);
    return { url: link.url, preview: false, qr, qrSizeMm: qrSizeMmFor(qr.version), documentId };
  } catch (error) {
    // An unreadable host, id or signature is a preview, not a broken document: the receipt still
    // prints, without a code that claims to verify.
    if (error instanceof VerificationLinkError) return { ...NO_VERIFICATION, documentId };
    return { ...NO_VERIFICATION, documentId };
  }
}

/** Resolves one receipt against its view, school and template. Pure and deterministic. */
export function buildReceiptDocument(input: ReceiptDocumentInput): ReceiptDocumentModel {
  const profile = RECEIPT_PROFILES[input.template] ?? RECEIPT_PROFILES.a4;
  const labels: ReceiptLabels = { ...RECEIPT_LABELS, ...input.labels };
  const page = profile.pageSize ? resolvePageGeometry({ size: profile.pageSize }) : null;
  const verification = resolveVerification(input.verification, input.view.number);
  const title = input.title ?? labels.title;

  const furniture: ReportPageFurniture | null = page
    ? {
        leftText: `${title} · ${input.view.number}`,
        // A receipt is one sheet for the common case; a long allocation list may legitimately flow
        // to a second, so the counter is honest about it (unlike a batch of report cards).
        pageNumbers: true,
        fontPt: 7.5,
        color: '#4b5563',
      }
    : null;

  return {
    kind: profile.kind,
    documentId: input.view.number,
    title,
    locale: input.locale ?? 'en',
    dir: input.dir ?? 'ltr',
    labels,
    school: input.school,
    view: input.view,
    issuedAtLabel: input.issuedAtLabel ?? input.view.issuedAt,
    footer: input.footer ?? null,
    page,
    furniture,
    rollWidthMm: profile.rollWidthMm,
    contentWidthMm: profile.rollWidthMm ?? page?.contentWidthMm ?? 0,
    verification,
    preview: verification.preview,
  };
}

/** True when the receipt is a roll rather than a sheet: no page box, no page furniture. */
export function isRoll(model: ReceiptDocumentModel): boolean {
  return model.page === null;
}
