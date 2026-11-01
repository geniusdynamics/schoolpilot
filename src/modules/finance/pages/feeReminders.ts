// ABOUTME: The fee-reminder list: which learners owe, which guardian receives the SMS, and the message
// ABOUTME: each one gets. It is pure, so the screen and its test read the same balance and recipient.

import type { RepositoryRow } from '@/data/repository';
import type { FinanceInvoiceRow, FinanceLearnerRow } from '../data/canonicalFinance';

export interface FeeReminderFilters {
  readonly className: string;
  readonly search: string;
}

export interface FeeReminderRow {
  readonly id: string;
  readonly learnerId: string;
  readonly learnerName: string;
  readonly admissionNumber: string;
  readonly className: string;
  readonly balanceMinor: number;
  readonly guardianName: string;
  readonly phone: string;
}

export const EMPTY_FEE_REMINDER_FILTERS: FeeReminderFilters = {
  className: '',
  search: '',
};

export const DEFAULT_REMINDER_TEMPLATE =
  'Dear {{guardian}}, the fee balance for {{learner}} ({{admission}}) is {{balance}}. Please settle at your earliest convenience. {{school}}';

const guardianName = (guardian: RepositoryRow<'guardian'>): string =>
  `${guardian.preferred_name ?? guardian.given_name} ${guardian.family_name}`.trim();

const guardianPhone = (guardian: RepositoryRow<'guardian'>): string =>
  guardian.phones?.find((phone) => phone.number.trim() !== '')?.number.trim() ?? '';

/**
 * Builds the reminder list.
 *
 * A learner's balance is billed minus paid minus posted credit notes, the same arithmetic as the
 * student financial summary. The recipient is the first guardian who receives SMS and is marked as
 * a fee payer (falling back to the primary guardian), so one learner is one message. A learner with
 * no phone is listed with an empty number and the screen refuses to send to it.
 */
export function buildFeeReminders(input: {
  readonly learners: readonly FinanceLearnerRow[];
  readonly invoices: readonly FinanceInvoiceRow[];
  readonly creditNotes: readonly RepositoryRow<'credit_note'>[];
  readonly links: readonly RepositoryRow<'learner_guardian'>[];
  readonly guardians: readonly RepositoryRow<'guardian'>[];
  readonly filters: FeeReminderFilters;
}): readonly FeeReminderRow[] {
  const invoicesByLearner = new Map<string, FinanceInvoiceRow[]>();
  for (const invoice of input.invoices) {
    if (!invoice.learnerId || invoice.status === 'void') continue;
    const list = invoicesByLearner.get(invoice.learnerId) ?? [];
    list.push(invoice);
    invoicesByLearner.set(invoice.learnerId, list);
  }
  const creditByLearner = new Map<string, number>();
  for (const note of input.creditNotes) {
    if (!note.learner_id || note.status !== 'posted') continue;
    creditByLearner.set(
      note.learner_id,
      (creditByLearner.get(note.learner_id) ?? 0) + note.amount.amount_minor
    );
  }

  const guardianById = new Map<string, RepositoryRow<'guardian'>>(
    input.guardians.map((guardian) => [String(guardian.id), guardian])
  );
  const linksByLearner = new Map<string, RepositoryRow<'learner_guardian'>[]>();
  for (const link of input.links) {
    const list = linksByLearner.get(link.learner_id) ?? [];
    list.push(link);
    linksByLearner.set(link.learner_id, list);
  }

  const term = input.filters.search.trim().toLowerCase();
  return input.learners
    .filter((learner) => learner.status === 'enrolled')
    .filter((learner) => !input.filters.className || learner.className === input.filters.className)
    .filter(
      (learner) =>
        !term ||
        learner.name.toLowerCase().includes(term) ||
        learner.admissionNumber.toLowerCase().includes(term)
    )
    .map((learner) => {
      const invoices = invoicesByLearner.get(learner.id) ?? [];
      const billedMinor = invoices.reduce((sum, invoice) => sum + invoice.total.amount_minor, 0);
      const paidMinor = invoices.reduce((sum, invoice) => sum + invoice.paid.amount_minor, 0);
      const balanceMinor = billedMinor - paidMinor - (creditByLearner.get(learner.id) ?? 0);
      if (balanceMinor <= 0) return null;

      const links = (linksByLearner.get(learner.id) ?? [])
        .filter((link) => link.receives_sms)
        .sort((left, right) => {
          if (left.is_fee_payer !== right.is_fee_payer) return left.is_fee_payer ? -1 : 1;
          if (left.is_primary !== right.is_primary) return left.is_primary ? -1 : 1;
          return (left.priority ?? 0) - (right.priority ?? 0);
        });
      const link = links.find((candidate) => guardianById.has(candidate.guardian_id));
      const guardian = link ? guardianById.get(link.guardian_id) : undefined;
      return {
        id: learner.id,
        learnerId: learner.id,
        learnerName: learner.name,
        admissionNumber: learner.admissionNumber,
        className: learner.className,
        balanceMinor,
        guardianName: guardian ? guardianName(guardian) : '',
        phone: guardian ? guardianPhone(guardian) : '',
      };
    })
    .filter((row): row is FeeReminderRow => row !== null)
    .sort(
      (left, right) =>
        left.className.localeCompare(right.className) || left.learnerName.localeCompare(right.learnerName)
    );
}

/** Fills the message's placeholders. Unknown placeholders are left as written, never blanked. */
export function renderReminderMessage(
  template: string,
  row: FeeReminderRow,
  schoolName: string
): string {
  // Two decimal places, read from the integer minor units rather than through a float.
  const minorDigits = String(row.balanceMinor).padStart(3, '0');
  const values: Record<string, string> = {
    learner: row.learnerName,
    admission: row.admissionNumber,
    balance: `${minorDigits.slice(0, -2)}.${minorDigits.slice(-2)}`,
    guardian: row.guardianName,
    school: schoolName,
  };
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name.toLowerCase())
      ? values[name.toLowerCase()] ?? ''
      : match
  );
}
