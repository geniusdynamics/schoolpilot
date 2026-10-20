// ABOUTME: Parity tests proving the form helper and repository-level schema agree exactly.
// ABOUTME: Exercises learner, enrolment and invoice payloads across every required defect class.

import { describe, expect, it } from 'vitest';
import type { z } from 'zod/v4';

import { enrolmentSchema } from '@/domain/schema/enrolment';
import { invoiceSchema } from '@/domain/schema/finance';
import { learnerSchema } from '@/domain/schema/people';
import { validFixtures } from '@/domain/schema/__tests__/fixtures';
import { mapIssuesToFields } from '../fieldTypes';
import { validateEntityForm } from '../validation';

type Payload = Record<string, unknown>;

function base(value: unknown): Payload {
  return structuredClone(value) as Payload;
}

function variant(value: unknown, patch: Payload): Payload {
  return { ...base(value), ...patch };
}

function without(value: unknown, key: string): Payload {
  const copy = base(value);
  delete copy[key];
  return copy;
}

interface ParityCase {
  readonly entity: 'learner' | 'enrolment' | 'invoice';
  readonly name: string;
  readonly schema: z.ZodType;
  readonly payload: Payload;
  readonly fieldPaths: readonly string[];
  readonly expectedField?: string;
}

const learnerPaths = [
  'given_name',
  'family_name',
  'gender',
  'date_of_birth',
  'admission_number',
  'status',
];
const enrolmentPaths = [
  'learner_id',
  'status',
  'start_date',
  'end_date',
  'entry_reason',
  'exit_reason',
];
const invoicePaths = [
  'number',
  'learner_id',
  'payer_guardian_id',
  'household_id',
  'issue_date',
  'due_date',
  'total',
  'status',
];

const learner = validFixtures.learner;
const enrolment = validFixtures.enrolment;
const invoice = validFixtures.invoice;

const cases: readonly ParityCase[] = [
  {
    entity: 'learner',
    name: 'valid learner',
    schema: learnerSchema,
    payload: base(learner),
    fieldPaths: learnerPaths,
  },
  {
    entity: 'learner',
    name: 'missing required given_name',
    schema: learnerSchema,
    payload: without(learner, 'given_name'),
    fieldPaths: learnerPaths,
    expectedField: 'given_name',
  },
  {
    entity: 'learner',
    name: 'bad gender enum',
    schema: learnerSchema,
    payload: variant(learner, { gender: 'unknown' }),
    fieldPaths: learnerPaths,
    expectedField: 'gender',
  },
  {
    entity: 'learner',
    name: 'bad date of birth',
    schema: learnerSchema,
    payload: variant(learner, { date_of_birth: '2014-02-30' }),
    fieldPaths: learnerPaths,
    expectedField: 'date_of_birth',
  },
  {
    entity: 'enrolment',
    name: 'valid enrolment',
    schema: enrolmentSchema,
    payload: base(enrolment),
    fieldPaths: enrolmentPaths,
  },
  {
    entity: 'enrolment',
    name: 'missing required learner_id',
    schema: enrolmentSchema,
    payload: without(enrolment, 'learner_id'),
    fieldPaths: enrolmentPaths,
    expectedField: 'learner_id',
  },
  {
    entity: 'enrolment',
    name: 'bad status enum',
    schema: enrolmentSchema,
    payload: variant(enrolment, { status: 'pending' }),
    fieldPaths: enrolmentPaths,
    expectedField: 'status',
  },
  {
    entity: 'enrolment',
    name: 'bad start_date',
    schema: enrolmentSchema,
    payload: variant(enrolment, { start_date: '2027-13-01' }),
    fieldPaths: enrolmentPaths,
    expectedField: 'start_date',
  },
  {
    entity: 'enrolment',
    name: 'end date before start date',
    schema: enrolmentSchema,
    payload: variant(enrolment, { end_date: '2027-01-01' }),
    fieldPaths: enrolmentPaths,
    expectedField: 'end_date',
  },
  {
    entity: 'enrolment',
    name: 'exit reason missing for a completed enrolment',
    schema: enrolmentSchema,
    payload: without(variant(enrolment, { status: 'completed' }), 'exit_reason'),
    fieldPaths: enrolmentPaths,
    expectedField: 'exit_reason',
  },
  {
    entity: 'invoice',
    name: 'valid invoice',
    schema: invoiceSchema,
    payload: base(invoice),
    fieldPaths: invoicePaths,
  },
  {
    entity: 'invoice',
    name: 'missing required number',
    schema: invoiceSchema,
    payload: without(invoice, 'number'),
    fieldPaths: invoicePaths,
    expectedField: 'number',
  },
  {
    entity: 'invoice',
    name: 'bad status enum',
    schema: invoiceSchema,
    payload: variant(invoice, { status: 'sent' }),
    fieldPaths: invoicePaths,
    expectedField: 'status',
  },
  {
    entity: 'invoice',
    name: 'bad issue date',
    schema: invoiceSchema,
    payload: variant(invoice, { issue_date: '2027-02-30' }),
    fieldPaths: invoicePaths,
    expectedField: 'issue_date',
  },
  {
    entity: 'invoice',
    name: 'fractional minor units',
    schema: invoiceSchema,
    payload: variant(invoice, {
      total: { amount_minor: 1.5, currency: 'KES' },
    }),
    fieldPaths: invoicePaths,
    expectedField: 'total',
  },
  {
    entity: 'invoice',
    name: 'lowercase currency',
    schema: invoiceSchema,
    payload: variant(invoice, {
      total: { amount_minor: 600000, currency: 'kes' },
    }),
    fieldPaths: invoicePaths,
    expectedField: 'total',
  },
  {
    entity: 'invoice',
    name: 'due date before issue date',
    schema: invoiceSchema,
    payload: variant(invoice, { due_date: '2027-01-01' }),
    fieldPaths: invoicePaths,
    expectedField: 'due_date',
  },
  {
    entity: 'invoice',
    name: 'no learner, payer or household',
    schema: invoiceSchema,
    payload: variant(without(without(invoice, 'learner_id'), 'household_id'), {
      payer_guardian_id: undefined,
    }),
    fieldPaths: invoicePaths,
    expectedField: 'learner_id',
  },
];

