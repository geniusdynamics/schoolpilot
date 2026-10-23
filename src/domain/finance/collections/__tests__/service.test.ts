// ABOUTME: The collections service against real SQLite: a schedule stored and read back, a run that
// ABOUTME: sends once and stays sent on a re-run, an opt-out that survives a schedule change, a
// ABOUTME: reminder deferred by quiet hours and released by the next run, a promise that suppresses
// ABOUTME: and then resumes escalated, the amount read from the statements module, and pay links.

import { afterEach, describe, expect, it } from 'vitest';

import { closeTestContext, createTestContext, type TestContext } from '@/data/__tests__/harness';
import {
  buildStatement,
  outstandingItemsFromInvoices,
  type AgingItem,
  type Statement,
} from '@/domain/finance/statements';
import { fromMinor } from '@/domain/money';

import {
  CollectionsService,
  createSqliteCollectionsStore,
  createWebCryptoPayLinkSigner,
  ensureCollectionsSchema,
  isCollectionsError,
  payLinkLeaksPersonalData,
  type CollectionsStore,
  type ReminderAttempt,
  type ReminderChannelPort,
  type ReminderMessage,
  type ReminderPayer,
  type ReminderSchedule,
  type ReminderSubjectRef,
  type ReminderTemplate,
  type StatementReader,
} from '..';

const KES = (minor: number) => fromMinor(minor, 'KES');
const DUE = '2027-02-05';

const contexts: TestContext[] = [];

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => closeTestContext(context)));
});

const TEMPLATES: readonly ReminderTemplate[] = [
  {
    id: 'sms-gentle',
    name: 'Gentle SMS',
    channel: 'sms',
    category: 'fee_reminder',
    tone: 'gentle',
    locale: 'en-KE',
    body: 'Dear {{payer}}, {{amount}} for {{learner}} is due on {{dueDate}}. Pay {{payLink}}',
  },
  {
    id: 'sms-final',
    name: 'Final SMS',
    channel: 'sms',
    category: 'final_notice',
    tone: 'final',
    locale: 'en-KE',
    body: 'FINAL NOTICE: {{amount}} for {{learner}} is outstanding. Pay {{payLink}}',
  },
  {
    id: 'sms-gentle-sw',
    name: 'Gentle SMS (Swahili)',
    channel: 'sms',
    category: 'fee_reminder',
    tone: 'gentle',
    locale: 'sw-KE',
    body: 'Habari {{payer}}, {{amount}} kwa {{learner}}. Lipa {{payLink}}',
  },
];

/** A channel that records what it was asked to send, so a test sends nothing real. */
class RecordingChannel implements ReminderChannelPort {
  readonly channel = 'sms' as const;
  readonly sent: ReminderMessage[] = [];

  async send(message: ReminderMessage): Promise<{ success: boolean; messageId: string; status: 'sent' }> {
    this.sent.push(message);
    return { success: true, messageId: `rec-${this.sent.length}`, status: 'sent' };
  }
}

function baseSchedule(institutionId: string): ReminderSchedule {
  return {
    id: 'sch-1',
    institutionId,
    name: 'Term fees',
    enabled: true,
    audience: 'learner',
    category: 'fee_reminder',
    escalationCategory: 'final_notice',
    intervals: [{ id: 'on_due', phase: 'on_due', days: 0 }],
    channels: ['sms'],
    locale: 'en-KE',
    quietHours: { enabled: false, start: '00:00', end: '00:00', timezone: 'Africa/Nairobi' },
  };
}

function learnerStatement(items: readonly AgingItem[]): Statement {
  return buildStatement({
    kind: 'learner',
    subjectId: 'learner-1',
    subjectName: 'Amani Wekesa',
    currency: 'KES',
    entries: [],
    period: {},
    asOf: DUE,
    agingItems: items,
  });
}

function item(id: string, dueDate: string | null, minor: number): AgingItem {
  return { id, documentId: id, documentNumber: `INV/${id}`, issueDate: '2027-01-05', dueDate, amount: KES(minor) };
}

interface Fixture {
  readonly context: TestContext;
  readonly store: CollectionsStore;
  readonly service: CollectionsService;
  readonly channel: RecordingChannel;
  readonly institutionId: string;
  readonly schedule: ReminderSchedule;
  readonly payer: ReminderPayer;
  readonly subject: ReminderSubjectRef;
}

