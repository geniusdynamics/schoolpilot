// ABOUTME: Behaviour tests for the canonical finance services: billing runs, payments with receipts,
// ABOUTME: allocations within the payment, charge invoices and credit notes. Amounts stay in minor units.

import { describe, expect, it } from 'vitest';

import { asId } from '@/domain/ids';
import { money } from '../../data/canonicalFinance';
import { createFinanceRepositoryDouble } from '../../data/__tests__/canonicalRepositoryDouble';
import {
  allocatePayment,
  createChargeInvoice,
  generateInvoices,
  nextDocumentNumber,
  recordPayment,
} from '../canonicalFinanceService';

const INSTITUTION = '00000000-0000-7000-8000-000000000001';
const YEAR = '21111111-1111-7111-8111-111111111111';
const PERIOD = '22222222-2222-7222-8222-222222222222';
const LEVEL = '33333333-3333-7333-8333-333333333333';
const CAMPUS = '44444444-4444-7444-8444-444444444444';
const PROGRAMME = '55555555-5555-7555-8555-555555555555';
const CLASS_GROUP = '66666666-6666-7666-8666-666666666666';
const LEARNER = '77777777-7777-7777-8777-777777777777';
const LEARNER_TWO = '88888888-8888-7888-8888-888888888888';
const FEE_ITEM = '99999999-9999-7999-8999-999999999999';
const SCHEDULE = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa';

function seed() {
  return createFinanceRepositoryDouble({
    institution: [{ id: INSTITUTION, name: 'Test School' }],
    academic_year: [
      {
        id: YEAR,
        institution_id: INSTITUTION,
        calendar_id: 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb',
        name: '2027',
        start_date: '2027-01-01',
        end_date: '2027-12-31',
        status: 'current',
      },
    ],
    academic_period: [
      {
        id: PERIOD,
        institution_id: INSTITUTION,
        academic_year_id: YEAR,
        kind: 'term',
        sequence: 1,
        name: 'Term 1 2027',
        start_date: '2027-01-01',
        end_date: '2027-04-30',
        is_reporting: true,
        is_billing: true,
        status: 'current',
      },
    ],
    level: [{ id: LEVEL, institution_id: INSTITUTION, stage_id: 'cccccccc-cccc-7ccc-8ccc-cccccccccccc', code: 'F1', name: 'Form 1', ordinal: 1, is_terminal: false }],
    class_group: [
      {
        id: CLASS_GROUP,
        institution_id: INSTITUTION,
        campus_id: CAMPUS,
        academic_year_id: YEAR,
        programme_id: PROGRAMME,
        level_id: LEVEL,
        name: 'Form 1 Blue',
        homeroom_teacher_ids: [],
      },
    ],
    learner: [
      {
        id: LEARNER,
        institution_id: INSTITUTION,
        admission_number: 'ADM-1',
        given_name: 'Jane',
        family_name: 'Wanjiru',
        name_order: 'given_first',
        gender: 'female',
        status: 'enrolled',
        residence_status: 'day',
      },
      {
        id: LEARNER_TWO,
        institution_id: INSTITUTION,
        admission_number: 'ADM-2',
        given_name: 'Peter',
        family_name: 'Otieno',
        name_order: 'given_first',
        gender: 'male',
        status: 'enrolled',
        residence_status: 'day',
      },
    ],
    enrolment: [
      {
        id: 'dddddddd-dddd-7ddd-8ddd-dddddddddddd',
        institution_id: INSTITUTION,
        learner_id: LEARNER,
        academic_year_id: YEAR,
        programme_id: PROGRAMME,
        level_id: LEVEL,
        class_group_id: CLASS_GROUP,
        status: 'active',
        start_date: '2027-01-05',
        entry_reason: 'new_admission',
      },
    ],
    fee_item: [
      {
        id: FEE_ITEM,
        institution_id: INSTITUTION,
        code: 'TUITION',
        name: 'Tuition',
        category: 'tuition',
        refundable: false,
        taxable: false,
        priority: 1,
        funding_source: 'parent',
      },
    ],
    fee_schedule: [
      {
        id: SCHEDULE,
        institution_id: INSTITUTION,
        name: 'Form 1 2027',
        academic_year_id: YEAR,
        academic_period_ids: [PERIOD],
        programme_ids: [],
        level_ids: [],
        residence_statuses: [],
        fee_category_ids: [],
        new_learners_only: false,
        version: 1,
        status: 'published',
      },
    ],
    fee_schedule_line: [
      {
        id: 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeeee',
        institution_id: INSTITUTION,
        fee_schedule_id: SCHEDULE,
        fee_item_id: FEE_ITEM,
        amount: money(150_005),
        mandatory: true,
        frequency: 'per_term',
        proration_rule: 'full',
      },
    ],
  });
}

describe('nextDocumentNumber', () => {
  it('continues the numeric suffix and pads it', () => {
    expect(nextDocumentNumber('INV', [])).toBe('INV-000001');
    expect(nextDocumentNumber('INV', ['INV-000009', 'INV-000004'])).toBe('INV-000010');
  });
});

