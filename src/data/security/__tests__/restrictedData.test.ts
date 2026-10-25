// ABOUTME: The restricted-data classification: which fields are special-category, that each is
// ABOUTME: declared encrypted at rest, and the redaction the audit trail writes instead of values.

import { describe, expect, it } from 'vitest';

import {
  REDACTED_MARKER,
  RESTRICTED_FIELDS,
  redactRestricted,
  restrictedFieldsIn,
  restrictedFieldsOf,
} from '@/data/security';
import { storageFor, type EntityName } from '@/domain/schema';

describe('the restricted-data classification', () => {
  it('declares every restricted field as encrypted at rest', () => {
    const classified = Object.entries(RESTRICTED_FIELDS);

    expect(classified.length).toBeGreaterThan(0);
    for (const [entity, fields] of classified) {
      const encrypted = storageFor(entity as EntityName).encrypted;
      expect(fields?.length, `${entity} classifies no field`).toBeGreaterThan(0);
      for (const field of fields ?? []) {
        expect(encrypted, `${entity}.${field} is restricted but not encrypted`).toContain(field);
      }
    }
  });

  it('names the special-category fields the registry models', () => {
    expect(restrictedFieldsOf('learner')).toEqual(['medical', 'special_needs']);
    expect(restrictedFieldsOf('health_visit')).toEqual(['complaint', 'treatment']);
    expect(restrictedFieldsOf('conduct_incident')).toEqual(['description', 'action']);
  });

  it('treats an entity with no restricted fields as unrestricted', () => {
    expect(restrictedFieldsOf('invoice')).toEqual([]);
    expect(restrictedFieldsIn('invoice', { id: 'i1', total: 500 })).toEqual([]);
  });

  it('reports only the restricted fields that carry a value', () => {
    expect(
      restrictedFieldsIn('health_visit', { complaint: 'Headache', treatment: null })
    ).toEqual(['complaint']);
    expect(restrictedFieldsIn('health_visit', { complaint: null })).toEqual([]);
    expect(restrictedFieldsIn('health_visit', null)).toEqual([]);
  });

  it('redacts restricted values and leaves the rest of the row alone', () => {
    const row = {
      id: 'h1',
      complaint: 'Headache and dizziness.',
      treatment: 'Rest and fluids.',
      referred: false,
    };

    expect(redactRestricted('health_visit', row)).toEqual({
      id: 'h1',
      complaint: REDACTED_MARKER,
      treatment: REDACTED_MARKER,
      referred: false,
    });
    expect(row.complaint).toBe('Headache and dizziness.');
  });

  it('returns a value that is not a row unchanged', () => {
    expect(redactRestricted('learner', null)).toBeNull();
    expect(redactRestricted('learner', 'plain text')).toBe('plain text');
    expect(redactRestricted('learner', ['a'])).toEqual(['a']);
  });
});
