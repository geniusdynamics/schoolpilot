// ABOUTME: Unit tests for grading scales: every kind of spec 03 section 5 with its published
// ABOUTME: example where there is one, the boundary at both ends of every band, the refused
// ABOUTME: gap/overlap/duplicate scales, trace replay, and composition with the scheme engine.

import { describe, expect, it } from 'vitest';

import { evaluateScheme, formatExact, parseExact, subtractExact, type Exact, type SchemeDefinition, type SchemeMark } from '../../engine';
import {
  ScaleTraceMismatchError,
  evaluateGradingScale,
  givenScore,
  gradeScoreOf,
  prepareGradingScale,
  replayScaleLookup,
} from '../index';
import type {
  GradingScaleDefinition,
  ScaleBandMatch,
  ScaleIssueCode,
  ScaleLookup,
  ScaleOutcome,
} from '../index';

function exactOf(text: string): Exact {
  const value = parseExact(text);
  if (value === null) throw new Error(`not an exact value: ${text}`);
  return value;
}

function outcomeOf(definition: GradingScaleDefinition, text: string): ScaleOutcome {
  return evaluateGradingScale(definition, givenScore(exactOf(text)));
}

function lookupOf(definition: GradingScaleDefinition, text: string): ScaleLookup {
  const outcome = outcomeOf(definition, text);
  if (!outcome.ok) {
    throw new Error(
      `expected the scale to load, got ${outcome.issues.map((issue) => issue.code).join(', ')}`
    );
  }
  return outcome;
}

function graded(definition: GradingScaleDefinition, text: string): ScaleBandMatch {
  const lookup = lookupOf(definition, text);
  if (!lookup.matched) throw new Error(`no band for ${text}`);
  return lookup.band;
}

function issueCodesOf(definition: GradingScaleDefinition): readonly ScaleIssueCode[] {
  const preparation = prepareGradingScale(definition);
  if (preparation.ok) throw new Error('expected the scale to be refused');
  return preparation.issues.map((issue) => issue.code);
}

function issuesOf(definition: GradingScaleDefinition) {
  const preparation = prepareGradingScale(definition);
  if (preparation.ok) throw new Error('expected the scale to be refused');
  return preparation.issues;
}

// --------------------------------------------------------------- spec fixtures

/** Spec 03 section 5: the CBE 8-level scale. The section's text declares the upper convention. */
const cbe: GradingScaleDefinition = {
  code: 'cbe_8_level',
  kind: 'numeric_bands',
  input: 'percent',
  upper: 'inclusive',
  bands: [
    { code: 'EE1', label: 'Exceeding Expectations 1', min: 90, max: 100, points: 8 },
    { code: 'EE2', label: 'Exceeding Expectations 2', min: 75, max: 89, points: 7 },
    { code: 'ME1', label: 'Meeting Expectations 1', min: 58, max: 74, points: 6 },
    { code: 'ME2', label: 'Meeting Expectations 2', min: 41, max: 57, points: 5 },
    { code: 'AE1', label: 'Approaching Expectations 1', min: 31, max: 40, points: 4 },
    { code: 'AE2', label: 'Approaching Expectations 2', min: 21, max: 30, points: 3 },
    { code: 'BE1', label: 'Below Expectations 1', min: 11, max: 20, points: 2 },
    { code: 'BE2', label: 'Below Expectations 2', min: 1, max: 10, points: 1 },
  ],
  verification: 'Bands as commonly published for Junior School/KJSEA reporting.',
};

/** Spec 03 Appendix A: the primary 4-level rubric. The score is the level itself. */
const cbe4: GradingScaleDefinition = {
  code: 'cbe_4_level',
  kind: 'rubric',
  input: 'level',
  upper: 'inclusive',
  bands: [
    {
      code: 'EE',
      label: 'Exceeding Expectations',
      min: 4,
      max: 4,
      points: 4,
      descriptor: 'Learner exceeds the expected competency.',
    },
    { code: 'ME', label: 'Meeting Expectations', min: 3, max: 3, points: 3 },
    { code: 'AE', label: 'Approaching Expectations', min: 2, max: 2, points: 2 },
    { code: 'BE', label: 'Below Expectations', min: 1, max: 1, points: 1 },
  ],
};

