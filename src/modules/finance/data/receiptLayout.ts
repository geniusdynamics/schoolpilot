// ABOUTME: The printable receipt's layout, as a school preference: paper profile, header title, footer,
// ABOUTME: and whether the school's logo, address and contact print. Stored locally because it is a
// ABOUTME: presentation choice, not a financial document.

import type { ReceiptTemplateKind } from '@/components/finance/receipts';
import { RECEIPT_TEMPLATE_KINDS } from '@/components/finance/receipts';

export interface ReceiptLayout {
  readonly template: ReceiptTemplateKind;
  readonly title: string;
  readonly footer: string;
  readonly showLogo: boolean;
  readonly showAddress: boolean;
  readonly showContact: boolean;
}

export const DEFAULT_RECEIPT_LAYOUT: ReceiptLayout = {
  template: 'a5',
  title: 'OFFICIAL RECEIPT',
  footer: 'Thank you for your payment.',
  showLogo: true,
  showAddress: true,
  showContact: true,
};

export const RECEIPT_LAYOUT_STORAGE_KEY = 'schoolpilot.receipt-layout';

const isKind = (value: unknown): value is ReceiptTemplateKind =>
  typeof value === 'string' && (RECEIPT_TEMPLATE_KINDS as readonly string[]).includes(value);

/** Reads the saved layout, falling back field by field so a half-written value cannot break a print. */
export function readReceiptLayout(
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined' ? null : localStorage
): ReceiptLayout {
  if (!storage) return DEFAULT_RECEIPT_LAYOUT;
  try {
    const raw = storage.getItem(RECEIPT_LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_RECEIPT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<ReceiptLayout>;
    return {
      template: isKind(parsed.template) ? parsed.template : DEFAULT_RECEIPT_LAYOUT.template,
      title:
        typeof parsed.title === 'string' && parsed.title.trim() !== ''
          ? parsed.title
          : DEFAULT_RECEIPT_LAYOUT.title,
      footer: typeof parsed.footer === 'string' ? parsed.footer : DEFAULT_RECEIPT_LAYOUT.footer,
      showLogo: typeof parsed.showLogo === 'boolean' ? parsed.showLogo : DEFAULT_RECEIPT_LAYOUT.showLogo,
      showAddress:
        typeof parsed.showAddress === 'boolean' ? parsed.showAddress : DEFAULT_RECEIPT_LAYOUT.showAddress,
      showContact:
        typeof parsed.showContact === 'boolean' ? parsed.showContact : DEFAULT_RECEIPT_LAYOUT.showContact,
    };
  } catch {
    return DEFAULT_RECEIPT_LAYOUT;
  }
}

/** Saves the layout; a storage failure leaves the caller's state intact and returns false. */
export function writeReceiptLayout(
  layout: ReceiptLayout,
  storage: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined' ? null : localStorage
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(RECEIPT_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    return true;
  } catch {
    return false;
  }
}