async function fixture(overrides: {
  readonly statement: Statement;
  readonly schedule?: Partial<ReminderSchedule>;
  readonly payer?: Partial<ReminderPayer>;
}): Promise<Fixture> {
  const context = await createTestContext();
  contexts.push(context);
  await ensureCollectionsSchema(context.adapter);

  const institutionId = context.seed.idOf('institution');
  const store = createSqliteCollectionsStore(context.adapter);
  const channel = new RecordingChannel();
  const statements = new Map<string, Statement>([[overrides.statement.subjectId, overrides.statement]]);
  const reader: StatementReader = {
    async statementFor(ref) {
      const statement = statements.get(ref.id);
      if (!statement) throw new Error(`the test holds no statement for ${ref.id}`);
      return statement;
    },
  };
  const service = new CollectionsService({
    store,
    channels: [channel],
    templates: TEMPLATES,
    reader,
    signer: createWebCryptoPayLinkSigner({ secret: 'a-test-secret' }),
    payLinkBaseUrl: 'https://pay.example.test/fees',
    schoolName: 'Mwangaza Secondary',
    now: () => new Date('2027-02-05T09:00:00.000Z'),
  });
  const schedule: ReminderSchedule = { ...baseSchedule(institutionId), ...overrides.schedule };
  await service.saveSchedule(schedule);
  const payer: ReminderPayer = {
    id: context.seed.idOf('guardian'),
    name: 'Grace Wekesa',
    contacts: { sms: '+254711000000' },
    locale: 'en-KE',
    ...overrides.payer,
  };
  const subject: ReminderSubjectRef = {
    kind: 'learner',
    id: overrides.statement.subjectId,
    name: overrides.statement.subjectName,
    payer,
  };
  return { context, store, service, channel, institutionId, schedule, payer, subject };
}

describe('the schedule store', () => {
  it('round-trips a schedule through SQLite', async () => {
    const f = await fixture({ statement: learnerStatement([item('inv-1', DUE, 500_000)]) });
    const stored = await f.service.schedule('sch-1');
    expect(stored).toMatchObject({ name: 'Term fees', audience: 'learner', escalationCategory: 'final_notice' });
    expect(stored?.intervals).toEqual([{ id: 'on_due', phase: 'on_due', days: 0 }]);
    expect(stored?.quietHours.timezone).toBe('Africa/Nairobi');
    expect(await f.service.schedules(f.institutionId)).toHaveLength(1);
  });

  it('refuses a schedule the run could not honour', async () => {
    const f = await fixture({ statement: learnerStatement([]) });
    let caught: unknown;
    try {
      await f.service.saveSchedule({ ...f.schedule, intervals: [] });
    } catch (error) {
      caught = error;
    }
    expect(isCollectionsError(caught) && caught.code).toBe('schedule_invalid');
  });

  it('refuses a run for a schedule that does not exist', async () => {
    const f = await fixture({ statement: learnerStatement([]) });
    let caught: unknown;
    try {
      await f.service.run({ scheduleId: 'sch-missing', subjects: [f.subject] });
    } catch (error) {
      caught = error;
    }
    expect(isCollectionsError(caught) && caught.code).toBe('schedule_not_found');
  });

  it('considers nobody for a schedule that is switched off', async () => {
    const f = await fixture({
      statement: learnerStatement([item('inv-1', DUE, 500_000)]),
      schedule: { enabled: false },
    });
    const result = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-05T09:00:00.000Z' });
    expect(result.disabled).toBe(true);
    expect(result.decisions).toEqual([]);
    expect(f.channel.sent).toEqual([]);
  });
});

