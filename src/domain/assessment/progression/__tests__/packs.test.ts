// ABOUTME: Coverage tests against the five shipped packs: every annual rule evaluates, every
// ABOUTME: progression and graduation level is covered and produces the action the pack declares,
// ABOUTME: every declared requirement blocks its transition when absent, and the class-council
// ABOUTME: suggestion is a suggestion even when the points total cannot be computed.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { evaluateAnnual, evaluateProgression, prepareProgression } from '..';
import type {
  AnnualDefinition,
  AnnualResult,
  AggregationDefinition,
  GradingScaleDefinition,
  GraduationRuleDefinition,
  PromotionRuleDefinition,
  ProgressionLearner,
  ProgressionSuggestion,
} from '..';
import { annualOf, learnerAt } from './fixtures';

// --------------------------------------------------------------- fixtures

interface PackScheme {
  readonly code: string;
  readonly levels: readonly string[];
  readonly grading_scale?: string;
}

interface PackAssessment {
  readonly schemes: readonly PackScheme[];
  readonly grading_scales: readonly GradingScaleDefinition[];
  readonly aggregations: readonly AggregationDefinition[];
  readonly annual?: AnnualDefinition;
}

interface PackLevel {
  readonly code: string;
  readonly next?: string | null;
}

interface PackStage {
  readonly code: string;
  readonly levels: readonly string[];
}

interface PackStructure {
  readonly levels: readonly PackLevel[];
  readonly stages: readonly PackStage[];
}

interface PackProgression {
  readonly progression: readonly PromotionRuleDefinition[];
  readonly graduation?: readonly GraduationRuleDefinition[];
}

interface Pack {
  readonly code: string;
  readonly assessment: PackAssessment;
  readonly progression: PackProgression;
  readonly structure: PackStructure;
}

function packRoot(): string {
  let current = process.cwd();
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(current, 'packs');
    if (existsSync(join(candidate, 'ke-cbe', 'assessment.json'))) return candidate;
    current = dirname(current);
  }
  throw new Error('the packs directory is not above the working directory');
}

const ROOT = packRoot();

function load(code: string): Pack {
  const read = <T>(file: string): T => JSON.parse(readFileSync(join(ROOT, code, file), 'utf8')) as T;
  return {
    code,
    assessment: read<PackAssessment>('assessment.json'),
    progression: read<PackProgression>('progression.json'),
    structure: read<PackStructure>('structure.json'),
  };
}

const PACK_CODES = ['ke-cbe', 'ke-844', 'gb-national', 'cambridge-intl', 'pearson-intl'] as const;

const PACKS: readonly Pack[] = PACK_CODES.map(load);

function levelOf(pack: Pack, code: string): PackLevel {
  const level = pack.structure.levels.find((candidate) => candidate.code === code);
  if (level === undefined) throw new Error(`${pack.code} has no level ${code}`);
  return level;
}

function stageOf(pack: Pack, code: string): PackStage {
  const stage = pack.structure.stages.find((candidate) => candidate.code === code);
  if (stage === undefined) throw new Error(`${pack.code} has no stage ${code}`);
  return stage;
}

/** A complete annual result for a level, graded in the scale the level's scheme declares. */
function annualFor(pack: Pack, level: string): AnnualResult {
  const annual = pack.assessment.annual;
  if (annual === undefined) throw new Error(`${pack.code} declares no annual rule`);
  const scale = pack.assessment.schemes.find(
    (scheme) => scheme.levels.includes(level) && scheme.grading_scale !== undefined
  )?.grading_scale;
  const evaluation = evaluateAnnual(
    annual,
    [
      { code: 'T1', value: '60', areas: [{ code: 'ENG', score: '60' }, { code: 'MAT', score: '60' }] },
      { code: 'T2', value: '70', areas: [{ code: 'ENG', score: '70' }, { code: 'MAT', score: '70' }] },
      { code: 'T3', value: '80', areas: [{ code: 'ENG', score: '80' }, { code: 'MAT', score: '80' }] },
    ],
    { scales: pack.assessment.grading_scales, ...(scale === undefined ? {} : { grading_scale: scale }) }
  );
  if (!evaluation.ok) {
    throw new Error(`${pack.code} annual failed: ${evaluation.issues.map((entry) => entry.code).join(', ')}`);
  }
  return evaluation.result;
}

function allRequirements(rule: PromotionRuleDefinition): Readonly<Record<string, boolean>> {
  return Object.fromEntries((rule.requires ?? []).map((name) => [name, true]));
}

function suggestionAt(
  pack: Pack,
  level: string,
  learner: ProgressionLearner,
  metrics?: Readonly<Record<string, { readonly value?: string; readonly complete?: boolean }>>
): ProgressionSuggestion {
  const evaluation = evaluateProgression(pack.progression, [learner], {
    levels: pack.structure.levels,
    stages: pack.structure.stages,
    annual: annualFor(pack, level),
    aggregations: pack.assessment.aggregations,
    scales: pack.assessment.grading_scales,
    ...(metrics === undefined ? {} : { metrics }),
  });
  if (!evaluation.ok) {
    throw new Error(`${pack.code} ${level}: ${evaluation.issues.map((entry) => `${entry.code} at ${entry.path}`).join(', ')}`);
  }
  return evaluation.suggestions[0];
}

