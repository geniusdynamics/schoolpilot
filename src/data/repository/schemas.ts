// ABOUTME: Schema access for the repository: the entity's own zod object, the derived
// ABOUTME: create/update shapes and the mapping of zod issues onto schema-aligned field paths.

import type { z } from 'zod/v4';

import { schemaFor, type EntityName, type EntityRow } from '@/domain/schema';

import { type RepositoryFieldIssue } from './errors';
import { type WritableFields } from './types';

/**
 * Fields the repository owns. A caller never sets them: the repository generates the
 * id, stamps the timestamps and records the actor.
 */
export const SERVER_OWNED_FIELDS = [
  'id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'deleted_at',
] as const;

export type ServerOwnedField = (typeof SERVER_OWNED_FIELDS)[number];

const SERVER_OWNED_MASK: Record<ServerOwnedField, true> = {
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
};

/** A zod object with an open shape; the registry holds one per entity. */
type AnyObjectSchema = z.ZodObject<z.ZodRawShape>;

/**
 * The entity's own schema object.
 *
 * The registry maps a closed union of entity names onto one zod object each, so
 * TypeScript cannot correlate a generic entity name with that entity's schema. This is
 * the single place where the deferred type is narrowed; the schema *object* is never
 * replaced, so the repository and the form validate with the very same instance.
 */
export function entitySchema<E extends EntityName>(entity: E): z.ZodType<EntityRow<E>> {
  return schemaFor(entity) as unknown as z.ZodType<EntityRow<E>>;
}

/** The entity's schema as a zod object, so the shape can be derived from it. */
function objectSchemaOf(entity: EntityName): AnyObjectSchema {
  return schemaFor(entity) as unknown as AnyObjectSchema;
}

/**
 * The shape a create form collects: the entity schema without the server-owned fields.
 *
 * zod v4 drops the entity's cross-field refinements when the shape is derived, so this
 * schema checks shape only. The repository re-validates the assembled row with
 * {@link entitySchema}, so the refinements still reject the write.
 */
export function createSchemaFor(entity: EntityName): AnyObjectSchema {
  return objectSchemaOf(entity).omit(SERVER_OWNED_MASK);
}

/**
 * The shape an edit form collects: the writable fields, all optional.
 *
 * Like {@link createSchemaFor} this is shape only; the repository validates the merged
 * row with the entity's own schema.
 */
export function updateSchemaFor(entity: EntityName): AnyObjectSchema {
  return objectSchemaOf(entity).omit(SERVER_OWNED_MASK).partial();
}

/** True when the key is owned by the repository and cannot be written by a caller. */
export function isServerOwnedField(key: string): key is ServerOwnedField {
  return Object.prototype.hasOwnProperty.call(SERVER_OWNED_MASK, key);
}

/**
 * The writable fields of a stored row.
 *
 * A row that comes back from the repository carries the server-owned fields and the
 * concurrency counter, so it no longer matches the entity schema: the schema rejects
 * `rowVersion` as an unknown key. A form seeds its fields from this, and the values
 * then satisfy `updateSchemaFor` and can be sent straight back to `update`.
 */
export function toWritableValues<E extends EntityName>(row: EntityRow<E>): WritableFields<E> {
  const values: Record<string, unknown> = { ...(row as unknown as Record<string, unknown>) };

  for (const field of SERVER_OWNED_FIELDS) delete values[field];
  delete values.rowVersion;

  return values as unknown as WritableFields<E>;
}

/**
 * Maps zod issues onto field paths.
 *
 * The path is the dotted path of the schema, so `total.amount_minor` and
 * `phones.0.number` address exactly the field the form renders. An unknown key is
 * reported with its own path, because zod reports it against the object as a whole.
 */
export function issuesFromZodError(error: z.ZodError): RepositoryFieldIssue[] {
  const issues: RepositoryFieldIssue[] = [];

  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      const keys = 'keys' in issue && Array.isArray(issue.keys) ? issue.keys : [];
      if (keys.length === 0) {
        issues.push({ path: '', message: issue.message, code: issue.code });
        continue;
      }
      for (const key of keys) {
        issues.push({ path: String(key), message: issue.message, code: issue.code });
      }
      continue;
    }

    issues.push({
      path: issue.path.map((segment) => String(segment)).join('.'),
      message: issue.message,
      code: issue.code,
    });
  }

  return issues;
}

/** Builds a validation issue for one field path. */
export function fieldIssue(path: string, message: string, code?: string): RepositoryFieldIssue {
  return code === undefined ? { path, message } : { path, message, code };
}
