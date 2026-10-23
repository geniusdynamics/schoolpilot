// ABOUTME: The adjustments service: it issues a credit note through the ledger's own credit-note
// ABOUTME: derivation and applies it through the allocation engine; runs a refund through the
// ABOUTME: maker-checker approval and posts the payout; writes off an uncollectable balance with a
// ABOUTME: second pair of eyes above a threshold and recovers it as a new posting; clears a learner
// ABOUTME: on exit; and explains a learner's balance as the documents that sum to it.

import type { SqliteTransaction } from '@/data/adapters/sqlite';
import { SqliteAdapterError } from '@/data/adapters/sqlite';
import type { RepositoryRow, UpdateInput } from '@/data/repository';
import { RepositoryStorageError } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import {
  add,
  compare,
  fromMinor,
  subtract,
  zero,
  type CurrencyCode,
  type Money,
} from '@/domain/money';
import {
  CONTROL_ACCOUNTS,
  LedgerService,
  createJournalEntry,
  createSqliteLedgerStore,
  isIsoDay,
  type JournalEntry,
} from '@/domain/finance/ledger';
import { planAllocation, type OutstandingItem } from '@/domain/finance/allocation';
import type { PaymentChannel } from '@/domain/finance/payments';
import { SequenceService, createSqliteSequenceStore } from '@/domain/sequences';
import {
  availableMoves,
  resolveMove,
  type WorkflowActor,
  type WorkflowAvailableMove,
  type WorkflowDefinition,
} from '@/domain/workflows';

import { buildBalanceExplanation, creditEffect, invoiceEffect, ledgerBalanceFor, recoveryEffect } from './balance';
import {
  CLEARANCE_WORKFLOW_KEY,
  REFUND_APPROVAL_WORKFLOW_KEY,
  WRITE_OFF_APPROVAL_WORKFLOW_KEY,
  assertMakerIsNotDecider,
  clearanceDefinition,
  refundApprovalDefinition,
  writeOffApprovalDefinition,
} from './definitions';
import { AdjustmentError } from './errors';
import {
  CLEARANCE_AUDIT_ENTITY,
  CREDIT_NOTE_APPLICATION_AUDIT_ENTITY,
  RECOVERY_ACCOUNT,
  REFUND_REQUEST_AUDIT_ENTITY,
  WRITE_OFF_ACCOUNT,
  WRITE_OFF_AUDIT_ENTITY,
  WRITE_OFF_RECOVERY_AUDIT_ENTITY,
  appendDocument,
  buildChart,
  ensureAdjustmentSchema,
  newDocumentId,
  nextCommitSequence,
  readDocument,
  readLatestDocuments,
  revenueAccountsOf,
  transactionAdapter,
} from './support';
import type {
  AdjustmentStore,
  AdjustmentsServiceOptions,
  BalanceDocument,
  BalanceExplanation,
  ClearanceAssessment,
  ClearanceDecision,
  ClearanceDocument,
  ClearanceFacts,
  ClearanceRequest,
  CreditNoteApplication,
  CreditNoteApplicationLine,
  CreditNoteOutcome,
  CreditNoteRequest,
  RefundDecision,
  RefundOutcome,
  RefundRejection,
  RefundRequest,
  WriteOffDecision,
  WriteOffDocument,
  WriteOffOutcome,
  WriteOffRecovery,
  WriteOffRecoveryRequest,
  WriteOffRejection,
  WriteOffRequest,
} from './types';

/** What a refund request records beyond the canonical row: the payout channel. */
interface RefundRequestDetail {
  readonly refundId: string;
  readonly channel: PaymentChannel;
  readonly learnerId: string | null;
  readonly amount: Money;
  readonly requestedAt: string;
}

/** What a caller may ask of a balance explanation. */
export interface BalanceExplanationQuery {
  /** Only documents and entries on or before this ISO day. */
  readonly asOf?: string;
}

/**
 * Credit notes, refunds, write-offs and exit clearance over the canonical finance documents.
 *
 * Every write composes the frozen primitives: the ledger derives and posts the credit note, the
 * sequences module issues the numbers, the allocation engine places a credit against an invoice, and
 * the workflow engine's guard decides the maker-checker moves. The module owns exactly the documents
 * the registry does not model — a write-off, its recovery, a clearance and a credit-note application
 * — which it keeps in the repository's own audit trail.
 */
export class AdjustmentsService {
  private readonly store: AdjustmentStore;
  private readonly clock: () => Date;
  private readonly actor: string | undefined;
  private readonly thresholdMinor: number;
  private readonly approverRoles: AdjustmentsServiceOptions['approverRoles'];

  constructor(options: AdjustmentsServiceOptions) {
    this.store = options.store;
    this.clock = options.now ?? (() => new Date());
    this.actor = options.actor;
    this.thresholdMinor = options.writeOffApprovalThresholdMinor ?? 0;
    this.approverRoles = options.approverRoles;
  }

  // ------------------------------------------------------------------ credit notes

