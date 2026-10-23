// ABOUTME: The selection a run makes, without I/O: the candidates read from a statement's aging, and
// ABOUTME: every skip reason - already sent, opted out, promised, below the floor, no contact, no
// ABOUTME: template - plus the quiet-hours deferral and the escalation a broken promise causes.

import { describe, expect, it } from 'vitest';

import { agingSummary, buildStatement, outstandingItemsFromInvoices, type AgingItem, type Statement } from '@/domain/finance/statements';
import { fromMinor } from '@/domain/money';

import {
  candidatesFromStatement,
  selectDueReminders,
  type PromiseToPay,
  type ReminderAttempt,
  type ReminderDecision,
  type ReminderOptOut,
  type ReminderOptOutScope,
  type ReminderPayer,
  type ReminderReason,
  type ReminderSchedule,
  type ReminderTemplate,
  type SelectionSubject,
} from '..';

const KES = (minor: number) => fromMinor(minor, 'KES');
const DUE = '2027-02-05';
const RUN_DAY = '2027-02-05';

function item(id: string, dueDate: string | null, minor: number): AgingItem {
  return {
    id,
    documentId: id,
    documentNumber: `INV/${id}`,
    issueDate: '2027-01-05',
    dueDate,
    amount: KES(minor),
  };
}

function statementOf(items: readonly AgingItem[], overrides: Partial<Statement> = {}): Statement {
  const built = buildStatement({
    kind: 'learner',
    subjectId: 'learner-1',
    subjectName: 'Amani Wekesa',
    currency: 'KES',
    entries: [],
    period: {},
    asOf: RUN_DAY,
    agingItems: items,
  });
  return { ...built, ...overrides };
}

const schedule = (overrides: Partial<ReminderSchedule> = {}): ReminderSchedule => ({
  id: 'sch-1',
  institutionId: 'inst-1',
  name: 'Term fees',
  enabled: true,
  audience: 'learner',
  category: 'fee_reminder',
  escalationCategory: 'final_notice',
  intervals: [{ id: 'on_due', phase: 'on_due', days: 0 }],
  channels: ['sms'],
  locale: 'en-KE',
  quietHours: { enabled: false, start: '00:00', end: '00:00', timezone: 'UTC' },
  ...overrides,
});

const payer = (overrides: Partial<ReminderPayer> = {}): ReminderPayer => ({
  id: 'guardian-1',
  name: 'Grace Wekesa',
  contacts: { sms: '+254711000000' },
  locale: 'en-KE',
  ...overrides,
});

const subject = (statement: Statement, payerOverrides: Partial<ReminderPayer> = {}): SelectionSubject => ({
  ref: { kind: 'learner', id: statement.subjectId, name: statement.subjectName, payer: payer(payerOverrides) },
  statement,
});

const TEMPLATES: readonly ReminderTemplate[] = [
  { id: 'sms-gentle', name: 'Gentle', channel: 'sms', category: 'fee_reminder', tone: 'gentle', locale: 'en-KE', body: 'gentle' },
  { id: 'sms-final', name: 'Final', channel: 'sms', category: 'final_notice', tone: 'final', locale: 'en-KE', body: 'final' },
];

const attempt = (overrides: Partial<ReminderAttempt> = {}): ReminderAttempt => ({
  id: 'attempt-1',
  institutionId: 'inst-1',
  scheduleId: 'sch-1',
  documentKey: 'inv-1',
  intervalId: 'on_due',
  payerId: 'guardian-1',
  payerName: 'Grace Wekesa',
  subjectName: 'Amani Wekesa',
  documentNumber: 'INV/inv-1',
  dueDate: DUE,
  amount: KES(500_000),
  channel: 'sms',
  category: 'fee_reminder',
  toAddress: '+254711000000',
  state: 'sent',
  reason: 'due',
  scheduledFor: null,
  sentAt: '2027-02-05T09:00:00.000Z',
  messageId: 'rec-1',
  createdAt: '2027-02-05T09:00:00.000Z',
  updatedAt: '2027-02-05T09:00:00.000Z',
  ...overrides,
});

const optOut = (scope: ReminderOptOutScope): ReminderOptOut => ({
  id: 'opt-1',
  institutionId: 'inst-1',
  payerId: 'guardian-1',
  scope,
  source: 'payer',
  recordedAt: '2027-02-01T00:00:00.000Z',
});