describe('a run', () => {
  it('sends once, and a re-run for the same document and interval sends nothing', async () => {
    const f = await fixture({ statement: learnerStatement([item('inv-1', DUE, 500_000)]) });

    const first = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-05T09:00:00.000Z' });
    expect(first.sent).toBe(1);
    expect(first.decisions[0]).toMatchObject({ outcome: 'send', reason: 'due', documentKey: 'inv-1', intervalId: 'on_due' });
    expect(f.channel.sent).toHaveLength(1);

    const second = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-05T09:00:00.000Z' });
    expect(second.sent).toBe(0);
    expect(second.decisions[0]).toMatchObject({ outcome: 'skipped', reason: 'already_sent' });
    expect(f.channel.sent).toHaveLength(1);
  });

  it('reminds about the outstanding the statements module computed, not the invoice total', async () => {
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
      allocatedMinorByInvoice: new Map([['inv-1', 150_000]]),
      creditedMinorByInvoice: new Map(),
    });
    const f = await fixture({ statement: learnerStatement(items) });

    const result = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-05T09:00:00.000Z' });
    expect(result.sent).toBe(1);
    expect(result.decisions[0]?.amount.amount_minor).toBe(450_000);
    const attempt = await f.store.attempt(f.institutionId, 'inv-1', 'on_due');
    expect(attempt?.amount.amount_minor).toBe(450_000);
    expect(f.channel.sent[0]?.body).toContain('4,500');
  });

  it('honours a template the schedule pins, over the payer locale', async () => {
    const f = await fixture({
      statement: learnerStatement([item('inv-1', DUE, 500_000)]),
      schedule: { templateIds: { sms: 'sms-gentle-sw' } },
    });
    const result = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-05T09:00:00.000Z' });
    expect(result.sent).toBe(1);
    expect(f.channel.sent[0]?.body).toContain('Habari');
  });

  it('holds the one attempt row per document and interval, whatever a second write says', async () => {    const f = await fixture({ statement: learnerStatement([item('inv-1', DUE, 500_000)]) });
    const attempt: ReminderAttempt = {
      id: '01930000-0000-7000-8000-0000000000a1',
      institutionId: f.institutionId,
      scheduleId: 'sch-1',
      documentKey: 'inv-1',
      intervalId: 'on_due',
      payerId: f.payer.id,
      payerName: f.payer.name,
      subjectName: 'Amani Wekesa',
      documentNumber: 'INV/inv-1',
      dueDate: DUE,
      amount: KES(500_000),
      channel: 'sms',
      category: 'fee_reminder',
      toAddress: '+254711000000',
      state: 'queued',
      reason: 'quiet_hours',
      scheduledFor: '2027-02-06T04:00:00.000Z',
      sentAt: null,
      messageId: null,
      createdAt: '2027-02-05T09:00:00.000Z',
      updatedAt: '2027-02-05T09:00:00.000Z',
    };
    await f.store.saveAttempt(attempt);
    await f.store.saveAttempt({ ...attempt, id: '01930000-0000-7000-8000-0000000000a2', state: 'sent' });

    const attempts = await f.store.attempts(f.institutionId);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.id).toBe(attempt.id);
    expect(attempts[0]?.state).toBe('sent');
  });
});

describe('quiet hours and opt-outs', () => {
  const quiet = { enabled: true, start: '20:00', end: '07:00', timezone: 'Africa/Nairobi' };

  it('defers a reminder inside the window and sends it when the window opens', async () => {
    const f = await fixture({
      statement: learnerStatement([item('inv-1', DUE, 500_000)]),
      schedule: { quietHours: quiet },
    });

    // 18:00 UTC is 21:00 in Nairobi: inside the window.
    const deferred = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-05T18:00:00.000Z' });
    expect(deferred.deferred).toBe(1);
    expect(deferred.decisions[0]).toMatchObject({ outcome: 'deferred', reason: 'quiet_hours' });
    expect(f.channel.sent).toEqual([]);
    const queued = await f.store.attempt(f.institutionId, 'inv-1', 'on_due');
    expect(queued).toMatchObject({ state: 'queued', scheduledFor: '2027-02-06T04:00:00.000Z' });

    // 05:00 UTC the next day is 08:00 in Nairobi: the window has opened.
    const released = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-06T05:00:00.000Z' });
    expect(released.sent).toBe(1);
    expect(released.deliveries[0]).toMatchObject({ documentKey: 'inv-1', resumedFromDeferral: true });
    expect(f.channel.sent).toHaveLength(1);

    const again = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-06T05:00:00.000Z' });
    expect(again.sent).toBe(0);
    expect(f.channel.sent).toHaveLength(1);
  });

  it('suppresses for an opt-out, and the opt-out survives a schedule change and a re-run', async () => {
    const f = await fixture({ statement: learnerStatement([item('inv-1', DUE, 500_000)]) });
    await f.service.recordOptOut({
      institutionId: f.institutionId,
      payerId: f.payer.id,
      scope: { kind: 'channel', channel: 'sms' },
      reason: 'asked at the counter',
    });

    const first = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-05T09:00:00.000Z' });
    expect(first.suppressed).toBe(1);
    expect(first.decisions[0]).toMatchObject({ outcome: 'suppressed', reason: 'opted_out' });
    expect(f.channel.sent).toEqual([]);

    // A schedule change: the window and the catch-up move, the opt-out is untouched.
    await f.service.saveSchedule({
      ...f.schedule,
      quietHours: { enabled: false, start: '22:00', end: '06:00', timezone: 'Africa/Nairobi' },
      catchUpDays: 3,
    });

    const second = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-05T09:00:00.000Z' });
    expect(second.suppressed).toBe(1);
    expect(second.decisions[0]).toMatchObject({ outcome: 'suppressed', reason: 'opted_out' });
    expect(f.channel.sent).toEqual([]);
    expect(await f.service.optOuts(f.institutionId)).toHaveLength(1);
  });

  it('suppresses for a category opt-out even when the channel changes', async () => {
    const f = await fixture({
      statement: learnerStatement([item('inv-1', DUE, 500_000)]),
      schedule: { channels: ['email', 'sms'] },
    });
    await f.service.recordOptOut({
      institutionId: f.institutionId,
      payerId: f.payer.id,
      scope: { kind: 'category', category: 'fee_reminder' },
    });
    const result = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-05T09:00:00.000Z' });
    expect(result.suppressed).toBe(1);
    expect(f.channel.sent).toEqual([]);
  });
});

