// ABOUTME: The statement service: it reads the ledger's entries and the canonical documents behind
// ABOUTME: them, scopes the entries to a learner, a household or a sponsor, and builds the running
// ABOUTME: statement - so the closing balance is the ledger's balance and not a second arithmetic.

import type { RepositoryRow } from '@/data/repository';
import type { Id } from '@/domain/ids';
import type { JournalEntry } from '@/domain/finance/ledger';
import type { CurrencyCode } from '@/domain/money';

import { outstandingItemsFromInvoices, type OutstandingInvoiceInput } from './aging';
import { clearanceStatus } from './clearance';
import { StatementError } from './errors';
import { statementAccounts } from './movements';
import { buildStatement } from './statement';
import type {
  AgingItem,
  ClearanceRule,
  ClearanceStatus,
  HouseholdSplit,
  LedgerReader,
  SponsorSubject,
  Statement,
  StatementAccount,
  StatementPeriod,
  StatementStore,
} from './types';

/** The longest page the service reads; the repository caps a page at 500 rows. */
const PAGE_LIMIT = 500;

/** What the service is built with. */
export interface StatementServiceOptions {
  /** The ledger the movements come from. `LedgerService` satisfies it. */
  readonly ledger: LedgerReader;
  /** The canonical rows the subjects are resolved from. The repository satisfies it. */
  readonly store: StatementStore;
  readonly institutionId: Id<'institution'>;
  /** The currency every statement is counted in. */
  readonly currency: CurrencyCode;
  /** The accounts the balance is summed over. Defaults to receivables, credit and refunds payable. */
  readonly accounts?: readonly StatementAccount[];
  /** The clock the aging's as-of day falls back to. Defaults to the system clock. */
  readonly now?: () => Date;
}

/** The documents one subject's statement is scoped to, and what is left outstanding on them. */
interface SubjectScope {
  /** `kind:id` keys of the ledger documents that belong to the subject. */
  readonly documentKeys: ReadonlySet<string>;
  readonly agingItems: readonly AgingItem[];
}

/** The scope key of a source document, as the ledger's entries name it. */
function documentKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}

/**
 * The statement service.
 *
 * It composes the frozen primitives rather than re-deriving anything: the movements are the
 * ledger's entries read through {@link LedgerReader}, the balance is the ledger's weighted account
 * balance, the aging is the canonical invoices' due dates, and the household split is the discounts
 * module's. What it owns is the scoping - which documents belong to a learner, a household or a
 * sponsor - and the assembly.
 */
export class StatementService {
  private readonly ledger: LedgerReader;
  private readonly store: StatementStore;
  private readonly institutionId: Id<'institution'>;
  private readonly currency: CurrencyCode;
  private readonly accounts: readonly StatementAccount[];
  private readonly clock: () => Date;

  constructor(options: StatementServiceOptions) {
    this.ledger = options.ledger;
    this.store = options.store;
    this.institutionId = options.institutionId;
    this.currency = options.currency;
    this.accounts = statementAccounts(options.accounts);
    this.clock = options.now ?? (() => new Date());
  }

  /** The day a statement with an open end is taken as of. */
  asOfDay(period: StatementPeriod = {}): string {
    return period.to ?? this.clock().toISOString().slice(0, 10);
  }

  /** A learner's statement: their receivables, with their clearance. */
  async learnerStatement(
    learnerId: Id<'learner'>,
    period: StatementPeriod = {},
    options: { readonly clearance?: ClearanceRule } = {}
  ): Promise<Statement> {
    const learner = await this.store.get('learner', learnerId);
    if (!learner) {
      throw new StatementError('not_found', `the learner ${learnerId} does not exist`, {
        detail: { learnerId },
      });
    }
    const scope = await this.scopeOf([learnerId], null);
    return this.assemble({
      kind: 'learner',
      subjectId: learnerId,
      subjectName: learnerName(learner),
      scope,
      period,
      clearance: options.clearance ?? {},
    });
  }

  /**
   * A household's statement: one running account across its children, with the family-versus-
   * sponsor split shown beside it.
   *
   * The split is the caller's, read from the discounts module's bill plans; the running balance is
   * the ledger's, over every document of the household's learners.
   */
  async householdStatement(
    householdId: Id<'household'>,
    period: StatementPeriod = {},
    options: { readonly split?: HouseholdSplit } = {}
  ): Promise<Statement> {
    const household = await this.store.get('household', householdId);
    if (!household) {
      throw new StatementError('not_found', `the household ${householdId} does not exist`, {
        detail: { householdId },
      });
    }
    const learners = await this.learnersOfHousehold(householdId);
    const scope = await this.scopeOf(
      learners.map((learner) => learner.id),
      householdId
    );
    return this.assemble({
      kind: 'household',
      subjectId: householdId,
      subjectName: household.name ?? householdId,
      scope,
      period,
      ...(options.split === undefined ? {} : { split: options.split }),
    });
  }

