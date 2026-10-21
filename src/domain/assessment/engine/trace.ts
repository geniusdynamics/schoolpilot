// ABOUTME: Builders and replay for the assessment engine's explanation trace. Every node stores an
// ABOUTME: exact value and the operands it came from, so replaying a trace recomputes the number
// ABOUTME: from the marks rather than trusting the stored result.

import {
  HUNDRED,
  ONE,
  ZERO,
  compareExact,
  divideExact,
  formatExact,
  multiplyExact,
  parseExact,
  roundExact,
  sumExact,
  type Exact,
  type RoundingMode,
} from './exact';
import type {
  CombineOp,
  CombineTrace,
  ConstantTrace,
  FractionTrace,
  MarkStatus,
  MarkTrace,
  PercentTrace,
  RatioTrace,
  ReplayedSchemeTrace,
  RoundTrace,
  RoundingStage,
  ScaleTrace,
  SchemeTrace,
  SumTrace,
  TraceNode,
} from './types';
import { ROUNDING_MODES } from './exact';

/** A trace whose stored value disagrees with the value recomputed from its operands. */
export class TraceMismatchError extends Error {
  readonly path: string;
  readonly expected: string;
  readonly actual: string;

  constructor(path: string, expected: string, actual: string) {
    super(`trace mismatch at ${path}: recorded ${expected}, recomputed ${actual}`);
    this.name = 'TraceMismatchError';
    this.path = path;
    this.expected = expected;
    this.actual = actual;
  }
}

function readExact(path: string, text: string): Exact {
  const value = parseExact(text);
  if (value === null) {
    throw new TraceMismatchError(path, 'an exact decimal or fraction', text);
  }
  return value;
}

function check(path: string, recorded: string, recomputed: Exact): Exact {
  const expected = readExact(path, recorded);
  if (compareExact(expected, recomputed) !== 0) {
    throw new TraceMismatchError(path, formatExact(expected), formatExact(recomputed));
  }
  return expected;
}

// ------------------------------------------------------------------- builders

export function markTrace(params: {
  slot: string;
  assessment: string;
  component?: string;
  status: MarkStatus;
  entered: string;
  max: Exact;
}): MarkTrace {
  const value = readExact(`${params.assessment}.score`, params.entered);
  return {
    kind: 'mark',
    slot: params.slot,
    assessment: params.assessment,
    ...(params.component === undefined ? {} : { component: params.component }),
    status: params.status,
    entered: params.entered,
    max: formatExact(params.max),
    value: formatExact(value),
  };
}

export function zeroTrace(): ConstantTrace {
  return { kind: 'constant', reason: 'zero', value: '0' };
}

export function carriedTrace(score: Exact, maxScore: Exact): ConstantTrace {
  return {
    kind: 'constant',
    reason: 'carry_previous',
    value: formatExact(score),
    source: { score: formatExact(score), max_score: formatExact(maxScore) },
  };
}

export function fractionTrace(input: TraceNode, max: Exact): FractionTrace {
  const value = readExact('fraction.input', input.value);
  return {
    kind: 'fraction',
    input,
    max: formatExact(max),
    value: formatExact(divideExact(value, max)),
  };
}

export interface FractionPartInput {
  readonly key: string;
  readonly part: TraceNode;
  readonly weight: Exact;
}

/**
 * The one combine formula: the weighted mean of part fractions, expressed on the sum of the
 * weights. `sum` weights each part by its maximum so the result is the plain total; `mean` and
 * `best_of` weight equally; `weighted` modes use the weights the scheme declared.
 */
export function combineTrace(
  op: CombineOp,
  parts: readonly FractionPartInput[],
  options: { readonly bestOf?: number; readonly selected?: readonly string[] } = {}
): CombineTrace {
  const active =
    options.selected === undefined
      ? parts
      : parts.filter((part) => options.selected?.includes(part.key) === true);
  const max = sumExact(active.map((part) => part.weight));
  const value = sumExact(
    active.map((part) => multiplyExact(part.weight, readExact('combine.part', part.part.value)))
  );
  return {
    kind: 'combine',
    op,
    parts: parts.map((part) => ({
      key: part.key,
      part: part.part,
      weight: formatExact(part.weight),
    })),
    max: formatExact(max),
    ...(options.bestOf === undefined ? {} : { best_of: options.bestOf }),
    ...(options.selected === undefined ? {} : { selected: options.selected }),
    value: formatExact(value),
  };
}

export function scaleTrace(input: TraceNode, from: Exact, to: Exact): ScaleTrace {
  return {
    kind: 'scale',
    input,
    from: formatExact(from),
    to: formatExact(to),
    value: formatExact(divideExact(multiplyExact(readExact('scale.input', input.value), to), from)),
  };
}

export function sumTrace(parts: readonly TraceNode[]): SumTrace {
  const value = sumExact(parts.map((part) => readExact('sum.part', part.value)));
  return { kind: 'sum', parts, value: formatExact(value) };
}

