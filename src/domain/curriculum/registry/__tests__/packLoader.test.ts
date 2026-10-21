// ABOUTME: Tests for the pack loader: the documented pack loads into the typed model, and a pack
// ABOUTME: that breaks a published schema rule or a runtime rule is refused with the check and its path.

import { describe, expect, it } from 'vitest';

import { packChecksum, sha256Hex } from '../checksum';
import { matchesPattern, versionBump } from '../diff';
import { isCalendarDate } from '../rules';
import { loadPack } from '../load';
import type { PackIssue } from '../types';

import {
  child,
  clone,
  examplePack,
  list,
  type PackDocument,
} from './packs';

function issuesOf(document: unknown): readonly PackIssue[] {
  const result = loadPack(document);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues;
}

function expectRefused(
  document: PackDocument,
  check: PackIssue['check'],
  path: string
): void {
  const issues = issuesOf(document);
  expect(
    issues.map((issue) => `${issue.check} ${issue.path}`),
    JSON.stringify(issues, null, 2)
  ).toContain(`${check} ${path}`);
}

describe('loading the documented pack', () => {
  it('projects the manifest and its reference', () => {
    const result = loadPack(examplePack());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.pack.code).toBe('ke-cbe');
    expect(result.pack.version).toBe('2026.1.0');
    expect(result.pack.ref).toBe('ke-cbe@2026.1.0');
    expect(result.pack.country).toBe('KE');
    expect(result.pack.issuers).toEqual(['KICD', 'KNEC', 'Ministry of Education']);
    expect(result.pack.languages).toEqual(['en', 'sw']);
    expect(result.pack.overridable).toEqual(['grading_scales.cbe_8_level.bands', 'reports.*.page']);
    expect(result.pack.supersedes).toBe('ke-cbc@2024.2.0');
    expect(result.pack.verification.status).toBe('draft');
  });

  it('projects every section onto the typed model', () => {
    const result = loadPack(examplePack());
    if (!result.ok) throw new Error('the documented pack must load');

    const { pack } = result;
    expect(pack.structure.stages.map((stage) => stage.code)).toEqual(['JS', 'SS']);
    expect(pack.structure.levels.map((level) => level.code)).toEqual([
      'G7',
      'G8',
      'G9',
      'G10',
      'G11',
      'G12',
    ]);
    expect(pack.structure.pathways.map((pathway) => pathway.code)).toEqual([
      'STEM',
      'SOC',
      'ASS',
    ]);
    expect(pack.structure.calendar.periods.map((period) => period.code)).toEqual([
      'T1',
      'T2',
      'T3',
    ]);
    expect(pack.learningAreas).toHaveLength(20);
    expect(pack.learningAreas.find((area) => area.code === 'KIS')?.alternatives).toEqual(['KSL']);
    expect(pack.learningAreas.find((area) => area.code === 'BIO')?.pathways).toEqual(['STEM']);
    expect(pack.competencies.map((competency) => competency.code)).toContain('VAL-RESP');
    expect(pack.combinationRules.map((rule) => rule.rule)).toEqual(['core_all', 'electives']);
    expect(pack.assessment.schemes).toHaveLength(1);

    const scheme = pack.assessment.schemes[0];
    expect(scheme.kind).toBe('marks');
    if (scheme.kind === 'marks') {
      expect(scheme.slots.map((slot) => slot.code)).toEqual(['SBA', 'ET']);
      expect(scheme.slots[0].scale_to).toBe(60);
      expect(scheme.missing).toEqual({ SBA: 'zero', ET: 'incomplete' });
      expect(scheme.rounding).toEqual([
        { stage: 'learning_area_score', precision: 0, mode: 'half_up' },
      ]);
    }

    expect(pack.assessment.gradingScales.map((scale) => scale.code)).toEqual([
      'cbe_8_level',
      'cbe_4_level',
    ]);
    expect(pack.assessment.gradingScales[0].bands).toHaveLength(8);
    expect(pack.assessment.aggregations[0].result_scale).toBe('cbe_8_level');
    expect(pack.assessment.ranking?.enabled).toBe(false);
    expect(pack.assessment.annual?.op).toBe('weighted_mean');
    expect(pack.progression.progression.map((rule) => rule.rule)).toEqual([
      'automatic',
      'stage_transition',
    ]);
    expect(pack.progression.graduation[0].levels).toEqual(['G12']);
    expect(pack.reports.map((report) => report.code)).toEqual(['js-term', 'ss-term']);
    expect(pack.reports[0].blocks.map((block) => block.type)).toContain('results_table');
    expect(pack.locales.map((locale) => locale.locale)).toEqual(['en', 'sw']);
    expect(pack.locales[0].labels['block.header']).toBe('School report');
    expect(pack.vectors[0].programme).toBe('ke-cbe');
    expect(pack.vectors[0].expect.selected).toEqual([]);
    expect(pack.vectors[0].expect.aggregates.cbe_mean_percent).toEqual({
      value: 86.5,
      grade: 'EE2',
      points: 7,
    });
  });

  it('is unchanged by the order the JSON happens to write its keys in', () => {
    const pack = examplePack();
    const reordered = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(reordered);
      if (typeof value !== 'object' || value === null) return value;
      const record = value as Record<string, unknown>;
      return Object.fromEntries(Object.keys(record).reverse().map((key) => [key, reordered(record[key])]));
    };

    expect(packChecksum(reordered(pack))).toBe(packChecksum(pack));
  });

  it('changes the checksum when the content changes', () => {
    const before = examplePack();
    const after = clone(before);
    child(after, 'pack').name = 'Kenya Competency-Based Education (revised)';
    expect(packChecksum(after)).not.toBe(packChecksum(before));
    expect(packChecksum(before)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe('SHA-256', () => {
  it('matches the published vectors', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
    expect(sha256Hex('The quick brown fox jumps over the lazy dog')).toBe(
      'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'
    );
  });

  it('hashes the same text the same way in one process', () => {
    expect(sha256Hex('ékei')).toBe(sha256Hex('ékei'));
    expect(sha256Hex('ékei')).not.toBe(sha256Hex('ekei'));
  });
});

describe('a pack that does not match the published shape', () => {
  it('refuses an unknown manifest key', () => {
    const pack = examplePack();
    child(pack, 'pack').unexpected = true;
    expectRefused(pack, 'additionalProperties', 'pack.unexpected');
  });

  it('refuses a pack with no tests section', () => {
    const pack = examplePack();
    delete pack.tests;
    expectRefused(pack, 'required', 'tests');
  });

  it('refuses an unknown slot kind', () => {
    const pack = examplePack();
    const scheme = child(pack, 'assessment');
    const slots = list(list(scheme, 'schemes')[0] as PackDocument, 'slots');
    (slots[0] as PackDocument).kind = 'quiz';
    expectRefused(pack, 'enum', 'assessment.schemes[0].slots[0].kind');
  });

  it('refuses an annual weight above one', () => {
    const pack = examplePack();
    child(pack, 'assessment', 'annual', 'of').T1 = 1.4;
    expectRefused(pack, 'maximum', 'assessment.annual.of.T1');
  });

  it('refuses a slot with neither max nor scale_to', () => {
    const pack = examplePack();
    const slot = list(list(child(pack, 'assessment'), 'schemes')[0] as PackDocument, 'slots')[0];
    delete (slot as PackDocument).scale_to;
    expectRefused(pack, 'anyOf', 'assessment.schemes[0].slots[0]');
  });

  it('refuses a scheme that mixes the marks and formative shapes', () => {
    const pack = examplePack();
    const scheme = list(child(pack, 'assessment'), 'schemes')[0] as PackDocument;
    scheme.evidence = 'rubric_observations';
    expectRefused(pack, 'additionalProperties', 'assessment.schemes[0].evidence');
  });

  it('refuses a report block that is not a named block', () => {
    const pack = examplePack();
    const block = list(list(pack, 'reports')[0] as PackDocument, 'blocks')[0] as PackDocument;
    block.type = 'poster';
    expectRefused(pack, 'enum', 'reports[0].blocks[0].type');
  });

  it('returns no pack at all when one deep value is wrong', () => {
    const pack = examplePack();
    child(pack, 'structure').levels = [];
    const result = loadPack(pack);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('pack');
  });
});

describe('a pack that breaks a rule the schema cannot state', () => {
  it('refuses duplicate level codes', () => {
    const pack = examplePack();
    list(child(pack, 'structure'), 'levels').push({
      code: 'G7',
      name: 'Grade 7 again',
      ordinal: 13,
    });
    expectRefused(pack, 'unique_codes', 'structure.levels');
  });

  it('refuses annual weights that do not sum to one', () => {
    const pack = examplePack();
    child(pack, 'assessment', 'annual', 'of').T1 = 0.6;
    expectRefused(pack, 'weight_sum', 'assessment.annual.of');
  });

  it('refuses a dangling grading-scale reference', () => {
    const pack = examplePack();
    (list(child(pack, 'assessment'), 'schemes')[0] as PackDocument).grading_scale = 'missing_scale';
    expectRefused(
      pack,
      'dangling_reference',
      'assessment.schemes[ke-cbe-terminal].grading_scale'
    );
  });

  it('refuses a dangling level reference', () => {
    const pack = examplePack();
    const level = list(child(pack, 'structure'), 'levels')[0] as PackDocument;
    level.next = 'G13';
    expectRefused(pack, 'dangling_reference', 'structure.levels[G7].next');
  });

  it('refuses overlapping bands', () => {
    const pack = examplePack();
    const bands = list(list(child(pack, 'assessment'), 'grading_scales')[0] as PackDocument, 'bands');
    (bands[1] as PackDocument).max = 100;
    expectRefused(pack, 'band_overlap', 'assessment.grading_scales[cbe_8_level].bands');
  });

  it('refuses a band whose minimum is above its maximum', () => {
    const pack = examplePack();
    const bands = list(list(child(pack, 'assessment'), 'grading_scales')[0] as PackDocument, 'bands');
    (bands[0] as PackDocument).min = 100;
    (bands[0] as PackDocument).max = 90;
    expectRefused(pack, 'band_order', 'assessment.grading_scales[cbe_8_level].bands[EE1]');
  });

  it('refuses an override path that is not a dotted path', () => {
    const pack = examplePack();
    child(pack, 'pack').overridable = ['grading_scales.cbe_8_level.bands', 'not a path'];
    expectRefused(pack, 'pattern', 'pack.overridable[1]');
  });

  it('refuses an impossible date', () => {
    const pack = examplePack();
    child(pack, 'pack').effective_from = '2026-02-30';
    expectRefused(pack, 'impossible_date', 'pack.effective_from');
  });

  it('refuses a report label no locale translates', () => {
    const pack = examplePack();
    const blocks = list(list(pack, 'reports')[0] as PackDocument, 'blocks');
    blocks.push({ type: 'fees', label_key: 'block.fees' });
    expectRefused(pack, 'locale_coverage', 'locales[en].labels');
  });

  it('refuses a manifest language with no locale entry', () => {
    const pack = examplePack();
    list(child(pack, 'pack'), 'languages').push('fr');
    expectRefused(pack, 'locale_coverage', 'locales');
  });

  it('refuses a repeated single-instance report block', () => {
    const pack = examplePack();
    const blocks = list(list(pack, 'reports')[0] as PackDocument, 'blocks');
    blocks.push({ type: 'header' });
    expectRefused(pack, 'single_instance_block', 'reports[js-term].blocks');
  });

  it('refuses a conformance vector for another programme', () => {
    const pack = examplePack();
    const vector = list(child(pack, 'tests'), 'vectors')[0] as PackDocument;
    vector.programme = 'ke-844';
    expectRefused(pack, 'programme_mismatch', 'tests.vectors[CBE mean percent 86.5 maps to EE2].programme');
  });

  it('refuses a progressive level with two rules', () => {
    const pack = examplePack();
    list(child(pack, 'progression'), 'progression').push({ levels: ['G7'], rule: 'automatic' });
    expectRefused(pack, 'duplicate_rule', 'progression.progression[automatic].levels');
  });

  it('refuses a best_n that keeps more results than are in scope', () => {
    const pack = examplePack();
    const aggregations = child(pack, 'assessment');
    aggregations.aggregations = [
      {
        code: 'best',
        op: 'best_n',
        n: 5,
        value: 'points',
        over: ['ENG', 'MAT'],
        groups: [{ fill_from: 'any' }],
      },
    ];
    expectRefused(pack, 'out_of_scope', 'assessment.aggregations[best].n');
  });
});

describe('calendar dates', () => {
  it('accepts a real day and refuses an impossible one', () => {
    expect(isCalendarDate('2026-01-01')).toBe(true);
    expect(isCalendarDate('2024-02-29')).toBe(true);
    expect(isCalendarDate('2026-02-29')).toBe(false);
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('2026-1-1')).toBe(false);
  });
});

describe('version bumps and override patterns', () => {
  it('reads the semver parts the way spec 03 §2.3 does', () => {
    expect(versionBump('2026.1.0', '2027.0.0')).toBe('major');
    expect(versionBump('2026.1.0', '2026.2.0')).toBe('minor');
    expect(versionBump('2026.1.0', '2026.1.1')).toBe('patch');
    expect(versionBump('2026.1.0', '2026.1.0')).toBe('same');
    expect(versionBump('2026.2.0', '2026.1.0')).toBe('downgrade');
  });

  it('matches a wildcard on exactly one path segment', () => {
    expect(matchesPattern('reports.js-term.page', 'reports.*.page')).toBe(true);
    expect(matchesPattern('reports.js-term.page.size', 'reports.*.page')).toBe(false);
    expect(matchesPattern('reports.js-term.branding', 'reports.*.page')).toBe(false);
    expect(
      matchesPattern('assessment.grading_scales.cbe_8_level.bands', 'grading_scales.cbe_8_level.bands')
    ).toBe(false);
  });
});

describe('the document the loader is given', () => {
  it('refuses a value that is not a pack at all', () => {
    const result = loadPack([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.path)).toContain('(root)');
    }
  });
});
