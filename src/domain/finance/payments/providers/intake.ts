// ABOUTME: The provider intake: it turns a provider delivery into a payment through the payments
// ABOUTME: core, or files it in suspense when no learner matches, and it is the one place webhook
// ABOUTME: idempotency lives - an identical delivery writes nothing twice, a status update moves the
// ABOUTME: same record on, and a charge that never got a callback is completed by polling.

import { asId, type Id } from '@/domain/ids';
import { fromMinor, isCurrencyCode, toDecimalString, type CurrencyCode, type Money } from '@/domain/money';
import type { LedgerService } from '@/domain/finance/ledger';
import { createLedgerSuspensePoster } from '@/domain/finance/reconciliation';

import { ProviderError, requireCapability } from './errors';
import type { PaymentsService } from '../service';
import type { PaymentsStore } from '../types';
import {
  fingerprintOfEvent,
  newProviderEvent,
  stableJson,
  type ProviderEventRecord,
  type ProviderEventStore,
} from './store';
import {
  newProviderSuspenseEntry,
  suspensePostingFor,
  type ProviderSuspenseEntry,
  type ProviderSuspenseStore,
} from './suspense';
import type {
  CollectionRequest,
  PaymentProvider,
  ProviderNotification,
  ProviderTransactionStatus,
  RefundRequest,
  TransactionStatus,
  WebhookAck,
  WebhookInput,
} from './types';

/** Where a learner is found from the reference a payer quoted. */
export interface LearnerDirectory {
  /**
   * The learner whose admission number is `reference` at `institutionId`, or null.
   *
   * A reference nobody knows is not an error: it is money that has arrived and cannot be placed,
   * which is what the suspense queue is for.
   */
  findLearnerByAdmissionNumber(institutionId: string, reference: string): Promise<string | null>;
}

/** The institution a delivery belongs to: the paybill is the institution's, not the learner's. */
export interface IntakeContext {
  readonly institutionId: string;
}

/** How a delivery ended. */
export type IntakeOutcome =
  /** A payment was recorded against a learner and posted. */
  | 'matched'
  /** The money arrived but no learner matched; it is held in suspense. */
  | 'suspended'
  /** This exact delivery was already recorded; nothing was written. */
  | 'duplicate'
  /** A C2B validation callback was accepted; no money has moved yet. */
  | 'validated'
  /** The seam refused the notification: the amount is not what was charged. */
  | 'refused'
  /** The provider reported a failure. */
  | 'failed'
  /** The provider says the transaction is still being processed. */
  | 'pending'
  /** A refund was paid. */
  | 'refunded'
  /** The event is already settled; a later delivery of it changed nothing. */
  | 'ignored';

/** What a delivery did. */
export interface IntakeResult {
  readonly outcome: IntakeOutcome;
  readonly idempotencyKey: string;
  readonly transactionId: string;
  readonly receipt: string | null;
  readonly paymentId: string | null;
  /** The ledger entry the event produced: the payment's posting, or the suspense posting. */
  readonly entryId: string | null;
  readonly suspenseEntryId: string | null;
  readonly refundId: string | null;
  readonly message: string;
}

/** What the intake is built with. */
export interface ProviderIntakeOptions {
  /** The canonical repository, for the one field the payments core does not set. */
  readonly store: PaymentsStore;
  /** The payments core: the seam records through it, so a provider payment is a payment. */
  readonly payments: PaymentsService;
  /** The provider event ledger: the idempotency of every delivery. */
  readonly events: ProviderEventStore;
  /** The suspense queue. */
  readonly suspense: ProviderSuspenseStore;
  readonly learners: LearnerDirectory;
  /** The posting engine: the suspense posting and its reversal go through it. */
  readonly ledger: LedgerService;
  readonly actor?: string;
  readonly now?: () => Date;
}