/** Spec 03 Appendix B: the KCSE 12-point subject scale, looked up from its points value. */
const kcseSubject: GradingScaleDefinition = {
  code: 'kcse_subject',
  kind: 'letter',
  input: 'points',
  upper: 'inclusive',
  bands: [
    { code: 'A', label: 'A', min: 12, max: 12, points: 12 },
    { code: 'A-', label: 'A-', min: 11, max: 11, points: 11 },
    { code: 'B+', label: 'B+', min: 10, max: 10, points: 10 },
    { code: 'B', label: 'B', min: 9, max: 9, points: 9 },
    { code: 'B-', label: 'B-', min: 8, max: 8, points: 8 },
    { code: 'C+', label: 'C+', min: 7, max: 7, points: 7 },
    { code: 'C', label: 'C', min: 6, max: 6, points: 6 },
    { code: 'C-', label: 'C-', min: 5, max: 5, points: 5 },
    { code: 'D+', label: 'D+', min: 4, max: 4, points: 4 },
    { code: 'D', label: 'D', min: 3, max: 3, points: 3 },
    { code: 'D-', label: 'D-', min: 2, max: 2, points: 2 },
    { code: 'E', label: 'E', min: 1, max: 1, points: 1 },
  ],
};

/**
 * Spec 03 section 12's KCSE vector: mean points 9.857 is B+ (10 points). The mean-grade ranges
 * are the fixture's; the spec says KCSE mark ranges are school-set.
 */
const kcseMean: GradingScaleDefinition = {
  code: 'kcse_mean_grade',
  kind: 'points',
  input: 'mean_points',
  bands: [
    { code: 'A', label: 'A', min: 11.5, max: 12.5, points: 12 },
    { code: 'A-', label: 'A-', min: 10.5, max: 11.5, points: 11 },
    { code: 'B+', label: 'B+', min: 9.5, max: 10.5, points: 10 },
    { code: 'B', label: 'B', min: 8.5, max: 9.5, points: 9 },
    { code: 'B-', label: 'B-', min: 7.5, max: 8.5, points: 8 },
    { code: 'C+', label: 'C+', min: 6.5, max: 7.5, points: 7 },
    { code: 'C', label: 'C', min: 5.5, max: 6.5, points: 6 },
    { code: 'C-', label: 'C-', min: 4.5, max: 5.5, points: 5 },
    { code: 'D+', label: 'D+', min: 3.5, max: 4.5, points: 4 },
    { code: 'D', label: 'D', min: 2.5, max: 3.5, points: 3 },
    { code: 'D-', label: 'D-', min: 1.5, max: 2.5, points: 2 },
    { code: 'E', label: 'E', min: 0.5, max: 1.5, points: 1 },
  ],
};

/** Spec 03 Appendix D: PLE aggregate 4-36 to Division I-IV/U. Ranges are the fixture's. */
const pleDivisions: GradingScaleDefinition = {
  code: 'ple_divisions',
  kind: 'division',
  input: 'aggregate',
  upper: 'inclusive',
  bands: [
    { code: 'I', label: 'Division I', min: 4, max: 12 },
    { code: 'II', label: 'Division II', min: 13, max: 23 },
    { code: 'III', label: 'Division III', min: 24, max: 29 },
    { code: 'IV', label: 'Division IV', min: 30, max: 34 },
    { code: 'U', label: 'Ungraded', min: 35, max: 36 },
  ],
};

/**
 * Spec 03 Appendix J: Francophone mentions. The top band ends above 20 so a mark of exactly 20
 * is included under the default exclusive upper bound, which makes it open-ended upward.
 */
const mentions: GradingScaleDefinition = {
  code: 'mentions_fr',
  kind: 'out_of_20',
  input: 'mark_out_of_20',
  bands: [
    { code: 'TB', label: 'Très bien', min: 16, max: 20.5 },
    { code: 'B', label: 'Bien', min: 14, max: 16 },
    { code: 'AB', label: 'Assez bien', min: 12, max: 14 },
    { code: 'P', label: 'Passable', min: 10, max: 12 },
    { code: 'NA', label: 'Non admis', min: 0, max: 10 },
  ],
};

/** A US-style 4.0 GPA scale: percent to a letter and its grade points. Ranges are the fixture's. */
const gpa: GradingScaleDefinition = {
  code: 'gpa_4',
  kind: 'gpa',
  input: 'percent',
  bands: [
    { code: 'A', label: 'A', min: 90, max: 100.5, points: 4 },
    { code: 'A-', label: 'A-', min: 85, max: 90, points: 3.7 },
    { code: 'B+', label: 'B+', min: 80, max: 85, points: 3.3 },
    { code: 'B', label: 'B', min: 75, max: 80, points: 3 },
    { code: 'B-', label: 'B-', min: 70, max: 75, points: 2.7 },
    { code: 'C+', label: 'C+', min: 65, max: 70, points: 2.3 },
    { code: 'C', label: 'C', min: 60, max: 65, points: 2 },
    { code: 'F', label: 'F', min: 0, max: 60, points: 0 },
  ],
};

