// ABOUTME: The upgrade diff: what two pack versions change, which override paths the pack allows,
// ABOUTME: and the version bump the change implies. It reads; it never writes.

import { deepEqual, getAtPath, isRecord } from './json';
import type {
  LoadedPack,
  PackChange,
  PackSection,
  PackVersionBump,
  PackWarning,
} from './types';

/** One entry of a collection section, keyed by its code. */
type Coded = { readonly code: string };

interface CollectionSpec {
  readonly section: PackSection;
  readonly items: (pack: LoadedPack) => readonly Coded[];
}

interface SingleSpec {
  readonly section: PackSection;
  readonly value: (pack: LoadedPack) => unknown;
}

const COLLECTIONS: readonly CollectionSpec[] = [
  { section: 'stages', items: (pack) => pack.structure.stages },
  { section: 'levels', items: (pack) => pack.structure.levels },
  { section: 'pathways', items: (pack) => pack.structure.pathways },
  { section: 'learning_areas', items: (pack) => pack.learningAreas },
  { section: 'competencies', items: (pack) => pack.competencies },
  { section: 'schemes', items: (pack) => pack.assessment.schemes },
  { section: 'grading_scales', items: (pack) => pack.assessment.gradingScales },
  { section: 'aggregations', items: (pack) => pack.assessment.aggregations },
  { section: 'reports', items: (pack) => pack.reports },
  { section: 'locales', items: (pack) => pack.locales.map((entry) => ({ code: entry.locale })) },
  { section: 'vectors', items: (pack) => pack.vectors.map((entry) => ({ code: entry.name })) },
];

/**
 * Sections without a code of their own: a combination rule, a promotion rule and a graduation rule
 * are identified by their rule and levels, not by a pack code, so they are compared as one value.
 */
const SINGLES: readonly SingleSpec[] = [
  { section: 'calendar', value: (pack) => pack.structure.calendar },
  { section: 'combination_rules', value: (pack) => pack.combinationRules },
  { section: 'ranking', value: (pack) => pack.assessment.ranking },
  { section: 'annual', value: (pack) => pack.assessment.annual },
  { section: 'progression', value: (pack) => pack.progression.progression },
  { section: 'graduation', value: (pack) => pack.progression.graduation },
];

/** The sections whose change is structural, so spec 03 §2.3 asks for a major version. */
const STRUCTURAL: ReadonlySet<PackSection> = new Set<PackSection>([
  'stages',
  'levels',
  'pathways',
  'learning_areas',
]);

const TOP_LEVEL_SECTIONS = new Set([
  'pack',
  'structure',
  'learning_areas',
  'assessment',
  'progression',
  'reports',
  'locales',
  'tests',
]);

export interface PackDifference {
  readonly versionBump: PackVersionBump;
  readonly changes: readonly PackChange[];
  readonly warnings: readonly PackWarning[];
}

