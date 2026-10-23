// ABOUTME: The restricted-data classification: which entity fields hold special-category data,
// ABOUTME: and the redaction the audit trail applies instead of copying their values.

import type { EntityName } from '@/domain/schema';

/**
 * Fields that hold special/restricted data (spec 06 §8.1) and are therefore encrypted at rest.
 *
 * The set is deliberately explicit rather than derived from the storage sidecar: a field is
 * restricted because of what it says about a person, and that judgement belongs in one readable
 * table. Every field named here must also be declared `encrypted` in its entity's storage
 * metadata; `restrictedData.test.ts` holds the two in step.
 *
 * Not modelled as restricted fields yet: identity-document numbers (`identifier.value` is a
 * national registry key, not a scan of the document), counselling notes (no entity), and
 * safeguarding records beyond `conduct_incident`'s narrative.
 */
export const RESTRICTED_FIELDS: Readonly<Partial<Record<EntityName, readonly string[]>>> = {
  learner: ['medical', 'special_needs'],
  health_visit: ['complaint', 'treatment'],
  conduct_incident: ['description', 'action'],
};

/** The marker written where a restricted value is withheld. */
export const REDACTED_MARKER = '[restricted]';

/** The restricted fields an entity declares, in declaration order. */
export function restrictedFieldsOf(entity: EntityName): readonly string[] {
  return RESTRICTED_FIELDS[entity] ?? [];
}

/** The restricted fields of one row that carry a value. */
export function restrictedFieldsIn(
  entity: EntityName,
  row: unknown
): readonly string[] {
  const fields = restrictedFieldsOf(entity);
  if (fields.length === 0) return [];
  if (row === null || typeof row !== 'object' || Array.isArray(row)) return [];

  const record = row as Readonly<Record<string, unknown>>;
  return fields.filter(
    (field) => record[field] !== null && record[field] !== undefined
  );
}

/**
 * A copy of the row with every restricted value replaced by {@link REDACTED_MARKER}.
 *
 * The audit trail is a second place a restricted value could come to rest in plaintext. The
 * trail records that a field changed, not what it changed to, so the value exists at rest once:
 * encrypted, in the row itself.
 */
export function redactRestricted(entity: EntityName, row: unknown): unknown {
  if (row === null || typeof row !== 'object' || Array.isArray(row)) return row;

  const fields = restrictedFieldsIn(entity, row);
  if (fields.length === 0) return row;

  const redacted = { ...(row as Record<string, unknown>) };
  for (const field of fields) redacted[field] = REDACTED_MARKER;
  return redacted;
}
