// ABOUTME: The chart the boot path seeds for a school that predates the chart table: seeded once
// ABOUTME: per institution, never over a chart the school configured, and idempotent on a re-run.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, type TestContext } from '@/data/__tests__/harness';
import { ensureDefaultLedgerCharts } from '..';

let context: TestContext;

beforeEach(async () => {
  context = await createTestContext({ seed: false });
});

afterEach(async () => {
  await context.close();
});

async function createSchool(name: string): Promise<string> {
  const institution = await context.repository.create('institution', {
    name,
    country: 'KE',
    ownership: 'public',
    gender_policy: 'mixed',
    boarding_policy: 'day',
    default_locale: 'en-KE',
    time_zone: 'Africa/Nairobi',
    base_currency: 'KES',
  });
  return institution.id;
}

describe('seeding the chart at boot', () => {
  it('gives an existing school with no ledger rows the default chart and channel nominations', async () => {
    const institutionId = await createSchool('Mwangaza Secondary School');

    const first = await ensureDefaultLedgerCharts(context.repository);
    expect(first).toEqual({ institutions: 1, seeded: 1 });

    const accounts = await context.repository.list('ledger_account', {
      where: { institution_id: institutionId },
      limit: 500,
    });
    expect(accounts.items.map((row) => row.code)).toEqual(
      expect.arrayContaining(['1010', '1020', '4000', '5000', '5900'])
    );

    const channels = await context.repository.list('channel_account', {
      where: { institution_id: institutionId },
      limit: 500,
    });
    expect(channels.items.map((row) => row.channel).sort()).toEqual([
      'bank_deposit',
      'cash',
      'cheque',
      'mobile_money',
    ]);

    // A second start finds the rows it wrote and writes nothing.
    const second = await ensureDefaultLedgerCharts(context.repository);
    expect(second).toEqual({ institutions: 1, seeded: 0 });
    const again = await context.repository.list('ledger_account', {
      where: { institution_id: institutionId },
      limit: 500,
    });
    expect(again.total).toBe(accounts.total);
    expect((await context.repository.list('channel_account', { limit: 500 })).total).toBe(4);
  });

  it('leaves a school that configured its own chart alone', async () => {
    const institutionId = await createSchool('Mwangaza Secondary School');
    await context.repository.create('ledger_account', {
      institution_id: institutionId,
      code: '1090',
      name: 'Petty cash',
      kind: 'asset',
      role: 'cash',
      is_system: false,
      is_active: true,
    });

    const result = await ensureDefaultLedgerCharts(context.repository);

    expect(result.seeded).toBe(0);
    const accounts = await context.repository.list('ledger_account', {
      where: { institution_id: institutionId },
      limit: 500,
    });
    expect(accounts.items.map((row) => row.code)).toEqual(['1090']);
  });

  it('seeds each school separately and only the one without rows', async () => {
    const bare = await createSchool('Greenfields Academy');
    const configured = await createSchool('Riverside School');
    await context.repository.create('ledger_account', {
      institution_id: configured,
      code: '1090',
      name: 'Petty cash',
      kind: 'asset',
      role: 'cash',
      is_system: false,
      is_active: true,
    });

    const result = await ensureDefaultLedgerCharts(context.repository);
    expect(result).toEqual({ institutions: 2, seeded: 1 });

    const bareRows = await context.repository.list('ledger_account', {
      where: { institution_id: bare },
      limit: 500,
    });
    const configuredRows = await context.repository.list('ledger_account', {
      where: { institution_id: configured },
      limit: 500,
    });
    expect(bareRows.total).toBeGreaterThan(1);
    expect(configuredRows.items.map((row) => row.code)).toEqual(['1090']);
  });
});
