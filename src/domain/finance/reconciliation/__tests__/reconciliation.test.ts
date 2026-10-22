// ABOUTME: The reconciliation service against real SQLite: an idempotent import, suggestions that
// ABOUTME: write nothing, a match and its undoing, the exceptions a reconciliation reports, and the
// ABOUTME: suspense entry an unexplained difference is posted as.

import { createNodeSqliteAdapter, SqliteAdapterError, type SqliteAdapter } from '@/data/adapters/sqlite';
import { fromMinor } from '@/domain/money';
import {
  CONTROL_ACCOUNTS,
  LedgerError,
  LedgerService,
  createLedgerAccountMapping,
  createSqliteLedgerStore,
  ensureLedgerSchema,
} from '@/domain/finance/ledger';
import { afterEach, describe, expect, it } from 'vitest';

import {
  RECONCILIATION_ACCOUNTS,
  RECONCILIATION_MATCH_TABLE,
  ReconciliationError,
  ReconciliationService,
  createAccountDirectory,
  createArrayCandidateSource,
  createLedgerSuspensePoster,
  createSqliteReconciliationStore,
  ensureReconciliationSchema,
  type MatchCandidate,
  type StatementAccount,
} from '..';
import { readFixture } from './fixtures';

const INSTITUTION = 'inst-1';
const ACTOR = 'bursar-1';
const CLOCK_START = Date.parse('2027-02-01T09:00:00.000Z');

const kes = (minor: number) => fromMinor(minor, 'KES');

const BANK: StatementAccount = {
  id: 'acct-bank',
  institutionId: INSTITUTION,
  name: 'Equity Bank 0123456789',
  currency: 'KES',
  kind: 'bank',
};

const CANDIDATES: readonly MatchCandidate[] = [
  {
    id: 'pay-101',
    kind: 'payment',
    institutionId: INSTITUTION,
    accountId: 'acct-bank',
    date: '2027-01-05',
    amount: kes(150_000),
    direction: 'inflow',
    reference: 'RCT/2027/000101',
    payerName: 'AMINA OTIENO',
    narration: 'Fees Term 1',
  },
  {
    id: 'pay-102',
    kind: 'payment',
    institutionId: INSTITUTION,
    accountId: 'acct-bank',
    date: '2027-01-06',
    amount: kes(250_000),
    direction: 'inflow',
    reference: 'RCT/2027/000102',
    payerName: 'BRIAN MWANGI',
    narration: 'Fees Term 1',
  },
  {
    id: 'pay-103',
    kind: 'payment',
    institutionId: INSTITUTION,
    accountId: 'acct-bank',
    date: '2027-01-09',
    amount: kes(150_000),
    direction: 'inflow',
    reference: 'RCT/2027/000103',
    payerName: 'AMINA OTIENO',
    narration: 'Fees Term 1',
  },
  {
    id: 'pay-unbanked',
    kind: 'payment',
    institutionId: INSTITUTION,
    accountId: 'acct-bank',
    date: '2027-01-08',
    amount: kes(70_000),
    direction: 'inflow',
    reference: 'RCT/2027/000150',
    payerName: 'CAROL WAIRIMU',
    narration: 'Recorded, not yet at the bank',
  },
];

const BANK_CSV = 'bank-statement.csv';
const WINDOW = {
  institutionId: INSTITUTION,
  accountId: 'acct-bank',
  from: '2027-01-01',
  to: '2027-01-31',
};

interface Harness {
  readonly adapter: SqliteAdapter;
  readonly service: ReconciliationService;
  readonly ledger: LedgerService;
}

const open: Harness[] = [];

async function harness(candidates: readonly MatchCandidate[] = CANDIDATES): Promise<Harness> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();
  await ensureLedgerSchema(adapter);
  await ensureReconciliationSchema(adapter);

  let tick = 0;
  const now = () => new Date(CLOCK_START + tick++ * 1000);

  const ledger = new LedgerService({
    store: createSqliteLedgerStore(adapter),
    mapping: createLedgerAccountMapping(),
    actor: ACTOR,
    now,
  });
  const service = new ReconciliationService({
    store: createSqliteReconciliationStore(adapter),
    accounts: createAccountDirectory([BANK]),
    candidates: createArrayCandidateSource(candidates),
    poster: createLedgerSuspensePoster(ledger),
    actor: ACTOR,
    now,
  });
  const instance: Harness = { adapter, service, ledger };
  open.push(instance);
  return instance;
}

