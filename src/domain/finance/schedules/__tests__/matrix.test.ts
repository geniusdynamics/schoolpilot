// ABOUTME: The fee-schedule matrix, proven as pure logic: the deterministic cell key, the
// ABOUTME: resolution of a cell, and every refusal that stops an ambiguous, undeclared or missing
// ABOUTME: combination from resolving to a value the bursar did not choose.

import { describe, expect, it } from 'vitest';

import { asId } from '@/domain/ids';
import { fromMajor } from '@/domain/money';

import {
  cellKeyOf,
  describe as describeAddress,
  effectiveLineAddress,
  headerOf,
  isEditable,
  normalizeAddress,
  parseCellKey,
  resolveCell,
  sameAddress,
  type MatrixHeader,
} from '../matrix';
import { isScheduleError, type ScheduleErrorCode } from '../errors';
import type { StoredScheduleLine } from '../types';

const LEVEL_A = asId<'level'>('00000000-0000-7000-8000-0000000000a1');
const LEVEL_B = asId<'level'>('00000000-0000-7000-8000-0000000000a2');
const CATEGORY = asId<'fee_category'>('00000000-0000-7000-8000-0000000000c1');
const CATEGORY_2 = asId<'fee_category'>('00000000-0000-7000-8000-0000000000c2');
const CAMPUS = asId<'campus'>('00000000-0000-7000-8000-0000000000d1');
const SCHEDULE = asId<'fee_schedule'>('00000000-0000-7000-8000-0000000000e1');
const TUITION = asId<'fee_item'>('00000000-0000-7000-8000-0000000000f1');
const ACTIVITY = asId<'fee_item'>('00000000-0000-7000-8000-0000000000f2');

let lineSeq = 0;
function line(partial: Partial<StoredScheduleLine>): StoredScheduleLine {
  lineSeq += 1;
  return {
    id: `00000000-0000-7000-8000-00000000${String(1000 + lineSeq)}`,
    institution_id: '00000000-0000-7000-8000-000000000001',
    fee_schedule_id: SCHEDULE,
    fee_item_id: TUITION,
    amount: fromMajor('1000', 'KES'),
    mandatory: true,
    frequency: 'per_term',
    proration_rule: 'full',
    created_at: '2026-10-22T09:00:00.000Z',
    updated_at: '2026-10-22T09:00:00.000Z',
    ...partial,
  } as StoredScheduleLine;
}

/** A header that spans two levels, two residences, one category and one campus. */
function twoByTwo(): MatrixHeader {
  return {
    id: SCHEDULE,
    name: 'Two by two',
    version: 1,
    status: 'draft',
    levelIds: [LEVEL_A, LEVEL_B],
    residenceStatuses: ['day', 'boarder'],
    feeCategoryIds: [CATEGORY],
    campusId: CAMPUS,
  };
}

function refusal(run: () => unknown): ScheduleErrorCode {
  try {
    run();
  } catch (error) {
    if (isScheduleError(error)) return error.code;
    throw error;
  }
  throw new Error('the call was expected to be refused');
}

describe('the cell key', () => {
  it('is stable and round-trips', () => {
    const address = { levelId: LEVEL_A, residence: 'day', feeCategoryId: CATEGORY, campusId: CAMPUS } as const;
    const key = cellKeyOf(address);
    expect(key).toBe(`${LEVEL_A}|day|${CATEGORY}|${CAMPUS}`);
    expect(parseCellKey(key)).toEqual(address);
    expect(sameAddress(parseCellKey(key), address)).toBe(true);
  });

  it('distinguishes an absent dimension from a present one', () => {
    const withCampus = cellKeyOf({ levelId: LEVEL_A, residence: 'day', feeCategoryId: null, campusId: CAMPUS });
    const withoutCampus = cellKeyOf({ levelId: LEVEL_A, residence: 'day', feeCategoryId: null, campusId: null });
    expect(withCampus).not.toBe(withoutCampus);
    expect(parseCellKey(withoutCampus).campusId).toBeNull();
  });
});