export function ratioTrace(input: TraceNode, by: Exact, of: Exact): RatioTrace {
  const total = divideExact(readExact('ratio.input', input.value), by);
  return {
    kind: 'ratio',
    input,
    by: formatExact(by),
    of: formatExact(of),
    value: formatExact(multiplyExact(total, of)),
  };
}

export function roundTrace(
  input: TraceNode,
  stage: RoundingStage,
  precision: number,
  mode: RoundingMode,
  applied: boolean
): RoundTrace {
  const value = readExact('round.input', input.value);
  return {
    kind: 'round',
    input,
    stage,
    precision,
    mode,
    applied,
    value: formatExact(applied ? roundExact(value, precision, mode) : value),
  };
}

export function percentTrace(input: TraceNode, outOf: Exact): PercentTrace {
  const value = divideExact(readExact('percent.input', input.value), outOf);
  return {
    kind: 'percent',
    input,
    out_of: formatExact(outOf),
    value: formatExact(multiplyExact(value, HUNDRED)),
  };
}

// --------------------------------------------------------------------- replay

function sameKeys(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

function replayCombine(node: CombineTrace, path: string): Exact {
  const weights = node.parts.map((part, index) => readExact(`${path}.parts[${index}].weight`, part.weight));
  const values = node.parts.map((part, index) => replayNode(part.part, `${path}.parts[${index}]`));
  const active = node.parts
    .map((part, index) => ({ part, index }))
    .filter(({ part }) => node.selected === undefined || node.selected.includes(part.key));

  const max = sumExact(active.map(({ index }) => weights[index]));
  check(`${path}.max`, node.max, max);

  const value = sumExact(active.map(({ index }) => multiplyExact(weights[index], values[index])));
  check(`${path}.value`, node.value, value);

  if (node.op === 'sum') {
    node.parts.forEach((part, index) => {
      if (part.part.kind !== 'fraction') return;
      const partMax = readExact(`${path}.parts[${index}].part.max`, part.part.max);
      if (compareExact(weights[index], partMax) !== 0) {
        throw new TraceMismatchError(
          `${path}.parts[${index}].weight`,
          formatExact(partMax),
          formatExact(weights[index])
        );
      }
    });
  }
  if (node.op === 'mean') {
    weights.forEach((weight, index) => {
      if (compareExact(weight, ONE) !== 0) {
        throw new TraceMismatchError(`${path}.parts[${index}].weight`, '1', formatExact(weight));
      }
    });
  }
  if (node.op === 'best_of' && node.best_of !== undefined) {
    const ranked = node.parts
      .map((part, index) => ({ key: part.key, value: values[index] }))
      .sort((left, right) => {
        const order = compareExact(right.value, left.value);
        if (order !== 0) return order;
        return left.key < right.key ? -1 : left.key > right.key ? 1 : 0;
      })
      .slice(0, node.best_of);
    const winners = new Set(ranked.map((entry) => entry.key));
    const expected = node.parts.filter((part) => winners.has(part.key)).map((part) => part.key);
    if (!sameKeys(node.selected ?? [], expected)) {
      throw new TraceMismatchError(
        `${path}.selected`,
        `[${(node.selected ?? []).join(', ')}]`,
        `[${expected.join(', ')}]`
      );
    }
    if (node.selected === undefined) {
      throw new TraceMismatchError(`${path}.selected`, `[${expected.join(', ')}]`, 'nothing');
    }
  }
  return value;
}

/**
 * Recomputes a node's value from its operands and checks the recorded value against it.
 *
 * Throws `TraceMismatchError` naming the node that disagrees; a caller replaying a result it
 * produced never sees one, which is exactly what the property test asserts.
 */
export function replayNode(node: TraceNode, path = 'trace'): Exact {
  switch (node.kind) {
    case 'mark':
      return check(`${path}.value`, node.value, readExact(`${path}.entered`, node.entered));
    case 'constant': {
      const value = readExact(`${path}.value`, node.value);
      if (node.reason === 'zero') {
        if (compareExact(value, ZERO) !== 0) {
          throw new TraceMismatchError(`${path}.value`, '0', node.value);
        }
        return value;
      }
      if (node.source === undefined) {
        throw new TraceMismatchError(`${path}.source`, 'a carried score', 'nothing');
      }
      return check(`${path}.value`, node.value, readExact(`${path}.source.score`, node.source.score));
    }
    case 'fraction': {
      const value = readExact(`${path}.input`, node.input.value);
      const max = readExact(`${path}.max`, node.max);
      return check(`${path}.value`, node.value, divideExact(value, max));
    }
    case 'combine':
      return replayCombine(node, path);
    case 'scale': {
      const value = readExact(`${path}.input`, node.input.value);
      const from = readExact(`${path}.from`, node.from);
      const to = readExact(`${path}.to`, node.to);
      return check(`${path}.value`, node.value, divideExact(multiplyExact(value, to), from));
    }
    case 'sum': {
      const value = sumExact(node.parts.map((part, index) => replayNode(part, `${path}.parts[${index}]`)));
      return check(`${path}.value`, node.value, value);
    }
    case 'ratio': {
      const input = replayNode(node.input, `${path}.input`);
      const by = readExact(`${path}.by`, node.by);
      const of = readExact(`${path}.of`, node.of);
      return check(`${path}.value`, node.value, multiplyExact(divideExact(input, by), of));
    }
    case 'round': {
      if (!ROUNDING_MODES.includes(node.mode)) {
        throw new TraceMismatchError(`${path}.mode`, ROUNDING_MODES.join('|'), node.mode);
      }
      const input = replayNode(node.input, `${path}.input`);
      const value = node.applied ? roundExact(input, node.precision, node.mode) : input;
      return check(`${path}.value`, node.value, value);
    }
    case 'percent': {
      const input = replayNode(node.input, `${path}.input`);
      const outOf = readExact(`${path}.out_of`, node.out_of);
      return check(`${path}.value`, node.value, multiplyExact(divideExact(input, outOf), HUNDRED));
    }
  }
}

/** Finds the first node of a kind on the path from the root towards its operands. */
function findNode(node: TraceNode, kind: TraceNode['kind']): TraceNode | null {
  if (node.kind === kind) return node;
  const children: TraceNode[] =
    node.kind === 'sum'
      ? [...node.parts]
      : node.kind === 'combine'
        ? node.parts.map((part) => part.part)
        : 'input' in node
          ? [node.input]
          : [];
  for (const child of children) {
    const found = findNode(child, kind);
    if (found !== null) return found;
  }
  return null;
}

/**
 * Replays a whole result trace and returns the numbers it reproduces.
 *
 * Every slot fraction and contribution is recomputed from the marks, then the total and the
 * percentage; a stored number that disagrees with its operands raises `TraceMismatchError`.
 * The returned values equal the result's own when the engine produced the trace.
 */
export function replaySchemeTrace(trace: SchemeTrace): ReplayedSchemeTrace {
  const slots = new Map<string, { fraction: string | null; contribution: string | null }>();
  for (const slot of trace.slots) {
    if (slot.outcome !== 'counted') {
      if (slot.fraction !== null || slot.contribution !== null) {
        throw new TraceMismatchError(`trace.slots[${slot.slot}]`, 'no value', 'a value');
      }
      slots.set(slot.slot, { fraction: null, contribution: null });
      continue;
    }
    if (slot.fraction === null || slot.contribution === null || slot.weight === null) {
      throw new TraceMismatchError(`trace.slots[${slot.slot}]`, 'a fraction and contribution', 'nothing');
    }
    if (slot.combine !== null) replayNode(slot.combine, `trace.slots[${slot.slot}].combine`);
    const fraction = replayNode(slot.fraction, `trace.slots[${slot.slot}].fraction`);
    const contribution = replayNode(slot.contribution, `trace.slots[${slot.slot}].contribution`);
    const weight = readExact(`trace.slots[${slot.slot}].weight`, slot.weight);
    if (compareExact(contribution, multiplyExact(fraction, weight)) !== 0) {
      throw new TraceMismatchError(
        `trace.slots[${slot.slot}].contribution`,
        formatExact(multiplyExact(fraction, weight)),
        formatExact(contribution)
      );
    }
    slots.set(slot.slot, { fraction: formatExact(fraction), contribution: formatExact(contribution) });
  }

  const total = trace.total === null ? null : replayNode(trace.total, 'trace.total');
  const percent = trace.percent === null ? null : replayNode(trace.percent, 'trace.percent');

  const ratio = trace.total === null ? null : findNode(trace.total, 'ratio');
  if (ratio !== null && ratio.kind === 'ratio') {
    const of = readExact('trace.total.of', ratio.of);
    if (compareExact(of, readExact('trace.out_of', trace.out_of)) !== 0) {
      throw new TraceMismatchError('trace.out_of', ratio.of, trace.out_of);
    }
    const by = readExact('trace.total.by', ratio.by);
    if (compareExact(by, readExact('trace.counted_weight', trace.counted_weight)) !== 0) {
      throw new TraceMismatchError('trace.counted_weight', ratio.by, trace.counted_weight);
    }
  }
  if (trace.percent !== null && trace.percent.kind === 'percent') {
    const of = readExact('trace.percent.out_of', trace.percent.out_of);
    if (compareExact(of, readExact('trace.out_of', trace.out_of)) !== 0) {
      throw new TraceMismatchError('trace.out_of', trace.percent.out_of, trace.out_of);
    }
  }

  return {
    total: total === null ? null : formatExact(total),
    percent: percent === null ? null : formatExact(percent),
    slots,
  };
}
