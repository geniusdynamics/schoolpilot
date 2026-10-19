// ABOUTME: The single validation entry point shared by the schema-bound form and its tests.
// ABOUTME: Runs the entity's own zod schema so form and repository acceptance cannot drift.

import type { z } from 'zod/v4';

import { mapIssuesToFields, type MappedIssues, type ZodIssueLike } from './fieldTypes';

export type EntityFormValidation<T extends z.ZodType> =
  | {
      readonly success: true;
      /** The exact payload that was validated, typed as the schema's input. */
      readonly data: z.input<T>;
      readonly issues: readonly [];
      readonly fieldErrors: Readonly<Record<string, readonly never[]>>;
      readonly formErrors: readonly [];
    }
  | {
      readonly success: false;
      readonly data?: undefined;
      readonly issues: readonly ZodIssueLike[];
      readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
      readonly formErrors: readonly string[];
    };

/**
 * Validates form values with `schema.safeParse` and maps issues onto the declared field
 * paths. This is the only validation the form performs; a repository calling
 * `schema.safeParse` on the submitted payload reaches the same verdict.
 */
export function validateEntityForm<T extends z.ZodType>(
  schema: T,
  values: unknown,
  fieldPaths: readonly string[] = []
): EntityFormValidation<T> {
  const result = schema.safeParse(values);

  if (result.success) {
    return {
      success: true,
      data: values as z.input<T>,
      issues: [],
      fieldErrors: {},
      formErrors: [],
    };
  }

  const mapped: MappedIssues = mapIssuesToFields(result.error.issues, fieldPaths);

  return {
    success: false,
    issues: result.error.issues,
    fieldErrors: mapped.fieldErrors,
    formErrors: mapped.formErrors,
  };
}
