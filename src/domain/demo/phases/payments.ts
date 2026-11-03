// ABOUTME: What the families of the demo school did about the fees, term by term: discounts as credit
// ABOUTME: notes, payments through the payments service (so receipts, allocations and ledger entries are
// ABOUTME: real), a bounced cheque, and for the alumni the refunds, write-offs and clearances.

import type { RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';
import { fromMinor, type Money } from '@/domain/money';
import type { AllocationStrategyKind } from '@/domain/finance/allocation';
import { AdjustmentsService } from '@/domain/finance/adjustments';
import { ensureAdjustmentSchema, transactionAdapter } from '@/domain/finance/adjustments/support';
import {
  LedgerService,
  createSqliteLedgerStore,
  ledgerChartFromRows,
} from '@/domain/finance/ledger';
import { PAYMENTS_SEQUENCE_CATALOG, PaymentsService, type PaymentChannel } from '@/domain/finance/payments';
import { SequenceService, createSqliteSequenceStore } from '@/domain/sequences';

import { STAFF, type Standing } from '../cast';
import type { DemoContext } from './context';
import type { DemoFinance } from './finance';
import { addDays, listAll } from './helpers';
import type { DemoRoster, RosterLearner } from './people';

/** One payment a family makes toward a term's invoice. */
interface Pay {
  /** The share of the term's invoice, after any discount. */
  readonly fraction?: number;
  /** A fixed amount in whole shillings, instead of a share. */
  readonly shillings?: number;
  /** Days after the term opened. */
  readonly offset: number;
  /** True when the payment is for this term's invoice only; false lets the oldest balance take it first. */
  readonly restricted: boolean;
  readonly cheque?: 'bounce';
}

/** A discount given on a term's invoice, as a credit note. */
interface Discount {
  readonly percentOfTuition?: number;
  readonly wholeInvoice?: boolean;
  readonly reason: string;
}

interface TermPlan {
  readonly discount?: Discount;
  readonly pays: readonly Pay[];
}

/** Where a term sits in the learner's story. */
interface Where {
  readonly year: 'previous' | 'current';
  readonly index: number;
  /** The last term of the learner's year that was billed. */
  readonly lastIndex: number;
  /** True for the term the learner is in now (or, for one who left, the last one they were in). */
  readonly isCurrent: boolean;
}

const CHANNELS: readonly PaymentChannel[] = ['mobile_money', 'bank_deposit', 'cash', 'cheque', 'mobile_money', 'bank_deposit'];

/** The strategy a family's payments are allocated by: the demo shows all three the notes ask for. */
const STRATEGY_OF: Readonly<Record<string, AllocationStrategyKind>> = {
  chloe: 'proportional',
  cyrus: 'proportional',
  nadia: 'vote_head_priority',
};

function hashOf(value: string): number {
  let hash = 11;
  for (const letter of value) hash = (Math.imul(hash, 33) + letter.charCodeAt(0)) >>> 0;
  return hash;
}

/** What a standing does in one term. */
function planFor(standing: Standing, where: Where): TermPlan {
  const full: Pay = { fraction: 1, offset: 6, restricted: true };
  const { isCurrent } = where;
  switch (standing) {
    case 'cleared':
      return { pays: [full] };
    case 'balance':
      return { pays: [isCurrent ? { fraction: 0.6, offset: 14, restricted: true } : full] };
    case 'arrears_terms':
      return {
        pays: where.year === 'previous' ? [full] : isCurrent ? [] : [{ fraction: 0.6, offset: 10, restricted: true }],
      };
    case 'arrears_years': {
      if (where.year === 'previous') {
        return { pays: [where.index === where.lastIndex ? { fraction: 0.4, offset: 12, restricted: true } : full] };
      }
      // This year's term is part-paid, and a lump sum goes to the oldest balance first.
      return isCurrent
        ? { pays: [{ fraction: 0.5, offset: 9, restricted: true }, { shillings: 5_000, offset: 20, restricted: false }] }
        : { pays: [full] };
    }
    case 'overpaid':
      return { pays: [isCurrent ? { fraction: 1.3, offset: 5, restricted: true } : full] };
    case 'prepaid':
      // One payment larger than the term, with nothing else open: the rest stays as credit for next term.
      return { pays: [isCurrent ? { fraction: 2.1, offset: 4, restricted: false } : full] };
    case 'installments':
      return {
        pays: isCurrent
          ? [
              { fraction: 0.25, offset: 3, restricted: true },
              { fraction: 0.25, offset: 35, restricted: true },
              { fraction: 0.25, offset: 70, restricted: true },
            ]
          : [full],
      };
    case 'bounced_cheque':
      return {
        pays: isCurrent
          ? [{ fraction: 1, offset: 6, restricted: true, cheque: 'bounce' }, { fraction: 0.5, offset: 20, restricted: true }]
          : [full],
      };
    case 'staff_half':
      return { discount: { percentOfTuition: 50, reason: "Staff child discount: a teacher's child, half tuition" }, pays: [full] };
    case 'staff_quarter':
      return {
        discount: { percentOfTuition: 25, reason: "Staff child discount: a support staff member's child, a quarter of tuition" },
        pays: [isCurrent ? { fraction: 0.7, offset: 15, restricted: true } : full],
      };
    case 'proprietor':
      return { discount: { wholeInvoice: true, reason: "Proprietor's child: fees waived" }, pays: [] };
    case 'bursary':
      return { discount: { percentOfTuition: 50, reason: 'County bursary: half of tuition' }, pays: [full] };
    case 'alumni_cleared':
      return { pays: [full] };
    case 'alumni_refund_paid':
      return { pays: where.index === where.lastIndex ? [{ ...full }, { shillings: 6_000, offset: 9, restricted: false }] : [full] };
    case 'alumni_refund_pending':
      return { pays: where.index === where.lastIndex ? [{ ...full }, { shillings: 4_500, offset: 9, restricted: false }] : [full] };
    case 'alumni_owing':
      return { pays: [where.index === where.lastIndex ? { fraction: 0.2, offset: 15, restricted: true } : full] };
    case 'alumni_writeoff_pending':
      return { pays: [where.index === where.lastIndex ? { fraction: 0.9, offset: 20, restricted: true } : full] };
    case 'alumni_writeoff_approved':
      return { pays: [where.index === where.lastIndex ? { fraction: 0.85, offset: 20, restricted: true } : full] };
  }
}

export interface DemoActors {
  /** The canonical user of the bursar, who makes the requests and takes the money. */
  readonly bursarId: string | undefined;
  /** The canonical user of the head teacher, who approves them. */
  readonly headId: string | undefined;
}

/** Writes the discounts, the payments and the settling of the alumni, in the order the terms happened. */
export async function seedMoney(
  ctx: DemoContext,
  roster: DemoRoster,
  finance: DemoFinance,
  actors: DemoActors
): Promise<void> {
  const { repository } = ctx;
  ctx.at('payments');

  // The ledger, the sequences and the audit trail keep their own tables; the billing run has made
  // sure they exist, and this makes sure again, because every statement is IF NOT EXISTS.
  await ensureAdjustmentSchema(ctx.tx);
  const adapter = transactionAdapter(ctx.tx);
  const ledgerAccounts = (
    await repository.list('ledger_account', {
      where: { institution_id: ctx.institutionId },
      limit: 500,
    })
  ).items;
  const channelAccounts = (
    await repository.list('channel_account', {
      where: { institution_id: ctx.institutionId },
      limit: 500,
    })
  ).items;
  const payments = new PaymentsService({
    store: repository,
    numbers: new SequenceService({
      store: createSqliteSequenceStore(adapter),
      definitions: PAYMENTS_SEQUENCE_CATALOG,
    }),
    ledger: new LedgerService({
      store: createSqliteLedgerStore(adapter),
      mapping: ledgerChartFromRows(ledgerAccounts, { channelRows: channelAccounts }),
      ...(actors.bursarId ? { actor: actors.bursarId } : {}),
    }),
    ...(actors.bursarId ? { actor: actors.bursarId } : {}),
  });
  const adjustments = new AdjustmentsService({
    store: repository,
    ...(actors.bursarId ? { actor: actors.bursarId } : {}),
  });
  const bursar = STAFF.find((person) => person.key === 'bursar');
  const cashierName = bursar ? `${bursar.given} ${bursar.family}` : 'Bursar';
  const tuition = finance.feeItems.get('TUITION');

  const payerOf = (entry: RosterLearner): string => {
    const guardian = roster.guardians.get(entry.cast.links[0]?.guardian ?? '');
    return guardian ? `${guardian.given_name} ${guardian.family_name}` : entry.cast.family;
  };

  let paymentNumber = 0;
  const pay = async (
    entry: RosterLearner,
    term: RepositoryRow<'academic_period'>,
    spec: Pay,
    invoices: readonly RepositoryRow<'invoice'>[],
    invoiceTotalMinor: number
  ): Promise<void> => {
    const minor = Math.round(spec.shillings !== undefined ? spec.shillings * 100 : invoiceTotalMinor * (spec.fraction ?? 0));
    if (minor <= 0) return;
    let day = addDays(term.start_date, spec.offset);
    if (entry.leftOn && day > entry.leftOn) day = entry.leftOn;
    if (day > ctx.today) return;
    paymentNumber += 1;
    const channel: PaymentChannel = spec.cheque ? 'cheque' : (CHANNELS[(hashOf(entry.cast.key) + paymentNumber) % CHANNELS.length] ?? 'cash');
    const reference =
      channel === 'cash'
        ? undefined
        : channel === 'mobile_money'
          ? `MP${(hashOf(`${entry.cast.key}${paymentNumber}`) % 1_000_000_000).toString(36).toUpperCase().padStart(8, '0')}`
          : channel === 'cheque'
            ? `CHQ-${String(100_000 + (hashOf(`${entry.cast.key}${paymentNumber}`) % 899_999))}`
            : `SLIP-${String(200_000 + (hashOf(`${entry.cast.key}${paymentNumber}`) % 799_999))}`;
    const strategy = STRATEGY_OF[entry.cast.key];
    const recorded = await payments.recordPayment({
      learnerId: entry.learnerId,
      amount: fromMinor(minor, ctx.currency),
      channel,
      ...(reference ? { reference } : {}),
      receivedAt: `${day}T09:30:00.000Z`,
      ...(actors.bursarId ? { cashierUserId: actors.bursarId } : {}),
      cashierName,
      payerName: payerOf(entry),
      ...(spec.restricted ? { invoiceIds: invoices.map((invoice) => invoice.id) } : {}),
      ...(strategy ? { strategy } : {}),
    });
    ctx.count('payment');
    ctx.count('receipt');

    if (channel !== 'cheque') return;
    // A cheque is a promise until the bank honours it: it is deposited, then it clears or bounces.
    const depositOn = addDays(day, 2);
    if (depositOn > ctx.today) return;
    await payments.depositCheque({ paymentId: recorded.payment.id, on: depositOn });
    if (spec.cheque === 'bounce') {
      // No bounce fee is asked for: the payments service adds the fee as an invoice but does not post
      // it to the ledger, so the learner's documents and the ledger would disagree by the fee.
      await payments.bounceCheque({
        paymentId: recorded.payment.id,
        on: addDays(depositOn, 3),
        reason: 'Refused by the bank: insufficient funds',
      });
      return;
    }
    const clearOn = addDays(depositOn, 4);
    if (clearOn <= ctx.today) await payments.clearCheque({ paymentId: recorded.payment.id, on: clearOn });
  };

  const lastBilledIndex = finance.billedTerms.filter((entry) => entry.isCurrentYear).at(-1)?.index ?? 0;
  const previousLast = ctx.previous.terms.length - 1;

  for (const billed of finance.billedTerms) {
    const invoicesOfTerm = finance.invoicesByPeriod.get(billed.term.id) ?? [];
    for (const entry of roster.learners) {
      const invoices = invoicesOfTerm.filter((invoice) => invoice.learner_id === entry.learnerId);
      if (invoices.length === 0) continue;
      const total = invoices.reduce((sum, invoice) => sum + invoice.total.amount_minor, 0);

      // The term a learner is "in now": the current one, or the last they were billed if they left.
      const exitIndex = entry.leftOn
        ? ctx.current.terms.reduce((last, term, index) => (term.start_date <= entry.leftOn! ? index : last), 0)
        : lastBilledIndex;
      const where: Where = billed.isCurrentYear
        ? { year: 'current', index: billed.index, lastIndex: lastBilledIndex, isCurrent: billed.index === Math.min(exitIndex, lastBilledIndex) }
        : { year: 'previous', index: billed.index, lastIndex: previousLast, isCurrent: false };
      const plan = planFor(entry.cast.standing, where);

      // A discount is a credit note against the term's invoice, crediting the fee items it covers.
      let discountMinor = 0;
      if (plan.discount) {
        const lines = await listAll(repository, 'invoice_line', { where: { invoice_id: invoices[0]?.id ?? '' } });
        const credited = plan.discount.wholeInvoice
          ? lines.filter((line) => line.kind === 'fee')
          : lines.filter((line) => tuition && line.fee_item_id === tuition.id);
        const amounts = credited.map((line) => ({
          feeItemId: line.fee_item_id ?? null,
          amount: fromMinor(
            plan.discount?.wholeInvoice
              ? line.amount.amount_minor
              : Math.round((line.amount.amount_minor * (plan.discount?.percentOfTuition ?? 0)) / 100),
            ctx.currency
          ),
        }));
        const note: Money | null = amounts.length === 0 ? null : amounts.reduce<Money>((sum, line) => fromMinor(sum.amount_minor + line.amount.amount_minor, ctx.currency), fromMinor(0, ctx.currency));
        if (note && note.amount_minor > 0 && invoices[0]) {
          await adjustments.issueCreditNote({
            learnerId: entry.learnerId,
            invoiceId: asId<'invoice'>(invoices[0].id),
            amount: note,
            reason: plan.discount.reason,
            issueDate: addDays(billed.term.start_date, 2),
            lines: amounts,
            applyToInvoiceId: asId<'invoice'>(invoices[0].id),
          });
          ctx.count('credit_note');
          discountMinor = note.amount_minor;
        }
      }

      // A uniform or a library fine the family has not settled stays out of what they pay, so it is
      // what is left owing: the billing run puts one-off charges on the term's invoice, not beside it.
      let pendingMinor = 0;
      if (entry.cast.uniform === 'pending' || entry.cast.libraryFine === 'pending') {
        for (const invoice of invoices) {
          for (const line of await listAll(repository, 'invoice_line', { where: { invoice_id: invoice.id } })) {
            const unsettled =
              (entry.cast.uniform === 'pending' && line.description.startsWith('Uniform')) ||
              (entry.cast.libraryFine === 'pending' && line.description.startsWith('Library fine'));
            if (unsettled) pendingMinor += line.amount.amount_minor;
          }
        }
      }

      for (const spec of plan.pays) {
        await pay(entry, billed.term, spec, invoices, Math.max(total - discountMinor - pendingMinor, 0));
      }
    }
  }

  await settleAlumni(ctx, roster, payments, adjustments, actors);
}

/** What happens to the alumni's accounts once they have left: refunds, write-offs and clearances. */
async function settleAlumni(
  ctx: DemoContext,
  roster: DemoRoster,
  payments: PaymentsService,
  adjustments: AdjustmentsService,
  actors: DemoActors
): Promise<void> {
  ctx.at('settlements');
  const when = ctx.previous.year.end_date;
  const head = actors.headId ? { id: actors.headId, roles: ['head_teacher'] as const } : null;
  if (!head) return;

  for (const entry of roster.learners) {
    const { standing } = entry.cast;
    if (!standing.startsWith('alumni_')) continue;
    const learnerId = entry.learnerId;
    const balance = await payments.outstandingBalance(learnerId, ctx.currency);

    if (standing === 'alumni_refund_paid' || standing === 'alumni_refund_pending') {
      const credit = fromMinor(standing === 'alumni_refund_paid' ? 600_000 : 450_000, ctx.currency);
      const requested = await adjustments.requestRefund({
        learnerId,
        amount: credit,
        reason: 'Refund of fees paid in excess when the learner left',
        channel: 'bank_deposit',
        requestedAt: `${addDays(when, 14)}T09:00:00.000Z`,
      });
      ctx.count('refund');
      if (standing === 'alumni_refund_paid') {
        await adjustments.approveRefund({
          refundId: requested.refund.id,
          actor: head,
          reason: 'Overpayment confirmed against the learner statement',
          paidAt: `${addDays(when, 21)}T10:00:00.000Z`,
        });
      }
    }

    if (standing === 'alumni_writeoff_pending' || standing === 'alumni_writeoff_approved') {
      if (balance.amount_minor > 0) {
        const request = await adjustments.requestWriteOff({
          learnerId,
          amount: balance,
          reason: 'The family has relocated and the balance cannot be collected',
          issueDate: addDays(when, 30),
        });
        ctx.count('write_off');
        if (standing === 'alumni_writeoff_approved') {
          await adjustments.approveWriteOff({
            writeOffId: request.writeOff.id,
            actor: head,
            reason: 'Approved after two reminders went unanswered',
            decidedAt: addDays(when, 40),
          });
        }
      }
    }

    if (standing === 'alumni_cleared' || standing === 'alumni_owing') {
      const clearance = await adjustments.requestClearance({
        learnerId,
        reason: 'The learner left the school after the final year',
        libraryBooksOut: 0,
        propertyItemsOut: 0,
        requestedAt: addDays(when, 7),
      });
      ctx.count('clearance');
      // Clearing a learner is a finance decision: the bursar makes it, the head teacher approves money.
      await adjustments.decideClearance({
        clearanceId: clearance.id,
        actor: { id: actors.bursarId ?? head.id, roles: ['bursar'] },
        decision: standing === 'alumni_cleared' ? 'clear' : 'refuse',
        ...(standing === 'alumni_owing' ? { reason: 'A fee balance is outstanding' } : {}),
        decidedAt: addDays(when, 10),
      });
    }
  }
}
