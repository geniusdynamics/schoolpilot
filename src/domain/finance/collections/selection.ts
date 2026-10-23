// ABOUTME: The selection a run makes, as a pure function: from a schedule, the subjects' statements
// ABOUTME: and the persisted attempts, opt-outs and promises, it decides who is due a reminder, who
// ABOUTME: is deferred and who is skipped, and says why for each. No I/O, so it is tested directly.

import { daysPastDue, type AgingItem, type Statement } from '@/domain/finance/statements';
import { isZero } from '@/domain/money';

import { isIntervalDueOn } from './schedule';
import { optOutBlocks } from './optOuts';
import { suppressingPromise } from './promise';
import { quietHoursRelease } from './quietHours';
import { pickTemplate } from './templates';
import type {
  ReminderAttempt,
  ReminderCandidate,
  ReminderCategory,
  ReminderChannel,
  ReminderDecision,
  ReminderOptOut,
  ReminderPayer,
  ReminderSchedule,
  ReminderSubjectRef,
  ReminderTemplate,
  PromiseToPay,
} from './types';

/** The key one reminder is identified by: a document and an interval. */
export function reminderAttemptKey(documentKey: string, intervalId: string): string {
  return `${documentKey}#${intervalId}`;
}

/**
 * The outstanding documents a statement ages, as reminder candidates.
 *
 * This is the composition with the statements module: the amount is the `AgingItem.amount` the
 * statement already computed - the invoice total less what was allocated and credited - so a
 * partly paid invoice is reminded about only for what is left, and a reminder can never disagree
 * with the statement. A statement with no per-invoice aging (a sponsor statement, today) yields a
 * single balance candidate anchored on the day the statement was taken.
 */
export function candidatesFromStatement(
  statement: Statement,
  runDay: string
): readonly ReminderCandidate[] {
  const items = statement.aging.buckets.flatMap((bucket) => bucket.items);
  if (items.length > 0) {
    return items.map((item) => candidateFromItem(item, statement, runDay));
  }
  if (isZero(statement.closingBalance)) return [];
  return [
    {
      documentKey: `balance:${statement.kind}:${statement.subjectId}`,
      source: 'balance',
      dueDate: statement.asOf,
      outstanding: statement.closingBalance,
      daysPastDue: Math.max(0, daysFrom(statement.asOf, runDay)),
    },
  ];
}

function candidateFromItem(item: AgingItem, statement: Statement, runDay: string): ReminderCandidate {
  return {
    documentKey: item.documentId,
    source: 'invoice',
    ...(item.documentNumber === undefined ? {} : { documentNumber: item.documentNumber }),
    dueDate: item.dueDate ?? null,
    outstanding: item.amount,
    daysPastDue: Math.max(0, daysPastDue(item, runDay, statement.aging.missingDueDate)),
  };
}

/** Whole days from one ISO day to another, in UTC. */
function daysFrom(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  return Math.round((end - start) / 86_400_000);
}

/** One subject a run considers, with the statement read for it. */
export interface SelectionSubject {
  readonly ref: ReminderSubjectRef;
  readonly statement: Statement;
}

/** Everything the pure selection reads. */
export interface SelectRemindersInput {
  readonly schedule: ReminderSchedule;
  readonly subjects: readonly SelectionSubject[];
  /** The day the run is made for, in the schedule's time zone. */
  readonly runDay: string;
  /** The instant the run happens at, as an ISO instant. */
  readonly at: string;
  readonly attempts: readonly ReminderAttempt[];
  readonly optOuts: readonly ReminderOptOut[];
  readonly promises: readonly PromiseToPay[];
  readonly templates: readonly ReminderTemplate[];
}

/**
 * Decides, for every candidate whose interval falls due on the run's day, what happens to it.
 *
 * A candidate and interval whose day has not come produces no decision at all: the run reports who
 * is due, not the whole calendar. Every decision it does produce carries the reason, so a screen
 * can answer "who was reminded, and who was not, and why". The quiet-hours check is here rather
 * than in the service because it is pure arithmetic over the instant and the schedule's zone.
 */
export function selectDueReminders(input: SelectRemindersInput): readonly ReminderDecision[] {
  const { schedule, runDay } = input;
  const attemptByKey = new Map(
    input.attempts.map((attempt) => [reminderAttemptKey(attempt.documentKey, attempt.intervalId), attempt])
  );
  const brokenByDocument = brokenPromises(input.promises, runDay);
  const at = new Date(input.at);
  const decisions: ReminderDecision[] = [];

  for (const subject of input.subjects) {
    if (subject.ref.kind !== schedule.audience) continue;
    const candidates = candidatesFromStatement(subject.statement, runDay);
    for (const candidate of candidates) {
      for (const interval of schedule.intervals) {
        if (candidate.dueDate === null) continue;
        if (!isIntervalDueOn(interval, candidate.dueDate, runDay, schedule.catchUpDays ?? 0)) continue;

        const existing = attemptByKey.get(reminderAttemptKey(candidate.documentKey, interval.id));
        // A reminder already sent for this document and interval is never sent again.
        if (existing?.state === 'sent') {
          decisions.push(
            decision(subject, candidate, interval.id, {
              channel: existing.channel,
              category: existing.category,
              outcome: 'skipped',
              reason: 'already_sent',
            })
          );
          continue;
        }
        // A reminder queued for a later window is the queue's to release, not this run's to re-decide.
        if (existing?.state === 'queued') continue;

        decisions.push(decide(input, subject, candidate, interval.id, at, brokenByDocument));
      }
    }
  }

  return decisions;
}

