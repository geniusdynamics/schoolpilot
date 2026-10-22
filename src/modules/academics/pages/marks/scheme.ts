// ABOUTME: Resolves the assessment columns a teaching group is marked on. A scheme the programme
// ABOUTME: pinned decides the slots and their order; without one the period's assessments do.
// ABOUTME: Every edited score is checked against the maximum the scheme declares, at entry time.

import type {
  ComponentCombine,
  MarkStatus,
  MissingPolicy,
  RoundingMode,
  RoundingRule,
  RoundingStage,
  SchemeDefinition,
  SchemeSlot,
  SlotCombine,
} from '@/domain/assessment/engine';

import type { SchemeColumn } from './types';

/** One `assessment_scheme` row, reduced to what the resolver reads. */
export interface SchemeDefinitionRecord {
  readonly id: string;
  readonly programmeId: string;
  readonly levelIds: readonly string[];
  readonly version: string;
  readonly definition: unknown;
}

/** One assessment, reduced to what the resolver reads. */
export interface AssessmentColumnSource {
  readonly id: string;
  readonly name: string;
  readonly slot: string | null;
  readonly kind: string;
  readonly max: number | null;
  readonly status: string;
}

/** The scheme the grid runs on, and where it came from. */
export interface ResolvedScheme {
  readonly code: string;
  readonly version: string | null;
  readonly source: 'programme' | 'assessments';
  readonly definition: SchemeDefinition;
  readonly columns: readonly SchemeColumn[];
}

/** The order slot kinds are shown in when no scheme declares one. */
const KIND_ORDER: readonly string[] = [
  'formative',
  'cat',
  'opener',
  'mid_term',
  'end_term',
  'mock',
  'project',
  'practical',
  'portfolio',
  'national',
];

const MISSING_POLICIES: readonly MissingPolicy[] = ['zero', 'exclude', 'incomplete', 'carry_previous'];
const ROUNDING_MODES: readonly RoundingMode[] = ['half_up', 'half_down', 'half_even', 'up', 'down'];
const ROUNDING_STAGES: readonly RoundingStage[] = ['slot', 'learning_area_score'];
const SLOT_COMBINES: readonly SlotCombine[] = ['sum', 'mean', 'best_of'];
const COMPONENT_COMBINES: readonly ComponentCombine[] = ['sum', 'scale_each_then_sum', 'weighted', 'best_of'];

