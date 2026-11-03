// ABOUTME: The chart a school never has to press a button for: the setup wizard's own school input
// ABOUTME: and the full demo school both leave a seeded chart and channel nominations behind.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  closeTestContext,
  createTestContext,
  type TestContext,
} from '@/data/__tests__/harness';
import { shippedPackDocument } from '@/components/setup/packs/packLibrary';
import { demoSchoolInputFor } from '@/components/setup/steps/canonicalSetup';
import { defaultDraft, type WizardDraft } from '@/components/setup/steps/wizardDraft';
import { seedDemoSchool } from '@/domain/demo';

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

const contexts: TestContext[] = [];

async function freshContext(): Promise<TestContext> {
  const context = await createTestContext({ seed: false });
  contexts.push(context);
  return context;
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => closeTestContext(context)));
});

/** The draft the setup wizard hands to `saveCanonicalSchool` when it finishes. */
function wizardDraft(): WizardDraft {
  const base = defaultDraft(new Date('2027-01-06T00:00:00Z'));
  return {
    ...base,
    school: { ...base.school, name: 'Greenfields Academy' },
    yearName: '2027',
    yearStart: '2027-01-06',
    yearEnd: '2027-11-30',
    terms: [
      { name: 'Term 1', start: '2027-01-06', end: '2027-04-04' },
      { name: 'Term 2', start: '2027-04-28', end: '2027-08-01' },
      { name: 'Term 3', start: '2027-08-25', end: '2027-10-31' },
    ],
    classes: [{ name: 'Grade 7', streams: 'North, South' }],
    includeDemoData: false,
  };
}

async function chartCodes(context: TestContext, institutionId: string): Promise<string[]> {
  const rows = await context.repository.list('ledger_account', {
    where: { institution_id: institutionId },
    limit: 500,
  });
  return rows.items.map((row) => row.code).sort();
}

describe('the chart every school starts with', () => {
  it('seeds a wizard-created school without the school visiting the chart page', async () => {
    const context = await freshContext();

    const result = await seedDemoSchool(context.repository, demoSchoolInputFor(wizardDraft()), {
      packDocument: shippedPackDocument,
    });

    const codes = await chartCodes(context, result.institutionId);
    expect(codes).toContain('1010');
    expect(codes).toContain('1020');
    expect(codes).toContain('5000');
    expect(codes).toContain('5900');

    const channels = await context.repository.list('channel_account', {
      where: { institution_id: result.institutionId },
      limit: 500,
    });
    expect(channels.items.map((row) => row.channel).sort()).toEqual([
      'bank_deposit',
      'cash',
      'cheque',
      'mobile_money',
    ]);

    // Finishing the wizard again reuses every row instead of duplicating the chart.
    await seedDemoSchool(context.repository, demoSchoolInputFor(wizardDraft()), {
      packDocument: shippedPackDocument,
    });
    expect(await chartCodes(context, result.institutionId)).toEqual(codes);
  });

  it('seeds the demo school with the same chart and channel nominations', async () => {
    const context = await freshContext();

    const result = await seedDemoSchool(
      context.repository,
      {
        school: { name: 'Mwangaza Academy', motto: 'Knowledge and service' },
        year: {
          name: '2027',
          startDate: '2027-01-05',
          endDate: '2027-11-30',
          terms: [
            { name: 'Term 1', startDate: '2027-01-05', endDate: '2027-04-10' },
            { name: 'Term 2', startDate: '2027-04-28', endDate: '2027-08-01' },
            { name: 'Term 3', startDate: '2027-08-25', endDate: '2027-10-31' },
          ],
        },
        classes: [{ name: 'Grade 7', streams: ['North', 'South'] }],
        demo: true,
        today: '2027-10-31',
      },
      { packDocument: shippedPackDocument }
    );

    expect(result.demoSeeded).toBe(true);
    expect(await chartCodes(context, result.institutionId)).toContain('5000');

    const channels = await context.repository.list('channel_account', {
      where: { institution_id: result.institutionId },
      limit: 500,
    });
    expect(channels.items).toHaveLength(4);
  });
});