/** What a caller asks of an offline reconciliation. */
export interface OfflineReconcileRequest {
  readonly institutionId: string;
  readonly transactionId: string;
  /** The receipt, when the caller already knows it. */
  readonly receipt?: string | null;
}

/** What issuing a refund produced. */
export interface IssuedRefund {
  readonly refundId: string;
  readonly transactionId: string;
  readonly status: ProviderTransactionStatus;
  readonly message: string | null;
}

/** What resolving a suspense entry produced. */
export interface ResolvedSuspense {
  readonly entry: ProviderSuspenseEntry;
  readonly paymentId: string;
  readonly entryId: string | null;
  /** The entry that reverses the suspense posting, so the suspense account returns to zero. */
  readonly reversalId: string;
}

/** The learner id a caller passes to {@link ProviderPaymentService.resolveSuspense}. */
export type LearnerId = Id<'learner'>;

/**
 * The outcomes an event does not move on from.
 *
 * Once a payment has been recorded and posted, or money is held in suspense, or a refund has been
 * paid, a later delivery of that transaction cannot undo it: a query that says "still processing"
 * after the payment landed changes nothing. `validated` is deliberately not here, because the
 * confirmation that follows a validation must be able to move the record on to `matched`.
 */
const SETTLED_OUTCOMES: ReadonlySet<string> = new Set(['matched', 'suspense', 'refunded']);

/**
 * The provider intake.
 *
 * A provider payment is a payment recorded by a machine instead of a cashier, so it lands in the
 * same `payment`, `payment_allocation` and `receipt` rows through the same {@link PaymentsService},
 * which posts it through the ledger's own payment derivation. Nothing here derives a journal entry
 * for a matched payment; the only entry this module derives is the suspense posting, and it hands
 * that to the reconciliation module's own poster.
 */
export class ProviderPaymentService {
  private readonly store: PaymentsStore;
  private readonly payments: PaymentsService;
  private readonly events: ProviderEventStore;
  private readonly suspense: ProviderSuspenseStore;
  private readonly learners: LearnerDirectory;
  private readonly ledger: LedgerService;
  private readonly actor: string | undefined;
  private readonly clock: () => Date;

  constructor(options: ProviderIntakeOptions) {
    this.store = options.store;
    this.payments = options.payments;
    this.events = options.events;
    this.suspense = options.suspense;
    this.learners = options.learners;
    this.ledger = options.ledger;
    this.actor = options.actor;
    this.clock = options.now ?? (() => new Date());
  }

  /**
   * Takes one delivery from a provider.
   *
   * The order is: verify, parse, look the delivery up by its idempotency key, and only then act. An
   * identical delivery of a recorded event writes nothing. A delivery that carries the same key but
   * a different payload is a status update and moves the same record on rather than making a second
   * one. Everything a delivery does is keyed by `<providerId>:<transactionId>`, which is the
   * provider's own transaction id, so a retried callback and a polled result converge on one row.
   */
  async receive(
    provider: PaymentProvider,
    input: WebhookInput,
    context: IntakeContext
  ): Promise<IntakeResult> {
    const identity = provider.describe();
    requireCapability(
      identity,
      identity.capabilities.notification,
      'notification',
      'receive a payment notification'
    );
    const verification = provider.verifyWebhook(input);
    if (!verification.valid) {
      throw new ProviderError('signature_invalid', verification.reason, {
        detail: { route: input.route, providerId: provider.describe().id },
      });
    }

    const notification = provider.parseNotification(input);
    if (!notification) {
      throw new ProviderError(
        'payload_unrecognised',
        `the body delivered to ${input.route} is not a ${provider.describe().id} notification`,
        { detail: { route: input.route } }
      );
    }

    const at = this.clock().toISOString();
    const key = provider.idempotencyKey(notification);
    const fingerprint = fingerprintOfEvent(notification.kind, notification.raw);
    const existing = await this.events.findByIdempotencyKey(key);

    if (existing && existing.payloadFingerprint === fingerprint && existing.outcome !== 'pending') {
      return resultOf(
        'duplicate',
        existing,
        `this delivery of ${key} was already recorded on ${existing.updatedAt}; nothing was written`
      );
    }

    if (existing && SETTLED_OUTCOMES.has(existing.outcome)) {
      return resultOf(
        'ignored',
        existing,
        `the ${key} event is already settled as ${existing.outcome}; the later delivery of ${existing.updatedAt} changed nothing`
      );
    }

    if (notification.kind === 'refund') {
      return this.applyRefund(provider, notification, context, existing, fingerprint, at);
    }

    return this.complete(provider, notification, context, existing, fingerprint, at);
  }