/** A decimal string, or undefined when the value is not one. The engine never takes a float. */
export function decimalString(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return /^-?\d+(\.\d+)?$/.test(trimmed) ? trimmed : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function readSlot(value: unknown): SchemeSlot | null {
  if (!isRecord(value) || typeof value.code !== 'string' || value.code.trim() === '') return null;
  const slot: {
    code: string;
    label?: string;
    max?: string;
    scale_to?: string;
    multi?: boolean;
    combine?: SlotCombine;
    best_of?: number;
    optional?: boolean;
  } = { code: value.code.trim() };
  if (typeof value.label === 'string') slot.label = value.label;
  const max = decimalString(value.max);
  if (max !== undefined) slot.max = max;
  const scaleTo = decimalString(value.scale_to);
  if (scaleTo !== undefined) slot.scale_to = scaleTo;
  if (typeof value.multi === 'boolean') slot.multi = value.multi;
  if (SLOT_COMBINES.includes(value.combine as SlotCombine)) slot.combine = value.combine as SlotCombine;
  const bestOf = finiteNumber(value.best_of);
  if (bestOf !== undefined) slot.best_of = bestOf;
  if (typeof value.optional === 'boolean') slot.optional = value.optional;
  return slot;
}

/**
 * Reads the scheme document a programme stored.
 *
 * The stored JSON is untrusted: it may predate the engine's vocabulary or carry numbers where the
 * engine wants decimal strings. A document without a usable slot is refused (null), so the caller
 * falls back to the period's assessments instead of evaluating a scheme it cannot read.
 */
export function readSchemeDefinition(
  definition: unknown,
  fallbackCode: string,
  version?: string
): SchemeDefinition | null {
  if (!isRecord(definition)) return null;
  const slots = Array.isArray(definition.slots)
    ? definition.slots.map(readSlot).filter((slot): slot is SchemeSlot => slot !== null)
    : [];
  if (slots.length === 0) return null;

  const score = isRecord(definition.learning_area_score) ? definition.learning_area_score : {};
  const of = stringList(score.of);
  const outOf = decimalString(score.out_of);

  const missing: Record<string, MissingPolicy> = {};
  if (isRecord(definition.missing)) {
    for (const [code, policy] of Object.entries(definition.missing)) {
      if (MISSING_POLICIES.includes(policy as MissingPolicy)) missing[code] = policy as MissingPolicy;
    }
  }

  const rounding: RoundingRule[] = [];
  if (Array.isArray(definition.rounding)) {
    for (const rule of definition.rounding) {
      if (!isRecord(rule)) continue;
      const precision = finiteNumber(rule.precision);
      if (!ROUNDING_STAGES.includes(rule.stage as RoundingStage)) continue;
      if (!ROUNDING_MODES.includes(rule.mode as RoundingMode)) continue;
      if (precision === undefined || !Number.isInteger(precision) || precision < 0) continue;
      rounding.push({
        stage: rule.stage as RoundingStage,
        precision,
        mode: rule.mode as RoundingMode,
      });
    }
  }

  const policy = isRecord(definition.component_policy) ? definition.component_policy : null;
  const componentPolicy: NonNullable<SchemeDefinition['component_policy']> | undefined =
    policy && COMPONENT_COMBINES.includes(policy.papers as ComponentCombine)
      ? {
          papers: policy.papers as ComponentCombine,
          ...(decimalString(policy.out_of) === undefined ? {} : { out_of: decimalString(policy.out_of) }),
          ...(finiteNumber(policy.best_of) === undefined ? {} : { best_of: finiteNumber(policy.best_of) }),
        }
      : undefined;

  return {
    code: typeof definition.code === 'string' && definition.code.trim() !== '' ? definition.code : fallbackCode,
    ...(version === undefined ? {} : { version }),
    slots,
    learning_area_score: {
      op: 'sum',
      ...(of.length === 0 ? {} : { of }),
      ...(outOf === undefined ? {} : { out_of: outOf }),
    },
    ...(Object.keys(missing).length === 0 ? {} : { missing }),
    ...(rounding.length === 0 ? {} : { rounding }),
    ...(componentPolicy === undefined ? {} : { component_policy: componentPolicy }),
  };
}

/** The slot order the scheme document declares, or the kind order when it declares none. */
function orderOf(definition: SchemeDefinition | null): readonly string[] {
  return definition?.slots.map((slot) => slot.code) ?? [];
}

/** The slot maximum the scheme declares, used when the assessment carries none. */
function slotMaximum(definition: SchemeDefinition | null, slot: string): number | null {
  const declared = definition?.slots.find((entry) => entry.code === slot);
  const scaleTo = declared?.scale_to === undefined ? undefined : Number(declared.scale_to);
  const max = declared?.max === undefined ? undefined : Number(declared.max);
  if (scaleTo !== undefined && Number.isFinite(scaleTo)) return scaleTo;
  if (max !== undefined && Number.isFinite(max)) return max;
  const outOf = definition?.learning_area_score.out_of;
  const total = outOf === undefined ? undefined : Number(outOf);
  return total !== undefined && Number.isFinite(total) ? total : null;
}

/**
 * The scheme a group is marked under, with the columns the grid draws.
 *
 * A scheme pinned for the group's level wins. Otherwise the scheme is derived from the period's
 * assessments: one slot per distinct `scheme_slot` (or kind), `multi` where several assessments
 * share it, and every slot required — the safe default when nobody has said otherwise.
 */
export function resolveScheme(input: {
  readonly assessments: readonly AssessmentColumnSource[];
  readonly schemes: readonly SchemeDefinitionRecord[];
  readonly levelId: string | null;
  readonly programmeId: string | null;
}): ResolvedScheme {
  const pinned = input.schemes
    .filter((row) => input.programmeId === null || row.programmeId === input.programmeId)
    .filter((row) => input.levelId === null || row.levelIds.includes(input.levelId))
    .sort((left, right) => right.version.localeCompare(left.version, undefined, { numeric: true }))[0];

  const pinnedDefinition = pinned
    ? readSchemeDefinition(pinned.definition, pinned.id, pinned.version)
    : null;

  const slots = new Map<string, AssessmentColumnSource[]>();
  for (const assessment of input.assessments) {
    const slot = assessment.slot ?? assessment.kind;
    slots.set(slot, [...(slots.get(slot) ?? []), assessment]);
  }

  const derived: SchemeDefinition = {
    code: 'derived',
    slots: [...slots].map(([slot, entries]) => {
      const maxima = entries.map((entry) => entry.max);
      const shared = maxima.every((max) => max !== null && max === maxima[0]) ? maxima[0] : null;
      return {
        code: slot,
        ...(shared === null ? {} : { max: String(shared) }),
        ...(entries.length > 1 ? { multi: true, combine: 'mean' as const } : {}),
      };
    }),
    learning_area_score: { op: 'sum' },
    default_missing: 'incomplete',
  };

  const definition = pinnedDefinition ?? derived;

  const columns = [...input.assessments]
    .sort((left, right) => {
      const leftSlot = left.slot ?? left.kind;
      const rightSlot = right.slot ?? right.kind;
      const order = orderOf(definition);
      const leftIndex = order.indexOf(leftSlot);
      const rightIndex = order.indexOf(rightSlot);
      const leftRank = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const rightRank = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      if (leftRank !== rightRank) return leftRank - rightRank;
      const kind = KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind);
      if (kind !== 0) return kind;
      return left.name.localeCompare(right.name);
    })
    .map<SchemeColumn>((assessment) => ({
      key: assessment.id,
      assessmentId: assessment.id,
      slot: assessment.slot ?? assessment.kind,
      label: assessment.name,
      max: assessment.max ?? slotMaximum(definition, assessment.slot ?? assessment.kind),
      kind: assessment.kind,
      assessmentStatus: assessment.status,
    }));

  return {
    code: pinnedDefinition?.code ?? (pinned ? pinned.id : 'derived'),
    version: pinnedDefinition?.version ?? pinned?.version ?? null,
    source: pinnedDefinition ? 'programme' : 'assessments',
    definition,
    columns,
  };
}

