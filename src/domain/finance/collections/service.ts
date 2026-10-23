// ABOUTME: The collections service: it runs a schedule - reading each subject's statement, deciding
// ABOUTME: who is due, honouring quiet hours and opt-outs, rendering the template, minting a pay
// ABOUTME: link, delivering through the injected channel and recording one attempt per document and
// ABOUTME: interval - and it records opt-outs, promises and pay links, and verifies a pay link.

import { generateUuidv7 } from '@/domain/ids';
import type { Money } from '@/domain/money';

import { CollectionsError } from './errors';
import { optOutBlocks } from './optOuts';
import {
  parsePayLinkUrl,
  payLinkPayload,
  payLinkUrl,
  verifyPayLink as verifyPayLinkRecord,
} from './payLink';
import { resolvePromises, suppressingPromise } from './promise';
import { localIsoDay } from './quietHours';
import { validateSchedule } from './schedule';
import {
  candidatesFromStatement,
  selectDueReminders,
  type SelectionSubject,
} from './selection';
import { pickTemplate, reminderVariables, renderTemplate } from './templates';
import type {
  CollectionsStore,
  PayLink,
  PayLinkSigner,
  PayLinkUrlParts,
  PayLinkVerification,
  PromiseToPay,
  ReminderAttempt,
  ReminderAttemptState,
  ReminderCategory,
  ReminderChannel,
  ReminderChannelPort,
  ReminderDecision,
  ReminderDelivery,
  ReminderDeliveryRecord,
  ReminderOptOut,
  ReminderOptOutScope,
  ReminderPayer,
  ReminderReason,
  ReminderRunInput,
  ReminderRunResult,
  ReminderSchedule,
  ReminderTemplate,
  StatementReader,
} from './types';

/** How the service is built. */
export interface CollectionsServiceOptions {
  readonly store: CollectionsStore;
  /** The channels a reminder may be delivered through. Injected, so a test sends nothing real. */
  readonly channels: readonly ReminderChannelPort[];
  readonly templates: readonly ReminderTemplate[];
  /** Where a subject's statement is read from. `StatementService` can back this with an adapter. */
  readonly reader: StatementReader;
  readonly signer: PayLinkSigner;
  /** The URL a pay link is built on, such as `https://pay.example.test/fees`. */
  readonly payLinkBaseUrl: string;
  /** The school's name, for a template that names it. */
  readonly schoolName?: string;
  /** The clock. Injectable so a test pins the instant. */
  readonly now?: () => Date;
}

/** What a caller states to record an opt-out. */
export interface RecordOptOutInput {
  readonly institutionId: string;
  readonly payerId: string;
  readonly scope: ReminderOptOutScope;
  readonly source?: 'payer' | 'staff';
  readonly reason?: string;
  readonly recordedAt?: string;
}

/** What a caller states to record a promise to pay. */
export interface RecordPromiseInput {
  readonly institutionId: string;
  readonly documentKey: string;
  readonly payerId: string;
  readonly amount: Money;
  readonly promisedOn: string;
  readonly note?: string;
  readonly recordedAt?: string;
}

/** What a caller states to mint a pay link. */
export interface IssuePayLinkInput {
  readonly institutionId: string;
  readonly documentKey: string;
  readonly payerId: string;
  readonly amount: Money;
  /** Overrides the schedule's own lifetime. */
  readonly ttlDays?: number;
  readonly now?: Date;
}

/** A pay link and the URL that carries it. */
export interface IssuedPayLink {
  readonly link: PayLink;
  readonly url: string;
}

/** What the service records about one delivery. */
interface DeliverFacts {
  readonly institutionId: string;
  readonly documentKey: string;
  readonly payerId: string;
  readonly payerName: string;
  readonly subjectName: string;
  readonly documentNumber: string | null;
  readonly dueDate: string | null;
  readonly amount: Money;
  readonly daysPastDue: number;
  readonly channel: ReminderChannel;
  readonly category: ReminderCategory;
  readonly to: string;
  readonly locale?: string;
  readonly ttlDays?: number;
  /** The templates the schedule pins, so delivery picks the same one the selection checked. */
  readonly templateIds?: Readonly<Partial<Record<ReminderChannel, string>>>;
}

/** The outcome of trying to deliver one reminder. */
type DeliverOutcome =
  | { readonly kind: 'sent'; readonly delivery: ReminderDelivery }
  | { readonly kind: 'failed'; readonly reason: ReminderReason; readonly detail: string };