  /**
   * Initiates a charge and records it as pending under the provider's transaction id.
   *
   * The pending record is what a later callback or query completes, and it is where the amount that
   * was charged comes from when a callback's amount has to be checked against it.
   */
  async initiateCharge(
    provider: PaymentProvider,
    request: CollectionRequest,
    context: IntakeContext
  ): Promise<{ readonly transactionId: string; readonly event: ProviderEventRecord }> {
    const identity = provider.describe();
    requireCapability(
      identity,
      identity.capabilities.collection,
      'collection',
      'initiate a charge'
    );
    const response = await provider.initiateCharge(request);
    const at = this.clock().toISOString();
    const providerId = provider.describe().id;
    const key = `${providerId}:${response.transactionId}`;
    const existing = await this.events.findByIdempotencyKey(key);
    if (existing) return { transactionId: response.transactionId, event: existing };

    const learnerId = await this.resolveLearner(context.institutionId, request.accountReference);
    const record = newProviderEvent(
      {
        institutionId: context.institutionId,
        providerId,
        idempotencyKey: key,
        transactionId: response.transactionId,
        receipt: null,
        kind: 'charge',
        payloadFingerprint: fingerprintOfEvent('charge', response.raw),
        payload: stableJson(response.raw),
        outcome: 'pending',
        amountMinor: request.amount.amount_minor,
        currency: request.amount.currency,
        accountReference: request.accountReference,
        learnerId,
        paymentId: null,
        refundId: null,
        ledgerEntryId: null,
        suspenseEntryId: null,
        message: response.message,
      },
      at
    );
    await this.events.insert(record);
    return { transactionId: response.transactionId, event: record };
  }

  /**
   * Completes a transaction by asking the provider what became of it.
   *
   * This is the offline path: a device that was offline when the callback fired never received it,
   * and M-Pesa does not re-send a C2B confirmation, so on reconnect the transaction is queried and
   * the same completion runs. The idempotency key is the same one the callback would carry, so a
   * callback that did arrive and a query that follows it converge on one payment.
   */
  async reconcileOffline(
    provider: PaymentProvider,
    request: OfflineReconcileRequest
  ): Promise<IntakeResult> {
    const identity = provider.describe();
    requireCapability(
      identity,
      identity.capabilities.query,
      'query',
      'be asked what became of a transaction'
    );
    const providerId = provider.describe().id;
    const key = `${providerId}:${request.transactionId}`;
    const existing = await this.events.findByIdempotencyKey(key);
    if (existing && SETTLED_OUTCOMES.has(existing.outcome)) {
      return resultOf(
        'ignored',
        existing,
        `the ${key} event is already settled as ${existing.outcome}; the query changed nothing`
      );
    }
    const status = await provider.queryTransaction({
      transactionId: request.transactionId,
      receipt: request.receipt ?? existing?.receipt ?? null,
    });

    if (status.status === 'pending') {
      return {
        outcome: 'pending',
        idempotencyKey: key,
        transactionId: request.transactionId,
        receipt: existing?.receipt ?? null,
        paymentId: existing?.paymentId ?? null,
        entryId: existing?.ledgerEntryId ?? null,
        suspenseEntryId: existing?.suspenseEntryId ?? null,
        refundId: existing?.refundId ?? null,
        message: status.message ?? 'the provider says the transaction is still being processed',
      };
    }

    const at = this.clock().toISOString();
    const notification = notificationFromStatus(
      providerId,
      status,
      existing,
      request.receipt ?? null,
      at
    );
    const fingerprint = fingerprintOfEvent(notification.kind, notification.raw);
    if (existing && existing.payloadFingerprint === fingerprint && existing.outcome !== 'pending') {
      return resultOf(
        'duplicate',
        existing,
        `this transaction was already recorded on ${existing.updatedAt}; the query found nothing new`
      );
    }
    return this.complete(
      provider,
      notification,
      { institutionId: request.institutionId },
      existing,
      fingerprint,
      at
    );
  }

