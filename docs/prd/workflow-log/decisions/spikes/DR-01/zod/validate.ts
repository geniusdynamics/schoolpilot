// ABOUTME: Runtime validation entry points for the DR-01 zod implementation.
// ABOUTME: Wraps safeParse so the benchmark calls both options through the same shape.

import { enrolmentSchema, learnerSchema } from './entity';

export function validateLearner(input: unknown) {
  return learnerSchema.safeParse(input);
}

export function validateEnrolment(input: unknown) {
  return enrolmentSchema.safeParse(input);
}