/** Spec 03 Appendix C: attainment against age-related expectations, as a descriptor scale. */
const attainment: GradingScaleDefinition = {
  code: 'ks3_attainment',
  kind: 'descriptor',
  input: 'percent',
  bands: [
    {
      code: 'GD',
      label: 'Greater depth',
      min: 80,
      max: 100.5,
      descriptor: 'Working above the age-related expectation.',
    },
    { code: 'EX', label: 'Expected', min: 50, max: 80, descriptor: 'Working at the expectation.' },
    {
      code: 'WT',
      label: 'Working towards',
      min: 0,
      max: 50,
      descriptor: 'Working towards the expectation.',
    },
  ],
};

// ------------------------------------------------------------------ numeric bands

describe('band boundaries', () => {
  const fixtures: readonly GradingScaleDefinition[] = [
    cbe,
    cbe4,
    kcseSubject,
    kcseMean,
    pleDivisions,
    mentions,
    gpa,
    attainment,
  ];

  it('owns both ends of every band under its declared convention', () => {
    for (const scale of fixtures) {
      const inclusive = scale.upper === 'inclusive';
      for (const band of scale.bands) {
        const atMin = lookupOf(scale, String(band.min));
        expect({ scale: scale.code, band: band.code, at: 'min', code: atMin.band?.code }).toEqual({
          scale: scale.code,
          band: band.code,
          at: 'min',
          code: band.code,
        });
        expect(atMin.trace.checks.filter((check) => check.matched)).toHaveLength(1);

        const end = inclusive
          ? String(band.max)
          : formatExact(subtractExact(exactOf(String(band.max)), exactOf('0.001')));
        const atMax = lookupOf(scale, end);
        expect({ scale: scale.code, band: band.code, at: 'max', code: atMax.band?.code }).toEqual({
          scale: scale.code,
          band: band.code,
          at: 'max',
          code: band.code,
        });
        expect(atMax.trace.checks.filter((check) => check.matched)).toHaveLength(1);
      }
    }
  });
});