  /**
   * Resolves a suspense entry to a learner.
   *
   * The payment is recorded and posted exactly as a matched one is, and the suspense posting the
   * arrival made is reversed, so the suspense account returns to zero and the money ends up where
   * it belongs: the mobile-money clearing account against the learner's fees.
   */
  async resolveSuspense(
    entryId: string,
    learnerId: string,
    actor?: string
  ): Promise<ResolvedSuspense> {
    const entry = await this.suspense.get(entryId);
    if (!entry) {
      throw new ProviderError('not_found', `suspense entry ${entryId} does not exist`, {
        detail: { entryId },
      });
    }
    if (entry.status !== 'open') {
      throw new ProviderError(
        'state_invalid',
        `suspense entry ${entryId} was already resolved to ${entry.resolvedLearnerId ?? 'a learner'} on ${entry.resolvedAt ?? 'an unknown day'}`,
        { detail: { entryId, status: entry.status } }
      );
    }

    const who = actor ?? this.actor;
    const reference = entry.receipt ?? entry.transactionId;
    const recorded = await this.recordPayment(learnerId, {
      amount: entry.amount,
      reference,
      receivedAt: entry.occurredAt,
      payerName: entry.payerName,
      reason: `provider suspense ${entry.id} resolved to learner ${learnerId}`,
    });

    const reversal = await this.ledger.reverse(entry.ledgerEntryId, {
      reason: `provider suspense ${entry.id} resolved to learner ${learnerId}`,
      ...(who ? { actor: who } : {}),
    });

    const at = this.clock().toISOString();
    const resolved: ProviderSuspenseEntry = {
      ...entry,
      status: 'resolved',
      paymentId: recorded.paymentId,
      resolvedLearnerId: learnerId,
      resolvedAt: at,
      resolvedBy: who ?? null,
    };
    await this.suspense.update(resolved);

    const event = await this.events.findByIdempotencyKey(
      `${entry.providerId}:${entry.transactionId}`
    );
    if (event) {
      await this.events.update({
        ...event,
        outcome: 'matched',
        learnerId,
        paymentId: recorded.paymentId,
        ledgerEntryId: recorded.entryId,
        suspenseEntryId: entry.id,
        message: `suspense ${entry.id} resolved to learner ${learnerId}`,
        updatedAt: at,
      });
    }

    return {
      entry: resolved,
      paymentId: recorded.paymentId,
      entryId: recorded.entryId,
      reversalId: reversal.id,
    };
  }

  /** The suspense entries still waiting for a learner. */
  listOpenSuspense(institutionId: string): Promise<readonly ProviderSuspenseEntry[]> {
    return this.suspense.list({ institutionId, status: 'open' });
  }