  /**
   * Issues a posted credit note: it reduces what the learner owes, posts through the ledger's own
   * credit-note derivation and takes its number from the sequences module. It is then either applied
   * to one outstanding invoice through the allocation engine, or left as a credit balance.
   */
  async issueCreditNote(input: CreditNoteRequest): Promise<CreditNoteOutcome> {
    this.assertPositive(input.amount, 'a credit note');
    const reason = this.requireText(input.reason, 'a credit note needs a reason');
    if (!isIsoDay(input.issueDate)) {
      throw new AdjustmentError('invalid_request', `a credit note is dated by an ISO day, not "${input.issueDate}"`);
    }

    return this.unit(async (tx) => {
      const learner = await this.requireLearner(input.learnerId);
      const institutionId = learner.institution_id;
      const sequences = this.sequencesFor(tx);
      const number = (
        await sequences.issue(
          'credit_note',
          { institution: institutionId, year: yearOf(input.issueDate) },
          { policy: 'reuse' }
        )
      ).number;

      const creditNote = await this.store.create(
        'credit_note',
        {
          institution_id: institutionId,
          number,
          learner_id: learner.id,
          ...(input.invoiceId ? { invoice_id: input.invoiceId } : {}),
          amount: input.amount,
          reason,
          issue_date: input.issueDate,
          status: 'posted',
        },
        this.writeOptions(`credit note: ${reason}`)
      );

      const ledger = await this.ledgerFor(tx);
      const entry = await ledger.postCreditNote({
        creditNote: {
          id: creditNote.id,
          number,
          institutionId,
          amount: input.amount,
          issueDate: input.issueDate,
          reason,
          ...(input.lines && input.lines.length > 0
            ? {
                lines: input.lines.map((line) => ({
                  feeItemId: line.feeItemId ?? null,
                  amount: line.amount,
                })),
              }
            : {}),
        },
        ...this.postedBy(),
      });

      let application: CreditNoteApplication | null = null;
      let remainingCredit = input.amount;
      if (input.applyToInvoiceId) {
        application = await this.applyCreditNote(tx, {
          creditNoteId: creditNote.id,
          learnerId: learner.id,
          amount: input.amount,
          invoiceId: input.applyToInvoiceId,
        });
        remainingCredit = subtract(input.amount, application.amount);
      }

      return {
        creditNote,
        number,
        ledgerEntryId: entry.id,
        application,
        remainingCredit,
      };
    });
  }

  /** The credit-note applications a learner holds, newest last. */
  async creditNoteApplicationsOf(learnerId: string): Promise<readonly CreditNoteApplication[]> {
    return this.unit(async (tx) => {
      const applications = await readLatestDocuments<CreditNoteApplication>(
        tx,
        CREDIT_NOTE_APPLICATION_AUDIT_ENTITY
      );
      return [...applications.values()]
        .filter((application) => application.learnerId === learnerId)
        .sort((left, right) => left.appliedAt.localeCompare(right.appliedAt));
    });
  }

  // ---------------------------------------------------------------------- refunds

  /** Records a refund request. Nothing is posted: money going out waits for a second pair of eyes. */
  async requestRefund(input: RefundRequest): Promise<RefundOutcome> {
    this.assertPositive(input.amount, 'a refund');
    const reason = this.requireText(input.reason, 'a refund needs a reason');
    const channel = this.requireChannel(input.channel);

    return this.unit(async (tx) => {
      const institutionId = await this.institutionOf(input.learnerId, input.paymentId);
      const requestedAt = this.isoDateTime(input.requestedAt);
      const sequences = this.sequencesFor(tx);
      const number = (
        await sequences.issue(
          'payment_voucher',
          { institution: institutionId, year: yearOf(requestedAt) },
          { policy: 'reuse' }
        )
      ).number;

      const refund = await this.store.create(
        'refund',
        {
          institution_id: institutionId,
          number,
          ...(input.learnerId ? { learner_id: input.learnerId } : {}),
          ...(input.paymentId ? { payment_id: input.paymentId } : {}),
          amount: input.amount,
          reason,
          requested_at: requestedAt,
          status: 'requested',
        },
        this.writeOptions(`refund requested: ${reason}`)
      );

      const detail: RefundRequestDetail = {
        refundId: refund.id,
        channel,
        learnerId: input.learnerId ?? null,
        amount: input.amount,
        requestedAt,
      };
      await appendDocument(tx, {
        entity: REFUND_REQUEST_AUDIT_ENTITY,
        id: refund.id,
        payload: detail,
        actorId: this.actorOf(input.actor),
        reason,
        createdAt: requestedAt,
        commitSequence: await nextCommitSequence(tx),
      });

      return { refund, number, channel, ledgerEntryId: null, awaitingApproval: true };
    });
  }

  /**
   * A checker approves a refund: it moves through the engine's guard to `approved` and `paid` and the
   * payout posts through the ledger, the channel deciding where the money leaves. A maker may not
   * approve their own request.
   */
  async approveRefund(input: RefundDecision): Promise<RefundOutcome> {
    return this.unit(async (tx) => {
      const refund = await this.requireRefund(input.refundId);
      if (refund.status !== 'requested') {
        throw new AdjustmentError(
          'wrong_state',
          `refund ${refund.number} is ${refund.status}; only a requested refund is approved.`,
          { refundId: refund.id, status: refund.status }
        );
      }
      assertMakerIsNotDecider(refund.created_by ?? null, input.actor.id, `refund ${refund.number}`);

      const detail = await readDocument<RefundRequestDetail>(tx, REFUND_REQUEST_AUDIT_ENTITY, refund.id);
      const channel = input.channel ? this.requireChannel(input.channel) : detail?.channel ?? 'bank_deposit';
      const definition = this.refundDefinition();

      const approved = await this.moveRefund(
        definition,
        refund,
        'approved',
        input.actor,
        input.reason ?? null,
        { approved_by: input.actor.id }
      );
      const paidAt = this.isoDateTime(input.paidAt);
      const paid = await this.moveRefund(definition, approved, 'paid', input.actor, 'refund paid', {
        paid_at: paidAt,
      });

      const ledger = await this.ledgerFor(tx);
      const entry = await ledger.postRefund({
        refund: {
          id: paid.id,
          number: paid.number,
          institutionId: paid.institution_id,
          amount: toMoney(paid.amount),
          status: 'paid',
          channel,
          paidAt,
          reason: paid.reason,
        },
        ...this.postedBy(input.actor.id),
      });

      return { refund: paid, number: paid.number, channel, ledgerEntryId: entry.id, awaitingApproval: false };
    });
  }

