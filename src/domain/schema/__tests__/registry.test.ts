// ABOUTME: Registry tests for the canonical entity map: closed EntityName union, unique tables,
// ABOUTME: resolvable foreign keys, valid index columns and the per-entity label functions.

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  databaseSchemaFor,
  ENTITY_NAMES,
  entityDefinitions,
  isEntityName,
  labelOf,
  type EntityName,
  type EntityRow,
  type UniqueConstraint,
  zodToJsonSchema,
} from '../index';
import { validFixtures } from './fixtures';

const EXPECTED_ENTITY_COUNT = 68;

const EXPECTED_ENTITIES = [
  'academic_period',
  'academic_year',
  'assessment',
  'assessment_scheme',
  'attendance_mark',
  'attendance_session',
  'calendar',
  'calendar_event',
  'campus',
  'class_group',
  'combination_rule',
  'comment_bank_entry',
  'competency',
  'competency_observation',
  'component',
  'conduct_incident',
  'credit_note',
  'curriculum_pack',
  'department',
  'discount_rule',
  'enrolment',
  'enrolment_change',
  'fee_category',
  'fee_item',
  'fee_schedule',
  'fee_schedule_line',
  'financial_year',
  'grading_scale',
  'guardian',
  'health_visit',
  'house',
  'household',
  'identifier',
  'installment_plan',
  'institution',
  'institution_identifier',
  'invoice',
  'invoice_line',
  'job_title',
  'learner',
  'learner_guardian',
  'learning_area',
  'learning_area_enrolment',
  'leave_out',
  'level',
  'mark',
  'outcome',
  'pathway',
  'payment',
  'payment_allocation',
  'period_result',
  'programme',
  'promotion_decision',
  'receipt',
  'refund',
  'report_card',
  'residence',
  'residence_bed',
  'result',
  'sponsorship',
  'staff',
  'stage',
  'teaching_assignment',
  'teaching_group',
  'teaching_group_member',
  'timetable_entry',
  'timetable_slot',
  'user',
] as const;

function propertiesOf(name: EntityName): Record<string, unknown> {
  return zodToJsonSchema(entityDefinitions[name].schema).properties;
}

function uniqueColumns(constraint: UniqueConstraint): readonly string[] {
  return 'columns' in constraint ? constraint.columns : constraint;
}

/** Array fields that name a role, not an entity; their ids still resolve to a registered table. */
const EXTERNAL_ID_ARRAYS: Readonly<Record<string, EntityName>> = {
  teacher_ids: 'staff',
  homeroom_teacher_ids: 'staff',
};

describe('canonical entity registry', () => {
  it('registers every canonical entity exactly once', () => {
    expect(ENTITY_NAMES).toHaveLength(EXPECTED_ENTITY_COUNT);
    expect(new Set(ENTITY_NAMES).size).toBe(EXPECTED_ENTITY_COUNT);
    expect(new Set(ENTITY_NAMES)).toEqual(new Set(Object.keys(entityDefinitions)));
    expect([...ENTITY_NAMES].sort()).toEqual([...EXPECTED_ENTITIES]);
  });

  it('keeps each registry key equal to the definition name', () => {
    for (const name of ENTITY_NAMES) {
      expect(entityDefinitions[name].name, name).toBe(name);
    }
  });

  it('uses a unique physical table per entity', () => {
    const tables = ENTITY_NAMES.map((name) => entityDefinitions[name].storage.table);
    expect(new Set(tables).size).toBe(ENTITY_NAMES.length);
  });

  it('declares a primary key that exists in the schema', () => {
    for (const name of ENTITY_NAMES) {
      const storage = entityDefinitions[name].storage;
      expect(propertiesOf(name), name).toHaveProperty(storage.primaryKey);
    }
  });

  it('resolves every foreign key to a registered table', () => {
    const tables = new Set(ENTITY_NAMES.map((name) => entityDefinitions[name].storage.table));
    for (const name of ENTITY_NAMES) {
      const { refs } = entityDefinitions[name].storage;
      for (const [column, target] of Object.entries(refs)) {
        expect(propertiesOf(name), `${name}.${column}`).toHaveProperty(column);
        expect(tables, `${name}.${column} -> ${target}`).toContain(target);
      }
    }
  });

  it('declares index and unique columns that exist in the schema', () => {
    for (const name of ENTITY_NAMES) {
      const properties = propertiesOf(name);
      const { indexes, unique, encrypted } = entityDefinitions[name].storage;

      for (const index of indexes) {
        const columns = typeof index === 'string' ? [index] : index;
        for (const column of columns) {
          expect(properties, `${name} index ${column}`).toHaveProperty(column);
        }
      }

      for (const key of unique) {
        for (const column of uniqueColumns(key)) {
          expect(properties, `${name} unique ${column}`).toHaveProperty(column);
        }
      }

      for (const column of encrypted) {
        expect(properties, `${name} encrypted ${column}`).toHaveProperty(column);
      }
    }
  });

  it('points every *_ids array at a registered entity or an explicit external target', () => {
    const registered = new Set<string>(ENTITY_NAMES);
    for (const name of ENTITY_NAMES) {
      for (const property of Object.keys(propertiesOf(name))) {
        if (!property.endsWith('_ids')) continue;
        const inferredTarget = property.slice(0, -'_ids'.length);
        const target = EXTERNAL_ID_ARRAYS[property] ?? inferredTarget;
        expect(registered, `${name}.${property} -> ${target}`).toContain(target);
      }
    }
  });

  it('reports entity names through the type guard', () => {
    expect(isEntityName('learner')).toBe(true);
    expect(isEntityName('not_an_entity')).toBe(false);
  });

  it('builds the DDL input with the storage table and primary key', () => {
    const learner = databaseSchemaFor('learner');
    expect(learner.title).toBe('learner');
    expect(learner.primaryKey).toBe('id');
    expect(learner.required).toContain('institution_id');
    expect(learner.properties.institution_id.ref).toBe('institution');
    expect(learner.encrypted).toEqual(['medical']);
  });

  it('exposes inferred row types for the registry', () => {
    expectTypeOf<EntityName>().toEqualTypeOf<keyof typeof entityDefinitions>();
    expectTypeOf<EntityRow<'learner'>>().toMatchTypeOf<{ admission_number: string }>();
    expectTypeOf<EntityRow<'enrolment'>>().toMatchTypeOf<{ start_date: string }>();
  });
});

describe('canonical entity labels', () => {
  it('labels a learner with name and admission number', () => {
    expect(labelOf('learner', validFixtures.learner)).toBe('Amani Wekesa · GA/2027/001');
  });

  it('labels an institution by its short name', () => {
    expect(labelOf('institution', validFixtures.institution)).toBe('Mwangaza');
  });

  it('labels a class group, invoice and calendar event', () => {
    expect(labelOf('class_group', validFixtures.class_group)).toBe('Blue');
    expect(labelOf('invoice', validFixtures.invoice)).toBe('INV/2027/T1/000123');
    expect(labelOf('calendar_event', validFixtures.calendar_event)).toBe(
      'exam_window 2027-03-01'
    );
  });

  it('labels a payment allocation with both sides of the link', () => {
    expect(labelOf('payment_allocation', validFixtures.payment_allocation)).toContain('→');
  });
});