  /**
   * Issues an approved refund through the provider and records it as pending.
   *
   * Approval is not this module's: maker-checker refunds belong to the refunds service (P3-C02).
   * This sends an already-approved refund out and remembers the provider's transaction id, so the
   * B2C result callback can find the refund it belongs to.
   */
  async issueRefund(
    provider: PaymentProvider,
    input: {
      readonly institutionId: string;
      readonly refundId: string;
      readonly request: RefundRequest;
    }
  ): Promise<IssuedRefund> {
    const identity = provider.describe();
    requireCapability(identity, identity.capabilities.refund, 'refund', 'issue a refund');
    const response = await provider.refund(input.request);
    const at = this.clock().toISOString();
    const providerId = provider.describe().id;
    const key = `${providerId}:${response.transactionId}`;
    const record = newProviderEvent(
      {
        institutionId: input.institutionId,
        providerId,
        idempotencyKey: key,
        transactionId: response.transactionId,
        receipt: null,
        kind: 'refund',
        payloadFingerprint: fingerprintOfEvent('refund', response.raw),
        payload: stableJson(response.raw),
        outcome: response.status === 'succeeded' ? 'refunded' : 'pending',
        amountMinor: input.request.amount.amount_minor,
        currency: input.request.amount.currency,
        accountReference: null,
        learnerId: null,
        paymentId: null,
        refundId: input.refundId,
        ledgerEntryId: null,
        suspenseEntryId: null,
        message: response.message,
      },
      at
    );
    await this.events.insert(record);
    return {
      refundId: input.refundId,
      transactionId: response.transactionId,
      status: response.status,
      message: response.message,
    };
  }

  /** The body to answer a delivery with, or null when the provider expects no answer. */
  acknowledge(
    provider: PaymentProvider,
    result: IntakeResult,
    options: { readonly kind?: ProviderNotification['kind']; readonly reason?: string } = {}
  ): WebhookAck | null {
    if (!provider.acknowledgeNotification) return null;
    return provider.acknowledgeNotification({
      kind: options.kind ?? 'validation',
      accepted: result.outcome !== 'refused',
      ...(options.reason ? { reason: options.reason } : {}),
    });
  }

  // ------------------------------------------------------------------ internals

