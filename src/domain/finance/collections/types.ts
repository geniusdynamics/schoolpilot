// ABOUTME: The vocabulary of the collections module: the channels and categories a reminder goes
// ABOUTME: out on, the schedule that says when, the template that says what, the pay link, the
// ABOUTME: promise to pay, the quiet hours and opt-outs that gate it, and the ports it reads and
// ABOUTME: delivers through.

import type { Statement } from '@/domain/finance/statements';
import type { Money } from '@/domain/money';
import type { SMSPlugin } from '@/plugins/types';

// ---------------------------------------------------------------------------
// Channels and categories.
// ---------------------------------------------------------------------------

/**
 * A channel a reminder may go out on.
 *
 * These are the channels the canonical `learner_guardian` already models
 * (`PREFERRED_CHANNELS` in `@/domain/schema`), narrowed to the four a fee reminder uses. A
 * reminder goes out on the first of the schedule's channels the payer has a contact for, so
 * one invoice and one interval produce one reminder, not one per channel.
 */
export type ReminderChannel = 'sms' | 'whatsapp' | 'email' | 'portal';

/** Every channel, in the order the module prefers when nothing else says. */
export const REMINDER_CHANNELS: readonly ReminderChannel[] = ['sms', 'whatsapp', 'email', 'portal'];

/** What a reminder is about: the tone ladder of spec 05 §6, gentle to firm. */
export type ReminderCategory = 'fee_reminder' | 'overdue_notice' | 'final_notice';

/** Every category, gentle to firm. */
export const REMINDER_CATEGORIES: readonly ReminderCategory[] = [
  'fee_reminder',
  'overdue_notice',
  'final_notice',
];

/** The tone of a template, matching the category ladder. */
export type ReminderTone = 'gentle' | 'firm' | 'final';

/** Whom a schedule addresses: one learner's family, a household's payer, or a sponsor. */
export type ReminderAudience = 'learner' | 'household' | 'sponsor';

// ---------------------------------------------------------------------------
// The schedule: when to remind.
// ---------------------------------------------------------------------------

/** Where an interval sits relative to the due date. */
export type ReminderIntervalPhase = 'before_due' | 'on_due' | 'after_due';

/**
 * One point at which a schedule reminds.
 *
 * `days` is a whole-day distance from the due date: `before_due` subtracts it, `after_due` adds
 * it, `on_due` is 0. `id` is the interval's stable identity and is half of the idempotency key,
 * so it must not be reused for a different point when a schedule is edited.
 */
export interface ReminderInterval {
  readonly id: string;
  readonly phase: ReminderIntervalPhase;
  readonly days: number;
  readonly label?: string;
}

/**
 * The window a reminder must not be sent in.
 *
 * The window is read in the schedule's own IANA time zone: `start` and `end` are local wall
 * clock, `start` inclusive and `end` exclusive, and a window may cross midnight (`end` earlier
 * than `start`). A reminder that falls inside is queued for the next window, never dropped.
 */
export interface QuietHours {
  readonly enabled: boolean;
  /** Window start, local wall clock `HH:mm`, inclusive. */
  readonly start: string;
  /** Window end, local wall clock `HH:mm`, exclusive. */
  readonly end: string;
  /** The IANA time zone the window is read in, such as `Africa/Nairobi`. */
  readonly timezone: string;
}

/** A reminder schedule: when to remind whom, and how. */
export interface ReminderSchedule {
  readonly id: string;
  readonly institutionId: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly audience: ReminderAudience;
  /** The category the schedule's own reminders are sent under. */
  readonly category: ReminderCategory;
  /** The category a broken promise escalates to. Absent means a broken promise does not escalate. */
  readonly escalationCategory?: ReminderCategory;
  readonly intervals: readonly ReminderInterval[];
  /** The channels in preference order. The first the payer has a contact for is used. */
  readonly channels: readonly ReminderChannel[];
  /** The default locale for template selection; a payer's own locale wins over it. */
  readonly locale?: string;
  readonly quietHours: QuietHours;
  /** How many days past an interval's day a run may still fire it. Default 0, the exact day. */
  readonly catchUpDays?: number;
  /** Skip a document whose outstanding is below this. Absent means no floor. */
  readonly minAmountMinor?: number;
  /** Whether a broken promise escalates the next reminder. Default true. */
  readonly escalateOnBrokenPromise?: boolean;
  /** The template ids to pin, by channel, when more than one template matches. */
  readonly templateIds?: Readonly<Partial<Record<ReminderChannel, string>>>;
  /** How long a pay link minted for this schedule lives. Default 14 days. */
  readonly payLinkTtlDays?: number;
}

