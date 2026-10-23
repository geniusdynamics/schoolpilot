// ABOUTME: The billing-run service v2: preview a run with its reasons and skips, then post it in one
// ABOUTME: transaction — the invoices, their lines, the journal entries, the sequence numbers and the
// ABOUTME: run's own identity in the audit trail — so a re-run of the same run bills nothing twice.

import { add, zero } from '@/domain/money';

import { BillingError } from './errors';
import { loadRunFacts, MAX_PAGE_SIZE } from './facts';
import { planRun, previewLineOf, type RunPlan } from './plan';
import type { RunFacts } from './facts';
import { ensureRunSchema, readPostedRun, writePostedRun, writeRunPlan } from './write';
import type {
  BillingRunOutcome,
  BillingRunPreview,
  BillingRunRequest,
  BillingRunServiceOptions,
  BillingRunStore,
  PostedBillingRun,
} from './types';

/**
 * Bills a period from the fee-schedule versions in force.
 *
 * The service composes the frozen primitives rather than re-deriving anything: the schedule matrix
 * resolves the cell and prices it, the money module multiplies and rounds, the sequences module
 * issues the invoice numbers, and the ledger posts the entries. It owns exactly one thing of its
 * own: the run — what a learner is billed, why, and whether this run has already been posted.
 *
 * `preview` reads and writes nothing. `post` does everything in **one transaction**, so a failure
 * part-way through leaves no invoice, no line, no journal entry and no run record.
 */
export class BillingRunService {
  private readonly store: BillingRunStore;
  private readonly clock: () => Date;
  private readonly actor: string | undefined;
  private readonly pageSize: number;

  constructor(options: BillingRunServiceOptions) {
    this.store = options.store;
    this.clock = options.now ?? (() => new Date());
    this.actor = options.actor;
    this.pageSize = Math.max(1, Math.min(options.pageSize ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE));
  }

  /** Computes what the run would bill and why. Nothing is written. */
  async preview(request: BillingRunRequest): Promise<BillingRunPreview> {
    const facts = await this.readFacts(request);
    return this.previewOf(planRun(facts, request), facts);
  }

  /**
   * Posts the run.
   *
   * A run whose identity was already posted is replayed: the recorded result comes back and nothing
   * is written, so running the same run twice cannot double-bill. A run that adds missing items to a
   * learner who is already billed puts them on a supplementary invoice, because a posted invoice is
   * immutable — its total may not change and its lines may not grow.
   */
  async post(request: BillingRunRequest): Promise<BillingRunOutcome> {
    const store = this.store;
    if (!store.transaction) {
      throw new BillingError(
        'no_transaction',
        'A billing run posts in one transaction, and this store offers none.'
      );
    }

    return store.transaction(async (tx) => {
      // The ledger, the sequences and the audit trail keep their own tables, so the run makes sure
      // they exist before it posts. Every statement is IF NOT EXISTS.
      await ensureRunSchema(tx);

      const facts = await this.readFacts(request);
      const plan = planRun(facts, request);
      const preview = this.previewOf(plan, facts);

      const recorded = await readPostedRun(tx, plan.key);
      if (recorded) {
        return {
          key: plan.key,
          replayed: true,
          posted: false,
          original: recorded,
          invoicesCreated: 0,
          supplementaryInvoices: 0,
          ledgerEntries: 0,
          amount: zero(facts.currency),
          // A replay wrote nothing, so it names no invoice.
          invoices: [],
          preview,
        };
      }

      const written = await writeRunPlan(plan, {
        store,
        tx,
        facts,
        issueDate: facts.issueDate,
        dueDate: facts.dueDate,
        ...(request.actor ?? this.actor ? { actor: request.actor ?? this.actor } : {}),
        now: this.clock,
      });

      const record: PostedBillingRun = {
        key: plan.key,
        runId: written.runId,
        periodId: facts.period.id,
        schedulePins: plan.schedulePins,
        learnersBilled: plan.lines.length,
        invoicesCreated: written.invoicesCreated,
        supplementaryInvoices: written.supplementaryInvoices,
        ledgerEntries: written.ledgerEntries,
        amount: written.amount,
        postedAt: this.clock().toISOString(),
        postedBy: request.actor ?? this.actor ?? null,
      };
      await writePostedRun(tx, record);

      return {
        key: plan.key,
        replayed: false,
        posted: true,
        original: record,
        invoicesCreated: written.invoicesCreated,
        supplementaryInvoices: written.supplementaryInvoices,
        ledgerEntries: written.ledgerEntries,
        amount: written.amount,
        invoices: written.invoices,
        preview,
      };
    });
  }

  private readFacts(request: BillingRunRequest): Promise<RunFacts> {
    return loadRunFacts(this.store, request, { now: this.clock, pageSize: this.pageSize });
  }

  private previewOf(plan: RunPlan, facts: RunFacts): BillingRunPreview {
    const lines = plan.lines.map(previewLineOf);
    let amount = zero(facts.currency);
    for (const line of lines) amount = add(amount, line.amount);
    return {
      key: plan.key,
      periodId: facts.period.id,
      periodName: facts.period.name,
      institutionId: facts.institutionId,
      currency: facts.currency,
      issueDate: facts.issueDate,
      dueDate: facts.dueDate,
      schedulePins: plan.schedulePins,
      lines,
      skips: plan.skips,
      totals: {
        learnersInScope: plan.learnersInScope,
        learnersBilled: lines.length,
        learnersSkipped: plan.skips.length,
        newInvoices: lines.filter((line) => line.isNewInvoice).length,
        supplementaryInvoices: lines.filter((line) => line.supplementary).length,
        amount,
      },
      notices: plan.notices,
    };
  }
}