  private async complete(
    provider: PaymentProvider,
    notification: ProviderNotification,
    context: IntakeContext,
    previous: ProviderEventRecord | null,
    fingerprint: string,
    at: string
  ): Promise<IntakeResult> {
    const providerId = provider.describe().id;
    const draft =
      previous ??
      newProviderEvent(
        {
          institutionId: context.institutionId,
          providerId,
          idempotencyKey: provider.idempotencyKey(notification),
          transactionId: notification.transactionId,
          receipt: null,
          kind: 'notification',
          payloadFingerprint: fingerprint,
          payload: stableJson(notification.raw),
          outcome: 'pending',
          amountMinor: null,
          currency: null,
          accountReference: null,
          learnerId: null,
          paymentId: null,
          refundId: null,
          ledgerEntryId: null,
          suspenseEntryId: null,
          message: null,
        },
        at
      );

    const base: ProviderEventRecord = {
      ...draft,
      institutionId: context.institutionId,
      receipt: notification.receipt ?? draft.receipt,
      payloadFingerprint: fingerprint,
      payload: stableJson(notification.raw),
      amountMinor: notification.amount?.amount_minor ?? draft.amountMinor,
      currency: notification.amount?.currency ?? draft.currency,
      accountReference: notification.payer.account ?? draft.accountReference,
      updatedAt: at,
    };

    if (notification.kind === 'validation') {
      const learnerId = await this.learnerFor(notification, context, draft);
      const done: ProviderEventRecord = {
        ...base,
        outcome: learnerId ? 'validated' : 'refused',
        learnerId,
        message: learnerId
          ? `accepted: reference ${notification.payer.account} is learner ${learnerId}`
          : `refused: reference ${notification.payer.account ?? '(none quoted)'} is not a learner of ${context.institutionId}`,
      };
      await this.persist(previous, done);
      return resultOf(learnerId ? 'validated' : 'refused', done, done.message ?? '');
    }

    if (notification.status !== 'succeeded') {
      const done: ProviderEventRecord = {
        ...base,
        outcome: notification.status === 'pending' ? 'pending' : 'failed',
        message: notification.failureReason ?? `the provider reported ${notification.status}`,
      };
      await this.persist(previous, done);
      return resultOf(done.outcome === 'pending' ? 'pending' : 'failed', done, done.message ?? '');
    }

    if (notification.amount === null) {
      throw new ProviderError(
        'payload_invalid',
        `a successful ${providerId} collection notification carries no amount`,
        { detail: { transactionId: notification.transactionId } }
      );
    }

    if (
      previous &&
      previous.amountMinor !== null &&
      previous.currency === notification.amount.currency &&
      previous.amountMinor !== notification.amount.amount_minor
    ) {
      const charged = toDecimalString(
        fromMinor(previous.amountMinor, notification.amount.currency)
      );
      const done: ProviderEventRecord = {
        ...base,
        outcome: 'refused',
        message: `the provider says ${toDecimalString(notification.amount)} but ${charged} was charged; nothing was posted`,
      };
      await this.persist(previous, done);
      return resultOf('refused', done, done.message ?? '');
    }

    const learnerId = await this.learnerFor(notification, context, draft);
    if (learnerId === null) {
      const posted = await this.fileSuspense(notification, context, at);
      const done: ProviderEventRecord = {
        ...base,
        outcome: 'suspense',
        learnerId: null,
        suspenseEntryId: posted.entry.id,
        ledgerEntryId: posted.entryId,
        message: `no learner holds the reference ${notification.payer.account ?? '(none quoted)'}; the money is held in suspense`,
      };
      await this.persist(previous, done);
      return resultOf('suspended', done, done.message ?? '');
    }

    const recorded = await this.recordPayment(learnerId, {
      amount: notification.amount,
      reference: notification.receipt ?? notification.transactionId,
      receivedAt: notification.occurredAt,
      payerName: notification.payer.name,
      reason: `provider ${providerId} payment ${notification.receipt ?? notification.transactionId}`,
    });
    const done: ProviderEventRecord = {
      ...base,
      outcome: 'matched',
      learnerId,
      paymentId: recorded.paymentId,
      ledgerEntryId: recorded.entryId,
      message: `recorded as a ${providerId} mobile-money payment against learner ${learnerId}`,
    };
    await this.persist(previous, done);
    return resultOf('matched', done, done.message ?? '');
  }

  private async applyRefund(
    provider: PaymentProvider,
    notification: ProviderNotification,
    context: IntakeContext,
    previous: ProviderEventRecord | null,
    fingerprint: string,
    at: string
  ): Promise<IntakeResult> {
    const providerId = provider.describe().id;
    const key = provider.idempotencyKey(notification);
    const event = previous ?? (await this.events.findByIdempotencyKey(key));
    if (!event || event.refundId === null) {
      throw new ProviderError(
        'transaction_unknown',
        `a ${providerId} refund result arrived for ${key}, which this system never issued`,
        { detail: { idempotencyKey: key } }
      );
    }

    const base: ProviderEventRecord = {
      ...event,
      institutionId: context.institutionId,
      receipt: notification.receipt ?? event.receipt,
      payloadFingerprint: fingerprint,
      payload: stableJson(notification.raw),
      amountMinor: notification.amount?.amount_minor ?? event.amountMinor,
      currency: notification.amount?.currency ?? event.currency,
      updatedAt: at,
    };

    if (notification.status !== 'succeeded') {
      const done: ProviderEventRecord = {
        ...base,
        outcome: notification.status === 'pending' ? 'pending' : 'failed',
        message: notification.failureReason ?? `the provider reported ${notification.status}`,
      };
      await this.persist(event, done);
      return resultOf(done.outcome === 'pending' ? 'pending' : 'failed', done, done.message ?? '');
    }

    const paidAt = notification.occurredAt;
    const refund = await this.store.get('refund', asId<'refund'>(event.refundId));
    if (!refund) {
      throw new ProviderError('not_found', `refund ${event.refundId} does not exist`, {
        detail: { refundId: event.refundId },
      });
    }
    if (refund.status !== 'paid') {
      await this.store.update(
        'refund',
        refund.id,
        { status: 'paid', paid_at: paidAt },
        {
          expectedVersion: refund.rowVersion,
          actor: this.actor,
          reason: `${providerId} refund ${notification.receipt ?? notification.transactionId} paid`,
        }
      );
    }

    const refundAmount = refundAmountOf(refund);
    const entry = await this.ledger.postRefund({
      refund: {
        id: refund.id,
        number: refund.number,
        institutionId: refund.institution_id,
        amount: refundAmount,
        status: 'paid',
        channel: 'mobile_money',
        paidAt,
        reason: refund.reason,
      },
      postedBy: this.actor,
    });

    const done: ProviderEventRecord = {
      ...base,
      outcome: 'refunded',
      ledgerEntryId: entry.id,
      receipt: notification.receipt ?? refund.number,
      message: `${providerId} refund paid as ${notification.receipt ?? notification.transactionId}`,
    };
    await this.persist(event, done);
    return resultOf('refunded', done, done.message ?? '');
  }