const promise = (overrides: Partial<PromiseToPay> = {}): PromiseToPay => ({
  id: 'promise-1',
  institutionId: 'inst-1',
  documentKey: 'inv-1',
  payerId: 'guardian-1',
  amount: KES(200_000),
  promisedOn: '2027-02-20',
  status: 'open',
  recordedAt: '2027-02-01T00:00:00.000Z',
  resolvedAt: null,
  ...overrides,
});

function select(overrides: {
  readonly schedule?: ReminderSchedule;
  readonly subjects: readonly SelectionSubject[];
  readonly runDay?: string;
  readonly at?: string;
  readonly attempts?: readonly ReminderAttempt[];
  readonly optOuts?: readonly ReminderOptOut[];
  readonly promises?: readonly PromiseToPay[];
  readonly templates?: readonly ReminderTemplate[];
}): readonly ReminderDecision[] {
  return selectDueReminders({
    schedule: overrides.schedule ?? schedule(),
    subjects: overrides.subjects,
    runDay: overrides.runDay ?? RUN_DAY,
    at: overrides.at ?? `${overrides.runDay ?? RUN_DAY}T09:00:00.000Z`,
    attempts: overrides.attempts ?? [],
    optOuts: overrides.optOuts ?? [],
    promises: overrides.promises ?? [],
    templates: overrides.templates ?? TEMPLATES,
  });
}

const reasonOf = (decisions: readonly ReminderDecision[]): ReminderReason | undefined => decisions[0]?.reason;

describe('the candidates a statement yields', () => {
  it('reads one candidate per aging item, with the outstanding the statement computed', () => {
    const statement = statementOf([item('inv-1', DUE, 500_000), item('inv-2', '2027-03-01', 250_000)]);
    const candidates = candidatesFromStatement(statement, RUN_DAY);
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      documentKey: 'inv-1',
      source: 'invoice',
      documentNumber: 'INV/inv-1',
      dueDate: DUE,
      daysPastDue: 0,
    });
    expect(candidates[0]?.outstanding.amount_minor).toBe(500_000);
  });

  it('ages only the part of a partly paid invoice that is left', () => {
    const items = outstandingItemsFromInvoices({
      invoices: [
        {
          id: 'inv-1',
          number: 'INV/inv-1',
          issueDate: '2027-01-05',
          dueDate: DUE,
          totalMinor: 600_000,
          currency: 'KES',
          status: 'partially_paid',
        },
      ],
      allocatedMinorByInvoice: new Map([['inv-1', 100_000]]),
      creditedMinorByInvoice: new Map([['inv-1', 50_000]]),
    });
    const candidates = candidatesFromStatement(statementOf(items), RUN_DAY);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.outstanding.amount_minor).toBe(450_000);
  });

  it('falls back to a balance candidate for a statement with no per-invoice aging', () => {
    const statement: Statement = {
      ...statementOf([]),
      kind: 'sponsor',
      subjectId: 'sponsor-1',
      subjectName: 'Acme Ltd',
      closingBalance: KES(1_200_000),
      aging: agingSummary([], RUN_DAY, 'KES'),
    };
    const candidates = candidatesFromStatement(statement, RUN_DAY);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ documentKey: 'balance:sponsor:sponsor-1', source: 'balance', dueDate: RUN_DAY });
    expect(candidatesFromStatement({ ...statement, closingBalance: KES(0) }, RUN_DAY)).toEqual([]);
  });
});