// ---------------------------------------------------------------------------
// Templates: what the reminder says.
// ---------------------------------------------------------------------------

/**
 * The variables a template may use.
 *
 * A template writes them as `{{name}}`, the placeholder convention the existing communication
 * templates and the built-in SMS mock already use. A template that names anything else is
 * refused rather than rendered with a stray brace.
 */
export interface ReminderVariables {
  readonly payer: string;
  readonly learner: string;
  readonly household: string;
  readonly amount: string;
  readonly currency: string;
  readonly dueDate: string;
  readonly invoiceNumber: string;
  readonly daysPastDue: string;
  readonly payLink: string;
  readonly school: string;
}

/** The name of every variable a template may use. */
export const REMINDER_VARIABLES: readonly (keyof ReminderVariables)[] = [
  'payer',
  'learner',
  'household',
  'amount',
  'currency',
  'dueDate',
  'invoiceNumber',
  'daysPastDue',
  'payLink',
  'school',
];

/** One message template for one channel, category and locale. */
export interface ReminderTemplate {
  readonly id: string;
  readonly name: string;
  readonly channel: ReminderChannel;
  readonly category: ReminderCategory;
  readonly tone: ReminderTone;
  /** The locale it is written for, such as `en-KE`; `*` matches any payer locale. */
  readonly locale: string;
  /** The subject line, for a channel that has one. */
  readonly subject?: string;
  /** The body, with `{{variable}}` placeholders. */
  readonly body: string;
}

// ---------------------------------------------------------------------------
// The payer and the subject a run reads.
// ---------------------------------------------------------------------------

/** The payer a reminder reaches, and the addresses it may be reached on. */
export interface ReminderPayer {
  readonly id: string;
  readonly name: string;
  /** The address to reach the payer on, by channel. A channel with no entry cannot be used. */
  readonly contacts: Readonly<Partial<Record<ReminderChannel, string>>>;
  /** The payer's locale; a template written for it is preferred. */
  readonly locale?: string;
}

/** One subject a run considers: a learner, a household or a sponsor, with their payer. */
export interface ReminderSubjectRef {
  readonly kind: ReminderAudience;
  readonly id: string;
  readonly name: string;
  readonly payer: ReminderPayer;
}

/**
 * Where a run reads a subject's statement.
 *
 * The reminder never computes a balance: it reads the statement the statements module built and
 * ages the outstanding items from it. `StatementService` satisfies this port with a thin adapter
 * over `learnerStatement`, `householdStatement` and `sponsorStatement`.
 */
export interface StatementReader {
  statementFor(subject: ReminderSubjectRef): Promise<Statement>;
}

// ---------------------------------------------------------------------------
// Opt-outs.
// ---------------------------------------------------------------------------

/**
 * What an opt-out silences.
 *
 * A `channel` opt-out silences one channel, a `category` opt-out silences one category across
 * channels (a payer who wants no final demands still gets the gentle ones), and `all` silences
 * every reminder for the payer.
 */
export type ReminderOptOutScope =
  | { readonly kind: 'channel'; readonly channel: ReminderChannel }
  | { readonly kind: 'category'; readonly category: ReminderCategory }
  | { readonly kind: 'all' };

/** A payer's standing instruction not to be reminded. It outlives any schedule. */
export interface ReminderOptOut {
  readonly id: string;
  readonly institutionId: string;
  readonly payerId: string;
  readonly scope: ReminderOptOutScope;
  /** Who recorded it. */
  readonly source: 'payer' | 'staff';
  readonly reason?: string;
  readonly recordedAt: string;
}

// ---------------------------------------------------------------------------
// Promise to pay.
// ---------------------------------------------------------------------------

/** Where a promise stands. `open` is a promise still in force or not yet due. */
export type PromiseStatus = 'open' | 'kept' | 'broken';

/**
 * A payer's commitment to pay an amount by a day.
 *
 * While it is `open` and its day has not passed, reminders for the document are suppressed. Once
 * the day passes and the document is still outstanding the promise is `broken` and reminders
 * resume - escalated, when the schedule asks. A document that leaves the statement (paid in
 * full) resolves the promise as `kept` without a reminder ever being sent.
 */
