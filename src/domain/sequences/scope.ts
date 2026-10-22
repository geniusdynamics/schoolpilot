// ABOUTME: Scope handling for sequences: which segments a definition is partitioned by, how the
// ABOUTME: reset policy fills year and month, and the canonical scope key the store counts on.

import { SequenceDefinitionError } from './errors';
import { compileDefinition } from './format';
import type { ResetPolicy, ScopeSegment, ScopeValues, SequenceDefinition } from './types';

/**
 * The order scope segments are written in a scope key.
 *
 * Fixed, so two callers that describe the same scope produce the same key and therefore share
 * one counter.
 */
export const SCOPE_SEGMENT_ORDER: readonly ScopeSegment[] = [
  'institution',
  'campus',
  'device',
  'cashier',
  'year',
  'month',
  'term',
];

/** The segments a reset policy adds to a scope: a reset is a scope of its own. */
export function resetSegmentsFor(reset: ResetPolicy): readonly ScopeSegment[] {
  if (reset === 'monthly') return ['year', 'month'];
  if (reset === 'yearly') return ['year'];
  return [];
}

/**
 * Checks that a definition can be issued and parsed.
 *
 * Throws a {@link SequenceDefinitionError} for the two mistakes that would otherwise corrupt a
 * run of numbers: a pattern that renders a segment nothing supplies, and a reset whose period is
 * not part of the number (which would let the new period repeat the old period's numbers).
 */
export function validateDefinition(definition: SequenceDefinition): void {
  if (typeof definition.name !== 'string' || definition.name.length === 0) {
    throw new SequenceDefinitionError('a sequence definition needs a name');
  }

  const format = compileDefinition(definition);
  const declared = new Set<ScopeSegment>(definition.scope);
  if (declared.size !== definition.scope.length) {
    throw new SequenceDefinitionError(`the "${definition.name}" sequence declares a scope segment twice`);
  }

  if (declared.size === 0 && resetSegmentsFor(definition.reset).length === 0) {
    throw new SequenceDefinitionError(
      `the "${definition.name}" sequence has no scope, so every caller would share one counter; give it at least one scope segment`
    );
  }

  for (const segment of format.segments) {
    if (!declared.has(segment)) {
      throw new SequenceDefinitionError(
        `the pattern of "${definition.name}" renders "${segment}", which is not a declared scope segment`
      );
    }
  }

  for (const segment of resetSegmentsFor(definition.reset)) {
    if (!declared.has(segment)) {
      throw new SequenceDefinitionError(
        `a "${definition.reset}" reset of "${definition.name}" needs "${segment}" in its scope`
      );
    }
    if (!format.segments.includes(segment)) {
      throw new SequenceDefinitionError(
        `a "${definition.reset}" reset of "${definition.name}" needs "${segment}" in its pattern, or the next period would reuse a number`
      );
    }
  }
}

/**
 * Resolves the scope of one allocation.
 *
 * `year` and `month` fall back to `now`, so a reset happens on its own without the caller having
 * to pass the date. Every other segment the definition needs must be given.
 */
export function resolveScope(
  definition: SequenceDefinition,
  values: ScopeValues,
  now: Date = new Date()
): ScopeValues {
  const format = compileDefinition(definition);
  const required = new Set<ScopeSegment>([
    ...definition.scope,
    ...format.segments,
    ...resetSegmentsFor(definition.reset),
  ]);

  const scope: ScopeValues = {};
  for (const segment of SCOPE_SEGMENT_ORDER) {
    if (!required.has(segment)) continue;

    let value = values[segment];
    if (value === undefined || value === '') {
      if (segment === 'year') value = now.getFullYear();
      else if (segment === 'month') value = now.getMonth() + 1;
      else {
        throw new SequenceDefinitionError(
          `the "${definition.name}" sequence needs a "${segment}" scope value`
        );
      }
    }

    scope[segment] = segment === 'year' || segment === 'month' ? asPeriod(value, segment) : String(value);
  }
  return scope;
}

/** The canonical key of a scope: fixed segment order, so equal scopes share one counter. */
export function scopeKey(scope: ScopeValues): string {
  const parts: string[] = [];
  for (const segment of SCOPE_SEGMENT_ORDER) {
    const value = scope[segment];
    if (value === undefined) continue;
    parts.push(`${segment}=${value}`);
  }
  if (parts.length === 0) {
    throw new SequenceDefinitionError('a scope with no segments would share one counter with every other scope');
  }
  return parts.join('|');
}

/** The scope key of one allocation for a definition. */
export function resolveScopeKey(
  definition: SequenceDefinition,
  values: ScopeValues,
  now: Date = new Date()
): { scope: ScopeValues; scopeKey: string } {
  const scope = resolveScope(definition, values, now);
  return { scope, scopeKey: scopeKey(scope) };
}

function asPeriod(value: string | number, segment: ScopeSegment): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new SequenceDefinitionError(`the "${segment}" scope value must be a positive integer, got "${value}"`);
  }
  if (segment === 'month' && parsed > 12) {
    throw new SequenceDefinitionError(`the month scope value must be between 1 and 12, got ${parsed}`);
  }
  return parsed;
}
