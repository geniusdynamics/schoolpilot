// ABOUTME: The plain data model of a printable receipt: the three template profiles of spec 05 §5.2
// ABOUTME: (80 mm thermal roll, A5, A4), the school identity, and the verification state a QR is drawn
// ABOUTME: from. The receipt's own figures come from the payments module's `ReceiptView`; nothing here
// ABOUTME: invents a field the view does not carry.

import type { ReceiptView } from '@/domain/finance/payments';
import type { QrMatrix, ReportPageFurniture, ReportPageGeometry } from '@/domain/reports';

/** The three receipt formats of spec 05 §5.2, in the order the spec lists them. */
export type ReceiptTemplateKind = 'thermal' | 'a5' | 'a4';

export const RECEIPT_TEMPLATE_KINDS: readonly ReceiptTemplateKind[] = ['thermal', 'a5', 'a4'];

/**
 * The school identity a receipt header prints.
 *
 * `ReceiptView` (P3-D01) carries none of this: it is the payment's view, not the school's. The
 * caller supplies the profile — the finance module already resolves one through `useSchoolProfile`
 * — and the header degrades to the name alone when the rest is absent.
 */
export interface ReceiptSchool {
  readonly name: string;
  readonly motto?: string | null;
  readonly address?: string | null;
  readonly contact?: string | null;
  /** Data URI or same-origin URL. A vector logo stays vector in the printed PDF. */
  readonly logo?: string | null;
}

/**
 * Where a receipt's verification link points.
 *
 * `documentId` is the opaque reference the verifier resolves, and it is deliberately separate from
 * the receipt number: the receipt number is a sequence like `RCT/2027/000123`, and the link
 * builder's document-id pattern (DR-05) rejects the `/` separator. Without an opaque id — or
 * without a signature — the document is a preview and carries no QR at all.
 */
export interface ReceiptVerificationConfig {
  readonly host: string;
  readonly documentId?: string | null;
  /** base64url signature from the publish service over the document id + snapshot hash + issued-at. */
  readonly signature?: string | null;
  /** Force the preview form even when an id and a signature are present. */
  readonly preview?: boolean;
}

/** The resolved verification state: the URL, whether it is a preview, and the QR when it is not. */
export interface ReceiptVerification {
  readonly url: string | null;
  readonly preview: boolean;
  readonly qr: QrMatrix | null;
  readonly qrSizeMm: number;
  readonly documentId: string | null;
}

/**
 * The printed copy. Every string is UI copy, not data; a caller that translates receipts passes its
 * own map and the defaults stand in otherwise.
 */
export interface ReceiptLabels {
  readonly title: string;
  readonly receiptNo: string;
  readonly date: string;
  readonly cashier: string;
  readonly payer: string;
  readonly learner: string;
  readonly amount: string;
  readonly inWords: string;
  readonly channel: string;
  readonly reference: string;
  readonly none: string;
  readonly allocation: string;
  readonly unallocated: string;
  readonly total: string;
  readonly balanceAfter: string;
  readonly verify: string;
  readonly preview: string;
  readonly previewBanner: string;
  readonly voided: string;
  readonly rollWidth: string;
  readonly document: string;
}

/** What the receipt builder needs. */
export interface ReceiptDocumentInput {
  /** The payment's receipt view from P3-D01. Every figure prints from here. */
  readonly view: ReceiptView;
  readonly template: ReceiptTemplateKind;
  readonly school: ReceiptSchool;
  readonly verification?: ReceiptVerificationConfig | null;
  /** The header line, e.g. `OFFICIAL RECEIPT`. Defaults to the label. */
  readonly title?: string;
  /** The template's footer message. Absent means no footer line. */
  readonly footer?: string | null;
  /** The display date; defaults to `view.issuedAt` unchanged, which is what the view carries. */
  readonly issuedAtLabel?: string | null;
  readonly locale?: string;
  readonly dir?: 'ltr' | 'rtl';
  readonly labels?: Partial<ReceiptLabels>;
}

/** One resolved receipt, ready for the surface. Pure data: the surface reads nothing else. */
export interface ReceiptDocumentModel {
  readonly kind: ReceiptTemplateKind;
  /** The receipt number: the human identity, and the document id when no opaque one is supplied. */
  readonly documentId: string;
  readonly title: string;
  readonly locale: string;
  readonly dir: 'ltr' | 'rtl';
  readonly labels: ReceiptLabels;
  readonly school: ReceiptSchool;
  readonly view: ReceiptView;
  readonly issuedAtLabel: string;
  readonly footer: string | null;
  /** The A5/A4 page box, or null for thermal, which is a roll and has no page box (DR-05). */
  readonly page: ReportPageGeometry | null;
  /** The `@page` furniture, or null for thermal. */
  readonly furniture: ReportPageFurniture | null;
  /** Thermal only: the printable width of the roll in millimetres. Null for A5/A4. */
  readonly rollWidthMm: number | null;
  /** The width the sheet's content occupies, in millimetres. */
  readonly contentWidthMm: number;
  readonly verification: ReceiptVerification;
  readonly preview: boolean;
}