  /** Files an arrival nobody matched in suspense, posting it through the reconciliation module. */
  private async fileSuspense(
    notification: ProviderNotification,
    context: IntakeContext,
    at: string
  ): Promise<{ entry: ProviderSuspenseEntry; entryId: string }> {
    if (notification.amount === null) {
      throw new ProviderError(
        'payload_invalid',
        `an unmatched ${notification.providerId} payment carries no amount`,
        { detail: { transactionId: notification.transactionId } }
      );
    }
    const draft = newProviderSuspenseEntry(
      {
        institutionId: context.institutionId,
        providerId: notification.providerId,
        transactionId: notification.transactionId,
        receipt: notification.receipt,
        amount: notification.amount,
        payerName: notification.payer.name,
        payerPhone: notification.payer.phone,
        accountReference: notification.payer.account,
        occurredAt: notification.occurredAt,
        payload: stableJson(notification.raw),
        ledgerEntryId: '',
      },
      at
    );
    const posted = await createLedgerSuspensePoster(this.ledger).post(
      suspensePostingFor(draft, this.ledger.mapping)
    );
    const entry: ProviderSuspenseEntry = { ...draft, ledgerEntryId: posted.id };
    await this.suspense.insert(entry);
    return { entry, entryId: posted.id };
  }

  private async resolveLearner(
    institutionId: string,
    reference: string | null
  ): Promise<string | null> {
    const account = reference?.trim();
    if (!account) return null;
    return this.learners.findLearnerByAdmissionNumber(institutionId, account);
  }

  /**
   * The learner a notification is for.
   *
   * A C2B payment carries the account the payer quoted, which is the admission number, and that is
   * what auto-match reads. An STK push callback carries no account at all — Daraja sends only the
   * amount, the receipt, the time and the phone — so the learner is the one the charge was
   * initiated for, which the charge record holds. A notification whose account resolves wins over
   * the charge's learner, so a payment made against a different reference than the one charged is
   * recorded against the reference the payer actually used.
   */
  private async learnerFor(
    notification: ProviderNotification,
    context: IntakeContext,
    draft: ProviderEventRecord
  ): Promise<string | null> {
    const fromReference = await this.resolveLearner(context.institutionId, notification.payer.account);
    return fromReference ?? draft.learnerId;
  }