afterEach(async () => {
  while (open.length > 0) await open.pop()?.adapter.close();
});

/** Imports the bank fixture, the statement every test below works with. */
function importBank(service: ReconciliationService) {
  return service.importStatement(readFixture(BANK_CSV), {
    accountId: 'acct-bank',
    sourceName: BANK_CSV,
  });
}

describe('importing a statement', () => {
  it('writes the statement and its lines, and keys each line by the file and its position', async () => {
    const { service } = await harness();
    const result = await importBank(service);

    expect(result.duplicate).toBe(false);
    expect(result.statement.format).toBe('csv');
    expect(result.statement.currency).toBe('KES');
    expect(result.statement.sourceName).toBe(BANK_CSV);
    expect(result.statement.firstDate).toBe('2027-01-05');
    expect(result.statement.lastDate).toBe('2027-01-09');
    expect(result.statement.lineCount).toBe(4);
    expect(result.lines).toHaveLength(4);
    expect(result.lines[0].dedupeKey).toBe(`${result.statement.fingerprint}#2`);
    expect(result.lines[3].dedupeKey).toBe(`${result.statement.fingerprint}#5`);

    expect(await service.listLines({ accountId: 'acct-bank' })).toHaveLength(4);
  });

  it('refuses a malformed file without writing anything', async () => {
    const { service } = await harness();
    const error = await service
      .importStatement(readFixture('malformed-date.csv'), { accountId: 'acct-bank' })
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ReconciliationError);
    expect((error as ReconciliationError).code).toBe('invalid_date');
    expect(await service.listStatements({ accountId: 'acct-bank' })).toEqual([]);
    expect(await service.listLines({ accountId: 'acct-bank' })).toEqual([]);
  });

  it('refuses a statement of an account the directory does not hold', async () => {
    const { service } = await harness();
    expect(
      await codeOf(
        service.importStatement('Date,Amount\n2027-01-05,1500.00\n', { accountId: 'acct-nope' })
      )
    ).toBe('account_not_found');
  });
});

describe('importing the same file twice', () => {
  it('writes nothing the second time, and returns the same statement and lines', async () => {
    const { service } = await harness();
    const first = await importBank(service);
    const second = await importBank(service);

    expect(second.duplicate).toBe(true);
    expect(second.statement.id).toBe(first.statement.id);
    expect(second.lines.map((line) => line.id)).toEqual(first.lines.map((line) => line.id));
    expect(await service.listStatements({ accountId: 'acct-bank' })).toHaveLength(1);
    expect(await service.listLines({ accountId: 'acct-bank' })).toHaveLength(4);
  });

  it('recognises the same file re-saved with a byte-order mark and CRLF endings', async () => {
    const { service } = await harness();
    // Put the fixture into LF first: the checkout may already have given it CRLF.
    const text = readFixture(BANK_CSV).replace(/\r\n?/g, '\n');
    await service.importStatement(text, { accountId: 'acct-bank' });
    const again = await service.importStatement(`\uFEFF${text.replace(/\n/g, '\r\n')}`, {
      accountId: 'acct-bank',
    });
    expect(again.duplicate).toBe(true);
    expect(await service.listLines({ accountId: 'acct-bank' })).toHaveLength(4);
  });

  it('refuses it outright when the caller asks it to', async () => {
    const { service } = await harness();
    await importBank(service);
    expect(
      await codeOf(
        service.importStatement(readFixture(BANK_CSV), { accountId: 'acct-bank', strict: true })
      )
    ).toBe('duplicate_statement');
  });

  it('cannot duplicate a line even when the engine is bypassed, because the key is unique', async () => {
    const { adapter, service } = await harness();
    const store = createSqliteReconciliationStore(adapter);
    const first = await importBank(service);
    const line = first.lines[0];

    const error = await store
      .insertLines([{ ...line, id: 'a-second-row-with-the-same-key' }])
      .catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(ReconciliationError);
    expect((error as ReconciliationError).code).toBe('duplicate_statement');
    expect(await service.listLines({ accountId: 'acct-bank' })).toHaveLength(4);
  });
});