describe('resolving a cell', () => {
  const lines = [
    line({ level_id: LEVEL_A, residence_status: 'day', fee_category_id: CATEGORY, fee_item_id: TUITION, amount: fromMajor('6000', 'KES') }),
    line({ level_id: LEVEL_A, residence_status: 'day', fee_category_id: CATEGORY, fee_item_id: ACTIVITY, amount: fromMajor('1000', 'KES') }),
    line({ level_id: LEVEL_B, residence_status: 'boarder', fee_category_id: CATEGORY, fee_item_id: TUITION, amount: fromMajor('5500', 'KES') }),
  ];

  it('prices a cell and totals it exactly in minor units', () => {
    const cell = resolveCell(twoByTwo(), lines, { levelId: LEVEL_A, residence: 'day' });
    expect(cell.feeScheduleId).toBe(SCHEDULE);
    expect(cell.version).toBe(1);
    expect(cell.lines.map((entry) => entry.feeItemId)).toEqual([TUITION, ACTIVITY]);
    expect(cell.total).toEqual({ amount_minor: 700_000, currency: 'KES' });
  });

  it('fills a dimension the schedule declares a single value for, and refuses when it declares several', () => {
    // The category is declared once, so it need not be named.
    const resolved = normalizeAddress(twoByTwo(), { levelId: LEVEL_A, residence: 'day' });
    expect(resolved.feeCategoryId).toBe(CATEGORY);
    // The level is declared twice, so it must be named.
    expect(refusal(() => normalizeAddress(twoByTwo(), { residence: 'day' } as never))).toBe('cell_ambiguous');
  });

  it('refuses a dimension the schedule declares no value for', () => {
    const header: MatrixHeader = { ...twoByTwo(), feeCategoryIds: [] };
    expect(refusal(() => normalizeAddress(header, { levelId: LEVEL_A, residence: 'day' }))).toBe(
      'cell_dimension_undeclared'
    );
  });

  it('refuses a value the schedule does not declare', () => {
    expect(refusal(() => normalizeAddress(twoByTwo(), { levelId: LEVEL_A, residence: 'weekly_boarder' }))).toBe(
      'cell_dimension_unknown'
    );
    expect(refusal(() => normalizeAddress(twoByTwo(), { levelId: LEVEL_A, residence: 'day', feeCategoryId: CATEGORY_2 }))).toBe(
      'cell_dimension_unknown'
    );
    expect(refusal(() => normalizeAddress(twoByTwo(), { levelId: LEVEL_A, residence: 'day', campusId: asId<'campus'>('00000000-0000-7000-8000-0000000000d9') }))).toBe(
      'cell_dimension_unknown'
    );
  });

  it('refuses a combination no cell prices rather than falling back to a neighbour', () => {
    expect(refusal(() => resolveCell(twoByTwo(), lines, { levelId: LEVEL_A, residence: 'boarder' }))).toBe(
      'cell_missing'
    );
    expect(refusal(() => resolveCell(twoByTwo(), lines, { levelId: LEVEL_B, residence: 'day' }))).toBe('cell_missing');
  });

  it("reads a line that names no level as belonging to the schedule's single level", () => {
    const header: MatrixHeader = { ...twoByTwo(), levelIds: [LEVEL_A], residenceStatuses: ['day'] };
    const address = effectiveLineAddress(header, line({ fee_item_id: TUITION }));
    expect(address?.levelId).toBe(LEVEL_A);
    expect(address?.residence).toBe('day');
  });

  it('cannot place a line when the schedule spans several levels and the line names none', () => {
    expect(effectiveLineAddress(twoByTwo(), line({ fee_item_id: TUITION }))).toBeNull();
  });
});

describe('the immutability rule', () => {
  it('freezes an approved, published or archived version and leaves a draft editable', () => {
    expect(isEditable('draft')).toBe(true);
    expect(isEditable('submitted')).toBe(true);
    expect(isEditable('approved')).toBe(false);
    expect(isEditable('published')).toBe(false);
    expect(isEditable('archived')).toBe(false);
  });
});

describe('reading a header off a canonical row', () => {
  it('carries the dimensions and the campus', () => {
    const header = headerOf({
      id: SCHEDULE,
      institution_id: '00000000-0000-7000-8000-000000000001',
      name: 'Two by two',
      academic_year_id: '00000000-0000-7000-8000-000000000010',
      academic_period_ids: [],
      programme_ids: [],
      level_ids: [LEVEL_A, LEVEL_B],
      residence_statuses: ['day', 'boarder'],
      fee_category_ids: [CATEGORY],
      campus_id: CAMPUS,
      new_learners_only: false,
      version: 3,
      status: 'approved',
      created_at: '2026-10-22T09:00:00.000Z',
      updated_at: '2026-10-22T09:00:00.000Z',
    });
    expect(header).toMatchObject({ version: 3, status: 'approved', campusId: CAMPUS });
    expect(header.levelIds).toEqual([LEVEL_A, LEVEL_B]);
  });
});

describe('describing a refusal', () => {
  it('names every dimension', () => {
    expect(describeAddress({ levelId: LEVEL_A, residence: 'day', feeCategoryId: null, campusId: null })).toContain(
      'residence day'
    );
  });
});
