// ABOUTME: Deterministic receipt fixtures for the unit and visual tests: a standard counter receipt,
// ABOUTME: a household receipt across siblings, a receipt with many allocation lines, a void receipt,
// ABOUTME: and the published/preview verification targets the e-receipt QR is drawn from.

import { buildReceiptView, type ReceiptView } from '@/domain/finance/payments';
import type { Money } from '@/domain/money';

import type { ReceiptSchool, ReceiptVerificationConfig } from '../types';

const LOGO_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>" +
  "<circle cx='32' cy='32' r='30' fill='none' stroke='%23111827' stroke-width='2.5'/>" +
  "<path d='M32 12l17 10v6H15v-6z' fill='%23111827'/>" +
  "<path d='M20 32h24v16H20z' fill='none' stroke='%23111827' stroke-width='2.5'/>" +
  "<path d='M14 52h36' stroke='%23111827' stroke-width='3'/></svg>";

/** The reference school: a long name, a motto, contacts and a vector logo. */
export const SCHOOL: ReceiptSchool = {
  name: 'Riverside Academy',
  motto: 'Knowledge · Integrity · Service',
  address: 'P.O. Box 4021-00100 · Nairobi',
  contact: '+254 20 555 0134 · info@riverside.ac.ke',
  logo: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO_SVG)}`,
};

const KES = (amountMinor: number): Money => ({ amount_minor: amountMinor, currency: 'KES' });

/**
 * A published verification target. The document id is opaque and pattern-valid (DR-05), and
 * deliberately not the receipt number: `RCT/2027/000123` carries a `/`, which the link's
 * document-id pattern rejects.
 */
export const VERIFICATION: ReceiptVerificationConfig = {
  host: 'https://verify.schoolpilot.app',
  documentId: 'RCP-2026-000123',
  signature: '6Kq2x0Yb8m3TfWc',
};

/** An unpublished e-receipt: no signature, so the receipt must draw no QR and say so. */
export const PREVIEW_VERIFICATION: ReceiptVerificationConfig = {
  host: 'https://verify.schoolpilot.app',
  documentId: 'RCP-2026-000123',
};

/** The common case: one learner, a cash payment allocated across two vote heads. */
export const STANDARD_RECEIPT: ReceiptView = buildReceiptView({
  number: 'RCT/2027/000123',
  issuedAt: '2026-10-23T09:14:00+03:00',
  status: 'issued',
  payer: 'Grace Achieng',
  learners: ['Amina Achieng'],
  amount: KES(5_000_00),
  channel: 'cash',
  reference: null,
  allocationByVoteHead: [
    { label: 'Tuition', amount: KES(4_000_00) },
    { label: 'Activity fee', amount: KES(1_000_00) },
  ],
  balanceAfter: KES(12_500_00),
  cashier: 'J. Mwangi',
});

/** A household payment: one receipt, two siblings, three vote heads. */
export const HOUSEHOLD_RECEIPT: ReceiptView = buildReceiptView({
  number: 'RCT/2027/000124',
  issuedAt: '2026-10-23T09:31:00+03:00',
  status: 'issued',
  payer: 'Grace Achieng',
  learners: ['Amina Achieng', 'Brian Achieng'],
  amount: KES(21_000_00),
  channel: 'mobile_money',
  reference: 'MPESA-QK41H8T2ZP',
  allocationByVoteHead: [
    { label: 'Tuition · Amina', amount: KES(12_000_00) },
    { label: 'Tuition · Brian', amount: KES(7_500_00) },
    { label: 'Lunch programme', amount: KES(1_500_00) },
  ],
  balanceAfter: KES(3_400_00),
  cashier: 'J. Mwangi',
});

/** A receipt with more vote-head lines than one roll length or sheet holds, so the table must flow. */
export const LONG_ALLOCATION_RECEIPT: ReceiptView = buildReceiptView({
  number: 'RCT/2027/000125',
  issuedAt: '2026-10-23T10:02:00+03:00',
  status: 'issued',
  payer: 'Riverside Parents Association',
  learners: ['Amina Achieng', 'Brian Achieng', 'Cynthia Achieng'],
  amount: KES(180_000_00),
  channel: 'bank_deposit',
  reference: 'KCB/2026/10/TRF-882134',
  allocationByVoteHead: Array.from({ length: 60 }, (_, index) => ({
    label: `Vote head ${String(index + 1).padStart(2, '0')} · Term 3 charge ${index + 1}`,
    amount: KES(3_000_00 + index * 7),
  })),
  balanceAfter: KES(0),
  cashier: 'J. Mwangi',
});

/** A receipt reversed the same day: it keeps its number and prints its status. */
export const VOID_RECEIPT: ReceiptView = buildReceiptView({
  number: 'RCT/2027/000126',
  issuedAt: '2026-10-23T10:20:00+03:00',
  status: 'void',
  payer: 'Grace Achieng',
  learners: ['Amina Achieng'],
  amount: KES(5_000_00),
  channel: 'cash',
  reference: null,
  allocationByVoteHead: [{ label: 'Tuition', amount: KES(5_000_00) }],
  balanceAfter: KES(17_500_00),
  cashier: 'J. Mwangi',
});

/** A receipt with no allocation at all: the amount is learner credit. */
export const UNALLOCATED_RECEIPT: ReceiptView = buildReceiptView({
  number: 'RCT/2027/000127',
  issuedAt: '2026-10-23T10:41:00+03:00',
  status: 'issued',
  payer: 'Grace Achieng',
  learners: ['Amina Achieng'],
  amount: KES(2_000_00),
  channel: 'cheque',
  reference: 'CHQ-004512',
  allocationByVoteHead: [],
  balanceAfter: KES(10_500_00),
  cashier: 'J. Mwangi',
});