const DEFAULT_PAY_LINK_TTL_DAYS = 14;

/**
 * The collections service.
 *
 * A run is a decision plus a delivery plus a record. It composes the statements module for the
 * amount (never recomputing a balance), the schedule's quiet hours and the payer's opt-outs for the
 * gate, the template for the words, and the injected channel for the delivery. What it owns is the
 * decision and the one-attempt-per-document-and-interval record that makes a re-run safe.
 */
export class CollectionsService {
  private readonly store: CollectionsStore;
  private readonly channels: ReadonlyMap<ReminderChannel, ReminderChannelPort>;
  private readonly templates: readonly ReminderTemplate[];
  private readonly reader: StatementReader;
  private readonly signer: PayLinkSigner;
  private readonly payLinkBaseUrl: string;
  private readonly schoolName: string;
  private readonly clock: () => Date;

  constructor(options: CollectionsServiceOptions) {
    this.store = options.store;
    this.channels = new Map(options.channels.map((channel) => [channel.channel, channel]));
    this.templates = options.templates;
    this.reader = options.reader;
    this.signer = options.signer;
    this.payLinkBaseUrl = options.payLinkBaseUrl;
    this.schoolName = options.schoolName ?? '';
    this.clock = options.now ?? (() => new Date());
  }

  // ------------------------------------------------------------------ schedule

  /** Stores a schedule, refusing one the run could not honour. */
  async saveSchedule(schedule: ReminderSchedule): Promise<ReminderSchedule> {
    validateSchedule(schedule);
    await this.store.saveSchedule(schedule);
    return schedule;
  }

  /** The schedules of an institution. */
  schedules(institutionId: string): Promise<readonly ReminderSchedule[]> {
    return this.store.listSchedules(institutionId);
  }

  /** One schedule, or null. */
  schedule(id: string): Promise<ReminderSchedule | null> {
    return this.store.schedule(id);
  }

  // ------------------------------------------------------------------- opt-outs

  /**
   * Records an opt-out.
   *
   * The row is keyed by payer and scope, so recording the same instruction twice updates it rather
   * than duplicating it, and it lives in its own table: editing a schedule cannot clear it, and a
   * re-run reads it again.
   */
  async recordOptOut(input: RecordOptOutInput): Promise<ReminderOptOut> {
    const optOut: ReminderOptOut = {
      id: generateUuidv7(),
      institutionId: input.institutionId,
      payerId: input.payerId,
      scope: input.scope,
      source: input.source ?? 'payer',
      ...(input.reason === undefined ? {} : { reason: input.reason }),
      recordedAt: input.recordedAt ?? this.clock().toISOString(),
    };
    await this.store.insertOptOut(optOut);
    return optOut;
  }

  /** The opt-outs of an institution. */
  optOuts(institutionId: string): Promise<readonly ReminderOptOut[]> {
    return this.store.optOuts(institutionId);
  }

  // ------------------------------------------------------------------ promises

  /** Records a promise to pay. */
  async recordPromise(input: RecordPromiseInput): Promise<PromiseToPay> {
    const promise: PromiseToPay = {
      id: generateUuidv7(),
      institutionId: input.institutionId,
      documentKey: input.documentKey,
      payerId: input.payerId,
      amount: input.amount,
      promisedOn: input.promisedOn,
      status: 'open',
      ...(input.note === undefined ? {} : { note: input.note }),
      recordedAt: input.recordedAt ?? this.clock().toISOString(),
      resolvedAt: null,
    };
    await this.store.savePromise(promise);
    return promise;
  }

  /** The promises of an institution, optionally for one document. */
  promises(institutionId: string, documentKey?: string): Promise<readonly PromiseToPay[]> {
    return this.store.promises(institutionId, documentKey);
  }

  // ------------------------------------------------------------------ pay links

  /**
   * Mints a pay link for a document.
   *
   * The token is a fresh UUIDv7; the signature covers the token and the expiry and nothing else, so
   * the URL carries no personal data. The row holds the document, the payer and the amount.
   */
  async issuePayLink(input: IssuePayLinkInput): Promise<IssuedPayLink> {
    const now = input.now ?? this.clock();
    const ttlDays = input.ttlDays ?? DEFAULT_PAY_LINK_TTL_DAYS;
    const expiresAt = new Date(now.getTime() + ttlDays * 86_400_000).toISOString();
    const token = generateUuidv7();
    const parts: PayLinkUrlParts = {
      token,
      expiresAt,
      signature: await this.signer.sign(payLinkPayload({ token, expiresAt })),
    };
    const link: PayLink = {
      token,
      institutionId: input.institutionId,
      documentKey: input.documentKey,
      payerId: input.payerId,
      amount: input.amount,
      createdAt: now.toISOString(),
      expiresAt,
      signature: parts.signature,
      usedAt: null,
    };
    await this.store.insertPayLink(link);
    return { link, url: payLinkUrl({ baseUrl: this.payLinkBaseUrl, ...parts }) };
  }