  /**
   * A sponsor's statement: what the sponsor owes and has paid.
   *
   * The sponsor's documents are the caller's, because the platform models no sponsor invoice or
   * sponsor receipt entity yet: the split billing of P3-B04 issues a sponsor invoice beside the
   * learner's, and the caller names those documents (and the receipts allocated against them) here.
   * The statement itself is the same running account every other kind is.
   */
  async sponsorStatement(subject: SponsorSubject, period: StatementPeriod = {}): Promise<Statement> {
    if (subject.documents.length === 0) {
      throw new StatementError(
        'no_documents',
        `the sponsor ${subject.id} names no document, so there is no statement to build`,
        { detail: { sponsorId: subject.id } }
      );
    }
    const scope: SubjectScope = {
      documentKeys: new Set(subject.documents.map((document) => documentKey(document.kind, document.id))),
      agingItems: [],
    };
    return this.assemble({
      kind: 'sponsor',
      subjectId: subject.id,
      subjectName: subject.name,
      scope,
      period,
    });
  }

  /**
   * A learner's clearance: the statement-side view of the exit-clearance question.
   *
   * The P3-C02 clearance document reads this rather than recomputing a balance, so the certificate
   * and the statement cannot disagree.
   */
  async clearanceOf(
    learnerId: Id<'learner'>,
    rule: ClearanceRule = {},
    period: StatementPeriod = {}
  ): Promise<ClearanceStatus> {
    const statement = await this.learnerStatement(learnerId, period, { clearance: rule });
    return statement.clearance ?? clearanceStatus(statement.closingBalance, this.currency, rule);
  }

  /** The learners of a household, from the canonical `learner.household_id`. */
  private async learnersOfHousehold(
    householdId: Id<'household'>
  ): Promise<readonly RepositoryRow<'learner'>[]> {
    const page = await this.store.list('learner', {
      where: { institution_id: this.institutionId, household_id: householdId },
      limit: PAGE_LIMIT,
    });
    return page.items;
  }

  /** Builds the statement from the scope and the ledger's entries for it. */
  private async assemble(input: {
    readonly kind: Statement['kind'];
    readonly subjectId: string;
    readonly subjectName: string;
    readonly scope: SubjectScope;
    readonly period: StatementPeriod;
    readonly clearance?: ClearanceRule;
    readonly split?: HouseholdSplit;
  }): Promise<Statement> {
    const asOf = this.asOfDay(input.period);
    const entries = await this.entriesFor(input.scope.documentKeys, input.period.to ?? null);
    return buildStatement({
      kind: input.kind,
      subjectId: input.subjectId,
      subjectName: input.subjectName,
      currency: this.currency,
      entries,
      period: input.period,
      asOf,
      agingItems: input.scope.agingItems,
      accounts: this.accounts,
      ...(input.clearance === undefined ? {} : { clearance: input.clearance }),
      ...(input.split === undefined ? {} : { split: input.split }),
    });
  }

  /** The ledger entries of a document set, as of a day. */
  private async entriesFor(
    documentKeys: ReadonlySet<string>,
    asOf: string | null
  ): Promise<readonly JournalEntry[]> {
    if (documentKeys.size === 0) return [];
    const entries = await this.ledger.listEntries({
      institutionId: this.institutionId,
      ...(asOf === null ? {} : { asOf }),
    });
    return entries.filter((entry) => documentKeys.has(documentKey(entry.source.kind, entry.source.id)));
  }