describe('numeric bands (spec 03 section 5)', () => {
  it('grades the midpoint of every band of the CBE 8-level scale', () => {
    const cases: readonly (readonly [string, string, string])[] = [
      ['95', 'EE1', '8'],
      ['80', 'EE2', '7'],
      ['60', 'ME1', '6'],
      ['50', 'ME2', '5'],
      ['35', 'AE1', '4'],
      ['25', 'AE2', '3'],
      ['15', 'BE1', '2'],
      ['5', 'BE2', '1'],
    ];
    for (const [score, code, points] of cases) {
      const band = graded(cbe, score);
      expect({ score, code: band.code, points: band.points }).toEqual({ score, code, points });
    }
  });

  it('keeps a shared boundary in the band the upper convention names, never both', () => {
    expect(graded(cbe, '90').code).toBe('EE1');
    expect(graded(cbe, '89').code).toBe('EE2');
    expect(graded(cbe, '75').code).toBe('EE2');
    expect(graded(cbe, '74').code).toBe('ME1');
    expect(graded(cbe, '58').code).toBe('ME1');
    expect(graded(cbe, '57').code).toBe('ME2');

    const lookup = lookupOf(cbe, '90');
    expect(lookup.trace.checks.filter((check) => check.matched)).toHaveLength(1);
    expect(lookup.trace.checks.find((check) => check.matched)?.band).toBe('EE1');
  });

  it('includes the top of the declared domain and refuses below the floor', () => {
    expect(graded(cbe, '100').code).toBe('EE1');
    expect(graded(cbe, '1').code).toBe('BE2');
    expect(lookupOf(cbe, '0').matched).toBe(false);
    expect(lookupOf(cbe, '100.5').matched).toBe(false);
  });

  it('returns the label and descriptor with the band', () => {
    const band = graded(cbe, '95');
    expect(band.label).toBe('Exceeding Expectations 1');
    expect(band.descriptor).toBeNull();
  });

  it('treats an omitted upper bound as exclusive, so the max belongs to the next band', () => {
    const halfOpen: GradingScaleDefinition = {
      code: 'half_open',
      kind: 'numeric_bands',
      input: 'percent',
      bands: [
        { code: 'PASS', label: 'Pass', min: 50, max: 100 },
        { code: 'FAIL', label: 'Fail', min: 0, max: 50 },
      ],
    };
    expect(graded(halfOpen, '50').code).toBe('PASS');
    expect(graded(halfOpen, '49.999').code).toBe('FAIL');
    expect(lookupOf(halfOpen, '100').matched).toBe(false);
  });

  it('grades a single-band scale inside its bounds and nowhere else', () => {
    const single: GradingScaleDefinition = {
      code: 'single',
      kind: 'numeric_bands',
      input: 'percent',
      upper: 'inclusive',
      bands: [{ code: 'ALL', label: 'All marks', min: 0, max: 100 }],
    };
    expect(graded(single, '0').code).toBe('ALL');
    expect(graded(single, '50').code).toBe('ALL');
    expect(graded(single, '100').code).toBe('ALL');
    expect(lookupOf(single, '-0.5').matched).toBe(false);
    expect(lookupOf(single, '100.5').matched).toBe(false);
  });

  it('accepts a top band that reaches past the domain, which keeps it open-ended', () => {
    const openTop: GradingScaleDefinition = {
      code: 'open_top',
      kind: 'numeric_bands',
      input: 'percent',
      bands: [
        { code: 'TOP', label: 'Top', min: 90, max: 1000 },
        { code: 'REST', label: 'Rest', min: 0, max: 90 },
      ],
    };
    expect(graded(openTop, '90').code).toBe('TOP');
    expect(graded(openTop, '100').code).toBe('TOP');
    expect(graded(openTop, '999.5').code).toBe('TOP');
  });

  it('converts a bound written in exponent form without losing a digit', () => {
    const tiny: GradingScaleDefinition = {
      code: 'tiny',
      kind: 'numeric_bands',
      bands: [
        { code: 'TINY', label: 'Tiny', min: 0.0000001, max: 1 },
        { code: 'ZERO', label: 'Zero', min: 0, max: 0.0000001 },
      ],
    };
    expect(graded(tiny, '0.00000005').code).toBe('ZERO');
    expect(graded(tiny, '0.0000001').code).toBe('TINY');
  });

  it('reports a declared order that follows neither direction as mixed, and still looks up', () => {
    const mixed: GradingScaleDefinition = {
      code: 'mixed',
      kind: 'numeric_bands',
      bands: [
        { code: 'MID', label: 'Mid', min: 50, max: 75 },
        { code: 'LOW', label: 'Low', min: 0, max: 50 },
        { code: 'HIGH', label: 'High', min: 75, max: 100 },
      ],
    };
    const preparation = prepareGradingScale(mixed);
    if (!preparation.ok) throw new Error('expected the scale to load');
    expect(preparation.scale.direction).toBe('mixed');
    expect(graded(mixed, '60').code).toBe('MID');
    expect(graded(mixed, '20').code).toBe('LOW');
    expect(graded(mixed, '80').code).toBe('HIGH');
  });

  it('compares exact scores, not floats or display values', () => {
    const thousandths: GradingScaleDefinition = {
      code: 'thousandths',
      kind: 'numeric_bands',
      bands: [
        { code: 'WITHIN', label: 'Within', min: 0.005, max: 1 },
        { code: 'BELOW', label: 'Below', min: 0, max: 0.005 },
      ],
    };
    expect(graded(thousandths, '0.004999999999999').code).toBe('BELOW');
    expect(graded(thousandths, '0.005').code).toBe('WITHIN');
    expect(graded(thousandths, '1/3').code).toBe('WITHIN');
  });
});

// ------------------------------------------------------------------------ rubric