  /** Verifies a pay link, by its URL or its three parts. */
  async verifyPayLink(
    link: string | PayLinkUrlParts,
    now?: Date
  ): Promise<PayLinkVerification> {
    const parts = typeof link === 'string' ? parsePayLinkUrl(link) : link;
    const record = await this.store.payLink(parts.token);
    return verifyPayLinkRecord({ signer: this.signer, parts, record, ...(now === undefined ? {} : { now }) });
  }

  /** Marks a pay link used, once. */
  async markPayLinkUsed(token: string, at?: string): Promise<void> {
    await this.store.markPayLinkUsed(token, at ?? this.clock().toISOString());
  }

  // ----------------------------------------------------------------------- run

  /**
   * Runs a schedule.
   *
   * It first releases anything quiet hours queued and whose window has opened, then decides the
   * fresh candidates. Every outcome is recorded as one attempt per document and interval, so a
   * re-run of the same day finds the sent rows and sends nothing twice.
   */
  async run(input: ReminderRunInput): Promise<ReminderRunResult> {
    const schedule = await this.store.schedule(input.scheduleId);
    if (!schedule) {
      throw new CollectionsError('schedule_not_found', `the schedule ${input.scheduleId} does not exist`, {
        detail: { scheduleId: input.scheduleId },
      });
    }

    const at = input.at === undefined ? this.clock() : new Date(input.at);
    const atIso = at.toISOString();
    const runDay = localIsoDay(schedule.quietHours.timezone, at);
    const institutionId = schedule.institutionId;

    const decisions: ReminderDecision[] = [];
    const deliveries: ReminderDeliveryRecord[] = [];
    const failures: string[] = [];
    let sent = 0;
    let deferred = 0;
    let suppressed = 0;
    let skipped = 0;

    if (!schedule.enabled) {
      return {
        scheduleId: schedule.id,
        institutionId,
        disabled: true,
        runDay,
        at: atIso,
        decisions,
        deliveries,
        sent,
        deferred,
        suppressed,
        skipped,
        failures,
      };
    }

    const [optOuts, promises, attempts] = await Promise.all([
      this.store.optOuts(institutionId),
      this.store.promises(institutionId),
      this.store.attempts(institutionId),
    ]);

    const subjects: SelectionSubject[] = [];
    for (const ref of input.subjects) {
      subjects.push({ ref, statement: await this.reader.statementFor(ref) });
    }
    const payerById = new Map<string, ReminderPayer>(
      input.subjects.map((ref) => [ref.payer.id, ref.payer])
    );
    const outstandingKeys = new Set<string>();
    for (const subject of subjects) {
      for (const candidate of candidatesFromStatement(subject.statement, runDay)) {
        outstandingKeys.add(candidate.documentKey);
      }
    }

    // A promise whose document has left the statement is kept; one whose day has passed with the
    // document still outstanding is broken. The break is recorded, so a later run still escalates.
    const resolution = resolvePromises(promises, runDay, outstandingKeys);
    for (const promise of resolution.kept) {
      await this.store.savePromise({ ...promise, status: 'kept', resolvedAt: atIso });
    }
    for (const promise of resolution.broken) {
      await this.store.savePromise({ ...promise, status: 'broken', resolvedAt: atIso });
    }

    // 1. Release what quiet hours queued and whose window has opened. A released reminder was
    // decided on an earlier run, so it appears in `deliveries` rather than in `decisions`.
    const queued = await this.store.queuedAttempts(institutionId, atIso);
    for (const attempt of queued) {
      const locale = payerById.get(attempt.payerId)?.locale;
      const optOut = optOutBlocks(optOuts, attempt.payerId, attempt.channel, attempt.category);
      if (optOut) {
        await this.restate(attempt, 'suppressed', 'opted_out', null, atIso);
        suppressed += 1;
        continue;
      }
      if (suppressingPromise(promises, attempt.documentKey, runDay)) {
        await this.restate(attempt, 'suppressed', 'promise_to_pay', null, atIso);
        suppressed += 1;
        continue;
      }
      const outcome = await this.deliver({
        institutionId,
        documentKey: attempt.documentKey,
        payerId: attempt.payerId,
        payerName: attempt.payerName,
        subjectName: attempt.subjectName,
        documentNumber: attempt.documentNumber,
        dueDate: attempt.dueDate,
        amount: attempt.amount,
        daysPastDue: 0,
        channel: attempt.channel,
        category: attempt.category,
        to: attempt.toAddress,
        ...(locale === undefined ? {} : { locale }),
        ...(schedule.templateIds === undefined ? {} : { templateIds: schedule.templateIds }),
      });
      if (outcome.kind === 'sent' && outcome.delivery.success) {
        await this.restate(attempt, 'sent', 'deferred_released', null, atIso, outcome.delivery.messageId, atIso);
        sent += 1;
        deliveries.push({
          documentKey: attempt.documentKey,
          intervalId: attempt.intervalId,
          payerId: attempt.payerId,
          channel: attempt.channel,
          category: attempt.category,
          to: attempt.toAddress,
          messageId: outcome.delivery.messageId,
          status: outcome.delivery.status,
          resumedFromDeferral: true,
          sentAt: atIso,
        });
        continue;
      }
      const reason: ReminderReason = outcome.kind === 'sent' ? 'delivery_failed' : outcome.reason;
      const detail = outcome.kind === 'sent' ? (outcome.delivery.detail ?? 'the channel refused it') : outcome.detail;
      failures.push(`${attempt.documentKey}#${attempt.intervalId}: ${detail}`);
      await this.restate(attempt, 'queued', reason, atIso, atIso);
    }

    // 2. Decide and act on the fresh candidates.
    decisions.push(
      ...selectDueReminders({
        schedule,
        subjects,
        runDay,
        at: atIso,
        attempts,
        optOuts,
        promises,
        templates: this.templates,
      })
    );

    for (const decision of decisions) {
      switch (decision.outcome) {
        case 'send': {
          const to = payerById.get(decision.payerId)?.contacts[decision.channel];
          if (to === undefined) {
            skipped += 1;
            await this.record(decision, schedule, '', 'skipped', 'no_contact', null, atIso);
            continue;
          }
          const locale = payerById.get(decision.payerId)?.locale;
          const outcome = await this.deliver({
            institutionId,
            documentKey: decision.documentKey,
            payerId: decision.payerId,
            payerName: decision.payerName,
            subjectName: decision.subjectName,
            documentNumber: decision.documentNumber ?? null,
            dueDate: decision.dueDate,
            amount: decision.amount,
            daysPastDue: decision.daysPastDue,
            channel: decision.channel,
            category: decision.category,
            to,
            ...(locale === undefined ? {} : { locale }),
            ...(schedule.payLinkTtlDays === undefined ? {} : { ttlDays: schedule.payLinkTtlDays }),
            ...(schedule.templateIds === undefined ? {} : { templateIds: schedule.templateIds }),
          });
          if (outcome.kind === 'sent' && outcome.delivery.success) {
            sent += 1;
            await this.record(decision, schedule, to, 'sent', 'due', null, atIso, outcome.delivery.messageId, atIso);
            deliveries.push({
              documentKey: decision.documentKey,
              intervalId: decision.intervalId,
              payerId: decision.payerId,
              channel: decision.channel,
              category: decision.category,
              to,
              messageId: outcome.delivery.messageId,
              status: outcome.delivery.status,
              resumedFromDeferral: false,
              sentAt: atIso,
            });
            continue;
          }
          const reason: ReminderReason = outcome.kind === 'sent' ? 'delivery_failed' : outcome.reason;
          const detail = outcome.kind === 'sent' ? (outcome.delivery.detail ?? 'the channel refused it') : outcome.detail;
          failures.push(`${decision.documentKey}#${decision.intervalId}: ${detail}`);
          await this.record(decision, schedule, to, 'queued', reason, atIso, atIso);
          continue;
        }
        case 'deferred': {
          deferred += 1;
          const to = payerById.get(decision.payerId)?.contacts[decision.channel] ?? '';
          await this.record(decision, schedule, to, 'queued', 'quiet_hours', decision.deferredUntil, atIso);
          continue;
        }
        case 'suppressed': {
          suppressed += 1;
          const to = payerById.get(decision.payerId)?.contacts[decision.channel] ?? '';
          await this.record(decision, schedule, to, 'suppressed', decision.reason, null, atIso);
          continue;
        }
        case 'skipped': {
          skipped += 1;
          if (decision.reason !== 'already_sent') {
            const to = payerById.get(decision.payerId)?.contacts[decision.channel] ?? '';
            await this.record(decision, schedule, to, 'skipped', decision.reason, null, atIso);
          }
          continue;
        }
      }
    }

    return {
      scheduleId: schedule.id,
      institutionId,
      disabled: false,
      runDay,
      at: atIso,
      decisions,
      deliveries,
      sent,
      deferred,
      suppressed,
      skipped,
      failures,
    };
  }

