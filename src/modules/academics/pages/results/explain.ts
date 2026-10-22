// ABOUTME: Turns an aggregate's own trace into the "Why this grade" answer: grouped steps, plain
// ABOUTME: labels, and the exact numbers the engine recorded - the page never explains a result it
// ABOUTME: recalculated itself.

import type {
  AggregateResult,
  AggregateTraceStep,
  CountPredicate,
  DivisorSource,
  SelectionDecision,
} from '@/domain/assessment/aggregation';
import { formatExact, multiplyExact, parseExact, sumExact, type Exact } from '@/domain/assessment/engine';
import type { ScaleBoundary, ScaleCheckTrace } from '@/domain/assessment/scales';

import { displayNumber } from './format';
import type { ExplanationStep, GradeExplanation } from './types';

type Labels = ReadonlyMap<string, string>;

function label(labels: Labels, code: string | null): string {
  if (code === null) return '—';
  return labels.get(code) ?? code;
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

// ------------------------------------------------------------------ selection

function constraintLines(
  groups: Extract<AggregateTraceStep, { kind: 'select' }>['groups'],
  labels: Labels
): string[] {
  const lines: string[] = [];
  for (const constraint of groups) {
    if ('require_all' in constraint) {
      lines.push(`Must include ${constraint.require_all.map((code) => label(labels, code)).join(', ')}.`);
    } else if ('group' in constraint) {
      lines.push(`At least ${constraint.min} from ${constraint.group}.`);
    } else {
      lines.push('The remaining places go to the highest results.');
    }
  }
  return lines;
}

function selectionReason(decision: SelectionDecision, labels: Labels): string {
  switch (decision.reason) {
    case 'required':
      return 'Required area';
    case 'group_minimum':
      return 'Fills a group minimum';
    case 'fill':
      return 'One of the highest remaining';
    case 'missing_value':
      return 'No result to count';
    case 'lower_value':
      return `Lower than ${label(labels, decision.lost_to)}`;
    case 'slots_full':
      return 'All places were already filled';
  }
}

function selectStep(
  step: Extract<AggregateTraceStep, { kind: 'select' }>,
  labels: Labels
): ExplanationStep {
  const kept = step.decisions.filter((decision) => decision.selected);
  return {
    kind: 'select',
    title: `Best ${step.n} of ${step.decisions.length} learning areas`,
    summary: `Kept ${kept.map((decision) => label(labels, decision.code)).join(', ') || 'none'}; their values add up to ${displayNumber(step.value)}.`,
    lines: [
      `${kept.length} of ${step.decisions.length} learning areas were kept. A tie is always broken the same way: the higher value first, then the lower code.`,
      ...constraintLines(step.groups, labels),
    ],
    table: {
      caption: 'Every candidate, and why it was kept or dropped',
      headers: ['Learning area', 'Value', 'Decision', 'Why'],
      rows: step.decisions.map((decision) => [
        label(labels, decision.code),
        decision.value === null ? 'no result' : displayNumber(decision.value),
        decision.selected ? 'Kept' : 'Dropped',
        selectionReason(decision, labels),
      ]),
    },
  };
}

// -------------------------------------------------------------------- combine

const DIVISOR_LABEL: Readonly<Record<DivisorSource, string>> = {
  declared: 'the divisor the aggregation declares',
  sum_of_multipliers: 'the total of the multipliers applied',
  count: 'the number of learning areas counted',
  one: 'a total is not divided',
  weights: 'the total weight',
};

function contribution(value: string, weight: string): string {
  const left = parseExact(value);
  const right = parseExact(weight);
  if (left === null || right === null) return '—';
  return displayNumber(formatExact(multiplyExact(left, right)));
}

function weightedNumerator(
  parts: readonly { readonly multiplied: string; readonly weight: string }[]
): string | null {
  const products: Exact[] = [];
  for (const part of parts) {
    const value = parseExact(part.multiplied);
    const weight = parseExact(part.weight);
    if (value === null || weight === null) return null;
    products.push(multiplyExact(value, weight));
  }
  if (products.length === 0) return '0';
  return formatExact(sumExact(products));
}

function combineStep(
  step: Extract<AggregateTraceStep, { kind: 'mean' | 'sum' | 'weighted_mean' }>,
  subtotal: string | null,
  afterSelection: boolean,
  labels: Labels
): ExplanationStep {
  const title =
    step.kind === 'weighted_mean'
      ? 'Weighted mean of the learning areas'
      : step.kind === 'mean'
        ? afterSelection
          ? 'Average of the selected learning areas'
          : 'Mean of the learning areas'
        : 'Total of the learning areas';

  const lines: string[] = [];
  if (step.kind === 'weighted_mean') {
    const numerator = weightedNumerator(step.parts);
    lines.push(
      `Each counted value is multiplied by its weight and the products are added: ${numerator === null ? '—' : displayNumber(numerator)} ÷ ${displayNumber(step.divisor)} = ${displayNumber(step.value)}.`
    );
    lines.push(`The weights add up to ${displayNumber(step.max)}.`);
  } else {
    const total = subtotal ?? '—';
    lines.push(
      step.divisor === '1'
        ? `${displayNumber(total)} = ${displayNumber(step.value)}.`
        : `${displayNumber(total)} ÷ ${displayNumber(step.divisor)} = ${displayNumber(step.value)}.`
    );
  }
  lines.push(`Divided by ${displayNumber(step.divisor)} — ${DIVISOR_LABEL[step.divisor_from]}.`);

  const table =
    step.kind === 'weighted_mean'
      ? {
          caption: 'Every value the aggregate counted, with its multiplier and weight',
          headers: ['Learning area', 'Value', '× multiplier', 'Counted', '× weight', 'Contribution'],
          rows: step.parts.map((part) => [
            label(labels, part.code),
            displayNumber(part.value),
            `× ${part.multiplier}`,
            displayNumber(part.multiplied),
            `× ${part.weight}`,
            contribution(part.multiplied, part.weight),
          ]),
        }
      : {
          caption: 'Every value the aggregate counted, with its multiplier',
          headers: ['Learning area', 'Value', '× multiplier', 'Counted'],
          rows: step.parts.map((part) => [
            label(labels, part.code),
            displayNumber(part.value),
            `× ${part.multiplier}`,
            displayNumber(part.multiplied),
          ]),
        };

  return {
    kind: step.kind,
    title,
    summary: `Counted ${step.parts.length} ${plural(step.parts.length, 'learning area', 'learning areas')}.`,
    lines,
    table,
  };
}

// --------------------------------------------------------------------- round

const MODE_LABEL: Readonly<Record<string, string>> = {
  half_up: 'half up',
  half_down: 'half down',
  half_even: 'half to even',
  up: 'up',
  down: 'down',
};

function roundStep(step: Extract<AggregateTraceStep, { kind: 'round' }>): ExplanationStep {
  const places = plural(step.precision, 'decimal place', 'decimal places');
  return {
    kind: 'round',
    title: 'Rounded once, after the arithmetic',
    summary: null,
    lines: [
      `${step.input} rounded to ${step.precision} ${places} (${MODE_LABEL[step.mode] ?? step.mode}) = ${step.value}.`,
    ],
    table: null,
  };
}

// -------------------------------------------------------------------- lookup

const BOUNDARY_TEXT: Readonly<Record<ScaleBoundary, string>> = {
  lower: 'on its lower boundary',
  upper: 'on its upper boundary',
  inside: 'inside the band',
  none: 'outside every band',
};

const SOURCE_TEXT: Readonly<Record<string, string>> = {
  percent: 'learning-area percentage',
  total: 'rounded total',
  exact_total: 'total before rounding',
  given: 'aggregate value',
};

function checkVerdict(check: ScaleCheckTrace): string {
  if (check.matched) return 'matched';
  if (check.lower_ok && !check.upper_ok) return 'score is above it';
  if (!check.lower_ok && check.upper_ok) return 'score is below it';
  return 'outside it';
}

function lookupStep(step: Extract<AggregateTraceStep, { kind: 'lookup' }>): ExplanationStep {
  const matched = step.lookup.checks.find((check) => check.matched);
  return {
    kind: 'lookup',
    title: 'Placed on the grading scale',
    summary: step.lookup.band === null ? 'No band matched.' : `Awarded ${step.lookup.band}.`,
    lines: [
      `${displayNumber(step.input)} was looked up in the grading scale ${step.lookup.scale} (${step.lookup.kind}), which reads the ${SOURCE_TEXT[step.lookup.source] ?? step.lookup.source}.`,
      matched === undefined
        ? `No band of the scale covers ${step.lookup.score}.`
        : `It fell in ${step.lookup.band}: ${matched.min} to ${matched.max}, and the score is ${BOUNDARY_TEXT[step.lookup.boundary]}. A band's upper bound is ${step.lookup.upper === 'inclusive' ? 'included' : 'excluded'}.`,
    ],
    table: {
      caption: 'Every band the scale checked',
      headers: ['Band', 'From', 'To', 'Result'],
      rows: step.lookup.checks.map((check) => [check.band, check.min, check.max, checkVerdict(check)]),
    },
  };
}

// ------------------------------------------------------------------- fail_if

function capStep(
  step: Extract<AggregateTraceStep, { kind: 'fail_if' }>,
  labels: Labels
): ExplanationStep {
  const watched = step.watched.map((code) => label(labels, code));
  const trigger = step.trigger.map((code) => label(labels, code));
  const rule = step.rule;
  const lines = [
    `The rule caps the award at ${rule.then_max_division} when ${rule.in === undefined ? 'a counted learning area' : watched.join(', ')} carries ${rule.any_grade}.`,
    step.fired
      ? `It fired: ${trigger.join(', ')} carries ${rule.any_grade}. ${step.awarded ?? 'No band'} was capped to ${step.capped ?? 'no band'}.`
      : `It did not fire: none of ${watched.join(', ') || 'the watched learning areas'} carries ${rule.any_grade}, so the award stands.`,
    `Band order used for the cap, best first: ${step.order.join(' > ')}.`,
  ];
  if (rule.source !== undefined) lines.push(`Source: ${rule.source}`);
  return {
    kind: 'fail_if',
    title: 'National rule (fail_if)',
    summary: step.fired ? `Capped at ${rule.then_max_division}.` : 'Watched, and did not fire.',
    lines,
    table: {
      caption: 'The learning areas the rule watched',
      headers: ['Learning area', 'Grade', 'Matches the rule'],
      rows: step.watched.map((code) => [
        label(labels, code),
        step.trigger.includes(code) ? rule.any_grade : '—',
        step.trigger.includes(code) ? 'yes' : 'no',
      ]),
    },
  };
}

// ------------------------------------------------------------ count / profile

function predicateText(predicate: CountPredicate): string {
  switch (predicate.op) {
    case 'eq':
      return `= ${predicate.value ?? ''}`;
    case 'in':
      return `one of ${(predicate.values ?? []).join(', ')}`;
    case 'gte':
      return `at least ${predicate.value ?? ''}`;
    case 'gt':
      return `more than ${predicate.value ?? ''}`;
    case 'lte':
      return `at most ${predicate.value ?? ''}`;
    case 'lt':
      return `less than ${predicate.value ?? ''}`;
  }
}

function countStep(
  step: Extract<AggregateTraceStep, { kind: 'count' }>,
  labels: Labels
): ExplanationStep {
  return {
    kind: 'count',
    title: 'Counted learning areas that meet the rule',
    summary: `${step.value} of ${step.parts.length}.`,
    lines: [`${step.value} of ${step.parts.length} learning areas meet the rule (${predicateText(step.predicate)}).`],
    table: {
      caption: 'Every learning area the rule was tested against',
      headers: ['Learning area', 'Value', 'Meets the rule'],
      rows: step.parts.map((part) => [
        label(labels, part.code),
        part.value ?? 'no value',
        part.matched ? 'yes' : 'no',
      ]),
    },
  };
}

function profileStep(
  step: Extract<AggregateTraceStep, { kind: 'profile' }>,
  labels: Labels
): ExplanationStep {
  const levels = step.counts.filter((count) => count.count > 0).length;
  return {
    kind: 'profile',
    title: 'Distribution of rubric levels',
    summary: `${step.parts.length} learning areas across ${levels} ${plural(levels, 'level', 'levels')}.`,
    lines: [
      `${step.parts.length} ${plural(step.parts.length, 'learning area was', 'learning areas were')} counted.`,
    ],
    table: {
      caption: 'How many learning areas carry each level',
      headers: ['Level', 'Learning areas'],
      rows: step.counts.map((count) => [count.label ?? label(labels, count.level), String(count.count)]),
    },
  };
}

// ------------------------------------------------------------------- headline

const OP_WORD: Readonly<Record<string, string>> = {
  sum: 'Total',
  mean: 'Mean',
  weighted_mean: 'Weighted mean',
  best_n: 'Best',
  points_mean: 'Mean points',
  sum_points: 'Total points',
  gpa: 'Grade-point average',
  count_where: 'Count',
  rubric_profile: 'Distribution',
};

function headlineOf(result: AggregateResult): string {
  const steps = result.trace.steps;
  const select = steps.find((step): step is Extract<AggregateTraceStep, { kind: 'select' }> => step.kind === 'select');
  const combine = steps.find(
    (step): step is Extract<AggregateTraceStep, { kind: 'mean' | 'sum' | 'weighted_mean' }> =>
      step.kind === 'mean' || step.kind === 'sum' || step.kind === 'weighted_mean'
  );
  const count = steps.find((step): step is Extract<AggregateTraceStep, { kind: 'count' }> => step.kind === 'count');
  const profile = steps.find(
    (step): step is Extract<AggregateTraceStep, { kind: 'profile' }> => step.kind === 'profile'
  );
  const cap = steps.find((step): step is Extract<AggregateTraceStep, { kind: 'fail_if' }> => step.kind === 'fail_if');

  if (count !== undefined) {
    return `${count.value} of ${count.parts.length} learning areas meet the rule (${predicateText(count.predicate)}).`;
  }
  if (profile !== undefined) {
    const levels = profile.counts.filter((entry) => entry.count > 0).length;
    return `${profile.parts.length} learning areas spread across ${levels} ${plural(levels, 'level', 'levels')}.`;
  }
  if (result.value === null) {
    return 'No grade yet — the aggregate is not complete.';
  }

  const expression: string[] = [];
  if (select !== undefined) {
    const counted = combine?.parts.map((part) => displayNumber(part.multiplied)) ?? [];
    const values =
      counted.length > 0
        ? counted
        : select.decisions
            .filter((decision) => decision.selected)
            .map((decision) => (decision.value === null ? '—' : displayNumber(decision.value)));
    expression.push(
      `Best ${select.n} of ${select.decisions.length}: ${values.join(' + ')} = ${displayNumber(result.subtotal ?? select.value)}`
    );
  } else if (combine !== undefined && combine.kind === 'weighted_mean') {
    expression.push(`${OP_WORD[result.op] ?? result.op}: Σ value × weight`);
  } else if (result.subtotal !== null) {
    expression.push(`${OP_WORD[result.op] ?? result.op}: ${displayNumber(result.subtotal)}`);
  } else {
    expression.push(`${OP_WORD[result.op] ?? result.op} of ${combine?.parts.length ?? 0} learning areas`);
  }

  if (combine !== undefined && combine.divisor !== '1') {
    expression.push(`÷ ${displayNumber(combine.divisor)}`);
  }
  const value = displayNumber(result.value);
  if (!(expression.length === 1 && expression[0] === value)) {
    expression.push(`= ${value}`);
  }

  if (result.grade !== null) {
    const band = result.grade;
    expression.push(band.label === band.band ? `→ ${band.band}` : `→ ${band.band} (${band.label})`);
  }
  if (cap !== undefined && cap.fired && cap.capped !== cap.awarded) {
    expression.push(`capped from ${cap.awarded ?? '—'} to ${cap.capped ?? '—'}`);
  }
  return expression.join(' ');
}

// ---------------------------------------------------------------------- entry

/** The "Why this grade" answer for one evaluated aggregate. */
export function explainAggregate(result: AggregateResult, labels: Labels): GradeExplanation {
  const steps: ExplanationStep[] = [];
  let afterSelection = false;
  for (const step of result.trace.steps) {
    if (step.kind === 'select') {
      steps.push(selectStep(step, labels));
      afterSelection = true;
      continue;
    }
    if (step.kind === 'mean' || step.kind === 'sum' || step.kind === 'weighted_mean') {
      steps.push(combineStep(step, result.subtotal, afterSelection, labels));
      continue;
    }
    if (step.kind === 'round') {
      steps.push(roundStep(step));
      continue;
    }
    if (step.kind === 'lookup') {
      steps.push(lookupStep(step));
      continue;
    }
    if (step.kind === 'fail_if') {
      steps.push(capStep(step, labels));
      continue;
    }
    if (step.kind === 'count') {
      steps.push(countStep(step, labels));
      continue;
    }
    steps.push(profileStep(step, labels));
  }

  return {
    headline: headlineOf(result),
    steps,
    bandCode: result.grade?.band ?? null,
    bandLabel: result.grade?.label ?? null,
  };
}