  /**
   * A checker rejects a refund, with a reason. Nothing is posted; the request is recorded as
   * `rejected`, which is what a rejected refund leaves behind.
   */
  async rejectRefund(input: RefundRejection): Promise<RefundOutcome> {
    return this.unit(async (tx) => {
      const refund = await this.requireRefund(input.refundId);
      if (refund.status !== 'requested') {
        throw new AdjustmentError(
          'wrong_state',
          `refund ${refund.number} is ${refund.status}; only a requested refund is rejected.`,
          { refundId: refund.id, status: refund.status }
        );
      }
      assertMakerIsNotDecider(refund.created_by ?? null, input.actor.id, `refund ${refund.number}`);

      const rejected = await this.moveRefund(
        this.refundDefinition(),
        refund,
        'rejected',
        input.actor,
        input.reason,
        {}
      );
      const detail = await readDocument<RefundRequestDetail>(tx, REFUND_REQUEST_AUDIT_ENTITY, refund.id);
      return {
        refund: rejected,
        number: rejected.number,
        channel: detail?.channel ?? 'bank_deposit',
        ledgerEntryId: null,
        awaitingApproval: false,
      };
    });
  }

  /** The moves this actor may make on a refund; the maker is not offered the decision they may not make. */
  async availableRefundMoves(
    refundId: Id<'refund'>,
    actor: WorkflowActor
  ): Promise<readonly WorkflowAvailableMove[]> {
    return this.unit(async () => {
      const refund = await this.requireRefund(refundId);
      const moves = availableMoves(this.refundDefinition(), { from: refund.status, actor });
      if (refund.created_by !== null && refund.created_by === actor.id) {
        return moves.filter(
          (move) => move.transition.key !== 'approve' && move.transition.key !== 'reject'
        );
      }
      return moves;
    });
  }

  // -------------------------------------------------------------------- write-offs

  /**
   * Writes off an uncollectable balance. Above the configured threshold a second pair of eyes must
   * approve it first; at or below it the write-off posts directly. The debt is never deleted: the
   * document stays and the balance stays explainable as the write-off that removed it.
   */
  async requestWriteOff(input: WriteOffRequest): Promise<WriteOffOutcome> {
    this.assertPositive(input.amount, 'a write-off');
    const reason = this.requireText(input.reason, 'a write-off needs a reason');
    const issueDate = input.issueDate ?? this.today();
    if (!isIsoDay(issueDate)) {
      throw new AdjustmentError('invalid_request', `a write-off is dated by an ISO day, not "${issueDate}"`);
    }

    return this.unit(async (tx) => {
      const learner = await this.requireLearner(input.learnerId);
      const institutionId = learner.institution_id;
      const sequences = this.sequencesFor(tx);
      const number = (
        await sequences.issue(
          'credit_note',
          { institution: institutionId, year: yearOf(issueDate) },
          { policy: 'reuse' }
        )
      ).number;

      const id = newDocumentId();
      const requestedAt = this.isoDateTime(undefined);
      const needsApproval = input.amount.amount_minor > this.thresholdMinor;
      const base: WriteOffDocument = {
        id,
        number,
        institutionId,
        learnerId: learner.id,
        amount: input.amount,
        reason,
        issueDate,
        state: needsApproval ? 'requested' : 'approved',
        requestedBy: this.actorOf(input.actor),
        requestedAt,
        decidedBy: needsApproval ? null : this.actorOf(input.actor),
        decidedAt: needsApproval ? null : requestedAt,
        decisionReason: needsApproval ? null : 'below the approval threshold',
        ledgerEntryId: null,
      };

      let document = base;
      if (!needsApproval) {
        const ledgerEntryId = await this.postWriteOff(tx, base);
        document = { ...base, ledgerEntryId };
      }

      await appendDocument(tx, {
        entity: WRITE_OFF_AUDIT_ENTITY,
        id,
        payload: document,
        actorId: document.requestedBy,
        reason,
        createdAt: requestedAt,
        commitSequence: await nextCommitSequence(tx),
      });

      return { writeOff: document, awaitingApproval: needsApproval, ledgerEntryId: document.ledgerEntryId };
    });
  }

  /** A checker approves a write-off; the debt is removed from receivables and the loss recorded. */
  async approveWriteOff(input: WriteOffDecision): Promise<WriteOffOutcome> {
    return this.unit(async (tx) => {
      const document = await this.requireWriteOff(tx, input.writeOffId);
      if (document.state !== 'requested') {
        throw new AdjustmentError(
          'wrong_state',
          `write-off ${document.number} is ${document.state}; only a requested write-off is approved.`,
          { writeOffId: document.id, state: document.state }
        );
      }
      assertMakerIsNotDecider(document.requestedBy, input.actor.id, `write-off ${document.number}`);

      const decision = resolveMove(this.writeOffDefinition(), {
        recordKey: document.id,
        from: 'requested',
        to: 'approved',
        actor: input.actor,
        reason: input.reason ?? null,
      });
      if (!decision.allowed) {
        throw new AdjustmentError('approval_denied', decision.message, {
          code: decision.code,
          transition: decision.transition,
        });
      }

      const ledgerEntryId = await this.postWriteOff(tx, document);
      const decidedAt = this.isoDateTime(input.decidedAt);
      const next: WriteOffDocument = {
        ...document,
        state: 'approved',
        decidedBy: input.actor.id,
        decidedAt,
        decisionReason: input.reason ?? null,
        ledgerEntryId,
      };
      await appendDocument(tx, {
        entity: WRITE_OFF_AUDIT_ENTITY,
        id: document.id,
        payload: next,
        action: 'update',
        actorId: input.actor.id,
        reason: input.reason ?? 'write-off approved',
        createdAt: decidedAt,
        commitSequence: await nextCommitSequence(tx),
      });
      return { writeOff: next, awaitingApproval: false, ledgerEntryId };
    });
  }