describe('who is due', () => {
  const statement = statementOf([item('inv-1', DUE, 500_000)]);

  it('sends when the interval is due and nothing holds it back', () => {
    const decisions = select({ subjects: [subject(statement)] });
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ outcome: 'send', reason: 'due', channel: 'sms', category: 'fee_reminder' });
  });

  it('reports nothing at all when no interval is due that day', () => {
    expect(select({ subjects: [subject(statement)], runDay: '2027-02-06' })).toEqual([]);
  });

  it('skips a reminder already sent for the same document and interval', () => {
    const decisions = select({ subjects: [subject(statement)], attempts: [attempt()] });
    expect(reasonOf(decisions)).toBe('already_sent');
    expect(decisions[0]?.outcome).toBe('skipped');
  });

  it('says nothing for a queued reminder; the queue releases it, not the selection', () => {
    const decisions = select({ subjects: [subject(statement)], attempts: [attempt({ state: 'queued', scheduledFor: '2027-02-06T04:00:00.000Z' })] });
    expect(decisions).toEqual([]);
  });

  it('ignores a subject whose kind is not the schedule audience', () => {
    expect(select({ schedule: schedule({ audience: 'household' }), subjects: [subject(statement)] })).toEqual([]);
  });

  it('skips a document under the schedule floor', () => {
    const decisions = select({ schedule: schedule({ minAmountMinor: 600_000 }), subjects: [subject(statement)] });
    expect(decisions[0]).toMatchObject({ outcome: 'skipped', reason: 'below_threshold' });
  });

  it('skips when the payer has no contact on any channel, and names the channel it tried', () => {
    const decisions = select({ subjects: [subject(statement, { contacts: {} })] });
    expect(decisions[0]).toMatchObject({ outcome: 'skipped', reason: 'no_contact', channel: 'sms' });
  });

  it('skips when no template matches the channel and category', () => {
    const decisions = select({ subjects: [subject(statement)], templates: [] });
    expect(decisions[0]).toMatchObject({ outcome: 'skipped', reason: 'no_template' });
  });
});

describe('who is suppressed', () => {
  const statement = statementOf([item('inv-1', DUE, 500_000)]);

  it('suppresses for a channel opt-out', () => {
    const decisions = select({ subjects: [subject(statement)], optOuts: [optOut({ kind: 'channel', channel: 'sms' })] });
    expect(decisions[0]).toMatchObject({ outcome: 'suppressed', reason: 'opted_out', optedOutBy: 'opt-1' });
  });

  it('suppresses for a category opt-out, on any channel', () => {
    const decisions = select({
      subjects: [subject(statement)],
      optOuts: [optOut({ kind: 'category', category: 'fee_reminder' })],
    });
    expect(decisions[0]).toMatchObject({ outcome: 'suppressed', reason: 'opted_out' });
  });

  it('suppresses for an opt-out of everything', () => {
    const decisions = select({ subjects: [subject(statement)], optOuts: [optOut({ kind: 'all' })] });
    expect(decisions[0]).toMatchObject({ outcome: 'suppressed', reason: 'opted_out' });
  });

  it('suppresses while a promise is in force', () => {
    const decisions = select({ subjects: [subject(statement)], promises: [promise()] });
    expect(decisions[0]).toMatchObject({ outcome: 'suppressed', reason: 'promise_to_pay' });
  });

  it('resumes, and escalates, once the promise is broken', () => {
    const broken = promise({ promisedOn: '2027-02-01' });
    const decisions = select({ subjects: [subject(statement)], promises: [broken] });
    expect(decisions[0]).toMatchObject({ outcome: 'send', reason: 'due', category: 'final_notice', escalated: true });
  });

  it('does not escalate a broken promise when the schedule says not to', () => {
    const decisions = select({
      schedule: schedule({ escalateOnBrokenPromise: false }),
      subjects: [subject(statement)],
      promises: [promise({ promisedOn: '2027-02-01' })],
    });
    expect(decisions[0]).toMatchObject({ outcome: 'send', category: 'fee_reminder', escalated: false });
  });
});

describe('quiet hours', () => {
  const statement = statementOf([item('inv-1', DUE, 500_000)]);
  const quiet = schedule({
    quietHours: { enabled: true, start: '20:00', end: '07:00', timezone: 'Africa/Nairobi' },
  });

  it('defers a reminder inside the window to the next window, rather than dropping it', () => {
    // 18:00 UTC is 21:00 in Nairobi, inside 20:00-07:00.
    const decisions = select({ schedule: quiet, subjects: [subject(statement)], at: '2027-02-05T18:00:00.000Z' });
    expect(decisions[0]).toMatchObject({ outcome: 'deferred', reason: 'quiet_hours' });
    expect(decisions[0]?.deferredUntil).toBe('2027-02-06T04:00:00.000Z');
  });

  it('sends outside the window', () => {
    // 09:00 UTC is 12:00 in Nairobi.
    const decisions = select({ schedule: quiet, subjects: [subject(statement)], at: '2027-02-05T09:00:00.000Z' });
    expect(decisions[0]).toMatchObject({ outcome: 'send', reason: 'due' });
  });
});