describe('rubric levels (spec 03 Appendix A)', () => {
  it('maps each level to its code, label and level points', () => {
    expect(graded(cbe4, '4')).toMatchObject({ code: 'EE', label: 'Exceeding Expectations', points: '4' });
    expect(graded(cbe4, '3')).toMatchObject({ code: 'ME', points: '3' });
    expect(graded(cbe4, '2')).toMatchObject({ code: 'AE', points: '2' });
    expect(graded(cbe4, '1')).toMatchObject({ code: 'BE', points: '1' });
  });

  it('returns the descriptor when the level carries one', () => {
    expect(graded(cbe4, '4').descriptor).toBe('Learner exceeds the expected competency.');
    expect(graded(cbe4, '3').descriptor).toBeNull();
  });

  it('does not invent a level between two whole levels', () => {
    expect(lookupOf(cbe4, '2.5').matched).toBe(false);
    expect(lookupOf(cbe4, '5').matched).toBe(false);
    expect(lookupOf(cbe4, '0').matched).toBe(false);
  });

  it('refuses a rubric band without its level points', () => {
    const pointsless: GradingScaleDefinition = {
      ...cbe4,
      bands: cbe4.bands.map((band) => ({
        code: band.code,
        label: band.label,
        min: band.min,
        max: band.max,
      })),
    };
    expect(issueCodesOf(pointsless)).toEqual([
      'missing_band_points',
      'missing_band_points',
      'missing_band_points',
      'missing_band_points',
    ]);
  });
});

// ------------------------------------------------------------------------ letter

describe('letter grades (spec 03 Appendix B)', () => {
  it('maps the KCSE 12-point scale to letters and points', () => {
    expect(graded(kcseSubject, '12')).toMatchObject({ code: 'A', points: '12' });
    expect(graded(kcseSubject, '9')).toMatchObject({ code: 'B', points: '9' });
    expect(graded(kcseSubject, '1')).toMatchObject({ code: 'E', points: '1' });
  });

  it('keeps the boundary between adjacent letters exclusive to one of them', () => {
    expect(graded(kcseSubject, '11').code).toBe('A-');
    expect(lookupOf(kcseSubject, '11').trace.checks.filter((check) => check.matched)).toHaveLength(1);
  });

  it('has no letter for points outside the table', () => {
    expect(lookupOf(kcseSubject, '0').matched).toBe(false);
    expect(lookupOf(kcseSubject, '11.5').matched).toBe(false);
    expect(lookupOf(kcseSubject, '13').matched).toBe(false);
  });
});

// ------------------------------------------------------------------------ points

describe('points (spec 03 section 12 KCSE mean-grade vector)', () => {
  it('turns a mean points value into the mean grade and its points', () => {
    expect(graded(kcseMean, '9.857')).toMatchObject({ code: 'B+', label: 'B+', points: '10' });
  });

  it('uses the mean-grade boundaries, upper bound exclusive by default', () => {
    expect(graded(kcseMean, '11.5').code).toBe('A');
    expect(graded(kcseMean, '10.5').code).toBe('A-');
    expect(graded(kcseMean, '9.5').code).toBe('B+');
    expect(graded(kcseMean, '0.5').code).toBe('E');
    expect(lookupOf(kcseMean, '0.499').matched).toBe(false);
    expect(lookupOf(kcseMean, '12.5').matched).toBe(false);
  });

  it('accepts a mean above the nominal top, because the top band is open-ended', () => {
    expect(graded(kcseMean, '12.4').code).toBe('A');
  });
});

// ---------------------------------------------------------------------- division

describe('divisions (spec 03 Appendix D, PLE aggregates)', () => {
  it('maps the aggregate range to Division I-IV and U', () => {
    expect(graded(pleDivisions, '4').code).toBe('I');
    expect(graded(pleDivisions, '12').code).toBe('I');
    expect(graded(pleDivisions, '13').code).toBe('II');
    expect(graded(pleDivisions, '24').code).toBe('III');
    expect(graded(pleDivisions, '30').code).toBe('IV');
    expect(graded(pleDivisions, '36').code).toBe('U');
  });

  it('has no division below the best aggregate or above the worst', () => {
    expect(lookupOf(pleDivisions, '3').matched).toBe(false);
    expect(lookupOf(pleDivisions, '37').matched).toBe(false);
  });

  it('returns no points, because a division does not carry grade points', () => {
    expect(graded(pleDivisions, '12').points).toBeNull();
  });

  it('reports the declared order as ascending, because a lower aggregate is the better division', () => {
    const preparation = prepareGradingScale(pleDivisions);
    if (!preparation.ok) throw new Error('expected the scale to load');
    expect(preparation.scale.direction).toBe('ascending');
  });
});

// --------------------------------------------------------------------- out of 20