  /** A checker rejects a write-off, with a reason. Nothing is posted. */
  async rejectWriteOff(input: WriteOffRejection): Promise<WriteOffOutcome> {
    return this.unit(async (tx) => {
      const document = await this.requireWriteOff(tx, input.writeOffId);
      if (document.state !== 'requested') {
        throw new AdjustmentError(
          'wrong_state',
          `write-off ${document.number} is ${document.state}; only a requested write-off is rejected.`,
          { writeOffId: document.id, state: document.state }
        );
      }
      assertMakerIsNotDecider(document.requestedBy, input.actor.id, `write-off ${document.number}`);

      const decision = resolveMove(this.writeOffDefinition(), {
        recordKey: document.id,
        from: 'requested',
        to: 'rejected',
        actor: input.actor,
        reason: input.reason,
      });
      if (!decision.allowed) {
        throw new AdjustmentError('approval_denied', decision.message, {
          code: decision.code,
          transition: decision.transition,
        });
      }

      const decidedAt = this.isoDateTime(input.decidedAt);
      const next: WriteOffDocument = {
        ...document,
        state: 'rejected',
        decidedBy: input.actor.id,
        decidedAt,
        decisionReason: input.reason,
      };
      await appendDocument(tx, {
        entity: WRITE_OFF_AUDIT_ENTITY,
        id: document.id,
        payload: next,
        action: 'update',
        actorId: input.actor.id,
        reason: input.reason,
        createdAt: decidedAt,
        commitSequence: await nextCommitSequence(tx),
      });
      return { writeOff: next, awaitingApproval: false, ledgerEntryId: null };
    });
  }

  /**
   * Recovers a written-off debt. This is a **new posting**, never a reversal of the write-off: it
   * debits the receivable again and credits bad debts recovered, so the debt is owed again and the
   * write-off stays in the history.
   */
  async recoverWriteOff(input: WriteOffRecoveryRequest): Promise<WriteOffRecovery> {
    const reason = this.requireText(input.reason, 'a recovery needs a reason');
    return this.unit(async (tx) => {
      const document = await this.requireWriteOff(tx, input.writeOffId);
      if (document.state !== 'approved') {
        throw new AdjustmentError(
          'wrong_state',
          `write-off ${document.number} is ${document.state}; only an approved write-off is recovered.`,
          { writeOffId: document.id, state: document.state }
        );
      }
      const amount = input.amount ?? document.amount;
      this.assertPositive(amount, 'a recovery');
      if (amount.amount_minor > document.amount.amount_minor) {
        throw new AdjustmentError(
          'invalid_request',
          `a recovery of ${amount.amount_minor} exceeds the write-off of ${document.amount.amount_minor}.`,
          { writeOffId: document.id }
        );
      }

      const recoveredAt = input.recoveredAt ?? this.today();
      if (!isIsoDay(recoveredAt)) {
        throw new AdjustmentError('invalid_request', `a recovery is dated by an ISO day, not "${recoveredAt}"`);
      }

      const ledger = await this.ledgerFor(tx);
      const id = newDocumentId();
      const entry = createJournalEntry(
        {
          institutionId: document.institutionId,
          entryDate: recoveredAt,
          source: { kind: 'payment', id, number: document.number },
          narration: `Write-off ${document.number} recovered: ${reason}`,
          lines: [
            {
              accountCode: CONTROL_ACCOUNTS.receivables.code,
              accountName: CONTROL_ACCOUNTS.receivables.name,
              debit: amount,
              memo: document.learnerId,
            },
            {
              accountCode: RECOVERY_ACCOUNT.code,
              accountName: RECOVERY_ACCOUNT.name,
              credit: amount,
            },
          ],
          ...this.postedBy(input.actor),
        },
        { now: this.clock }
      );
      const posted = await ledger.post(entry);

      const recovery: WriteOffRecovery = {
        id,
        writeOffId: document.id,
        institutionId: document.institutionId,
        learnerId: document.learnerId,
        amount,
        reason,
        recoveredAt,
        recoveredBy: this.actorOf(input.actor),
        ledgerEntryId: posted.id,
      };
      await appendDocument(tx, {
        entity: WRITE_OFF_RECOVERY_AUDIT_ENTITY,
        id,
        payload: recovery,
        actorId: recovery.recoveredBy,
        reason,
        createdAt: this.isoDateTime(undefined),
        commitSequence: await nextCommitSequence(tx),
      });
      return recovery;
    });
  }

