// ABOUTME: Dumps the JSON Schema that zod v4 emits for the spike entities and checks a few samples.
// ABOUTME: Run with `node_modules/.bin/tsx zod/dump.ts`.

import { z } from 'zod/v4';
import { enrolmentSchema, learnerSchema } from './entity';

for (const [name, schema] of [
  ['learner', learnerSchema],
  ['enrolment', enrolmentSchema],
] as const) {
  const json = z.toJSONSchema(schema, { io: 'output' });
  console.log(`=== ${name} ===`);
  console.log(JSON.stringify(json, null, 2));
}

const validLearner = {
  id: '0190f0d0-0000-7000-8000-000000000001',
  institution_id: '0190f0d0-0000-7000-8000-000000000002',
  admission_number: 'ADM-0001',
  given_name: 'Amina',
  family_name: 'Otieno',
  gender: 'female',
  status: 'enrolled',
  residence_status: 'day',
  created_at: '2026-10-19T09:00:00Z',
  updated_at: '2026-10-19T09:00:00Z',
};
console.log('learner sample:', learnerSchema.safeParse(validLearner).success);

const validEnrolment = {
  id: '0190f0d0-0000-7000-8000-000000000003',
  learner_id: validLearner.id,
  academic_year_id: '0190f0d0-0000-7000-8000-000000000004',
  programme_id: '0190f0d0-0000-7000-8000-000000000005',
  level_id: '0190f0d0-0000-7000-8000-000000000006',
  class_group_id: '0190f0d0-0000-7000-8000-000000000007',
  status: 'active',
  start_date: '2026-01-05',
  entry_reason: 'new_admission',
  created_at: '2026-10-19T09:00:00Z',
  updated_at: '2026-10-19T09:00:00Z',
};
console.log('enrolment sample:', enrolmentSchema.safeParse(validEnrolment).success);

const badDates = { ...validEnrolment, start_date: '2026-05-01', end_date: '2026-04-01' };
console.log('bad dates:', JSON.stringify(enrolmentSchema.safeParse(badDates).error?.issues));