export interface PromiseToPay {
  readonly id: string;
  readonly institutionId: string;
  /** The invoice, or the subject's balance, as the statement's aging names it. */
  readonly documentKey: string;
  readonly payerId: string;
  readonly amount: Money;
  /** The day the payer promised to pay by, ISO `YYYY-MM-DD`. */
  readonly promisedOn: string;
  readonly status: PromiseStatus;
  readonly note?: string;
  readonly recordedAt: string;
  readonly resolvedAt: string | null;
}

// ---------------------------------------------------------------------------
// Pay links.
// ---------------------------------------------------------------------------

/**
 * A pay link, as it is stored.
 *
 * The row holds what the link is for - the document, the payer, the amount. The link itself
 * carries none of it: only an opaque token, an expiry and a signature (see
 * {@link PayLinkUrlParts}), so a link that leaks reveals nothing about the family.
 */
export interface PayLink {
  readonly token: string;
  readonly institutionId: string;
  readonly documentKey: string;
  readonly payerId: string;
  readonly amount: Money;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly signature: string;
  readonly usedAt: string | null;
}

/** The only three things a pay link URL carries. No learner, payer, name, phone or amount. */
export interface PayLinkUrlParts {
  readonly token: string;
  readonly expiresAt: string;
  readonly signature: string;
}

/** Why a pay link was refused. */
export type PayLinkRejection = 'unknown_token' | 'expired' | 'bad_signature' | 'already_used';

/** What verifying a pay link reports. */
export interface PayLinkVerification {
  readonly valid: boolean;
  readonly reason: PayLinkRejection | 'ok';
  readonly link: PayLink | null;
}

