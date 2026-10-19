// ABOUTME: DDL bridge tests that zod schemas flow through toDatabaseSchema and SchemaConverter
// ABOUTME: into the expected SQLite CREATE TABLE and index statements.

import { describe, expect, it } from 'vitest';

import { SchemaConverter } from '@/services/database/SchemaConverter';
import { databaseSchemaFor, entityDefinitions, type EntityName } from '../index';

function tableFor(entity: EntityName) {
  const storage = entityDefinitions[entity].storage;
  const schema = databaseSchemaFor(entity);
  const conversion = SchemaConverter.convertRxDBToSQLite(storage.table, schema);
  return {
    schema,
    storage,
    conversion,
    sql: SchemaConverter.generateCreateTableSQL(conversion.sqlSchema),
  };
}

describe('zod to SQLite DDL bridge', () => {
  it('generates the learner table with its columns, primary key and relationships', () => {
    const { schema, conversion, sql } = tableFor('learner');

    expect(schema.title).toBe('learner');
    expect(schema.required).toEqual(
      expect.arrayContaining([
        'id',
        'institution_id',
        'admission_number',
        'given_name',
        'family_name',
        'status',
      ])
    );
    expect(schema.properties.institution_id.ref).toBe('institution');
    expect(schema.properties.house_id.ref).toBe('house');
    expect(schema.properties.date_of_birth.format).toBe('date');
    expect(schema.properties.attributes.type).toBe('object');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "learner"');
    expect(sql).toContain('"id" TEXT PRIMARY KEY');
    expect(sql).toContain('"institution_id" TEXT');
    expect(sql).toContain('"admission_number" TEXT');
    expect(sql).toContain('"given_name" TEXT');
    expect(sql).toContain('"family_name" TEXT');
    expect(sql).toContain('"status" TEXT');
    expect(sql).toContain('"medical" TEXT');
    expect(sql).toContain('"attributes" TEXT');

    expect(conversion.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ localColumn: 'institution_id', targetTable: 'institution' }),
        expect.objectContaining({ localColumn: 'house_id', targetTable: 'house' }),
        expect.objectContaining({ localColumn: 'household_id', targetTable: 'household' }),
      ])
    );
    expect(conversion.indexes.map((index) => index.name)).toEqual(
      expect.arrayContaining(['idx_learner_institution_id', 'idx_learner_status'])
    );
  });

  it('generates the enrolment table with all enrolment foreign keys', () => {
    const { conversion, sql, storage } = tableFor('enrolment');

    for (const column of [
      'learner_id',
      'academic_year_id',
      'programme_id',
      'level_id',
      'class_group_id',
      'pathway_id',
      'sponsorship_id',
    ]) {
      expect(sql, column).toContain(`"${column}" TEXT`);
    }

    expect(conversion.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ localColumn: 'learner_id', targetTable: 'learner' }),
        expect.objectContaining({ localColumn: 'academic_year_id', targetTable: 'academic_year' }),
        expect.objectContaining({ localColumn: 'class_group_id', targetTable: 'class_group' }),
        expect.objectContaining({ localColumn: 'sponsorship_id', targetTable: 'sponsorship' }),
      ])
    );
    expect(conversion.indexes.map((index) => index.name)).toEqual(
      expect.arrayContaining(['idx_enrolment_learner_id', 'idx_enrolment_class_group_id'])
    );
    expect(storage.unique).toEqual([['learner_id', 'academic_year_id', 'start_date']]);
  });

  it('generates the invoice table with money and payer relationships', () => {
    const { conversion, sql, storage } = tableFor('invoice');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "invoice"');
    expect(sql).toContain('"number" TEXT');
    expect(sql).toContain('"learner_id" TEXT');
    expect(sql).toContain('"payer_guardian_id" TEXT');
    expect(sql).toContain('"household_id" TEXT');
    expect(sql).toContain('"total" TEXT');
    expect(conversion.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ localColumn: 'learner_id', targetTable: 'learner' }),
        expect.objectContaining({ localColumn: 'payer_guardian_id', targetTable: 'guardian' }),
        expect.objectContaining({ localColumn: 'household_id', targetTable: 'household' }),
      ])
    );
    expect(storage.unique).toEqual([['institution_id', 'number']]);
  });

  it('maps integers and booleans to their SQLite column types', () => {
    const classGroup = tableFor('class_group').sql;
    expect(classGroup).toContain('"capacity" INTEGER');

    const campus = tableFor('campus').sql;
    expect(campus).toContain('"is_main" INTEGER');
  });

  it('exposes unique keys and required columns for the DDL backend to emit', () => {
    const learner = tableFor('learner');
    expect(learner.storage.unique).toEqual([['institution_id', 'admission_number']]);
    expect(learner.schema.required).toEqual(
      expect.arrayContaining([
        'id',
        'institution_id',
        'admission_number',
        'given_name',
        'family_name',
        'status',
        'created_at',
        'updated_at',
      ])
    );

    const mark = tableFor('mark');
    expect(mark.storage.unique).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          columns: ['assessment_id', 'enrolment_id', 'learning_area_id'],
          where: 'component_id IS NULL',
        }),
      ])
    );

    // A04 owns turning `required` into NOT NULL and `unique` (including partial keys) into
    // CREATE UNIQUE INDEX statements; these assertions pin the metadata it consumes.
  });

  it('emits one CREATE TABLE for every registered entity', () => {
    for (const entity of Object.keys(entityDefinitions) as EntityName[]) {
      const { sql } = tableFor(entity);
      expect(sql, entity).toContain(
        `CREATE TABLE IF NOT EXISTS "${entityDefinitions[entity].storage.table}"`
      );
    }
  });
});