function numbersOf(version: string): readonly [number, number, number] | null {
  const match = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(version);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function versionBump(from: string, to: string): PackVersionBump {
  const before = numbersOf(from);
  const after = numbersOf(to);
  if (!before || !after) return 'same';
  if (after[0] !== before[0]) return after[0] > before[0] ? 'major' : 'downgrade';
  if (after[1] !== before[1]) return after[1] > before[1] ? 'minor' : 'downgrade';
  if (after[2] !== before[2]) return after[2] > before[2] ? 'patch' : 'downgrade';
  return 'same';
}

function difference(left: unknown, right: unknown): readonly string[] {
  if (deepEqual(left, right)) return [];
  if (!isRecord(left) || !isRecord(right)) return ['*'];

  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  return keys.filter((key) => !deepEqual(left[key], right[key]));
}

/**
 * The changes between two loaded pack versions.
 *
 * Collections are compared by code; a changed entry names the top-level fields that differ. A
 * section the pack holds once (calendar, ranking, annual) is one change with code `*`.
 */
export function diffPacks(installed: LoadedPack, candidate: LoadedPack): PackDifference {
  const changes: PackChange[] = [];

  for (const spec of COLLECTIONS) {
    const before = new Map(spec.items(installed).map((item) => [item.code, item]));
    const after = new Map(spec.items(candidate).map((item) => [item.code, item]));

    for (const [code, item] of after) {
      const previous = before.get(code);
      if (!previous) {
        changes.push({ section: spec.section, kind: 'added', code, fields: [] });
        continue;
      }
      const fields = difference(previous, item);
      if (fields.length > 0) {
        changes.push({ section: spec.section, kind: 'changed', code, fields });
      }
    }
    for (const code of before.keys()) {
      if (!after.has(code)) {
        changes.push({ section: spec.section, kind: 'removed', code, fields: [] });
      }
    }
  }

  for (const spec of SINGLES) {
    const fields = difference(spec.value(installed), spec.value(candidate));
    if (fields.length > 0) {
      changes.push({ section: spec.section, kind: 'changed', code: '*', fields });
    }
  }

  const bump = versionBump(installed.version, candidate.version);
  const warnings: PackWarning[] = [];

  const structural = changes.filter(
    (change) => STRUCTURAL.has(change.section) && change.kind === 'removed'
  );
  if (structural.length > 0) {
    const summary = [...new Set(structural.map((change) => change.section))].join(', ');
    warnings.push({
      code: 'structural_change',
      detail: `the structure removes entries in: ${summary}`,
    });
    if (bump !== 'major') {
      warnings.push({
        code: 'version_bump_too_small',
        detail: `a structural change asks for a major version (spec 03 §2.3), but this is a ${bump} bump`,
      });
    }
  }

  const droppedLanguages = installed.languages.filter(
    (language) => !candidate.languages.includes(language)
  );
  if (droppedLanguages.length > 0) {
    warnings.push({
      code: 'language_removed',
      detail: `languages no longer provided: ${droppedLanguages.join(', ')}`,
    });
  }

  return { versionBump: bump, changes, warnings };
}

/**
 * Every override path pattern a pack declares, in the pack document's own vocabulary.
 *
 * A manifest pattern is relative to the pack root. Spec 03 §2.3 writes the assessment section's
 * keys without the `assessment.` prefix (`grading_scales.kcse_subject.bands`), so a pattern that
 * does not start with a top-level section is accepted under `assessment` too. A pattern declared
 * on a scheme is relative to that scheme.
 */
export function overridablePatterns(pack: LoadedPack): readonly string[] {
  const patterns = new Set<string>();
  for (const pattern of pack.overridable) {
    patterns.add(pattern);
    const first = pattern.split('.')[0];
    if (!TOP_LEVEL_SECTIONS.has(first)) patterns.add(`assessment.${pattern}`);
  }
  for (const scheme of pack.assessment.schemes) {
    for (const pattern of scheme.overridable) {
      patterns.add(`assessment.schemes.${scheme.code}.${pattern}`);
    }
  }
  return [...patterns];
}

/** True when `path` matches one of the patterns; `*` stands for exactly one segment. */
export function matchesPattern(path: string, pattern: string): boolean {
  const pathSegments = path.split('.');
  const patternSegments = pattern.split('.');
  if (pathSegments.length !== patternSegments.length) return false;
  return patternSegments.every(
    (segment, index) => segment === '*' || segment === pathSegments[index]
  );
}

/** True when the pack lets a school override `path` (spec 03 §2.3). */
export function isOverridable(pack: LoadedPack, path: string): boolean {
  return overridablePatterns(pack).some((pattern) => matchesPattern(path, pattern));
}

export interface ResolvedPath {
  readonly found: boolean;
  readonly value: unknown;
}

/** Resolves a dotted path in the pack document, addressing array entries by code. */
export function resolvePackPath(document: unknown, path: string): ResolvedPath {
  const { found, value } = getAtPath(document, path);
  return { found, value };
}