  /** Records and posts a payment through the payments core. */
  private async recordPayment(
    learnerId: string,
    input: {
      readonly amount: Money;
      readonly reference: string;
      readonly receivedAt: string;
      readonly payerName: string | null;
      readonly reason: string;
    }
  ): Promise<{ paymentId: string; entryId: string | null }> {
    // A provider payment is a payment with no cashier: it lands through the same core, which numbers
    // its receipt from the sequences module, allocates it and posts it through the ledger's payment
    // derivation. The reference it carries is the provider's receipt, which is what the printed
    // receipt shows and what the reconciliation module matches on.
    //
    // The provider's own transaction id is *not* written onto the payment row: `payment` freezes
    // `external_reference` once it is posted (the repository's `finance.posted_immutable` invariant),
    // and the payments core does not accept one. It is kept on the provider event ledger instead.
    const recorded = await this.payments.recordPayment({
      learnerId: asId<'learner'>(learnerId),
      amount: input.amount,
      channel: 'mobile_money',
      reference: input.reference,
      receivedAt: input.receivedAt,
      post: true,
      reason: input.reason,
      ...(input.payerName ? { payerName: input.payerName } : {}),
    });
    return { paymentId: recorded.payment.id, entryId: recorded.entry?.id ?? null };
  }

  /**
   * Writes the completed record.
   *
   * A new record is inserted and the unique index on the idempotency key is the guard: when a
   * second delivery of the same key races the first, the insert fails and the record the winner
   * wrote is read back and returned as a duplicate instead of a second payment.
   */
  private async persist(
    previous: ProviderEventRecord | null,
    done: ProviderEventRecord
  ): Promise<void> {
    if (previous) {
      await this.events.update(done);
      return;
    }
    try {
      await this.events.insert(done);
    } catch (error) {
      const raced = await this.events.findByIdempotencyKey(done.idempotencyKey);
      if (raced && raced.payloadFingerprint === done.payloadFingerprint) return;
      throw new ProviderError(
        'storage',
        `the ${done.providerId} delivery ${done.idempotencyKey} could not be recorded`,
        { cause: error, detail: { idempotencyKey: done.idempotencyKey } }
      );
    }
  }
}

/**
 * A refund's amount as a money value.
 *
 * The canonical `refund` row carries the schema's money shape, whose currency is a plain string;
 * the ledger wants a currency of the money table, so the row is checked rather than cast.
 */
function refundAmountOf(refund: { readonly amount: { readonly amount_minor: number; readonly currency: string } }): Money {
  if (!isCurrencyCode(refund.amount.currency)) {
    throw new ProviderError(
      'storage',
      `the refund is counted in "${refund.amount.currency}", which is not a currency of the table`,
      { detail: { currency: refund.amount.currency } }
    );
  }
  return fromMinor(refund.amount.amount_minor, refund.amount.currency);
}

/** The notification a status query stands in for, filling what the query does not carry. */
function notificationFromStatus(
  providerId: string,
  status: TransactionStatus,
  existing: ProviderEventRecord | null,
  receipt: string | null,
  at: string
): ProviderNotification {
  const amount =
    status.amount ??
    (existing && existing.amountMinor !== null && existing.currency !== null
      ? fromMinor(existing.amountMinor, existing.currency as CurrencyCode)
      : null);
  return {
    providerId,
    kind: 'collection',
    transactionId: status.transactionId,
    receipt: status.receipt ?? receipt ?? existing?.receipt ?? null,
    amount,
    payer: {
      name: status.payer.name,
      phone: status.payer.phone,
      account: status.payer.account ?? existing?.accountReference ?? null,
    },
    occurredAt: status.occurredAt ?? at,
    status: status.status,
    failureReason: status.status === 'succeeded' ? null : status.message,
    raw: status.raw,
  };
}

/** What a delivery did, read off the record it wrote. */
function resultOf(
  outcome: IntakeOutcome,
  record: ProviderEventRecord,
  message: string
): IntakeResult {
  return {
    outcome,
    idempotencyKey: record.idempotencyKey,
    transactionId: record.transactionId,
    receipt: record.receipt,
    paymentId: record.paymentId,
    entryId: record.ledgerEntryId,
    suspenseEntryId: record.suspenseEntryId,
    refundId: record.refundId,
    message,
  };
}