describe('suggesting a match', () => {
  it('suggests the payment each line corresponds to, with its reasons, and writes nothing', async () => {
    const { service } = await harness();
    await importBank(service);

    const suggestions = await service.suggest({
      accountId: 'acct-bank',
      from: '2027-01-01',
      to: '2027-01-31',
    });

    const best = suggestions.filter((suggestion) => suggestion.rank === 1);
    expect(best).toHaveLength(3);
    for (const suggestion of best) {
      expect(suggestion.reasons.map((reason) => reason.rule)).toContain('amount_exact');
      expect(suggestion.score).toBeGreaterThanOrEqual(70);
    }

    // The bank charge has no payment and is suggested nothing.
    const lines = await service.listLines({ accountId: 'acct-bank' });
    expect(lines[1].description).toBe('Bank charge for transfer');
    expect(suggestions.some((suggestion) => suggestion.lineId === lines[1].id)).toBe(false);

    // Suggesting is read-only: no match record exists yet.
    expect(await service.listMatches({ institutionId: INSTITUTION })).toEqual([]);
  });
});

describe('matching and unmatching', () => {
  it('links the two sides, records who and when, and frees them again on unmatch', async () => {
    const { service } = await harness();
    const imported_ = await importBank(service);
    const line = imported_.lines[0];

    const match = await service.confirmMatch({
      statementLineId: line.id,
      candidateKind: 'payment',
      candidateId: 'pay-101',
      score: 100,
    });
    expect(match.status).toBe('confirmed');
    expect(match.matchedBy).toBe(ACTOR);
    expect(match.unmatchedAt).toBeNull();
    expect(await service.listMatches({ institutionId: INSTITUTION, status: 'confirmed' })).toHaveLength(1);

    const undone = await service.unmatch({ matchId: match.id, reason: 'wrong payer' });
    expect(undone.status).toBe('unmatched');
    expect(undone.unmatchedBy).toBe(ACTOR);
    expect(undone.unmatchedReason).toBe('wrong payer');
    expect(undone.unmatchedAt).not.toBeNull();

    // Nothing was deleted, and both sides are free again.
    expect(await service.listMatches({ institutionId: INSTITUTION })).toHaveLength(1);
    const again = await service.confirmMatch({
      statementLineId: line.id,
      candidateKind: 'payment',
      candidateId: 'pay-101',
    });
    expect(again.id).not.toBe(match.id);
    expect(again.status).toBe('confirmed');
    expect(await service.listMatches({ institutionId: INSTITUTION })).toHaveLength(2);
    expect(await service.listMatches({ institutionId: INSTITUTION, status: 'confirmed' })).toHaveLength(1);

    const trail = await service.auditTrail(match.id);
    expect(trail.map((event) => event.action)).toEqual(['create', 'update']);
    expect(trail[1].reason).toBe('wrong payer');
  });

  it('refuses a line already matched, a payment already matched, and an unknown side', async () => {
    const { service } = await harness();
    const imported_ = await importBank(service);
    const [first, , second] = imported_.lines;

    await service.confirmMatch({
      statementLineId: first.id,
      candidateKind: 'payment',
      candidateId: 'pay-101',
    });

    expect(
      await codeOf(
        service.confirmMatch({
          statementLineId: first.id,
          candidateKind: 'payment',
          candidateId: 'pay-102',
        })
      )
    ).toBe('line_already_matched');
    expect(
      await codeOf(
        service.confirmMatch({
          statementLineId: second.id,
          candidateKind: 'payment',
          candidateId: 'pay-101',
        })
      )
    ).toBe('candidate_already_matched');
    expect(
      await codeOf(
        service.confirmMatch({
          statementLineId: 'nope',
          candidateKind: 'payment',
          candidateId: 'pay-101',
        })
      )
    ).toBe('line_not_found');
    expect(
      await codeOf(
        service.confirmMatch({
          statementLineId: second.id,
          candidateKind: 'payment',
          candidateId: 'nope',
        })
      )
    ).toBe('candidate_not_found');
  });

  it('refuses an unmatch without a reason and an unmatch of a match already undone', async () => {    const { service } = await harness();
    const imported_ = await importBank(service);
    const match = await service.confirmMatch({
      statementLineId: imported_.lines[0].id,
      candidateKind: 'payment',
      candidateId: 'pay-101',
    });

    expect(await codeOf(service.unmatch({ matchId: match.id, reason: '   ' }))).toBe('reason_required');
    expect(await codeOf(service.unmatch({ matchId: 'nope', reason: 'why not' }))).toBe('match_not_found');

    await service.unmatch({ matchId: match.id, reason: 'duplicate' });
    expect(await codeOf(service.unmatch({ matchId: match.id, reason: 'again' }))).toBe(
      'match_already_unmatched'
    );
  });

  it('cannot double-match when the engine is bypassed, because the indexes refuse it', async () => {
    const { adapter, service } = await harness();
    const store = createSqliteReconciliationStore(adapter);
    const imported_ = await importBank(service);
    const [first, , second] = imported_.lines;
    const match = await service.confirmMatch({
      statementLineId: first.id,
      candidateKind: 'payment',
      candidateId: 'pay-101',
    });

    const sameLine = await store
      .insertMatch({ ...match, id: 'a-second-match-on-the-same-line', candidateId: 'pay-102' })
      .catch((thrown: unknown) => thrown);
    expect((sameLine as ReconciliationError).code).toBe('line_already_matched');

    const samePayment = await store
      .insertMatch({
        ...match,
        id: 'a-second-match-of-the-same-payment',
        statementLineId: second.id,
      })
      .catch((thrown: unknown) => thrown);
    expect((samePayment as ReconciliationError).code).toBe('candidate_already_matched');

    // Neither attempt wrote anything: the one confirmed match stands.
    expect(await service.listMatches({ institutionId: INSTITUTION, status: 'confirmed' })).toHaveLength(1);
  });

  it('refuses to delete a match record, so the history is never lost', async () => {
    const { adapter, service } = await harness();
    const imported_ = await importBank(service);
    const match = await service.confirmMatch({
      statementLineId: imported_.lines[0].id,
      candidateKind: 'payment',
      candidateId: 'pay-101',
    });

    const error = await adapter
      .run(`DELETE FROM "${RECONCILIATION_MATCH_TABLE}" WHERE "id" = ?`, [match.id])
      .catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(SqliteAdapterError);
    expect((error as SqliteAdapterError).message).toContain('history');
    expect(await service.listMatches({ institutionId: INSTITUTION })).toHaveLength(1);
  });
});

