// ABOUTME: Single-entity refinement tests for the canonical schemas: date ordering, conditional
// ABOUTME: exit reasons, grading bands, competency evidence and finance consistency rules.

import { describe, expect, it } from 'vitest';

import { entityDefinitions } from '../index';
import { validFixtures } from './fixtures';

function accepts(name: keyof typeof validFixtures, row: unknown): boolean {
  return entityDefinitions[name].schema.safeParse(row).success;
}

describe('calendar refinements', () => {
  it('rejects an academic year that ends before it starts', () => {
    const row = structuredClone(validFixtures.academic_year);
    row.end_date = '2026-12-31';
    expect(accepts('academic_year', row)).toBe(false);
  });

  it('accepts a single-day academic year', () => {
    const row = structuredClone(validFixtures.academic_year);
    row.end_date = row.start_date;
    expect(accepts('academic_year', row)).toBe(true);
  });

  it('rejects overlapping-order dates on periods, events and financial years', () => {
    const period = structuredClone(validFixtures.academic_period);
    period.end_date = '2027-01-01';
    expect(accepts('academic_period', period)).toBe(false);

    const event = structuredClone(validFixtures.calendar_event);
    event.end_date = '2027-02-01';
    expect(accepts('calendar_event', event)).toBe(false);

    const financialYear = structuredClone(validFixtures.financial_year);
    financialYear.end_date = '2026-12-31';
    expect(accepts('financial_year', financialYear)).toBe(false);
  });
});

describe('enrolment refinements', () => {
  it('rejects an enrolment that ends before it starts', () => {
    const row = structuredClone(validFixtures.enrolment);
    row.end_date = '2026-12-31';
    expect(accepts('enrolment', row)).toBe(false);
  });

  it('requires an exit reason when the enrolment is left or completed', () => {
    const left = structuredClone(validFixtures.enrolment);
    left.status = 'left';
    delete left.exit_reason;
    expect(accepts('enrolment', left)).toBe(false);

    const completed = structuredClone(validFixtures.enrolment);
    completed.status = 'completed';
    completed.exit_reason = 'graduated';
    expect(accepts('enrolment', completed)).toBe(true);
  });

  it('keeps an active enrolment valid with a null exit reason', () => {
    expect(accepts('enrolment', validFixtures.enrolment)).toBe(true);
  });

  it('rejects reversed validity windows on membership and assignments', () => {
    const member = structuredClone(validFixtures.teaching_group_member);
    member.valid_to = '2027-01-01';
    expect(accepts('teaching_group_member', member)).toBe(false);

    const assignment = structuredClone(validFixtures.teaching_assignment);
    assignment.valid_to = '2027-01-01';
    expect(accepts('teaching_assignment', assignment)).toBe(false);

    const learningArea = structuredClone(validFixtures.learning_area_enrolment);
    learningArea.valid_to = '2027-01-01';
    expect(accepts('learning_area_enrolment', learningArea)).toBe(false);
  });
});

describe('people and timetable refinements', () => {
  it('rejects a staff end date before the start date', () => {
    const row = structuredClone(validFixtures.staff);
    row.end_date = '2019-12-31';
    expect(accepts('staff', row)).toBe(false);
  });

  it('rejects a timetable slot that ends before it starts', () => {
    const row = structuredClone(validFixtures.timetable_slot);
    row.end_time = '07:30:00';
    expect(accepts('timetable_slot', row)).toBe(false);
  });
});

describe('assessment refinements', () => {
  it('rejects a grading band whose minimum exceeds its maximum', () => {
    const row = structuredClone(validFixtures.grading_scale);
    row.bands[0] = { ...row.bands[0], min: 95, max: 90 };
    expect(accepts('grading_scale', row)).toBe(false);
  });

  it('rejects an assessment date window that ends before it starts', () => {
    const row = structuredClone(validFixtures.assessment);
    row.date_window = { start_date: '2027-03-24', end_date: '2027-03-20' };
    expect(accepts('assessment', row)).toBe(false);
  });

  it('requires exactly one of outcome_id or competency_id on an observation', () => {
    const neither = structuredClone(validFixtures.competency_observation);
    delete neither.outcome_id;
    expect(accepts('competency_observation', neither)).toBe(false);

    const both = structuredClone(validFixtures.competency_observation);
    both.competency_id = validFixtures.competency.id;
    expect(accepts('competency_observation', both)).toBe(false);
  });

  it('rejects a non-decimal mark score', () => {
    const row = structuredClone(validFixtures.mark);
    row.score = 'forty five';
    expect(accepts('mark', row)).toBe(false);
  });
});

describe('finance refinements', () => {
  it('rejects a percentage discount above 100', () => {
    const row = structuredClone(validFixtures.discount_rule);
    row.value = 101;
    expect(accepts('discount_rule', row)).toBe(false);
  });

  it('rejects a sponsorship that ends before it starts', () => {
    const row = structuredClone(validFixtures.sponsorship);
    row.ends_on = '2026-12-31';
    expect(accepts('sponsorship', row)).toBe(false);
  });

  it('rejects an invoice that is due before it is issued', () => {
    const row = structuredClone(validFixtures.invoice);
    row.due_date = '2027-01-01';
    expect(accepts('invoice', row)).toBe(false);
  });

  it('requires an invoice to name a learner, payer or household', () => {
    const row = structuredClone(validFixtures.invoice);
    delete row.learner_id;
    delete row.payer_guardian_id;
    delete row.household_id;
    expect(accepts('invoice', row)).toBe(false);
  });

  it('records an exchange rate and base amount together', () => {
    const row = structuredClone(validFixtures.payment);
    row.exchange_rate = 1.15;
    expect(accepts('payment', row)).toBe(false);

    row.base_amount = { amount_minor: 345000, currency: 'KES' };
    expect(accepts('payment', row)).toBe(true);
  });

  it('rejects a non-positive payment allocation', () => {
    const row = structuredClone(validFixtures.payment_allocation);
    row.amount = { amount_minor: 0, currency: 'KES' };
    expect(accepts('payment_allocation', row)).toBe(false);
  });

  it('requires a paid refund to record when it was paid', () => {
    const row = structuredClone(validFixtures.refund);
    delete row.paid_at;
    expect(accepts('refund', row)).toBe(false);
  });
});