function decide(
  input: SelectRemindersInput,
  subject: SelectionSubject,
  candidate: ReminderCandidate,
  intervalId: string,
  at: Date,
  brokenByDocument: ReadonlyMap<string, PromiseToPay>
): ReminderDecision {
  const { schedule } = input;
  const payer = subject.ref.payer;
  const channel = resolveChannel(schedule, payer);
  const category = effectiveCategory(schedule, candidate.documentKey, brokenByDocument);
  const escalated = category !== schedule.category;

  if (channel === null) {
    return decision(subject, candidate, intervalId, {
      channel: schedule.channels[0],
      category,
      escalated,
      outcome: 'skipped',
      reason: 'no_contact',
    });
  }

  const base = { channel, category, escalated };

  if (isZero(candidate.outstanding)) {
    return decision(subject, candidate, intervalId, {
      ...base,
      outcome: 'skipped',
      reason: 'nothing_outstanding',
    });
  }

  if (schedule.minAmountMinor !== undefined && candidate.outstanding.amount_minor < schedule.minAmountMinor) {
    return decision(subject, candidate, intervalId, {
      ...base,
      outcome: 'skipped',
      reason: 'below_threshold',
    });
  }

  const optOut = optOutBlocks(input.optOuts, payer.id, channel, category);
  if (optOut) {
    return decision(subject, candidate, intervalId, {
      ...base,
      outcome: 'suppressed',
      reason: 'opted_out',
      optedOutBy: optOut.id,
    });
  }

  if (suppressingPromise(input.promises, candidate.documentKey, input.runDay)) {
    return decision(subject, candidate, intervalId, {
      ...base,
      outcome: 'suppressed',
      reason: 'promise_to_pay',
    });
  }

  const locale = payer.locale ?? schedule.locale;
  const template = pickTemplate(input.templates, {
    channel,
    category,
    ...(locale === undefined ? {} : { locale }),
    ...(schedule.templateIds === undefined ? {} : { templateIds: schedule.templateIds }),
  });
  if (template === undefined) {
    return decision(subject, candidate, intervalId, {
      ...base,
      outcome: 'skipped',
      reason: 'no_template',
    });
  }

  const release = quietHoursRelease(schedule.quietHours, at);
  if (release.getTime() > at.getTime()) {
    return decision(subject, candidate, intervalId, {
      ...base,
      outcome: 'deferred',
      reason: 'quiet_hours',
      deferredUntil: release.toISOString(),
    });
  }

  return decision(subject, candidate, intervalId, { ...base, outcome: 'send', reason: 'due' });
}

/** The first channel the payer has a contact for, or null. */
export function resolveChannel(schedule: ReminderSchedule, payer: ReminderPayer): ReminderChannel | null {
  for (const channel of schedule.channels) {
    const contact = payer.contacts[channel];
    if (contact !== undefined && contact !== '') return channel;
  }
  return null;
}

/** The category a reminder goes out under: the schedule's, escalated when a promise was broken. */
export function effectiveCategory(
  schedule: ReminderSchedule,
  documentKey: string,
  brokenByDocument: ReadonlyMap<string, PromiseToPay>
): ReminderCategory {
  if (schedule.escalateOnBrokenPromise === false) return schedule.category;
  if (schedule.escalationCategory === undefined) return schedule.category;
  return brokenByDocument.has(documentKey) ? schedule.escalationCategory : schedule.category;
}

/** The promises that are broken on a day, keyed by the document they were made against. */
export function brokenPromises(
  promises: readonly PromiseToPay[],
  runDay: string
): ReadonlyMap<string, PromiseToPay> {
  const broken = new Map<string, PromiseToPay>();
  for (const promise of promises) {
    if (promise.status === 'broken') {
      broken.set(promise.documentKey, promise);
      continue;
    }
    if (promise.status === 'open' && promise.promisedOn < runDay) broken.set(promise.documentKey, promise);
  }
  return broken;
}

interface DecisionParts {
  readonly channel: ReminderChannel;
  readonly category: ReminderCategory;
  readonly outcome: ReminderDecision['outcome'];
  readonly reason: ReminderDecision['reason'];
  readonly escalated?: boolean;
  readonly deferredUntil?: string | null;
  readonly optedOutBy?: string;
}

function decision(
  subject: SelectionSubject,
  candidate: ReminderCandidate,
  intervalId: string,
  parts: DecisionParts
): ReminderDecision {
  return {
    subjectKind: subject.ref.kind,
    subjectId: subject.ref.id,
    subjectName: subject.ref.name,
    payerId: subject.ref.payer.id,
    payerName: subject.ref.payer.name,
    channel: parts.channel,
    category: parts.category,
    intervalId,
    documentKey: candidate.documentKey,
    ...(candidate.documentNumber === undefined ? {} : { documentNumber: candidate.documentNumber }),
    dueDate: candidate.dueDate,
    amount: candidate.outstanding,
    daysPastDue: candidate.daysPastDue,
    outcome: parts.outcome,
    reason: parts.reason,
    escalated: parts.escalated ?? false,
    deferredUntil: parts.deferredUntil ?? null,
    ...(parts.optedOutBy === undefined ? {} : { optedOutBy: parts.optedOutBy }),
  };
}