describe('the exceptions a reconciliation reports', () => {
  it('reports the unmatched lines and the unmatched payments, with an exact difference', async () => {
    const { service } = await harness();
    const imported_ = await importBank(service);
    const [first, , second, third] = imported_.lines;

    for (const [line, payment] of [
      [first, 'pay-101'],
      [second, 'pay-102'],
      [third, 'pay-103'],
    ] as const) {
      await service.confirmMatch({
        statementLineId: line.id,
        candidateKind: 'payment',
        candidateId: payment,
      });
    }

    const report = await service.report(WINDOW);

    expect(report.lines).toEqual({ total: 4, matched: 3, unmatched: 1 });
    expect(report.candidates).toEqual({ total: 4, matched: 3, unmatched: 1 });
    expect(report.unmatchedLines.map((line) => line.fileLine)).toEqual([3]);
    expect(report.unmatchedLines[0].description).toBe('Bank charge for transfer');
    expect(report.unmatchedCandidates.map((candidate) => candidate.id)).toEqual(['pay-unbanked']);

    // The exact totals: 1,500.00 + 2,500.00 + 1,500.00 in and 150.00 out, against 6,200.00 recorded.
    expect(report.signedLineTotal).toEqual(kes(535_000));
    expect(report.signedCandidateTotal).toEqual(kes(620_000));
    expect(report.unmatchedLineTotal).toEqual(kes(-15_000));
    expect(report.unmatchedCandidateTotal).toEqual(kes(70_000));
    expect(report.difference).toEqual(kes(-85_000));

    // Because a suggestion is only made when the amounts are exactly equal, the matched pairs net
    // out, so the difference from the unmatched sides is the same difference.
    expect(report.difference).toEqual(
      fromMinor(
        report.unmatchedLineTotal.amount_minor - report.unmatchedCandidateTotal.amount_minor,
        'KES'
      )
    );
  });
});

