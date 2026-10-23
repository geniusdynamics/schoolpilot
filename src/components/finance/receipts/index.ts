// ABOUTME: Public API of the printable receipt surface: the three template profiles, the receipt
// ABOUTME: document builder, the page frame, the print entry point and the body portal.

export type {
  ReceiptDocumentInput,
  ReceiptDocumentModel,
  ReceiptLabels,
  ReceiptSchool,
  ReceiptTemplateKind,
  ReceiptVerification,
  ReceiptVerificationConfig,
} from './types';
export { RECEIPT_TEMPLATE_KINDS } from './types';

export {
  RECEIPT_LABELS,
  RECEIPT_PROFILES,
  THERMAL_MARGIN_MM,
  THERMAL_PRINT_WIDTH_MM,
  THERMAL_ROLL_WIDTH_MM,
  buildReceiptDocument,
  isRoll,
  type ReceiptProfile,
} from './document';

export { ReceiptDocument, type ReceiptDocumentProps } from './ReceiptDocument';
export { ReceiptPrintSurface } from './ReceiptPrintSurface';

// The print entry point is the report surface's, reused rather than re-implemented: it waits for the
// print fonts, hides the app shell with `display: none`, and clears the attribute on `afterprint`.
export {
  beginPrint,
  endPrint,
  isPrinting,
  printReport as printReceipt,
  PRINTING_ATTRIBUTE,
  type PrintEnvironment,
} from '@/components/reports';