describe('generateInvoices', () => {
  it('previews the run without writing and keeps the exact minor units', async () => {
    const repository = seed();
    const result = await generateInvoices(repository, {
      academicPeriodId: PERIOD,
      dryRun: true,
      issueDate: '2027-02-01',
    });
    expect(result.lines).toHaveLength(1);
    expect(result.amount).toEqual(money(150_005));
    expect(result.lines[0]?.amount).toEqual(money(150_005));
    expect(result.skippedLearnerIds).toEqual([]);
    expect(repository.writes).toHaveLength(0);
  });

  it('posts one invoice per learner with a line per schedule line', async () => {
    const repository = seed();
    const result = await generateInvoices(repository, {
      academicPeriodId: PERIOD,
      dryRun: false,
      issueDate: '2027-02-01',
    });
    expect(result.invoicesCreated).toBe(1);
    const invoices = repository.rows.invoice ?? [];
    expect(invoices).toHaveLength(1);
    expect(invoices[0]?.status).toBe('posted');
    expect(invoices[0]?.total).toEqual(money(150_005));
    const lines = repository.rows.invoice_line ?? [];
    expect(lines).toHaveLength(1);
    expect(lines[0]?.description).toBe('TUITION Tuition');
    expect(lines[0]?.amount).toEqual(money(150_005));
  });

  it('reports a learner who is already billed instead of editing the invoice', async () => {
    const repository = seed();
    await generateInvoices(repository, {
      academicPeriodId: PERIOD,
      dryRun: false,
      issueDate: '2027-02-01',
    });
    const second = await generateInvoices(repository, {
      academicPeriodId: PERIOD,
      dryRun: false,
      issueDate: '2027-02-01',
    });
    expect(second.invoicesCreated).toBe(0);
    expect(second.skippedLearnerIds).toEqual([LEARNER]);
    expect((repository.rows.invoice ?? []).length).toBe(1);
  });
});

describe('recordPayment', () => {
  it('posts the payment and issues a receipt with the exact amount', async () => {
    const repository = seed();
    const { payment, receipt } = await recordPayment(repository, {
      learnerId: LEARNER,
      amount: money(1_500_005),
      channel: 'mobile_money',
      receivedAt: '2027-02-02T09:00:00.000Z',
      reference: 'MPESA-1',
    });
    expect(payment.amount).toEqual(money(1_500_005));
    expect(payment.status).toBe('posted');
    expect(receipt.number).toMatch(/^RCT-\d{6}$/);
    expect(receipt.payment_id).toBe(payment.id);
  });
});

describe('allocatePayment', () => {
  it('writes the allocation and marks the invoice paid', async () => {
    const repository = seed();
    const { payment } = await recordPayment(repository, {
      learnerId: LEARNER,
      amount: money(200_000),
      channel: 'cash',
      receivedAt: '2027-02-02T09:00:00.000Z',
    });
    const invoice = await repository.create('invoice', {
      institution_id: INSTITUTION,
      number: 'INV-000001',
      learner_id: asId<'learner'>(LEARNER),
      academic_period_id: asId<'academic_period'>(PERIOD),
      issue_date: '2027-02-01',
      total: money(200_000),
      status: 'posted',
    });
    const result = await allocatePayment(repository, {
      paymentId: payment.id,
      invoiceId: invoice.id,
      amount: money(200_000),
    });
    expect(result.allocation.amount).toEqual(money(200_000));
    expect(result.invoice.status).toBe('paid');
  });

  it('refuses an allocation above the amount that was paid', async () => {
    const repository = seed();
    const { payment } = await recordPayment(repository, {
      learnerId: LEARNER,
      amount: money(100_000),
      channel: 'cash',
      receivedAt: '2027-02-02T09:00:00.000Z',
    });
    const invoice = await repository.create('invoice', {
      institution_id: INSTITUTION,
      number: 'INV-000001',
      learner_id: asId<'learner'>(LEARNER),
      issue_date: '2027-02-01',
      total: money(200_000),
      status: 'posted',
    });
    await expect(
      allocatePayment(repository, {
        paymentId: payment.id,
        invoiceId: invoice.id,
        amount: money(150_000),
      })
    ).rejects.toThrow(/exceed/);
  });
});

describe('createChargeInvoice', () => {
  it('posts a one-line charge with the kind the caller names', async () => {
    const repository = seed();
    const result = await createChargeInvoice(repository, {
      learnerId: LEARNER,
      description: 'Damaged textbook',
      amount: money(50_000),
      kind: 'fine',
      issueDate: '2027-02-03',
    });
    expect(result.invoice.status).toBe('posted');
    expect(result.invoice.total).toEqual(money(50_000));
    expect(result.line.kind).toBe('fine');
    expect(result.line.amount).toEqual(money(50_000));
  });
});
