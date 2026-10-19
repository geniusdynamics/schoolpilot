// ABOUTME: Regression tests for storage unique keys: campus-scoped class groups, partial unique
// ABOUTME: handling for NULL components, effective-dated history and over-constrained names.

import { describe, expect, it } from 'vitest';

import { entityDefinitions, type EntityName, type UniqueConstraint, type UniqueKey } from '../index';
import { validFixtures } from './fixtures';

type Row = Record<string, unknown>;

const OTHER_CAMPUS = '00000000-0000-7000-8000-000000000201';

function columnsOf(constraint: UniqueConstraint): readonly string[] {
  return 'columns' in constraint ? constraint.columns : constraint;
}

function appliesTo(row: Row, constraint: UniqueConstraint): boolean {
  if (!('columns' in constraint)) return true;
  if (constraint.where === 'component_id IS NULL') {
    return row.component_id === null || row.component_id === undefined;
  }
  if (constraint.where === 'campus_id IS NULL') {
    return row.campus_id === null || row.campus_id === undefined;
  }
  return true;
}

function keyOf(row: Row, columns: readonly string[]): string {
  return columns.map((column) => `${column}=${String(row[column])}`).join('|');
}

/** Mirrors what A04 will emit as a UNIQUE INDEX, including a partial index predicate. */
function collides(rows: readonly Row[], constraint: UniqueConstraint): boolean {
  const columns = columnsOf(constraint);
  const seen = new Set<string>();
  for (const row of rows) {
    if (!appliesTo(row, constraint)) continue;
    const key = keyOf(row, columns);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function accepts(name: EntityName, row: unknown): boolean {
  return entityDefinitions[name].schema.safeParse(row).success;
}

describe('campus-scoped unique keys', () => {
  it('keeps class_group natural keys campus-scoped', () => {
    const east = structuredClone(validFixtures.class_group);
    const west = {
      ...structuredClone(validFixtures.class_group),
      id: '00000000-0000-7000-8000-000000000203',
      campus_id: OTHER_CAMPUS,
    };

    expect(accepts('class_group', east)).toBe(true);
    expect(accepts('class_group', west)).toBe(true);

    const key = entityDefinitions.class_group.storage.unique[0];
    expect(columnsOf(key)).toEqual([
      'institution_id',
      'campus_id',
      'academic_year_id',
      'programme_id',
      'level_id',
      'name',
    ]);
    expect(collides([east, west], key)).toBe(false);

    const duplicate = { ...east, id: '00000000-0000-7000-8000-000000000204' };
    expect(collides([east, duplicate], key)).toBe(true);
  });

  it('scopes teaching_group names to a campus as well as a year and learning area', () => {
    const east = structuredClone(validFixtures.teaching_group);
    const west = {
      ...structuredClone(validFixtures.teaching_group),
      id: '00000000-0000-7000-8000-000000000205',
      campus_id: OTHER_CAMPUS,
    };

    expect(accepts('teaching_group', east)).toBe(true);
    expect(accepts('teaching_group', west)).toBe(true);

    const key = entityDefinitions.teaching_group.storage.unique[0];
    expect(columnsOf(key)).toContain('campus_id');
    expect(collides([east, west], key)).toBe(false);

    const duplicate = { ...east, id: '00000000-0000-7000-8000-000000000206' };
    expect(collides([east, duplicate], key)).toBe(true);
  });

  it('scopes fee schedule names and versions to a campus', () => {
    const east = structuredClone(validFixtures.fee_schedule);
    const west = {
      ...structuredClone(validFixtures.fee_schedule),
      id: '00000000-0000-7000-8000-000000000207',
      campus_id: OTHER_CAMPUS,
    };

    expect(accepts('fee_schedule', east)).toBe(true);
    expect(accepts('fee_schedule', west)).toBe(true);

    const key = entityDefinitions.fee_schedule.storage.unique[0];
    expect(columnsOf(key)).toContain('campus_id');
    expect(collides([east, west], key)).toBe(false);

    const duplicate = { ...east, id: '00000000-0000-7000-8000-000000000208' };
    expect(collides([east, duplicate], key)).toBe(true);
  });

  it('enforces one institution-wide fee schedule per name and version', () => {
    const first = structuredClone(validFixtures.fee_schedule);
    delete first.campus_id;
    const second = {
      ...structuredClone(validFixtures.fee_schedule),
      id: '00000000-0000-7000-8000-000000000216',
    };
    delete second.campus_id;

    expect(accepts('fee_schedule', first)).toBe(true);
    expect(accepts('fee_schedule', second)).toBe(true);

    const partial = entityDefinitions.fee_schedule.storage.unique.find(
      (constraint): constraint is UniqueKey =>
        'columns' in constraint && constraint.where === 'campus_id IS NULL'
    );
    if (!partial) throw new Error('fee_schedule must declare a partial unique key for no campus');

    expect(collides([first, second], partial)).toBe(true);
  });
});

describe('mark unique key with a NULL component', () => {
  it('rejects two component-less marks for the same assessment, enrolment and learning area', () => {
    const first = structuredClone(validFixtures.mark);
    delete first.component_id;
    const second = {
      ...structuredClone(validFixtures.mark),
      id: '00000000-0000-7000-8000-000000000209',
    };
    delete second.component_id;

    expect(accepts('mark', first)).toBe(true);
    expect(accepts('mark', second)).toBe(true);

    const partial = entityDefinitions.mark.storage.unique.find(
      (constraint): constraint is UniqueKey =>
        'columns' in constraint && constraint.where === 'component_id IS NULL'
    );
    if (!partial) throw new Error('mark must declare a partial unique key for NULL components');

    expect(columnsOf(partial)).toEqual([
      'assessment_id',
      'enrolment_id',
      'learning_area_id',
    ]);
    expect(collides([first, second], partial)).toBe(true);
  });

  it('keeps component-scoped marks distinct', () => {
    const first = structuredClone(validFixtures.mark);
    const second = {
      ...structuredClone(validFixtures.mark),
      id: '00000000-0000-7000-8000-000000000210',
      component_id: '00000000-0000-7000-8000-000000000211',
    };

    const key = entityDefinitions.mark.storage.unique[0];
    expect(collides([first, second], key)).toBe(false);
  });
});

describe('effective-dated learning area history', () => {
  it('accepts a second period for the same enrolment and learning area', () => {
    const first = structuredClone(validFixtures.learning_area_enrolment);
    const second = {
      ...structuredClone(validFixtures.learning_area_enrolment),
      id: '00000000-0000-7000-8000-000000000212',
      valid_from: '2027-06-01',
      valid_to: null,
    };

    expect(accepts('learning_area_enrolment', first)).toBe(true);
    expect(accepts('learning_area_enrolment', second)).toBe(true);

    const key = entityDefinitions.learning_area_enrolment.storage.unique[0];
    expect(columnsOf(key)).toEqual(['enrolment_id', 'learning_area_id', 'valid_from']);
    expect(collides([first, second], key)).toBe(false);
  });

  it('rejects a duplicate start date for the same enrolment and learning area', () => {
    const first = structuredClone(validFixtures.learning_area_enrolment);
    const duplicate = {
      ...structuredClone(validFixtures.learning_area_enrolment),
      id: '00000000-0000-7000-8000-000000000213',
    };

    const key = entityDefinitions.learning_area_enrolment.storage.unique[0];
    expect(collides([first, duplicate], key)).toBe(true);
  });
});

describe('over-constrained unique keys', () => {
  it('allows assessment names to repeat across levels within a period', () => {
    expect(entityDefinitions.assessment.storage.unique).toEqual([]);
    const second = {
      ...structuredClone(validFixtures.assessment),
      id: '00000000-0000-7000-8000-000000000214',
    };
    expect(accepts('assessment', validFixtures.assessment)).toBe(true);
    expect(accepts('assessment', second)).toBe(true);
  });

  it('does not treat household names as identifiers', () => {
    expect(entityDefinitions.household.storage.unique).toEqual([]);
    const second = {
      ...structuredClone(validFixtures.household),
      id: '00000000-0000-7000-8000-000000000215',
    };
    expect(accepts('household', validFixtures.household)).toBe(true);
    expect(accepts('household', second)).toBe(true);
  });

  it('uses the generated-number uniqueness for invoices and receipts', () => {
    expect(entityDefinitions.invoice.storage.unique).toEqual([['institution_id', 'number']]);
    expect(entityDefinitions.receipt.storage.unique).toEqual([['institution_id', 'number']]);
  });
});