  // ---------------------------------------------------------------- internals

  /**
   * Renders and sends one reminder, minting its pay link.
   *
   * A missing template or an unrenderable one is a refusal, not a send: the reminder is reported
   * with the reason rather than delivered half-formed.
   */
  private async deliver(facts: DeliverFacts): Promise<DeliverOutcome> {
    const port = this.channels.get(facts.channel);
    if (!port) return { kind: 'failed', reason: 'no_contact', detail: `no ${facts.channel} channel is wired` };

    const locale = facts.locale;
    const template = pickTemplate(this.templates, {
      channel: facts.channel,
      category: facts.category,
      ...(locale === undefined ? {} : { locale }),
      ...(facts.templateIds === undefined ? {} : { templateIds: facts.templateIds }),
    });
    if (!template) {
      return { kind: 'failed', reason: 'no_template', detail: `no ${facts.category} template for ${facts.channel}` };
    }

    const issued = await this.issuePayLink({
      institutionId: facts.institutionId,
      documentKey: facts.documentKey,
      payerId: facts.payerId,
      amount: facts.amount,
      ...(facts.ttlDays === undefined ? {} : { ttlDays: facts.ttlDays }),
    });

    const variables = reminderVariables({
      payerName: facts.payerName,
      learnerName: facts.subjectName,
      amount: facts.amount,
      dueDate: facts.dueDate,
      ...(facts.documentNumber === null ? {} : { invoiceNumber: facts.documentNumber }),
      daysPastDue: facts.daysPastDue,
      payLink: issued.url,
      school: this.schoolName,
      ...(locale === undefined ? {} : { locale }),
    });

    let rendered: { readonly subject?: string; readonly body: string };
    try {
      rendered = renderTemplate(template, variables);
    } catch (error) {
      const detail = error instanceof CollectionsError ? error.message : String(error);
      return { kind: 'failed', reason: 'no_template', detail };
    }

    const delivery = await port.send({
      channel: facts.channel,
      to: facts.to,
      body: rendered.body,
      ...(rendered.subject === undefined ? {} : { subject: rendered.subject }),
    });
    return { kind: 'sent', delivery };
  }

