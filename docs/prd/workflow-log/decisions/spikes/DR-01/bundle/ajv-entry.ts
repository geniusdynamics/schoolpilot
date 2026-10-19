// ABOUTME: Bundle-size entry for the JSON Schema + Ajv implementation of the DR-01 entity.
// ABOUTME: Imports the schema and compiles one validator, mirroring runtime use.

import Ajv from 'ajv';
import schema from '../json-schema/entity.schema.json';

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema.definitions.learner);

export const ok = validate({
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
});
