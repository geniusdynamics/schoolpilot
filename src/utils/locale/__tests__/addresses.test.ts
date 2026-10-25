// ABOUTME: Pins country address hierarchies, the field order a country's form collects, and the
// ABOUTME: locale's own line order for printing an address.

import { describe, expect, it } from 'vitest';

import {
  ADDRESS_COUNTRIES,
  addressFieldsFor,
  addressSchemaFor,
  formatAddress,
  formatAddressLines,
  missingAddressFields,
} from '../addresses';

const kenyan = {
  line1: '12 Moi Avenue',
  line2: 'P.O. Box 12345',
  city: 'Nairobi',
  postal_code: '00100',
  country: 'KE',
  subdivisions: { county: 'Kiambu', sub_county: 'Ruiru', ward: 'Kahawa' },
};

describe('country address schemas', () => {
  it('gives Kenya county, sub-county and ward, and Nigeria state and LGA', () => {
    expect(addressSchemaFor('KE').levels.map((level) => level.key)).toEqual([
      'county',
      'sub_county',
      'ward',
    ]);
    expect(addressSchemaFor('ng').levels.map((level) => level.key)).toEqual(['state', 'lga']);
    expect(addressSchemaFor('UG').levels.map((level) => level.key)).toEqual([
      'district',
      'sub_county',
      'parish',
    ]);
    expect(ADDRESS_COUNTRIES).toContain('ZA');
    expect(addressSchemaFor('ZZ').levels).toEqual([]);
  });

  it('lists a country form fields in the order it collects them', () => {
    expect(addressFieldsFor('KE').map((field) => field.key)).toEqual([
      'line1',
      'line2',
      'county',
      'sub_county',
      'ward',
      'city',
      'postal_code',
    ]);
    const required = addressFieldsFor('KE')
      .filter((field) => field.required)
      .map((field) => field.key);
    expect(required).toEqual(['line1', 'county', 'sub_county']);
  });

  it('names the required fields an address is missing', () => {
    expect(missingAddressFields({ subdivisions: { county: 'Kiambu' } }, 'KE')).toEqual([
      'line1',
      'sub_county',
    ]);
    expect(missingAddressFields(kenyan, 'KE')).toEqual([]);
  });
});

describe('formatAddressLines', () => {
  it('prints the Kenyan hierarchy between the street and the town', () => {
    expect(formatAddressLines(kenyan, 'en-KE')).toEqual([
      '12 Moi Avenue',
      'P.O. Box 12345',
      'Kiambu',
      'Ruiru',
      'Kahawa',
      'Nairobi',
      '00100',
      'Kenya',
    ]);
  });

  it('prints French with the postcode and town on one line', () => {
    expect(
      formatAddressLines(
        {
          line1: '12 rue de la Paix',
          postal_code: '75002',
          city: 'Paris',
          country: 'FR',
          subdivisions: { department: 'Paris' },
        },
        'fr-FR'
      )
    ).toEqual(['12 rue de la Paix', 'Paris', '75002 Paris', 'France']);
  });

  it('prints Arabic with the hierarchy, then the city, then the postcode', () => {
    expect(
      formatAddressLines(
        {
          line1: '12 Nile Street',
          subdivisions: { governorate: 'القاهرة', district: 'مصر الجديدة' },
          city: 'القاهرة',
          postal_code: '11511',
          country: 'EG',
        },
        'ar-EG'
      )
    ).toEqual(['12 Nile Street', 'القاهرة', 'مصر الجديدة', 'القاهرة', '11511', 'مصر']);
  });

  it('prints the British order and names the country in the locale', () => {
    const british = {
      line1: '10 Downing Street',
      city: 'London',
      region: 'Greater London',
      postal_code: 'SW1A 2AA',
      country: 'GB',
    };
    expect(formatAddressLines(british, 'en-GB')).toEqual([
      '10 Downing Street',
      'London',
      'Greater London',
      'SW1A 2AA',
      'United Kingdom',
    ]);
    expect(formatAddressLines({ country: 'KE', line1: 'A' }, 'ar-EG')).toEqual(['A', 'كينيا']);
  });

  it('falls back to the generic order for a country with no schema of its own', () => {
    expect(
      formatAddressLines(
        { line1: 'A', city: 'B', region: 'C', postal_code: 'D', country: 'MW' },
        'en-GB'
      )
    ).toEqual(['A', 'B', 'C', 'D', 'Malawi']);
  });

  it('joins the lines on request and renders nothing for a missing address', () => {
    expect(formatAddress(kenyan, 'en-KE', { separator: ', ' })).toBe(
      '12 Moi Avenue, P.O. Box 12345, Kiambu, Ruiru, Kahawa, Nairobi, 00100, Kenya'
    );
    expect(formatAddressLines(null, 'en-KE')).toEqual([]);
  });
});