  /** The write-offs of one learner, newest last. */
  async writeOffsOf(learnerId: string): Promise<readonly WriteOffDocument[]> {
    return this.unit(async (tx) => {
      const documents = await readLatestDocuments<WriteOffDocument>(tx, WRITE_OFF_AUDIT_ENTITY);
      return [...documents.values()]
        .filter((document) => document.learnerId === learnerId)
        .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt));
    });
  }

  // -------------------------------------------------------------------- clearance

  /**
   * Assesses a learner for exit clearance: the balance is settled or written off and nothing is
   * still out. The rule is a pure function so the statements view (P3-E01) can read the same one.
   */
  async assessClearance(
    learnerId: string,
    facts: { readonly libraryBooksOut?: number; readonly propertyItemsOut?: number } = {}
  ): Promise<ClearanceAssessment> {
    const explanation = await this.explainBalance(learnerId);
    const writtenOff = await this.writtenOffTotalOf(learnerId, explanation.currency);
    return evaluateClearance({
      learnerId,
      currency: explanation.currency,
      outstanding: explanation.balance,
      writtenOff,
      ...(facts.libraryBooksOut === undefined ? {} : { libraryBooksOut: facts.libraryBooksOut }),
      ...(facts.propertyItemsOut === undefined ? {} : { propertyItemsOut: facts.propertyItemsOut }),
    });
  }

  /** Raises a clearance document in `pending`. It is cleared or refused by a later decision. */
  async requestClearance(input: ClearanceRequest): Promise<ClearanceDocument> {
    const reason = this.requireText(input.reason, 'a clearance request needs a reason');
    return this.unit(async (tx) => {
      const learner = await this.requireLearner(input.learnerId);
      const assessment = await this.assessClearance(learner.id, {
        ...(input.libraryBooksOut === undefined ? {} : { libraryBooksOut: input.libraryBooksOut }),
        ...(input.propertyItemsOut === undefined ? {} : { propertyItemsOut: input.propertyItemsOut }),
      });
      const requestedAt = this.isoDateTime(input.requestedAt);
      const document: ClearanceDocument = {
        id: newDocumentId(),
        institutionId: learner.institution_id,
        learnerId: learner.id,
        state: 'pending',
        assessment,
        reason,
        requestedBy: this.actorOf(input.actor),
        requestedAt,
        decidedBy: null,
        decidedAt: null,
        decisionReason: null,
      };
      await appendDocument(tx, {
        entity: CLEARANCE_AUDIT_ENTITY,
        id: document.id,
        payload: document,
        actorId: document.requestedBy,
        reason,
        createdAt: requestedAt,
        commitSequence: await nextCommitSequence(tx),
      });
      return document;
    });
  }

  /**
   * Clears or refuses a learner. The engine's guard carries the rule: `clear` is refused unless the
   * assessment says the learner is clearable, and `refuse` needs a reason.
   */
  async decideClearance(input: ClearanceDecision): Promise<ClearanceDocument> {
    return this.unit(async (tx) => {
      const document = await this.requireClearance(tx, input.clearanceId);
      if (document.state !== 'pending') {
        throw new AdjustmentError(
          'wrong_state',
          `clearance ${document.id} is ${document.state}; only a pending clearance is decided.`,
          { clearanceId: document.id, state: document.state }
        );
      }

      const to = input.decision === 'clear' ? 'cleared' : 'refused';
      const decision = resolveMove(clearanceDefinition(), {
        recordKey: document.id,
        from: 'pending',
        to,
        actor: input.actor,
        reason: input.reason ?? null,
        record: { clearable: document.assessment.clearable },
      });
      if (!decision.allowed) {
        const code = decision.code === 'condition_failed' ? 'not_clearable' : 'approval_denied';
        throw new AdjustmentError(code, decision.message, {
          code: decision.code,
          transition: decision.transition,
          checks: document.assessment.checks,
        });
      }

      const decidedAt = this.isoDateTime(input.decidedAt);
      const next: ClearanceDocument = {
        ...document,
        state: to,
        decidedBy: input.actor.id,
        decidedAt,
        decisionReason: input.reason ?? null,
      };
      await appendDocument(tx, {
        entity: CLEARANCE_AUDIT_ENTITY,
        id: document.id,
        payload: next,
        action: 'update',
        actorId: input.actor.id,
        reason: input.reason ?? `clearance ${to}`,
        createdAt: decidedAt,
        commitSequence: await nextCommitSequence(tx),
      });
      return next;
    });
  }

  /** The newest clearance document of a learner, or null. */
  async clearanceOf(learnerId: string): Promise<ClearanceDocument | null> {
    return this.unit(async (tx) => {
      const documents = await readLatestDocuments<ClearanceDocument>(tx, CLEARANCE_AUDIT_ENTITY);
      const mine = [...documents.values()]
        .filter((document) => document.learnerId === learnerId)
        .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt));
      return mine[mine.length - 1] ?? null;
    });
  }

  // ---------------------------------------------------------------------- balance

  /**
   * Explains a learner's balance as the documents that sum to it, and reads the same balance back
   * from the ledger. The acceptance of the module is that the two agree: every shilling of the
   * balance is traceable to an invoice line, a credit note, a payment, a write-off or an opening
   * balance.
   */
  async explainBalance(
    learnerId: string,
    query: BalanceExplanationQuery = {}
  ): Promise<BalanceExplanation> {
    return this.unit(async (tx) => {
      const learner = await this.requireLearner(learnerId);
      const institutionId = learner.institution_id;
      const institution = await this.store.get('institution', asId<'institution'>(institutionId));
      const currency = (institution?.base_currency ?? 'KES') as CurrencyCode;
      const asOf = query.asOf ?? null;
      const documents: BalanceDocument[] = [];
      const ids = new Set<string>();

      const within = (date: string): boolean => asOf === null || date <= asOf;

      const invoices = await this.list('invoice', learnerId);
      for (const invoice of invoices) {
        if (invoice.status === 'draft' || invoice.status === 'void') continue;
        if (!within(invoice.issue_date)) continue;
        const lines = (
          await this.store.list('invoice_line', { where: { invoice_id: invoice.id }, limit: 500 })
        ).items;
        const opening = lines.length === 1 && lines[0]?.kind === 'opening_balance';
        documents.push({
          kind: opening ? 'opening_balance' : 'invoice',
          id: invoice.id,
          number: invoice.number,
          date: invoice.issue_date,
          amount: invoiceEffect(toMoney(invoice.total)),
          description: opening ? 'Opening balance carried forward' : `Invoice ${invoice.number}`,
        });
        ids.add(invoice.id);
      }

      const creditNotes = await this.list('credit_note', learnerId);
      for (const note of creditNotes) {
        if (note.status !== 'posted') continue;
        if (!within(note.issue_date)) continue;
        documents.push({
          kind: 'credit_note',
          id: note.id,
          number: note.number,
          date: note.issue_date,
          amount: creditEffect(toMoney(note.amount)),
          description: `Credit note ${note.number}: ${note.reason}`,
        });
        ids.add(note.id);
      }

      const payments = await this.list('payment', learnerId);
      for (const payment of payments) {
        if (payment.status !== 'posted' && payment.status !== 'cleared') continue;
        const day = payment.received_at.slice(0, 10);
        if (!within(day)) continue;
        documents.push({
          kind: 'payment',
          id: payment.id,
          number: payment.reference ?? payment.external_reference ?? null,
          date: day,
          amount: creditEffect(toMoney(payment.amount)),
          description: `Payment received via ${payment.channel}`,
        });
        ids.add(payment.id);
      }

      const writeOffs = await readLatestDocuments<WriteOffDocument>(tx, WRITE_OFF_AUDIT_ENTITY);
      for (const document of writeOffs.values()) {
        if (document.learnerId !== learnerId || document.state !== 'approved') continue;
        if (!within(document.issueDate)) continue;
        documents.push({
          kind: 'write_off',
          id: document.id,
          number: document.number,
          date: document.issueDate,
          amount: creditEffect(document.amount),
          description: `Write-off ${document.number}: ${document.reason}`,
        });
        ids.add(document.id);
      }

      const recoveries = await readLatestDocuments<WriteOffRecovery>(tx, WRITE_OFF_RECOVERY_AUDIT_ENTITY);
      for (const recovery of recoveries.values()) {
        if (recovery.learnerId !== learnerId) continue;
        if (!within(recovery.recoveredAt)) continue;
        documents.push({
          kind: 'recovery',
          id: recovery.id,
          number: null,
          date: recovery.recoveredAt,
          amount: recoveryEffect(recovery.amount),
          description: `Recovery of a write-off: ${recovery.reason}`,
        });
        ids.add(recovery.id);
      }

      documents.sort((left, right) =>
        left.date === right.date ? left.id.localeCompare(right.id) : left.date.localeCompare(right.date)
      );

      const ledger = await this.ledgerFor(tx);
      const entries: readonly JournalEntry[] = await ledger.listEntries({
        institutionId,
        ...(asOf === null ? {} : { asOf }),
      });
      const ledgerBalance = ledgerBalanceFor(entries, ids, currency);

      return buildBalanceExplanation({
        learnerId,
        institutionId,
        currency,
        asOf,
        documents,
        ledgerBalance,
      });
    });
  }

  // ---------------------------------------------------------------------- internals

  /** Runs `work` in one transaction of the store, with the module's schema in place. */
  private async unit<T>(work: (tx: SqliteTransaction) => Promise<T>): Promise<T> {
    const store = this.store;
    if (!store.transaction) {
      throw new AdjustmentError(
        'no_transaction',
        'The adjustments module posts and reads in one transaction, and this store offers none.'
      );
    }
    try {
      return await store.transaction(async (tx) => {
        await ensureAdjustmentSchema(tx);
        return work(tx);
      });
    } catch (error) {
      throw unwrapTransactionRefusal(error);
    }
  }

  private async ledgerFor(tx: SqliteTransaction): Promise<LedgerService> {
    const feeItems = (await this.store.list('fee_item', { limit: 500 })).items;
    return new LedgerService({
      store: createSqliteLedgerStore(transactionAdapter(tx)),
      mapping: buildChart(revenueAccountsOf(feeItems)),
      ...(this.actor === undefined ? {} : { actor: this.actor }),
      now: this.clock,
    });
  }

  private sequencesFor(tx: SqliteTransaction): SequenceService {
    return new SequenceService({ store: createSqliteSequenceStore(transactionAdapter(tx)), now: this.clock });
  }

  private async applyCreditNote(
    tx: SqliteTransaction,
    input: { creditNoteId: string; learnerId: string; amount: Money; invoiceId: Id<'invoice'> }
  ): Promise<CreditNoteApplication> {
    const invoice = await this.store.get('invoice', input.invoiceId);
    if (!invoice) {
      throw new AdjustmentError('not_found', `invoice ${input.invoiceId} does not exist.`, {
        invoiceId: input.invoiceId,
      });
    }
    if (invoice.learner_id !== input.learnerId) {
      throw new AdjustmentError(
        'application_refused',
        `invoice ${invoice.number} belongs to another learner; a credit note is applied to the learner's own invoice.`,
        { invoiceId: invoice.id, learnerId: input.learnerId }
      );
    }

    const currency = input.amount.currency;
    const items = await this.outstandingItemsOf(tx, invoice.id, input.learnerId, currency);
    const plan = planAllocation({
      source: { id: input.creditNoteId, kind: 'credit', amount: input.amount, learnerId: input.learnerId },
      items,
      options: { strategy: 'oldest_first' },
    });

    const lines: CreditNoteApplicationLine[] = plan.allocations.map((allocation) => ({
      invoiceLineId: allocation.itemId,
      invoiceId: allocation.invoiceId,
      amount: allocation.amount,
    }));
    const appliedAt = this.isoDateTime(undefined);
    const application: CreditNoteApplication = {
      creditNoteId: input.creditNoteId,
      invoiceId: invoice.id,
      learnerId: input.learnerId,
      amount: plan.allocated,
      appliedAt,
      appliedBy: this.actor ?? null,
      lines,
    };
    await appendDocument(tx, {
      entity: CREDIT_NOTE_APPLICATION_AUDIT_ENTITY,
      id: newDocumentId(),
      payload: application,
      actorId: this.actor ?? null,
      reason: `credit note applied to invoice ${invoice.number}`,
      createdAt: appliedAt,
      commitSequence: await nextCommitSequence(tx),
    });
    return application;
  }

  /** One invoice's outstanding lines, after the payments and credits already placed against it. */
  private async outstandingItemsOf(
    tx: SqliteTransaction,
    invoiceId: string,
    learnerId: string,
    currency: CurrencyCode
  ): Promise<readonly OutstandingItem[]> {
    const invoice = await this.store.get('invoice', asId<'invoice'>(invoiceId));
    const lines = (
      await this.store.list('invoice_line', { where: { invoice_id: invoiceId }, limit: 500 })
    ).items;

    let reduction = zero(currency);
    const applications = await readLatestDocuments<CreditNoteApplication>(
      tx,
      CREDIT_NOTE_APPLICATION_AUDIT_ENTITY
    );
    for (const application of applications.values()) {
      if (application.invoiceId === invoiceId) reduction = add(reduction, application.amount);
    }
    const allocations = (
      await this.store.list('payment_allocation', { where: { invoice_id: invoiceId }, limit: 500 })
    ).items;
    for (const allocation of allocations) reduction = add(reduction, toMoney(allocation.amount));

    let remaining = reduction.amount_minor;
    const items: OutstandingItem[] = [];
    for (const [index, line] of lines.entries()) {
      if (line.amount.amount_minor <= 0) continue;
      const take = Math.min(line.amount.amount_minor, Math.max(remaining, 0));
      remaining -= take;
      items.push({
        id: line.id,
        invoiceId,
        ...(invoice ? { invoiceNumber: invoice.number } : {}),
        learnerId,
        issuedOn: invoice?.issue_date ?? this.today(),
        ...(line.kind ? { kind: line.kind } : {}),
        ...(line.fee_item_id ? { feeItemId: line.fee_item_id } : {}),
        description: line.description,
        sequence: index,
        balance: fromMinor(line.amount.amount_minor - take, currency),
      });
    }
    return items.filter((item) => item.balance.amount_minor > 0);
  }

  /** Posts the write-off's journal entry: the bad-debt loss against the receivable. */
  private async postWriteOff(tx: SqliteTransaction, document: WriteOffDocument): Promise<string> {
    const ledger = await this.ledgerFor(tx);
    const entry = createJournalEntry(
      {
        institutionId: document.institutionId,
        entryDate: document.issueDate,
        source: { kind: 'credit_note', id: document.id, number: document.number },
        narration: `Write-off ${document.number} posted: ${document.reason}`,
        lines: [
          {
            accountCode: WRITE_OFF_ACCOUNT.code,
            accountName: WRITE_OFF_ACCOUNT.name,
            debit: document.amount,
            memo: document.learnerId,
          },
          {
            accountCode: CONTROL_ACCOUNTS.receivables.code,
            accountName: CONTROL_ACCOUNTS.receivables.name,
            credit: document.amount,
            memo: document.learnerId,
          },
        ],
        ...this.postedBy(document.decidedBy ?? document.requestedBy ?? undefined),
      },
      { now: this.clock }
    );
    const posted = await ledger.post(entry);
    return posted.id;
  }

  private async writtenOffTotalOf(learnerId: string, currency: CurrencyCode): Promise<Money> {
    const writeOffs = await this.writeOffsOf(learnerId);
    let total = zero(currency);
    for (const document of writeOffs) {
      if (document.state === 'approved') total = add(total, document.amount);
    }
    return total;
  }

  /** Moves a refund's canonical status through the engine's guard, then writes it. */
  private async moveRefund(
    definition: WorkflowDefinition,
    refund: RepositoryRow<'refund'>,
    to: string,
    actor: WorkflowActor,
    reason: string | null,
    patch: Record<string, unknown>
  ): Promise<RepositoryRow<'refund'>> {
    const decision = resolveMove(definition, {
      recordKey: refund.id,
      from: refund.status,
      to,
      actor,
      reason,
    });
    if (!decision.allowed) {
      throw new AdjustmentError('approval_denied', decision.message, {
        code: decision.code,
        transition: decision.transition,
      });
    }
    return this.store.update('refund', refund.id, { status: to, ...patch } as UpdateInput<'refund'>, {
      expectedVersion: refund.rowVersion,
      actor: actor.id,
      ...(reason === null ? {} : { reason }),
    });
  }

  private refundDefinition(): WorkflowDefinition {
    return refundApprovalDefinition(this.approverRoles ?? undefined);
  }

  private writeOffDefinition(): WorkflowDefinition {
    return writeOffApprovalDefinition(this.approverRoles ?? undefined);
  }

  private async requireLearner(learnerId: string): Promise<RepositoryRow<'learner'>> {
    const learner = await this.store.get('learner', asId<'learner'>(learnerId));
    if (!learner) {
      throw new AdjustmentError('not_found', `learner ${learnerId} does not exist.`, { learnerId });
    }
    return learner;
  }

  private async requireRefund(refundId: string): Promise<RepositoryRow<'refund'>> {
    const refund = await this.store.get('refund', asId<'refund'>(refundId));
    if (!refund) {
      throw new AdjustmentError('not_found', `refund ${refundId} does not exist.`, { refundId });
    }
    return refund;
  }

  private async requireWriteOff(tx: SqliteTransaction, writeOffId: string): Promise<WriteOffDocument> {
    const document = await readDocument<WriteOffDocument>(tx, WRITE_OFF_AUDIT_ENTITY, writeOffId);
    if (!document) {
      throw new AdjustmentError('not_found', `write-off ${writeOffId} does not exist.`, { writeOffId });
    }
    return document;
  }

  private async requireClearance(tx: SqliteTransaction, clearanceId: string): Promise<ClearanceDocument> {
    const document = await readDocument<ClearanceDocument>(tx, CLEARANCE_AUDIT_ENTITY, clearanceId);
    if (!document) {
      throw new AdjustmentError('not_found', `clearance ${clearanceId} does not exist.`, { clearanceId });
    }
    return document;
  }

  private async list<E extends 'invoice' | 'credit_note' | 'payment'>(
    entity: E,
    learnerId: string
  ): Promise<readonly RepositoryRow<E>[]> {
    return (await this.store.list(entity, { where: { learner_id: learnerId }, limit: 500 })).items;
  }

  private async institutionOf(learnerId?: string, paymentId?: string): Promise<string> {
    if (learnerId) return (await this.requireLearner(learnerId)).institution_id;
    if (paymentId) {
      const payment = await this.store.get('payment', asId<'payment'>(paymentId));
      if (!payment) {
        throw new AdjustmentError('not_found', `payment ${paymentId} does not exist.`, { paymentId });
      }
      return payment.institution_id;
    }
    throw new AdjustmentError('invalid_request', 'a refund names a learner or a payment to belong to.');
  }

  private requireText(value: string, message: string): string {
    const text = value.trim();
    if (text === '') throw new AdjustmentError('invalid_request', message);
    return text;
  }

  private assertPositive(amount: Money, subject: string): void {
    if (amount.amount_minor <= 0) {
      throw new AdjustmentError(
        'invalid_request',
        `${subject} must be greater than zero, not ${amount.amount_minor} ${amount.currency}.`,
        { amount }
      );
    }
  }

  private requireChannel(channel: PaymentChannel): PaymentChannel {
    return channel;
  }

  private actorOf(actor?: string): string | null {
    return actor ?? this.actor ?? null;
  }

  private postedBy(actor?: string): { readonly postedBy?: string } {
    const posted = actor ?? this.actor;
    return posted === undefined ? {} : { postedBy: posted };
  }

  private writeOptions(reason: string): { readonly actor?: string; readonly reason: string } {
    return { ...(this.actor === undefined ? {} : { actor: this.actor }), reason };
  }

  private today(): string {
    return this.clock().toISOString().slice(0, 10);
  }

  private isoDateTime(value?: string): string {
    return value ?? this.clock().toISOString();
  }
}

