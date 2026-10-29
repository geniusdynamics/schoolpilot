// ABOUTME: Tests the KNEC index-number rules: the county-centre-candidate structure, the band a
// ABOUTME: candidate's subject count falls into, and the refusals for a centre or value that fails.

import { describe, expect, it } from 'vitest';

import {
  INDEX_NUMBER_LENGTH,
  bandForSubjectCount,
  candidateNumberText,
  centrePrefix,
  formatIndexNumber,
  parseIndexNumber,
  validateCentre,
} from '../indexNumbers';

const CENTRE = { countyCode: '24', centreNumber: '950500' };

describe('the KNEC index number', () => {
  it('is the county code, the centre number and the candidate number, in that order', () => {
    expect(centrePrefix(CENTRE)).toBe('24950500');
    expect(formatIndexNumber(CENTRE, 1)).toBe('24950500001');
    expect(formatIndexNumber(CENTRE, 1)).toHaveLength(INDEX_NUMBER_LENGTH);
  });

  it('pads the candidate number to three digits', () => {
    expect(candidateNumberText(1)).toBe('001');
    expect(candidateNumberText(42)).toBe('042');
    expect(candidateNumberText(499)).toBe('499');
  });

  it('reads a full index number back into its parts', () => {
    expect(parseIndexNumber('24950500001')).toEqual({
      centre: { countyCode: '24', centreNumber: '950500' },
      candidateNumber: 1,
    });
  });

  it('refuses to read a value that is not eleven digits', () => {
    expect(parseIndexNumber('2495050001')).toBeNull();
    expect(parseIndexNumber('249505000011')).toBeNull();
    expect(parseIndexNumber('2495050000A')).toBeNull();
    expect(parseIndexNumber('')).toBeNull();
  });

  it('puts seven subjects or more in the 001-499 band', () => {
    expect(bandForSubjectCount(7).id).toBe('standard');
    expect(bandForSubjectCount(9).candidateNumbers).toEqual({ from: 1, to: 499 });
  });

  it('puts fewer than seven subjects in the 801-899 band', () => {
    expect(bandForSubjectCount(1).id).toBe('partial_repeater');
    expect(bandForSubjectCount(6).candidateNumbers).toEqual({ from: 801, to: 899 });
    expect(bandForSubjectCount(6).reason).toContain('801');
  });

  it('accepts a two-digit county code and a six-digit centre number', () => {
    expect(validateCentre(CENTRE)).toEqual([]);
  });

  it('refuses a centre whose parts are the wrong length or not digits', () => {
    expect(validateCentre({ countyCode: '2', centreNumber: '950500' })).toHaveLength(1);
    expect(validateCentre({ countyCode: '24', centreNumber: '95050' })).toHaveLength(1);
    expect(validateCentre({ countyCode: 'AB', centreNumber: '950500' })).toHaveLength(1);
    expect(validateCentre({ countyCode: '24', centreNumber: '95O500' })).toHaveLength(1);
  });

  it('explains what a refused county code must look like', () => {
    const [issue] = validateCentre({ countyCode: '2', centreNumber: '950500' });

    expect(issue).toEqual({
      field: 'countyCode',
      message: 'the county code must be exactly two digits',
    });
  });
});