  /** Records one decision as an attempt row. */
  private async record(
    decision: ReminderDecision,
    schedule: ReminderSchedule,
    to: string,
    state: ReminderAttemptState,
    reason: ReminderReason,
    scheduledFor: string | null,
    now: string,
    messageId?: string,
    sentAt?: string
  ): Promise<void> {
    await this.store.saveAttempt({
      id: generateUuidv7(),
      institutionId: schedule.institutionId,
      scheduleId: schedule.id,
      documentKey: decision.documentKey,
      intervalId: decision.intervalId,
      payerId: decision.payerId,
      payerName: decision.payerName,
      subjectName: decision.subjectName,
      documentNumber: decision.documentNumber ?? null,
      dueDate: decision.dueDate,
      amount: decision.amount,
      channel: decision.channel,
      category: decision.category,
      toAddress: to,
      state,
      reason,
      scheduledFor,
      sentAt: sentAt ?? null,
      messageId: messageId ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Moves a queued attempt to a new state. */
  private async restate(
    attempt: ReminderAttempt,
    state: ReminderAttemptState,
    reason: ReminderReason,
    scheduledFor: string | null,
    now: string,
    messageId?: string,
    sentAt?: string
  ): Promise<void> {
    await this.store.saveAttempt({
      ...attempt,
      state,
      reason,
      scheduledFor,
      messageId: messageId ?? attempt.messageId,
      sentAt: sentAt ?? attempt.sentAt,
      updatedAt: now,
    });
  }
}
