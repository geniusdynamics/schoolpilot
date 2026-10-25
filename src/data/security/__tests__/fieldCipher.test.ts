// ABOUTME: The row codec's encryption wiring: which columns a cipher seals, that decoding opens
// ABOUTME: them, that legacy plaintext still reads, and that a non-text encrypted column is refused.

import { describe, expect, it } from 'vitest';

import { columnsFor, decodeRow, encodeRow, type EntityColumns } from '@/data/repository';
import { RestrictedDataError, type FieldCipher } from '@/data/security';

/**
 * A cipher that marks a value instead of encrypting it.
 *
 * The codec's wiring is what is under test here, not the cryptography: a marker makes it obvious
 * which column was sealed, and the real AES-GCM implementation is proved separately.
 */
class MarkerCipher implements FieldCipher {
  isSealed(value: string): boolean {
    return value.startsWith('sealed:');
  }

  seal(plaintext: string): string {
    return this.isSealed(plaintext) ? plaintext : `sealed:${plaintext}`;
  }

  open(sealed: string): string {
    return this.isSealed(sealed) ? sealed.slice('sealed:'.length) : sealed;
  }
}

const cipher = new MarkerCipher();

describe('the row codec with a cipher', () => {
  it('seals only the encrypted columns', () => {
    const encoded = encodeRow(
      columnsFor('health_visit'),
      { id: 'h1', complaint: 'Headache', referred: false },
      cipher
    );

    expect(encoded.complaint).toBe('sealed:Headache');
    expect(encoded.referred).toBe(0);
    expect(encoded.id).toBe('h1');
  });

  it('stores plaintext when no cipher is given', () => {
    const encoded = encodeRow(columnsFor('health_visit'), { id: 'h1', complaint: 'Headache' });
    expect(encoded.complaint).toBe('Headache');
  });

  it('opens an encrypted column on decode and leaves the others as they are', () => {
    const decoded = decodeRow(
      columnsFor('health_visit'),
      { id: 'h1', complaint: 'sealed:Headache', referred: 0 },
      cipher
    );

    expect(decoded.row.complaint).toBe('Headache');
    expect(decoded.row.referred).toBe(false);
  });

  it('reads a value an older hub left in plaintext', () => {
    const decoded = decodeRow(columnsFor('health_visit'), { complaint: 'Headache' }, cipher);
    expect(decoded.row.complaint).toBe('Headache');
  });

  it('round-trips a JSON column through the seal', () => {
    const encoded = encodeRow(
      columnsFor('learner'),
      { id: 'l1', medical: { allergies: ['penicillin'] } },
      cipher
    );
    expect(encoded.medical).toBe('sealed:{"allergies":["penicillin"]}');

    const decoded = decodeRow(columnsFor('learner'), encoded as Record<string, string>, cipher);
    expect(decoded.row.medical).toEqual({ allergies: ['penicillin'] });
  });

  it('refuses an encrypted column that is not stored as text', () => {
    const columns: EntityColumns = {
      entity: 'learner',
      table: 'learner',
      primaryKey: 'id',
      columns: { id: { kind: 'text', nullable: false }, points: { kind: 'integer', nullable: true } },
      concurrencyColumn: 'row_version',
      hasBusinessVersion: false,
      encrypted: ['points'],
    };

    expect(() => encodeRow(columns, { id: 'l1', points: 3 }, cipher)).toThrow(RestrictedDataError);
    expect(() => encodeRow(columns, { id: 'l1', points: 3 }, cipher)).toThrow(
      /not stored as text/
    );
  });

  it('leaves a null encrypted value null', () => {
    const encoded = encodeRow(columnsFor('health_visit'), { id: 'h1', treatment: null }, cipher);
    expect(encoded.treatment).toBeNull();
  });
});
