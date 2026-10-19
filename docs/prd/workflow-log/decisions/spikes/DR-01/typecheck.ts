// ABOUTME: Compile-time assertions that both DR-01 schema options infer equivalent entity types.
// ABOUTME: Any unused @ts-expect-error is a failure: it means an invalid value was accepted.

import type { Enrolment as ZodEnrolment, Learner as ZodLearner } from './zod/entity';
import type { Enrolment as JsonEnrolment, Learner as JsonLearner } from './json-schema/entity.generated';

const zodLearner: ZodLearner = {
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

const jsonLearner: JsonLearner = { ...zodLearner };
const jsonFromZodShape: Omit<JsonLearner, 'attributes'> = zodLearner;
const zodFromJsonShape: Omit<ZodLearner, 'attributes'> = jsonLearner;
const jsonFromZod: JsonLearner = { ...zodLearner };
const zodFromJson: ZodLearner = { ...jsonLearner, attributes: { 'ke.kemis_upi': 'UPI-1' } };

const zodEnrolment: ZodEnrolment = {
  id: '0190f0d0-0000-7000-8000-000000000003',
  learner_id: zodLearner.id,
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

const jsonEnrolment: JsonEnrolment = zodEnrolment;
const zodEnrolmentBack: ZodEnrolment = jsonEnrolment;

const { family_name: _familyName, ...withoutFamily } = zodLearner;
void _familyName;

// @ts-expect-error zod rejects an unknown status
const badZodStatus: ZodLearner = { ...zodLearner, status: 'not_a_status' };
// @ts-expect-error JSON Schema codegen rejects an unknown status
const badJsonStatus: JsonLearner = { ...jsonLearner, status: 'not_a_status' };
// @ts-expect-error zod requires family_name
const missingZodName: ZodLearner = withoutFamily;
// @ts-expect-error JSON Schema codegen requires family_name
const missingJsonName: JsonLearner = withoutFamily;
// @ts-expect-error zod dates are ISO strings, not Date objects
const badZodDate: ZodLearner = { ...zodLearner, date_of_birth: new Date() };
// @ts-expect-error JSON Schema codegen dates are strings, not Date objects
const badJsonDate: JsonLearner = { ...jsonLearner, date_of_birth: new Date() };
// @ts-expect-error zod enum stays narrow
const badZodEnum: ZodLearner['status'] = 'nope';
// @ts-expect-error generated enum stays narrow
const badJsonEnum: JsonLearner['status'] = 'nope';

export {
  zodLearner,
  jsonLearner,
  zodEnrolment,
  jsonEnrolment,
  jsonFromZod,
  jsonFromZodShape,
  zodFromJson,
  zodFromJsonShape,
  zodEnrolmentBack,
  badZodStatus,
  badJsonStatus,
  missingZodName,
  missingJsonName,
  badZodDate,
  badJsonDate,
  badZodEnum,
  badJsonEnum,
};