  /**
   * Resolves the documents a set of learners (and optionally a household) own, and what is left
   * outstanding on them.
   *
   * A payment belongs to a learner when it names them or when one of its allocations clears one of
   * their invoices; a credit note belongs to a learner when it names them or the invoice it credits
   * is theirs. That is what makes a household payment (one payment across siblings) reach each
   * child's statement.
   */
  private async scopeOf(
    learnerIds: readonly string[],
    householdId: Id<'household'> | null
  ): Promise<SubjectScope> {
    const documentKeys = new Set<string>();
    const invoiceById = new Map<string, RepositoryRow<'invoice'>>();

    const invoices = await this.invoicesFor(learnerIds, householdId);
    for (const invoice of invoices) {
      invoiceById.set(invoice.id, invoice);
      documentKeys.add(documentKey('invoice', invoice.id));
    }

    const allocatedMinorByInvoice = new Map<string, number>();
    const creditedMinorByInvoice = new Map<string, number>();
    const paymentIds = new Set<string>();

    // Allocations: the payment of each allocation belongs to the learner whose invoice it clears.
    for (const invoice of invoices) {
      const page = await this.store.list('payment_allocation', {
        where: { institution_id: this.institutionId, invoice_id: invoice.id },
        limit: PAGE_LIMIT,
      });
      for (const allocation of page.items) {
        allocatedMinorByInvoice.set(
          invoice.id,
          (allocatedMinorByInvoice.get(invoice.id) ?? 0) + allocation.amount.amount_minor
        );
        paymentIds.add(allocation.payment_id);
      }
    }

    // Credit notes: those that name a learner, and those that credit one of their invoices. A note
    // found by both queries is counted once, so its amount is not subtracted from the invoice twice.
    const creditNotes = new Map<string, RepositoryRow<'credit_note'>>();
    for (const learnerId of learnerIds) {
      const page = await this.store.list('credit_note', {
        where: { institution_id: this.institutionId, learner_id: learnerId },
        limit: PAGE_LIMIT,
      });
      for (const note of page.items) creditNotes.set(note.id, note);
    }
    for (const invoice of invoices) {
      const page = await this.store.list('credit_note', {
        where: { institution_id: this.institutionId, invoice_id: invoice.id },
        limit: PAGE_LIMIT,
      });
      for (const note of page.items) creditNotes.set(note.id, note);
    }
    for (const note of creditNotes.values()) {
      if (note.status !== 'posted') continue;
      documentKeys.add(documentKey('credit_note', note.id));
      if (note.invoice_id) {
        creditedMinorByInvoice.set(
          note.invoice_id,
          (creditedMinorByInvoice.get(note.invoice_id) ?? 0) + note.amount.amount_minor
        );
      }
    }

    // Payments: those that name a learner, those of the household, and those whose allocations
    // clear one of the invoices in scope.
    for (const learnerId of learnerIds) {
      const page = await this.store.list('payment', {
        where: { institution_id: this.institutionId, learner_id: learnerId },
        limit: PAGE_LIMIT,
      });
      for (const payment of page.items) documentKeys.add(documentKey('payment', payment.id));
    }
    if (householdId !== null) {
      const page = await this.store.list('payment', {
        where: { institution_id: this.institutionId, household_id: householdId },
        limit: PAGE_LIMIT,
      });
      for (const payment of page.items) documentKeys.add(documentKey('payment', payment.id));
    }
    for (const paymentId of paymentIds) documentKeys.add(documentKey('payment', paymentId));

    // Refunds: those that name a learner.
    for (const learnerId of learnerIds) {
      const page = await this.store.list('refund', {
        where: { institution_id: this.institutionId, learner_id: learnerId },
        limit: PAGE_LIMIT,
      });
      for (const refund of page.items) documentKeys.add(documentKey('refund', refund.id));
    }

    const agingItems = outstandingItemsFromInvoices({
      invoices: [...invoiceById.values()].map((invoice) => toOutstandingInvoice(invoice, this.currency)),
      allocatedMinorByInvoice,
      creditedMinorByInvoice,
    });

    return { documentKeys, agingItems };
  }

  /** The invoices of a set of learners, and of a household by its own column. */
  private async invoicesFor(
    learnerIds: readonly string[],
    householdId: Id<'household'> | null
  ): Promise<readonly RepositoryRow<'invoice'>[]> {
    const byId = new Map<string, RepositoryRow<'invoice'>>();
    for (const learnerId of learnerIds) {
      const page = await this.store.list('invoice', {
        where: { institution_id: this.institutionId, learner_id: learnerId },
        limit: PAGE_LIMIT,
      });
      for (const invoice of page.items) byId.set(invoice.id, invoice);
    }
    if (householdId !== null) {
      const page = await this.store.list('invoice', {
        where: { institution_id: this.institutionId, household_id: householdId },
        limit: PAGE_LIMIT,
      });
      for (const invoice of page.items) byId.set(invoice.id, invoice);
    }
    return [...byId.values()];
  }
}

/** The display name of a learner, as the statements spell it. */
export function learnerName(learner: RepositoryRow<'learner'>): string {
  const given = learner.preferred_name ?? learner.given_name;
  return `${given} ${learner.family_name}`.trim();
}

/**
 * One canonical invoice as the aging reads it.
 *
 * The canonical money carries a plain ISO-4217 string, so the statement's own currency is used:
 * the finance documents are written in one currency (spec 05 §1) until the currency table lands.
 */
function toOutstandingInvoice(
  invoice: RepositoryRow<'invoice'>,
  currency: CurrencyCode
): OutstandingInvoiceInput {
  return {
    id: invoice.id,
    number: invoice.number,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date ?? null,
    totalMinor: invoice.total.amount_minor,
    currency,
    status: invoice.status,
  };
}