describe('the suspense posting of an unexplained difference', () => {
  it('derives a balanced entry and posts it, moving the bank account and the suspense account', async () => {
    const { service, ledger } = await harness();
    const imported_ = await importBank(service);
    const [first, , second, third] = imported_.lines;
    for (const [line, payment] of [
      [first, 'pay-101'],
      [second, 'pay-102'],
      [third, 'pay-103'],
    ] as const) {
      await service.confirmMatch({
        statementLineId: line.id,
        candidateKind: 'payment',
        candidateId: payment,
      });
    }

    const posting = await service.deriveSuspenseDifference(WINDOW);
    expect(posting.difference).toEqual(kes(-85_000));
    expect(posting.accountCode).toBe(CONTROL_ACCOUNTS.bank.code);
    expect(posting.entryDate).toBe('2027-01-31');
    expect(posting.lines).toEqual([
      {
        accountCode: RECONCILIATION_ACCOUNTS.suspense.code,
        accountName: RECONCILIATION_ACCOUNTS.suspense.name,
        debit: kes(85_000),
        memo: '1 unmatched payment(s)',
      },
      {
        accountCode: CONTROL_ACCOUNTS.bank.code,
        accountName: CONTROL_ACCOUNTS.bank.name,
        credit: kes(85_000),
        memo: 'reconciliation adjustment at 2027-01-31',
      },
    ]);

    const posted = await service.postSuspenseDifference(WINDOW);
    expect(posted.entryId).toBeTruthy();

    expect(
      await ledger.accountBalance(CONTROL_ACCOUNTS.bank.code, {
        institutionId: INSTITUTION,
        currency: 'KES',
      })
    ).toEqual(kes(-85_000));
    expect(
      await ledger.accountBalance(RECONCILIATION_ACCOUNTS.suspense.code, {
        institutionId: INSTITUTION,
        currency: 'KES',
      })
    ).toEqual(kes(85_000));
    expect(
      (await ledger.trialBalance({ institutionId: INSTITUTION, currency: 'KES' })).balanced
    ).toBe(true);
  });

  it('refuses to post the same day twice', async () => {
    const { service } = await harness();
    await service.postSuspenseDifference(WINDOW);
    expect(await codeOf(service.postSuspenseDifference(WINDOW))).toBe('conflict');
  });

  it('refuses to post when nothing is unexplained', async () => {
    const { service } = await harness([
      {
        id: 'pay-201',
        kind: 'payment',
        institutionId: INSTITUTION,
        accountId: 'acct-bank',
        date: '2027-01-05',
        amount: kes(150_000),
        direction: 'inflow',
        reference: 'RCT/2027/000101',
        payerName: 'AMINA OTIENO',
        narration: 'Fees',
      },
    ]);
    const imported_ = await service.importStatement(
      'Date,Description,Reference,Amount\n2027-01-05,Fees,RCT/2027/000101,1500.00\n',
      { accountId: 'acct-bank' }
    );
    await service.confirmMatch({
      statementLineId: imported_.lines[0].id,
      candidateKind: 'payment',
      candidateId: 'pay-201',
    });

    expect(await codeOf(service.deriveSuspenseDifference(WINDOW))).toBe('nothing_to_post');
  });

  it('refuses to post when no poster was supplied', async () => {
    const { adapter } = await harness();
    const service = new ReconciliationService({
      store: createSqliteReconciliationStore(adapter),
      accounts: createAccountDirectory([BANK]),
      candidates: createArrayCandidateSource(CANDIDATES),
    });
    await importBank(service);
    expect(await codeOf(service.postSuspenseDifference(WINDOW))).toBe('no_suspense_poster');
  });
});

/** Runs `work` and returns the code of the refusal it raised. */
async function codeOf(work: Promise<unknown>): Promise<string> {
  try {
    await work;
  } catch (error) {
    if (error instanceof ReconciliationError) return error.code;
    if (error instanceof LedgerError) return error.code;
    throw error;
  }
  throw new Error('expected a refusal, but the call succeeded');
}