/** The year a date belongs to, for a sequence scoped by year. */
function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

/** A stored amount read back as the money module's value: the same minor units, the money type. */
function toMoney(value: { readonly amount_minor: number; readonly currency: string }): Money {
  return fromMinor(value.amount_minor, value.currency as CurrencyCode);
}

/**
 * Unwraps a domain refusal the canonical repository's transaction has wrapped.
 *
 * `Repository.transaction` maps anything that is not a `RepositoryError` onto a
 * `RepositoryStorageError`, so a refusal this module raises inside the transaction (a maker
 * approving their own request, a ledger that will not post, a money mismatch) would otherwise reach
 * the caller as a storage failure and lose its code. The refusal is the wrapped error's `cause`; a
 * genuine storage failure's cause is the adapter's own error, which is left wrapped.
 */
function unwrapTransactionRefusal(error: unknown): unknown {
  if (
    error instanceof RepositoryStorageError &&
    error.cause instanceof Error &&
    !(error.cause instanceof SqliteAdapterError)
  ) {
    return error.cause;
  }
  return error;
}

/**
 * The clearance rule of spec 05 section 7 and 04 section 6, as a pure function.
 *
 * A learner is clearable when the balance is settled or written off (nothing outstanding) and
 * nothing is still out: a library book, school property. P3-E01's statement view reads the same
 * function, so the status a statement shows and the certificate a bursar issues cannot disagree.
 */