describe('/20 marks (spec 03 Appendix J, Francophone mentions)', () => {
  it('applies the published mention thresholds', () => {
    expect(graded(mentions, '16').code).toBe('TB');
    expect(graded(mentions, '15.75').code).toBe('B');
    expect(graded(mentions, '14').code).toBe('B');
    expect(graded(mentions, '12').code).toBe('AB');
    expect(graded(mentions, '10').code).toBe('P');
    expect(graded(mentions, '9.5').code).toBe('NA');
  });

  it('includes 20/20 in the top mention and nothing above the declared range', () => {
    expect(graded(mentions, '20').code).toBe('TB');
    expect(graded(mentions, '0').code).toBe('NA');
    expect(lookupOf(mentions, '20.5').matched).toBe(false);
  });

  it('carries the label in the scale language', () => {
    expect(graded(mentions, '17').label).toBe('Très bien');
  });
});

// --------------------------------------------------------------------------- gpa

describe('GPA (grade points)', () => {
  it('returns the grade points of the matched band', () => {
    expect(graded(gpa, '90')).toMatchObject({ code: 'A', points: '4' });
    expect(graded(gpa, '89.9')).toMatchObject({ code: 'A-', points: '3.7' });
    expect(graded(gpa, '100')).toMatchObject({ code: 'A', points: '4' });
    expect(graded(gpa, '59.9')).toMatchObject({ code: 'F', points: '0' });
  });

  it('refuses a GPA band without grade points', () => {
    const pointsless: GradingScaleDefinition = {
      code: 'gpa_without_points',
      kind: 'gpa',
      bands: [{ code: 'A', label: 'A', min: 0, max: 100 }],
    };
    expect(issueCodesOf(pointsless)).toEqual(['missing_band_points']);
  });
});

// -------------------------------------------------------------------- descriptor

describe('descriptor scales (spec 03 Appendix C)', () => {
  it('returns the qualitative descriptor with the band', () => {
    expect(graded(attainment, '85')).toMatchObject({
      code: 'GD',
      label: 'Greater depth',
      descriptor: 'Working above the age-related expectation.',
    });
    expect(graded(attainment, '50').code).toBe('EX');
    expect(graded(attainment, '49.9').code).toBe('WT');
  });

  it('refuses a descriptor band without a descriptor', () => {
    const bare: GradingScaleDefinition = {
      code: 'bare',
      kind: 'descriptor',
      bands: [{ code: 'GD', label: 'Greater depth', min: 0, max: 100 }],
    };
    expect(issueCodesOf(bare)).toEqual(['missing_band_descriptor']);
  });
});

// -------------------------------------------------------------------- load checks