const learner = (level: string, requirements: Readonly<Record<string, boolean | string>> = {}): ProgressionLearner =>
  learnerAt(level, { requirements });

// ------------------------------------------------------------------- annual

describe('the packs annual rule', () => {
  for (const pack of PACKS) {
    it(`${pack.code} declares one of the five operators and computes it`, () => {
      const annual = pack.assessment.annual;
      expect(annual).toBeDefined();
      if (annual === undefined) return;
      expect(['weighted_mean', 'mean', 'final_period_only', 'cumulative_sum', 'best_of']).toContain(annual.op);
      const result = annualOf(annual, { T1: '60', T2: '70', T3: '80' });
      expect(result.status).toBe('complete');
      expect(result.value).toBe('71');
    });

    it(`${pack.code} renormalises a missing period`, () => {
      const annual = pack.assessment.annual;
      if (annual === undefined) throw new Error('no annual rule');
      const result = annualOf(annual, { T1: '60', T3: '80' });
      expect(result.status).toBe('complete');
      expect(result.value).toBe('500/7');
      const missing = result.average.trace.steps[0];
      expect(missing.kind).toBe('missing');
      if (missing.kind === 'missing') {
        expect(missing.renormalised).toBe(true);
        expect(missing.entries[0]).toMatchObject({ code: 'T2', treatment: 'excluded' });
      }
      expect(result.average.flags.map((flag) => flag.code)).toEqual(['missing_period', 'renormalised']);
    });
  }
});

// -------------------------------------------------------------- progression

describe('the packs progression rules', () => {
  for (const pack of PACKS) {
    it(`${pack.code} prepares its rule set and covers every declared level`, () => {
      const preparation = prepareProgression(pack.progression, {
        levels: pack.structure.levels,
        stages: pack.structure.stages,
      });
      expect(preparation.ok).toBe(true);
      if (!preparation.ok) return;
      const covered = new Set([
        ...pack.progression.progression.flatMap((rule) => rule.levels),
        ...(pack.progression.graduation ?? []).flatMap((rule) => rule.levels),
      ]);
      expect(pack.structure.levels.filter((level) => !covered.has(level.code)).map((level) => level.code)).toEqual([]);
    });

    it(`${pack.code} evaluates every promotion level`, () => {
      for (const level of pack.structure.levels.map((entry) => entry.code)) {
        const rule = pack.progression.progression.find((candidate) => candidate.levels.includes(level));
        const graduation = (pack.progression.graduation ?? []).find((candidate) => candidate.levels.includes(level));
        if (rule === undefined && graduation === undefined) {
          throw new Error(`${pack.code} has no rule for ${level}`);
        }
        if (graduation !== undefined) {
          const suggestion = suggestionAt(pack, level, learner(level));
          expect(suggestion.action, `${pack.code} ${level}`).toBe('graduate');
          expect(suggestion.to_level, `${pack.code} ${level}`).toBeNull();
          continue;
        }
        if (rule === undefined) continue;
        const suggestion = suggestionAt(pack, level, learner(level, allRequirements(rule)));
        if (rule.rule === 'automatic' || rule.rule === 'threshold') {
          expect(suggestion.action, `${pack.code} ${level}`).toBe('promote');
          expect(suggestion.to_level, `${pack.code} ${level}`).toBe(levelOf(pack, level).next ?? null);
        } else if (rule.rule === 'stage_transition') {
          expect(rule.to_stage, `${pack.code} ${level}`).toBeDefined();
          if (rule.to_stage === undefined) continue;
          expect(suggestion.action, `${pack.code} ${level}`).toBe('promote');
          expect(suggestion.to_stage, `${pack.code} ${level}`).toBe(rule.to_stage);
          expect(suggestion.to_level, `${pack.code} ${level}`).toBe(stageOf(pack, rule.to_stage).levels[0]);
        } else {
          expect(suggestion.action, `${pack.code} ${level}`).toBe('council');
          expect(suggestion.to_level, `${pack.code} ${level}`).toBe(levelOf(pack, level).next ?? null);
          expect(suggestion.council, `${pack.code} ${level}`).not.toBeNull();
        }
      }
    });

    it(`${pack.code} blocks every declared requirement when it is absent`, () => {
      for (const rule of pack.progression.progression) {
        if (rule.requires === undefined || rule.requires.length === 0) continue;
        for (const level of rule.levels) {
          for (const missing of rule.requires) {
            const requirements: Record<string, boolean> = {};
            for (const name of rule.requires) requirements[name] = name !== missing;
            const suggestion = suggestionAt(pack, level, learner(level, requirements));
            expect(suggestion.action, `${pack.code} ${level}/${missing}`).toBe('blocked');
            expect(suggestion.flags, `${pack.code} ${level}/${missing}`).toEqual([
              { code: 'requirement_unmet', metric: null, requirement: missing },
            ]);
            expect(suggestion.complete, `${pack.code} ${level}/${missing}`).toBe(true);
          }
          const none = suggestionAt(pack, level, learner(level));
          expect(none.action, `${pack.code} ${level}/none`).toBe('blocked');
          expect(none.flags.map((flag) => flag.requirement)).toEqual([...rule.requires]);
        }
      }
    });
  }
});