export function evaluateClearance(facts: ClearanceFacts): ClearanceAssessment {
  const settled = compare(facts.outstanding, zero(facts.currency)) <= 0;
  const booksOut = facts.libraryBooksOut ?? 0;
  const propertyOut = facts.propertyItemsOut ?? 0;
  const booksReturned = booksOut <= 0;
  const propertyReturned = propertyOut <= 0;

  const checks = [
    {
      code: 'balance_settled_or_written_off' as const,
      passed: settled,
      detail: settled
        ? `the balance is ${facts.outstanding.amount_minor} ${facts.currency}: settled or written off`
        : `${facts.outstanding.amount_minor} ${facts.currency} is still owed`,
    },
    {
      code: 'library_books_returned' as const,
      passed: booksReturned,
      detail: booksReturned
        ? 'no library book is outstanding'
        : `${booksOut} library book(s) are still out`,
    },
    {
      code: 'school_property_returned' as const,
      passed: propertyReturned,
      detail: propertyReturned
        ? 'no school property is outstanding'
        : `${propertyOut} item(s) of school property are still out`,
    },
  ];

  return {
    learnerId: facts.learnerId,
    currency: facts.currency,
    outstanding: facts.outstanding,
    writtenOff: facts.writtenOff,
    clearable: checks.every((check) => check.passed),
    checks,
  };
}

export { CLEARANCE_WORKFLOW_KEY, REFUND_APPROVAL_WORKFLOW_KEY, WRITE_OFF_APPROVAL_WORKFLOW_KEY };
