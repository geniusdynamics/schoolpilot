// ABOUTME: DDL tests for the SQLite adapter: required columns, foreign keys, declared indexes
// ABOUTME: and composite/partial unique indexes generated from the entity storage sidecar.

import { describe, expect, it } from 'vitest';

import { databaseSchemaFor, type EntityName } from '@/domain/schema';
import { createDatabaseSchema, type DatabaseSchema } from '@/utils/databaseAgnosticSchema';

import { canonicalDatabaseSchema, statementsForSchema } from '..';

function ddlFor(entity: EntityName): string[] {
  return statementsForSchema(canonicalDatabaseSchema(entity));
}

function tableFor(entity: EntityName): string {
  return ddlFor(entity)[0];
}

describe('generated SQLite DDL', () => {
  it('emits NOT NULL on the canonical primary key', () => {
    expect(tableFor('learner')).toContain('"id" TEXT NOT NULL PRIMARY KEY');
    expect(tableFor('enrolment')).toContain('"id" TEXT NOT NULL PRIMARY KEY');
    expect(tableFor('invoice')).toContain('"id" TEXT NOT NULL PRIMARY KEY');
  });

  it('keeps strict mode behind canonicalDatabaseSchema for repositories', () => {
    expect(canonicalDatabaseSchema('learner').strict).toBe(true);
    expect(databaseSchemaFor('learner').strict).toBeUndefined();
  });

  it('emits NOT NULL for required columns and leaves optional columns nullable', () => {
    const learner = tableFor('learner');

    expect(learner).toContain('"institution_id" TEXT NOT NULL');
    expect(learner).toContain('"admission_number" TEXT NOT NULL');
    expect(learner).toContain('"given_name" TEXT NOT NULL');
    expect(learner).toContain('"family_name" TEXT NOT NULL');
    expect(learner).toContain('"status" TEXT NOT NULL');
    expect(learner).toContain('"created_at" TEXT NOT NULL');
    expect(learner).toContain('"updated_at" TEXT NOT NULL');

    expect(learner).not.toContain('"house_id" TEXT NOT NULL');
    expect(learner).not.toContain('"attributes" TEXT NOT NULL');
    expect(learner).not.toContain('"deleted_at" TEXT NOT NULL');
  });

  it('declares foreign keys for every ref column', () => {
    const learner = tableFor('learner');
    expect(learner).toContain('REFERENCES "institution"("id")');
    expect(learner).toContain('REFERENCES "house"("id")');
    expect(learner).toContain('REFERENCES "household"("id")');

    const enrolment = tableFor('enrolment');
    for (const target of [
      'learner',
      'academic_year',
      'programme',
      'level',
      'class_group',
      'pathway',
      'sponsorship',
    ]) {
      expect(enrolment, target).toContain(`REFERENCES "${target}"("id")`);
    }
  });

  it('emits declared non-unique indexes', () => {
    const statements = ddlFor('learner');
    expect(
      statements.some(
        (sql) => sql.includes('CREATE INDEX IF NOT EXISTS "idx_learner_status"') && sql.includes('ON "learner" ("status")')
      )
    ).toBe(true);
  });

  it('emits composite unique indexes for learner and enrolment', () => {
    const learner = ddlFor('learner').join('\n');
    expect(learner).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "uq_learner_institution_id_admission_number"');
    expect(learner).toContain('ON "learner" ("institution_id", "admission_number")');

    const enrolment = ddlFor('enrolment').join('\n');
    expect(enrolment).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "uq_enrolment_learner_id_academic_year_id_start_date"'
    );
    expect(enrolment).toContain('ON "enrolment" ("learner_id", "academic_year_id", "start_date")');
  });

  it('emits partial unique indexes with their WHERE predicate', () => {
    const mark = ddlFor('mark').join('\n');
    expect(mark).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "uq_mark_assessment_id_enrolment_id_learning_area_id_component_id"'
    );
    expect(mark).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "uq_mark_assessment_id_enrolment_id_learning_area_id_partial"'
    );
    expect(mark).toContain('WHERE component_id IS NULL');

    const feeSchedule = ddlFor('fee_schedule').join('\n');
    expect(feeSchedule).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "uq_fee_schedule_institution_id_name_version_partial"'
    );
    expect(feeSchedule).toContain('WHERE campus_id IS NULL');
  });

  it('keeps legacy converter DDL unchanged without the strict flag', () => {
    const legacy: DatabaseSchema = createDatabaseSchema({
      title: 'legacy_record',
      primaryKey: 'id',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        note: { type: ['string', 'null'] },
      },
      required: ['id', 'name', 'note'],
    });

    const [table] = statementsForSchema(legacy);
    expect(table).toContain('CREATE TABLE IF NOT EXISTS "legacy_record"');
    expect(table).toContain('"id" TEXT PRIMARY KEY');
    // Strict mode is opt-in, so legacy collections keep their historical nullable columns
    // even when their schema declares a required list.
    expect(table).not.toContain('"name" TEXT NOT NULL');
    expect(table).not.toContain('"note" TEXT NOT NULL');
    expect(table).not.toContain('REFERENCES');
  });

  it('does not infer NOT NULL when no root required list is supplied', () => {
    const legacy = createDatabaseSchema({
      title: 'unconstrained',
      primaryKey: 'id',
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
      },
    });

    const [table] = statementsForSchema(legacy);
    expect(table).not.toContain('"label" TEXT NOT NULL');
  });

  it('applies required columns and references only in strict mode', () => {
    const base = createDatabaseSchema({
      title: 'strict_record',
      primaryKey: 'id',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        house_id: { type: 'ref', ref: 'house' },
      },
      required: ['id', 'name'],
    });

    const [loose] = statementsForSchema(base);
    expect(loose).not.toContain('"name" TEXT NOT NULL');
    expect(loose).not.toContain('REFERENCES');

    const [strict] = statementsForSchema({ ...base, strict: true });
    expect(strict).toContain('"name" TEXT NOT NULL');
    expect(strict).toContain('"house_id" TEXT REFERENCES "house"("id")');
  });
});