/** The outcome of checking one typed score against its column. */
export type ScoreCheck =
  | { readonly ok: true; readonly score: string }
  | { readonly ok: false; readonly code: 'empty' | 'invalid' | 'out_of_range'; readonly message: string };

/**
 * Checks a typed score the way the engine would.
 *
 * The engine refuses a mark above the assessment maximum at evaluation time; a teacher must learn
 * that while typing, so the same rule runs here. `max === null` is not a range to check: the
 * column is unusable and the cell carries `incomplete_scheme` instead.
 */
export function checkScore(raw: string, max: number | null): ScoreCheck {
  const score = raw.trim();
  if (score === '') {
    return { ok: false, code: 'empty', message: 'Enter a score, or record the learner with a status.' };
  }
  if (!/^\d+(\.\d+)?$/.test(score)) {
    return {
      ok: false,
      code: 'invalid',
      message: 'A score is a number, for example 78 or 78.5.',
    };
  }
  if (max !== null && Number(score) > max) {
    return {
      ok: false,
      code: 'out_of_range',
      message: `A score cannot be above the maximum of ${max}.`,
    };
  }
  return { ok: true, score };
}

/** What a cell's mark contributes to the engine: the slot, the assessment and the raw score. */
export interface RowMark {
  readonly slot: string;
  readonly assessment: string;
  readonly score: string | undefined;
  readonly maxScore: string | undefined;
  readonly status: MarkStatus;
}

/** The key the engine's flags and the grid agree on for one cell. */
export function cellKey(slot: string, assessment: string): string {
  return `${slot}|${assessment}`;
}