// --------------------------------------------------------------- class council

describe('the packs class-council rules', () => {
  for (const pack of PACKS) {
    for (const rule of pack.progression.progression) {
      if (rule.rule !== 'class_council') continue;
      for (const level of rule.levels) {
        const metric = rule.suggest?.metric;
        if (metric === undefined) throw new Error(`${pack.code} ${level} has no suggestion metric`);

        it(`${pack.code} ${level} refers ${metric} to the council without deciding`, () => {
          const without = suggestionAt(pack, level, learner(level));
          expect(without.action).toBe('council');
          expect(without.council?.suggested).toBeNull();
          expect(without.flags.map((flag) => flag.code)).toContain('metric_unknown');
          expect(without.complete).toBe(false);
          expect(without.trace.council_suggested).toBeNull();

          const withMetric = suggestionAt(pack, level, learner(level), {
            [metric]: { value: '55', complete: true },
          });
          expect(withMetric.action).toBe('council');
          expect(withMetric.council?.suggested).toBe('promote');
          expect(withMetric.complete).toBe(true);
          expect(withMetric.trace.council_suggested).toBe('promote');
        });
      }
    }
  }
});

// ---------------------------------------------------------------- ke-cbe

describe('ke-cbe stage exits and senior pathways', () => {
  const pack = PACKS.find((candidate) => candidate.code === 'ke-cbe') as Pack;

  it('exits PP2 into Lower Primary at G1', () => {
    const suggestion = suggestionAt(pack, 'PP2', learner('PP2'));
    expect(suggestion.action).toBe('promote');
    expect(suggestion.to_stage).toBe('LP');
    expect(suggestion.to_level).toBe('G1');
  });

  it('exits G3 into Upper Primary at G4', () => {
    const suggestion = suggestionAt(pack, 'G3', learner('G3'));
    expect(suggestion.to_stage).toBe('UP');
    expect(suggestion.to_level).toBe('G4');
  });

  it('exits G6 into Junior School only when the national assessment is recorded', () => {
    expect(suggestionAt(pack, 'G6', learner('G6')).action).toBe('blocked');
    const recorded = suggestionAt(pack, 'G6', learner('G6', { national_assessment_recorded: true }));
    expect(recorded.action).toBe('promote');
    expect(recorded.to_stage).toBe('JS');
    expect(recorded.to_level).toBe('G7');
  });

  it('exits G9 into Senior School only with the national assessment and a pathway', () => {
    const missingPathway = suggestionAt(pack, 'G9', learner('G9', { national_assessment_recorded: true }));
    expect(missingPathway.action).toBe('blocked');
    expect(missingPathway.flags).toEqual([
      { code: 'requirement_unmet', metric: null, requirement: 'pathway_placement' },
    ]);
    const placed = suggestionAt(
      pack,
      'G9',
      learner('G9', { national_assessment_recorded: true, pathway_placement: 'STEM' })
    );
    expect(placed.action).toBe('promote');
    expect(placed.to_stage).toBe('SS');
    expect(placed.to_level).toBe('G10');
    expect(placed.trace.requirements).toEqual({
      national_assessment_recorded: true,
      pathway_placement: true,
    });
  });

  it('promotes through the senior school and graduates at G12', () => {
    expect(suggestionAt(pack, 'G10', learner('G10')).to_level).toBe('G11');
    expect(suggestionAt(pack, 'G11', learner('G11')).to_level).toBe('G12');
    expect(suggestionAt(pack, 'G12', learner('G12')).action).toBe('graduate');
  });
});

// ------------------------------------------------------------- gb-national

describe('gb-national key-stage transitions', () => {
  const pack = PACKS.find((candidate) => candidate.code === 'gb-national') as Pack;

  it('moves N2 into KS1 at Y1 and requires the EYFS profile', () => {
    expect(suggestionAt(pack, 'N2', learner('N2')).action).toBe('blocked');
    const recorded = suggestionAt(pack, 'N2', learner('N2', { national_assessment_recorded: true }));
    expect(recorded.action).toBe('promote');
    expect(recorded.to_stage).toBe('KS1');
    expect(recorded.to_level).toBe('Y1');
  });

  it('moves Y6 into KS3 at Y7', () => {
    const suggestion = suggestionAt(pack, 'Y6', learner('Y6'));
    expect(suggestion.action).toBe('promote');
    expect(suggestion.to_stage).toBe('KS3');
    expect(suggestion.to_level).toBe('Y7');
  });

  it('moves Y9 into KS4 at Y10', () => {
    const suggestion = suggestionAt(pack, 'Y9', learner('Y9'));
    expect(suggestion.action).toBe('promote');
    expect(suggestion.to_stage).toBe('KS4');
    expect(suggestion.to_level).toBe('Y10');
  });
});