/** Signs and verifies a pay link's payload. */
export interface PayLinkSigner {
  sign(payload: string): Promise<string>;
  verify(payload: string, signature: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Delivery.
// ---------------------------------------------------------------------------

/** One message handed to a channel. */
export interface ReminderMessage {
  readonly channel: ReminderChannel;
  readonly to: string;
  readonly body: string;
  readonly subject?: string;
}

/** What a channel reports back. */
export interface ReminderDelivery {
  readonly success: boolean;
  readonly messageId: string;
  readonly status: 'sent' | 'failed' | 'pending';
  readonly detail?: string;
}

/** A channel a reminder is delivered through. Injected, so a test never sends anything real. */
export interface ReminderChannelPort {
  readonly channel: ReminderChannel;
  send(message: ReminderMessage): Promise<ReminderDelivery>;
}

/** The shape of the existing SMS plugin the `sms` channel adapts. `SMSPlugin` satisfies it. */
export type SmsSender = Pick<SMSPlugin, 'send'>;

// ---------------------------------------------------------------------------
// Selection.
// ---------------------------------------------------------------------------

/** Whether a candidate is a per-invoice aging item or a subject-level balance. */
export type ReminderDocumentSource = 'invoice' | 'balance';

/** One document a run may remind about, read from the statement's aging. */
export interface ReminderCandidate {
  /** The invoice id, or `balance:<kind>:<subjectId>` for a subject with no per-invoice aging. */
  readonly documentKey: string;
  readonly source: ReminderDocumentSource;
  readonly documentNumber?: string;
  readonly dueDate: string | null;
  readonly outstanding: Money;
  readonly daysPastDue: number;
}

/** What a run decided about one candidate at one interval. */
export type ReminderOutcome = 'send' | 'deferred' | 'suppressed' | 'skipped';

/** Why a run reached its outcome. */
export type ReminderReason =
  | 'due'
  | 'already_sent'
  | 'nothing_outstanding'
  | 'below_threshold'
  | 'opted_out'
  | 'promise_to_pay'
  | 'quiet_hours'
  | 'no_template'
  | 'no_contact'
  | 'delivery_failed'
  | 'deferred_released';

/** What a run decided about one candidate at one interval, and why. */
export interface ReminderDecision {
  readonly subjectKind: ReminderAudience;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly payerId: string;
  readonly payerName: string;
  readonly channel: ReminderChannel;
  readonly category: ReminderCategory;
  readonly intervalId: string;
  readonly documentKey: string;
  readonly documentNumber?: string;
  readonly dueDate: string | null;
  readonly amount: Money;
  readonly daysPastDue: number;
  readonly outcome: ReminderOutcome;
  readonly reason: ReminderReason;
  /** True when a broken promise escalated this reminder to the schedule's firmer category. */
  readonly escalated: boolean;
  /** When deferred: the instant the next window opens. Otherwise null. */
  readonly deferredUntil: string | null;
  /** The opt-out that silenced this reminder, when one did. */
  readonly optedOutBy?: string;
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

/** What a run is asked to do. */
export interface ReminderRunInput {
  readonly scheduleId: string;
  /** The instant the run happens at. Defaults to the service clock. */
  readonly at?: string;
  /** The subjects the run considers, each with the payer to remind and a way to read them. */
  readonly subjects: readonly ReminderSubjectRef[];
}

/** One reminder that reached a channel. */
export interface ReminderDeliveryRecord {
  readonly documentKey: string;
  readonly intervalId: string;
  readonly payerId: string;
  readonly channel: ReminderChannel;
  readonly category: ReminderCategory;
  readonly to: string;
  readonly messageId: string;
  readonly status: 'sent' | 'failed' | 'pending';
  /** True when the reminder was queued by quiet hours and released by this run. */
  readonly resumedFromDeferral: boolean;
  readonly sentAt: string;
}

/** What a run did. */
export interface ReminderRunResult {
  readonly scheduleId: string;
  readonly institutionId: string;
  /** True when the schedule is switched off, so the run considered nobody. */
  readonly disabled: boolean;
  /** The day the run was made for, in the schedule's time zone. */
  readonly runDay: string;
  readonly at: string;
  readonly decisions: readonly ReminderDecision[];
  readonly deliveries: readonly ReminderDeliveryRecord[];
  readonly sent: number;
  readonly deferred: number;
  readonly suppressed: number;
  readonly skipped: number;
  /** The deliveries that failed, as `documentKey#intervalId: detail`. */
  readonly failures: readonly string[];
}

// ---------------------------------------------------------------------------
// Persistence.
// ---------------------------------------------------------------------------

/** Where a persisted reminder attempt stands. */
export type ReminderAttemptState = 'queued' | 'sent' | 'suppressed' | 'skipped';

/**
 * The one row the module keeps per (document, interval).
 *
 * The row is the idempotency proof: a reminder that has been sent is `sent`, and a re-run finds
 * the row and skips. A reminder deferred by quiet hours is `queued` with the instant its window
 * opens; the next run drains it. A reminder silenced by an opt-out or a promise is `suppressed`,
 * and stays re-evaluated on later runs so lifting the opt-out or breaking the promise resumes it.
 */
export interface ReminderAttempt {
  readonly id: string;
  readonly institutionId: string;
  readonly scheduleId: string;
  readonly documentKey: string;
  readonly intervalId: string;
  readonly payerId: string;
  readonly payerName: string;
  readonly subjectName: string;
  readonly documentNumber: string | null;
  readonly dueDate: string | null;
  readonly amount: Money;
  readonly channel: ReminderChannel;
  readonly category: ReminderCategory;
  readonly toAddress: string;
  readonly state: ReminderAttemptState;
  readonly reason: string;
  /** For a queued attempt: the instant its window opens. */
  readonly scheduledFor: string | null;
  readonly sentAt: string | null;
  readonly messageId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * The persistence a collections run needs.
 *
 * The canonical registry models no reminder, so - like the ledger and the cashier session - the
 * module keeps its own tables. `transaction` binds a store that joins the caller's transaction,
 * so a run that writes several attempts writes them together.
 */
export interface CollectionsStore {
  transaction<T>(work: (tx: CollectionsStore) => Promise<T>): Promise<T>;
  saveSchedule(schedule: ReminderSchedule): Promise<void>;
  schedule(id: string): Promise<ReminderSchedule | null>;
  listSchedules(institutionId: string): Promise<readonly ReminderSchedule[]>;
  insertOptOut(optOut: ReminderOptOut): Promise<void>;
  optOuts(institutionId: string): Promise<readonly ReminderOptOut[]>;
  savePromise(promise: PromiseToPay): Promise<void>;
  promises(institutionId: string, documentKey?: string): Promise<readonly PromiseToPay[]>;
  insertPayLink(link: PayLink): Promise<void>;
  payLink(token: string): Promise<PayLink | null>;
  markPayLinkUsed(token: string, usedAt: string): Promise<void>;
  attempt(
    institutionId: string,
    documentKey: string,
    intervalId: string
  ): Promise<ReminderAttempt | null>;
  attempts(institutionId: string): Promise<readonly ReminderAttempt[]>;
  queuedAttempts(institutionId: string, at: string): Promise<readonly ReminderAttempt[]>;
  saveAttempt(attempt: ReminderAttempt): Promise<void>;
}