describe('a malformed scale is refused at load', () => {
  const band = (code: string, min: number, max: number) => ({ code, label: code, min, max });

  it('names both bands of a gap', () => {
    const gapped: GradingScaleDefinition = {
      code: 'gapped',
      kind: 'numeric_bands',
      bands: [band('LOW', 0, 49), band('HIGH', 90, 100)],
    };
    const issues = issuesOf(gapped);
    expect(issues.map((issue) => issue.code)).toEqual(['gap_between_bands']);
    expect(issues[0].bands).toEqual(['LOW', 'HIGH']);
    expect(issues[0].detail).toContain('"LOW"');
    expect(issues[0].detail).toContain('"HIGH"');
  });

  it('names both bands of an overlap', () => {
    const overlapping: GradingScaleDefinition = {
      code: 'overlapping',
      kind: 'numeric_bands',
      bands: [band('LOW', 0, 60), band('HIGH', 50, 100)],
    };
    const issues = issuesOf(overlapping);
    expect(issues.map((issue) => issue.code)).toEqual(['overlapping_bands']);
    expect(issues[0].bands).toEqual(['LOW', 'HIGH']);
  });

  it('treats a shared inclusive boundary as an overlap, not as two claims', () => {
    const shared: GradingScaleDefinition = {
      code: 'shared',
      kind: 'numeric_bands',
      upper: 'inclusive',
      bands: [band('LOW', 0, 60), band('HIGH', 60, 100)],
    };
    expect(issuesOf(shared).map((issue) => issue.code)).toEqual(['overlapping_bands']);
  });

  it('refuses a wide gap under the inclusive convention too', () => {
    const gapped: GradingScaleDefinition = {
      code: 'gapped_inclusive',
      kind: 'numeric_bands',
      upper: 'inclusive',
      bands: [band('LOW', 0, 49), band('HIGH', 60, 100)],
    };
    expect(issuesOf(gapped).map((issue) => issue.code)).toEqual(['gap_between_bands']);
  });

  it('accepts the one-mark daylight that published inclusive ranges use', () => {
    const published: GradingScaleDefinition = {
      code: 'published',
      kind: 'numeric_bands',
      upper: 'inclusive',
      bands: [band('LOW', 0, 49), band('HIGH', 50, 100)],
    };
    expect(prepareGradingScale(published).ok).toBe(true);
  });

  it('refuses duplicate band codes', () => {
    const duplicate: GradingScaleDefinition = {
      code: 'duplicate',
      kind: 'numeric_bands',
      bands: [band('A', 0, 50), band('A', 50, 100)],
    };
    expect(issuesOf(duplicate).map((issue) => issue.code)).toEqual(['duplicate_band']);
  });

  it('refuses a band whose minimum is above its maximum', () => {
    const inverted: GradingScaleDefinition = {
      code: 'inverted',
      kind: 'numeric_bands',
      bands: [band('A', 80, 20)],
    };
    expect(issuesOf(inverted).map((issue) => issue.code)).toEqual(['invalid_band_range']);
  });

  it('refuses an empty band under the exclusive convention', () => {
    const empty: GradingScaleDefinition = {
      code: 'empty',
      kind: 'numeric_bands',
      bands: [band('A', 50, 50)],
    };
    expect(issuesOf(empty).map((issue) => issue.code)).toEqual(['empty_band']);
  });

  it('accepts a single-point band under the inclusive convention', () => {
    const point: GradingScaleDefinition = {
      code: 'point',
      kind: 'numeric_bands',
      upper: 'inclusive',
      bands: [band('A', 5, 5)],
    };
    expect(graded(point, '5').code).toBe('A');
  });

  it('refuses an empty band list and a non-finite bound', () => {
    expect(issueCodesOf({ code: 'none', kind: 'numeric_bands', bands: [] })).toEqual(['empty_bands']);
    expect(
      issueCodesOf({ code: 'nan', kind: 'numeric_bands', bands: [band('A', 0, Number.POSITIVE_INFINITY)] })
    ).toEqual(['invalid_band_bound']);
  });

  it('refuses an unknown kind or upper convention handed to the runtime', () => {
    const badKind = { ...cbe, kind: 'letter_grade' } as unknown as GradingScaleDefinition;
    const badUpper = { ...cbe, upper: 'half' } as unknown as GradingScaleDefinition;
    expect(issueCodesOf(badKind)).toEqual(['invalid_kind']);
    expect(issueCodesOf(badUpper)).toEqual(['invalid_upper']);
  });
});

// ------------------------------------------------------------------------ traces

describe('the explanation trace', () => {
  it('records the score, its source, every band and the boundary that matched', () => {
    const lookup = lookupOf(cbe, '90');
    expect(lookup.matched).toBe(true);
    expect(lookup.trace).toMatchObject({
      scale: 'cbe_8_level',
      kind: 'numeric_bands',
      input: 'percent',
      upper: 'inclusive',
      source: 'given',
      score: '90',
      band: 'EE1',
      boundary: 'lower',
    });
    expect(lookup.trace.checks).toHaveLength(cbe.bands.length);
    expect(lookup.trace.checks.map((check) => check.band)).toEqual(cbe.bands.map((entry) => entry.code));
  });

  it('distinguishes a score on the lower bound, the upper bound and inside', () => {
    expect(lookupOf(cbe4, '4').trace.boundary).toBe('lower');
    expect(lookupOf(mentions, '20').trace.boundary).toBe('inside');
    expect(lookupOf(mentions, '16').trace.boundary).toBe('lower');
    expect(lookupOf(mentions, '15.999').trace.boundary).toBe('inside');
  });

  it('records a miss as no band with the boundary set to none', () => {
    const lookup = lookupOf(cbe, '0');
    expect(lookup.matched).toBe(false);
    expect(lookup.band).toBeNull();
    expect(lookup.trace.band).toBeNull();
    expect(lookup.trace.boundary).toBe('none');
    expect(lookup.trace.checks.every((check) => !check.matched)).toBe(true);
  });

  it('replays into the band and boundary it recorded', () => {
    for (const score of ['95', '90', '89', '50', '1', '0']) {
      const lookup = lookupOf(cbe, score);
      expect(replayScaleLookup(lookup.trace)).toEqual({
        band: lookup.band === null ? null : lookup.band.code,
        boundary: lookup.trace.boundary,
      });
    }
  });

  it('refuses a trace whose score was changed without its decisions', () => {
    const lookup = lookupOf(cbe, '95');
    const tampered = { ...lookup.trace, score: '50' };
    expect(() => replayScaleLookup(tampered)).toThrow(ScaleTraceMismatchError);
  });
});

