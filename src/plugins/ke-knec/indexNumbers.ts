// ABOUTME: KNEC index-number arithmetic: the county-centre-candidate structure, the two candidate
// ABOUTME: number bands a subject count falls into, and the checks a centre has to pass.

/** The identity a candidate's index number is built from: two digits of county, six of centre. */
export interface CentreIdentity {
  readonly countyCode: string;
  readonly centreNumber: string;
}

/** The candidates of one band share a range of candidate numbers. */
export interface IndexBand {
  readonly id: 'standard' | 'partial_repeater';
  readonly candidateNumbers: { readonly from: number; readonly to: number };
  /** The rule the band comes from, in words the export can print. */
  readonly reason: string;
}

export const COUNTY_CODE_LENGTH = 2;
export const CENTRE_NUMBER_LENGTH = 6;
export const CANDIDATE_NUMBER_LENGTH = 3;
export const INDEX_NUMBER_LENGTH =
  COUNTY_CODE_LENGTH + CENTRE_NUMBER_LENGTH + CANDIDATE_NUMBER_LENGTH;

/**
 * The two ranges KNEC allocates candidate numbers from (KCSE user guide §2.3.23 and §2.3.24).
 *
 * The band follows the number of subjects entered, not the candidate's entry code: a repeater who
 * returns for seven subjects or more is numbered with the first attempt candidates.
 */
export const INDEX_BANDS: Readonly<Record<IndexBand['id'], IndexBand>> = {
  standard: {
    id: 'standard',
    candidateNumbers: { from: 1, to: 499 },
    reason: 'first attempt candidates and repeaters taking seven subjects or more are numbered 001 to 499',
  },
  partial_repeater: {
    id: 'partial_repeater',
    candidateNumbers: { from: 801, to: 899 },
    reason: 'repeaters taking fewer than seven subjects are numbered 801 to 899',
  },
};

/** The band a candidate with `subjectCount` subjects is numbered in. */
export function bandForSubjectCount(subjectCount: number): IndexBand {
  return subjectCount >= 7 ? INDEX_BANDS.standard : INDEX_BANDS.partial_repeater;
}

/** The county code and centre number the candidate numbers run under. */
export function centrePrefix(centre: CentreIdentity): string {
  return `${centre.countyCode}${centre.centreNumber}`;
}

/** The candidate number as three digits, the way it sits inside an index number. */
export function candidateNumberText(candidateNumber: number): string {
  return String(candidateNumber).padStart(CANDIDATE_NUMBER_LENGTH, '0');
}

/** The full eleven-digit index number of one candidate at a centre. */
export function formatIndexNumber(centre: CentreIdentity, candidateNumber: number): string {
  return `${centrePrefix(centre)}${candidateNumberText(candidateNumber)}`;
}

/** Reads an index number back, or null when it is not eleven digits. */
export function parseIndexNumber(
  value: string
): { readonly centre: CentreIdentity; readonly candidateNumber: number } | null {
  const pattern = new RegExp(
    `^(\\d{${COUNTY_CODE_LENGTH}})(\\d{${CENTRE_NUMBER_LENGTH}})(\\d{${CANDIDATE_NUMBER_LENGTH}})$`
  );
  const match = pattern.exec(value);
  if (!match) return null;
  return {
    centre: { countyCode: match[1] ?? '', centreNumber: match[2] ?? '' },
    candidateNumber: Number(match[3] ?? ''),
  };
}

/** One problem with a centre identity, named by the field it belongs to. */
export interface CentreIssue {
  readonly field: 'countyCode' | 'centreNumber';
  readonly message: string;
}

/** The problems a centre identity has; an empty list means the centre can carry index numbers. */
export function validateCentre(centre: CentreIdentity): readonly CentreIssue[] {
  const issues: CentreIssue[] = [];
  const county = new RegExp(`^\\d{${COUNTY_CODE_LENGTH}}$`);
  const centreNumber = new RegExp(`^\\d{${CENTRE_NUMBER_LENGTH}}$`);
  if (!county.test(centre.countyCode)) {
    issues.push({
      field: 'countyCode',
      message: 'the county code must be exactly two digits',
    });
  }
  if (!centreNumber.test(centre.centreNumber)) {
    issues.push({
      field: 'centreNumber',
      message: 'the centre number must be exactly six digits',
    });
  }
  return issues;
}