describe('form and repository validation parity', () => {
  for (const testCase of cases) {
    it(`${testCase.entity}: ${testCase.name}`, () => {
      const formResult = validateEntityForm(testCase.schema, testCase.payload, testCase.fieldPaths);
      const repositoryResult = testCase.schema.safeParse(testCase.payload);

      expect(formResult.success).toBe(repositoryResult.success);

      if (formResult.success && repositoryResult.success) {
        expect(formResult.data).toEqual(testCase.payload);
        expect(testCase.schema.safeParse(formResult.data).success).toBe(true);
        expect(repositoryResult.data).toEqual(testCase.payload);
      }

      if (testCase.expectedField) {
        expect(formResult.fieldErrors[testCase.expectedField]?.length ?? 0).toBeGreaterThan(0);
      }
    });
  }

  it('does not mutate the submitted payload', () => {
    const payload = variant(learner, { gender: 'unknown' });
    const snapshot = structuredClone(payload);

    validateEntityForm(learnerSchema, payload, learnerPaths);

    expect(payload).toEqual(snapshot);
  });
});

describe('issue path mapping', () => {
  it('maps nested object and array paths to their declared controls', () => {
    const mapped = mapIssuesToFields(
      [
        { path: ['total', 'amount_minor'], message: 'amount must be an integer' },
        { path: ['phones', 0, 'number'], message: 'phone number must be E.164' },
        { path: [], message: 'an invoice needs a payer' },
      ],
      ['total', 'phones']
    );

    expect(mapped.fieldErrors).toEqual({
      total: ['amount must be an integer'],
      phones: ['phone number must be E.164'],
    });
    expect(mapped.formErrors).toEqual(['an invoice needs a payer']);
  });

  it('prefers the longest declared path', () => {
    const mapped = mapIssuesToFields(
      [{ path: ['total', 'amount_minor'], message: 'bad minor units' }],
      ['total', 'total.amount_minor']
    );

    expect(mapped.fieldErrors).toEqual({ 'total.amount_minor': ['bad minor units'] });
  });
});