// -------------------------------------------------------------- engine composition

describe('composition with the scheme engine', () => {
  const scheme: SchemeDefinition = {
    code: 'ng-terminal',
    slots: [
      { code: 'CA1', max: '20' },
      { code: 'CA2', max: '20' },
      { code: 'EXAM', max: '60' },
    ],
    learning_area_score: { op: 'sum', of: ['CA1', 'CA2', 'EXAM'], out_of: '100' },
    missing: { CA1: 'zero', CA2: 'zero', EXAM: 'zero' },
    rounding: [{ stage: 'learning_area_score', precision: 0, mode: 'half_up' }],
  };

  const present = (slot: string, score: string, max: string): SchemeMark => ({
    slot,
    assessment: slot,
    score,
    max_score: max,
    status: 'present',
  });

  const halfOpen: GradingScaleDefinition = {
    code: 'half_open_percent',
    kind: 'numeric_bands',
    input: 'percent',
    bands: [
      { code: 'A', label: 'A', min: 90, max: 101 },
      { code: 'B', label: 'B', min: 75, max: 90 },
      { code: 'C', label: 'C', min: 0, max: 75 },
    ],
  };

  const resultOf = (marks: readonly SchemeMark[]) => {
    const evaluation = evaluateScheme({ scheme, marks });
    if (!evaluation.ok) throw new Error(evaluation.issues.map((issue) => issue.code).join(', '));
    return evaluation.result;
  };

  it('grades the exact total or the rounded total, whichever the caller names', () => {
    const result = resultOf([present('CA1', '18', '20'), present('CA2', '19', '20'), present('EXAM', '52.5', '60')]);
    expect(result.exact_total).toBe('89.5');
    expect(result.total).toBe('90');
    expect(result.percent).toBe('90');

    const exact = gradeScoreOf(result, 'exact_total');
    const rounded = gradeScoreOf(result, 'total');
    if (exact === null || rounded === null) throw new Error('expected both scores');

    expect(exact.value).toEqual(exactOf('89.5'));
    expect(exact.source).toBe('exact_total');

    const exactLookup = evaluateGradingScale(halfOpen, exact);
    const roundedLookup = evaluateGradingScale(halfOpen, rounded);
    if (!exactLookup.ok || !roundedLookup.ok) throw new Error('expected the scale to load');
    expect(exactLookup.matched && exactLookup.band.code).toBe('B');
    expect(roundedLookup.matched && roundedLookup.band.code).toBe('A');
    expect(roundedLookup.trace.source).toBe('total');
    expect(roundedLookup.trace.score).toBe('90');
  });

  it('grades the percent the engine computed, and records that source', () => {
    const result = resultOf([present('CA1', '15', '20'), present('CA2', '15', '20'), present('EXAM', '45', '60')]);
    const percent = gradeScoreOf(result, 'percent');
    if (percent === null) throw new Error('expected a percent');
    const lookup = evaluateGradingScale(halfOpen, percent);
    if (!lookup.ok) throw new Error('expected the scale to load');
    expect(lookup.matched).toBe(true);
    expect(lookup.trace.source).toBe('percent');
  });

  it('returns no score when the named number is absent, rather than grading zero', () => {
    const emptyScheme: SchemeDefinition = {
      ...scheme,
      rounding: [],
      missing: { CA1: 'incomplete', CA2: 'incomplete', EXAM: 'incomplete' },
    };
    const absent = (slot: string, max: string): SchemeMark => ({
      slot,
      assessment: slot,
      max_score: max,
      status: 'absent',
    });
    const evaluation = evaluateScheme({
      scheme: emptyScheme,
      marks: [absent('CA1', '20'), absent('CA2', '20'), absent('EXAM', '60')],
    });
    if (!evaluation.ok) throw new Error('expected an evaluation');
    expect(evaluation.result.status).toBe('incomplete');
    expect(evaluation.result.total).toBeNull();
    expect(evaluation.result.exact_total).toBeNull();
    expect(gradeScoreOf(evaluation.result, 'total')).toBeNull();
    expect(gradeScoreOf(evaluation.result, 'exact_total')).toBeNull();
  });

  it('passes a caller-supplied exact score through with the given source', () => {
    const score = givenScore(exactOf('89.999'));
    expect(score.source).toBe('given');
    const lookup = lookupOf(halfOpen, '89.999');
    expect(lookup.matched && lookup.band.code).toBe('B');
  });
});
