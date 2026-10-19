// ABOUTME: Bundle-size entry for the zod implementation of the DR-01 entity.
// ABOUTME: Imports and runs one learner parse so the validator cannot be tree-shaken away.

import { learnerSchema } from '../zod/entity';

const sample = {
  id: '0190f0d0-0000-7000-8000-000000000001',
  institution_id: '0190f0d0-0000-7000-8000-000000000002',
  admission_number: 'ADM-0001',
  given_name: 'Amina',
  family_name: 'Otieno',
  gender: 'female' as const,
  status: 'enrolled' as const,
  residence_status: 'day' as const,
  created_at: '2026-10-19T09:00:00Z',
  updated_at: '2026-10-19T09:00:00Z',
};

export const ok = learnerSchema.safeParse(sample).success;