describe('a promise to pay', () => {
  it('suppresses, then resumes and escalates once it is broken', async () => {
    const f = await fixture({
      statement: learnerStatement([item('inv-1', DUE, 500_000)]),
      schedule: { catchUpDays: 10 },
    });
    await f.service.recordPromise({
      institutionId: f.institutionId,
      documentKey: 'inv-1',
      payerId: f.payer.id,
      amount: KES(200_000),
      promisedOn: '2027-02-10',
    });

    const held = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-05T09:00:00.000Z' });
    expect(held.suppressed).toBe(1);
    expect(held.decisions[0]).toMatchObject({ outcome: 'suppressed', reason: 'promise_to_pay' });
    expect(f.channel.sent).toEqual([]);
    expect((await f.service.promises(f.institutionId))[0]?.status).toBe('open');

    const resumed = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-11T09:00:00.000Z' });
    expect(resumed.sent).toBe(1);
    expect(resumed.decisions[0]).toMatchObject({ outcome: 'send', category: 'final_notice', escalated: true });
    expect(f.channel.sent).toHaveLength(1);
    expect(f.channel.sent[0]?.body).toContain('FINAL NOTICE');
    expect((await f.service.promises(f.institutionId))[0]?.status).toBe('broken');
  });

  it('is kept, with no reminder, when the document leaves the statement', async () => {
    const f = await fixture({ statement: learnerStatement([]) });
    await f.service.recordPromise({
      institutionId: f.institutionId,
      documentKey: 'inv-1',
      payerId: f.payer.id,
      amount: KES(500_000),
      promisedOn: '2027-02-20',
    });
    const result = await f.service.run({ scheduleId: 'sch-1', subjects: [f.subject], at: '2027-02-21T09:00:00.000Z' });
    expect(result.decisions).toEqual([]);
    expect((await f.service.promises(f.institutionId))[0]?.status).toBe('kept');
  });
});

describe('pay links', () => {
  it('issues a link with no personal data in it, verifies it, and refuses it once used', async () => {
    const f = await fixture({ statement: learnerStatement([item('inv-1', DUE, 500_000)]) });
    const issued = await f.service.issuePayLink({
      institutionId: f.institutionId,
      documentKey: 'inv-1',
      payerId: f.payer.id,
      amount: KES(500_000),
    });

    expect(
      payLinkLeaksPersonalData(issued.url, ['inv-1', f.payer.id, 'Amani Wekesa', '+254711000000', 'KSh 5,000.00'])
    ).toBeNull();

    const verified = await f.service.verifyPayLink(issued.url, new Date('2027-02-10T00:00:00.000Z'));
    expect(verified.valid).toBe(true);
    expect(verified.link?.documentKey).toBe('inv-1');

    await f.service.markPayLinkUsed(issued.link.token, '2027-02-10T00:00:00.000Z');
    expect(await f.service.verifyPayLink(issued.url, new Date('2027-02-10T00:00:00.000Z'))).toMatchObject({
      valid: false,
      reason: 'already_used',
    });
  });

  it('refuses an expired link', async () => {
    const f = await fixture({ statement: learnerStatement([]) });
    const issued = await f.service.issuePayLink({
      institutionId: f.institutionId,
      documentKey: 'inv-1',
      payerId: f.payer.id,
      amount: KES(500_000),
      ttlDays: 1,
      now: new Date('2027-01-01T00:00:00.000Z'),
    });
    expect(await f.service.verifyPayLink(issued.url, new Date('2027-01-03T00:00:00.000Z'))).toMatchObject({
      valid: false,
      reason: 'expired',
    });
  });
});
