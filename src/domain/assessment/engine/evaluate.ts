// ABOUTME: The scheme evaluator: turns a learner's marks into exact slot and learning-area values,
// ABOUTME: applying the missing policy, the component and slot combines, and the declared
// ABOUTME: rounding, and returns the typed trace that explains every number.

import {
  ONE,
  ZERO,
  compareExact,
  divideExact,
  formatExact,
  multiplyExact,
  parseExact,
  sumExact,
  type Exact,
} from './exact';
import {
  prepareEvaluation,
  type PreparedCarry,
  type PreparedRounding,
  type PreparedScheme,
  type PreparedSlot,
} from './prepare';
import {
  carriedTrace,
  combineTrace,
  fractionTrace,
  markTrace,
  percentTrace,
  ratioTrace,
  roundTrace,
  scaleTrace,
  sumTrace,
  zeroTrace,
} from './trace';
import type {
  EngineFlag,
  MarkStatus,
  MissingDecision,
  MissingPolicy,
  PartDecision,
  RoundingRecord,
  SchemeEvaluation,
  SchemeEvaluationInput,
  SchemeMark,
  SchemeResult,
  SchemeStatus,
  SlotCombine,
  SlotOutcome,
  SlotPartTrace,
  SlotResult,
  SlotTrace,
  TraceNode,
} from './types';

/** The node a slot's parts combine into; kept local to the slot builder's parameters. */
type CombineNode = Extract<TraceNode, { kind: 'combine' }>;

interface ResolvedMark {
  readonly mark: SchemeMark;
  readonly decision: 'counted' | 'exempt' | 'dropped';
  readonly status: MarkStatus;
  readonly score: Exact | null;
  readonly max: Exact | null;
  readonly trace: TraceNode | null;
  readonly missing: MissingDecision | null;
}

interface AssessmentOutcome {
  readonly assessment: string;
  readonly decision: PartDecision;
  readonly status: MarkStatus;
  readonly score: Exact | null;
  readonly max: Exact | null;
  readonly fraction: Exact | null;
  readonly fractionNode: TraceNode | null;
  readonly scoreNode: TraceNode | null;
  readonly missing: readonly MissingDecision[];
  readonly flags: readonly EngineFlag[];
  readonly incomplete: boolean;
}

interface SlotEvaluationBase {
  readonly result: SlotResult;
  readonly trace: SlotTrace;
  readonly incomplete: boolean;
  readonly flags: readonly EngineFlag[];
}

interface CountedSlotEvaluation extends SlotEvaluationBase {
  readonly counted: true;
  readonly weight: Exact;
  readonly fraction: Exact;
  readonly contribution: Exact;
  readonly contributionNode: TraceNode;
}

interface UncountedSlotEvaluation extends SlotEvaluationBase {
  readonly counted: false;
}

type SlotEvaluation = CountedSlotEvaluation | UncountedSlotEvaluation;

const isCountedSlot = (evaluation: SlotEvaluation): evaluation is CountedSlotEvaluation =>
  evaluation.counted;

function exactOf(text: string): Exact {
  const value = parseExact(text);
  if (value === null) {
    throw new Error(`the assessment engine prepared a value it cannot parse: ${JSON.stringify(text)}`);
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** The keys of the `count` largest fractions, in the order the parts were declared. */
function bestKeys(
  parts: readonly { readonly key: string; readonly value: Exact }[],
  count: number
): string[] {
  const winners = new Set(
    [...parts]
      .sort((left, right) => compareExact(right.value, left.value) || compareText(left.key, right.key))
      .slice(0, count)
      .map((part) => part.key)
  );
  return parts.filter((part) => winners.has(part.key)).map((part) => part.key);
}

// ------------------------------------------------------------------ evaluation

/** The evaluation of one scheme against one learner's marks. Deterministic and side-effect free. */
export function evaluateScheme(input: SchemeEvaluationInput): SchemeEvaluation {
  const preparation = prepareEvaluation(input);
  if (!preparation.ok) return { ok: false, issues: preparation.issues };

  return { ok: true, result: evaluatePrepared(preparation.value.prepared, preparation.value.marks) };
}

function evaluatePrepared(
  prepared: PreparedScheme,
  marks: readonly { readonly index: number; readonly mark: SchemeMark }[]
): SchemeResult {
  const marksBySlot = new Map<string, SchemeMark[]>();
  for (const { mark } of marks) {
    const slotMarks = marksBySlot.get(mark.slot) ?? [];
    slotMarks.push(mark);
    marksBySlot.set(mark.slot, slotMarks);
  }

  const evaluations = prepared.included.map((slot) =>
    evaluateSlot(prepared, slot, marksBySlot.get(slot.code) ?? [])
  );

  const counted = evaluations.filter(isCountedSlot);
  const total = evaluateTotal(prepared, counted);
  const status = resultStatus(evaluations, counted);
  const flags = evaluations.flatMap((evaluation) => evaluation.flags);

  return {
    scheme: { code: prepared.code, version: prepared.version },
    status,
    total: total.total,
    exact_total: total.exactTotal,
    out_of: total.outOf,
    percent: total.percent,
    rounding: total.rounding,
    slots: evaluations.map((evaluation) => evaluation.result),
    flags,
    trace: {
      scheme_code: prepared.code,
      scheme_version: prepared.version,
      slots: evaluations.map((evaluation) => evaluation.trace),
      total: total.totalNode,
      percent: total.percentNode,
      out_of: total.outOf,
      counted_weight: total.countedWeight,
      declared_weight: formatExact(
        sumExact(prepared.included.map((slot) => slot.weight))
      ),
    },
  };
}

function resultStatus(
  evaluations: readonly SlotEvaluation[],
  counted: readonly CountedSlotEvaluation[]
): SchemeStatus {
  if (counted.length === 0) {
    const allExempt =
      evaluations.length > 0 && evaluations.every((evaluation) => evaluation.result.outcome === 'exempt');
    return allExempt ? 'exempt' : 'incomplete';
  }
  const incomplete = evaluations.some((evaluation) => evaluation.incomplete);
  return incomplete ? 'incomplete' : 'complete';
}

// ------------------------------------------------------------------------ slots

function evaluateSlot(
  prepared: PreparedScheme,
  slot: PreparedSlot,
  marks: readonly SchemeMark[]
): SlotEvaluation {
  const policy = prepared.missing.get(slot.code) ?? prepared.defaultMissing;
  const carried = prepared.carry.get(slot.code);

  if (marks.length === 0) {
    if (slot.optional) {
      return uncountedEvaluation(slot, 'optional_absent', null, [], [], [
        { code: 'optional_slot_absent', slot: slot.code },
      ]);
    }
    return applySlotPolicy(slot, policy, carried, [], [], [], false, prepared.rounding.get('slot'));
  }

  const groups = groupMarks(marks);
  const outcomes = groups.map((group) => resolveAssessment(slot, group, policy, carried, prepared));
  const parts = outcomes.map(toSlotPart);
  const missing = outcomes.flatMap((outcome) => outcome.missing);
  const flags = outcomes.flatMap((outcome) => outcome.flags);
  const counted = outcomes.filter(
    (outcome): outcome is AssessmentOutcome & { score: Exact; max: Exact; fraction: Exact; fractionNode: TraceNode } =>
      outcome.score !== null && outcome.max !== null && outcome.fraction !== null && outcome.fractionNode !== null
  );

  if (counted.length === 0) {
    const allExempt = outcomes.length > 0 && outcomes.every((outcome) => outcome.decision === 'exempt');
    if (allExempt) {
      return uncountedEvaluation(slot, 'exempt', null, parts, missing, flags);
    }
    return applySlotPolicy(slot, policy, carried, parts, missing, flags, true, prepared.rounding.get('slot'));
  }

  return countedSlot(
    prepared,
    slot,
    counted,
    parts,
    missing,
    flags,
    outcomes.some((outcome) => outcome.incomplete)
  );
}

function groupMarks(marks: readonly SchemeMark[]): readonly (readonly SchemeMark[])[] {
  const groups = new Map<string, SchemeMark[]>();
  for (const mark of marks) {
    const group = groups.get(mark.assessment) ?? [];
    group.push(mark);
    groups.set(mark.assessment, group);
  }
  return [...groups.values()];
}

function resolveAssessment(
  slot: PreparedSlot,
  marks: readonly SchemeMark[],
  policy: MissingPolicy,
  carried: PreparedCarry | undefined,
  prepared: PreparedScheme
): AssessmentOutcome {
  const resolved = marks.map((mark) => resolveMark(mark, slot, policy, carried));
  const missing = resolved.flatMap((entry) => (entry.missing === null ? [] : [entry.missing]));
  const flags = resolved.flatMap((entry) => flagsForMark(slot.code, entry));
  const incomplete = resolved.some(
    (entry) => entry.missing?.applied === 'incomplete' || entry.missing?.applied === 'carry_unavailable'
  );
  const counted = resolved.filter(
    (entry): entry is ResolvedMark & { score: Exact; max: Exact; trace: TraceNode } =>
      entry.score !== null && entry.max !== null && entry.trace !== null
  );
  const assessment = marks[0]?.assessment ?? '';
  const status = resolved[0]?.mark.status ?? 'present';

  if (counted.length === 0) {
    return {
      assessment,
      decision: resolved.every((entry) => entry.decision === 'exempt') ? 'exempt' : 'dropped',
      status,
      score: null,
      max: null,
      fraction: null,
      fractionNode: null,
      scoreNode: null,
      missing,
      flags,
      incomplete,
    };
  }

  const usesComponents = marks.length > 1 || marks.some((mark) => mark.component !== undefined);
  if (!usesComponents) {
    const only = counted[0];
    return {
      assessment,
      decision: 'counted',
      status,
      score: only.score,
      max: only.max,
      fraction: divideExact(only.score, only.max),
      fractionNode: fractionTrace(only.trace, only.max),
      scoreNode: only.trace,
      missing,
      flags,
      incomplete,
    };
  }

  return combineAssessment(
    prepared,
    assessment,
    status,
    counted,
    missing,
    flags,
    incomplete
  );
}

function combineAssessment(
  prepared: PreparedScheme,
  assessment: string,
  status: MarkStatus,
  counted: readonly (ResolvedMark & { score: Exact; max: Exact; trace: TraceNode })[],
  missing: readonly MissingDecision[],
  flags: readonly EngineFlag[],
  incomplete: boolean
): AssessmentOutcome {
  const policy = prepared.componentPolicy;
  const mode = policy?.papers ?? 'sum';
  const weights = policy?.weights;
  const outOf = policy?.outOf ?? null;
  const parts = counted.map((entry) => ({
    key: entry.mark.component ?? entry.mark.assessment,
    value: divideExact(entry.score, entry.max),
    weight: weights?.get(entry.mark.component ?? '') ?? entry.max,
    node: fractionTrace(entry.trace, entry.max),
  }));
  const bestOf = mode === 'best_of' ? policy?.bestOf ?? 1 : undefined;
  const selected = bestOf === undefined ? undefined : bestKeys(parts, bestOf);
  const combined = combineTrace(
    mode,
    parts.map((part) => ({ key: part.key, part: part.node, weight: part.weight })),
    { ...(bestOf === undefined ? {} : { bestOf }), ...(selected === undefined ? {} : { selected }) }
  );
  const combinedMax = exactOf(combined.max);
  const scored = outOf === null ? combined : scaleTrace(combined, combinedMax, outOf);
  const max = outOf ?? combinedMax;
  const score = exactOf(scored.value);

  return {
    assessment,
    decision: 'counted',
    status,
    score,
    max,
    fraction: divideExact(score, max),
    fractionNode: fractionTrace(scored, max),
    scoreNode: scored,
    missing,
    flags,
    incomplete,
  };
}

function resolveMark(
  mark: SchemeMark,
  slot: PreparedSlot,
  policy: MissingPolicy,
  carried: PreparedCarry | undefined
): ResolvedMark {
  if (mark.status === 'exempt') {
    return { mark, decision: 'exempt', status: mark.status, score: null, max: null, trace: null, missing: null };
  }

  if (mark.status === 'present' && mark.score !== undefined && mark.max_score !== undefined) {
    const score = exactOf(mark.score);
    const max = exactOf(mark.max_score);
    return {
      mark,
      decision: 'counted',
      status: mark.status,
      score,
      max,
      trace: markTrace({
        slot: slot.code,
        assessment: mark.assessment,
        ...(mark.component === undefined ? {} : { component: mark.component }),
        status: mark.status,
        entered: mark.score,
        max,
      }),
      missing: null,
    };
  }

  const decision = (applied: MissingDecision['applied']): MissingDecision => ({
    assessment: mark.assessment,
    component: mark.component ?? null,
    status: mark.status,
    policy,
    applied,
  });

  switch (policy) {
    case 'zero': {
      const max = mark.max_score === undefined ? ONE : exactOf(mark.max_score);
      return {
        mark,
        decision: 'counted',
        status: mark.status,
        score: ZERO,
        max,
        trace: zeroTrace(),
        missing: decision('zero'),
      };
    }
    case 'exclude':
      return { mark, decision: 'dropped', status: mark.status, score: null, max: null, trace: null, missing: decision('excluded') };
    case 'incomplete':
      return { mark, decision: 'dropped', status: mark.status, score: null, max: null, trace: null, missing: decision('incomplete') };
    case 'carry_previous': {
      const previous = carriedValueFor(mark, slot, carried);
      if (previous === null) {
        return {
          mark,
          decision: 'dropped',
          status: mark.status,
          score: null,
          max: null,
          trace: null,
          missing: decision('carry_unavailable'),
        };
      }
      return {
        mark,
        decision: 'counted',
        status: mark.status,
        score: previous.score,
        max: previous.max,
        trace: carriedTrace(previous.score, previous.max),
        missing: decision('carried'),
      };
    }
  }
}

function carriedValueFor(
  mark: SchemeMark,
  slot: PreparedSlot,
  carried: PreparedCarry | undefined
): { readonly score: Exact; readonly max: Exact } | null {
  if (carried === undefined) return null;
  if (mark.component !== undefined) {
    return carried.components.get(mark.component) ?? null;
  }
  // The slot-level value describes the whole slot, so it only stands in for a single
  // assessment; a multi slot would need a value per assessment.
  if (slot.multi) return null;
  return { score: carried.raw, max: carried.max };
}

function flagsForMark(slot: string, entry: ResolvedMark): EngineFlag[] {
  const base = {
    slot,
    assessment: entry.mark.assessment,
    ...(entry.mark.component === undefined ? {} : { component: entry.mark.component }),
  };
  if (entry.decision === 'exempt') return [{ code: 'exempt', ...base }];
  if (entry.missing === null) return [];

  const flags: EngineFlag[] = [];
  switch (entry.missing.applied) {
    case 'zero':
    case 'excluded':
    case 'incomplete':
      flags.push({ code: 'mark_missing', ...base });
      break;
    case 'carried':
      flags.push({ code: 'carried_previous', ...base });
      break;
    case 'carry_unavailable':
      flags.push({ code: 'mark_missing', ...base }, { code: 'carry_unavailable', ...base });
      break;
  }
  if (entry.missing.status === 'malpractice') flags.push({ code: 'malpractice', ...base });
  return flags;
}

function toSlotPart(outcome: AssessmentOutcome): SlotPartTrace {
  return {
    assessment: outcome.assessment,
    decision: outcome.decision,
    status: outcome.status,
    score: outcome.score === null ? null : formatExact(outcome.score),
    max: outcome.max === null ? null : formatExact(outcome.max),
    fraction: outcome.fraction === null ? null : formatExact(outcome.fraction),
    trace: outcome.scoreNode,
  };
}

// -------------------------------------------------------------- slot policies

/**
 * A slot with nothing usable: its policy decides what stands in.
 *
 * `zero` counts the slot as zero, `exclude` leaves it out and the remaining slots keep the
 * total, `incomplete` leaves it out and flags the result, and `carry_previous` uses the value
 * recorded for the slot in the previous period.
 */
function applySlotPolicy(
  slot: PreparedSlot,
  policy: MissingPolicy,
  carried: PreparedCarry | undefined,
  parts: readonly SlotPartTrace[],
  missing: readonly MissingDecision[],
  flags: readonly EngineFlag[],
  hadMarks = false,
  slotRounding: PreparedRounding | undefined = undefined
): SlotEvaluation {
  const slotFlags = (): EngineFlag[] => {
    if (hadMarks) return [...flags];
    switch (policy) {
      case 'zero':
      case 'exclude':
      case 'incomplete':
        return [...flags, { code: 'mark_missing', slot: slot.code }];
      case 'carry_previous':
        return [...flags, { code: 'mark_missing', slot: slot.code }, { code: 'carry_unavailable', slot: slot.code }];
    }
  };

  switch (policy) {
    case 'zero': {
      const fractionNode = zeroTrace();
      const contributionNode = scaleTrace(fractionNode, ONE, slot.weight);
      return countedEvaluation(slot, parts, missing, slotFlags(), null, fractionNode, contributionNode, ZERO, null, false);
    }
    case 'exclude':
      return uncountedEvaluation(slot, 'excluded', policy, parts, missing, flags);
    case 'incomplete':
      return {
        ...uncountedEvaluation(slot, 'excluded', policy, parts, missing, slotFlags()),
        incomplete: true,
      };
    case 'carry_previous': {
      if (carried === undefined) {
        return {
          ...uncountedEvaluation(slot, 'excluded', policy, parts, missing, slotFlags()),
          incomplete: true,
        };
      }
      const carriedNode = carriedTrace(carried.raw, carried.max);
      const rule = slotRule(slotRounding, carriedNode);
      const scored = rule.node;
      const fractionNode = fractionTrace(scored, carried.max);
      const contributionNode = scaleTrace(fractionNode, ONE, slot.weight);
      return countedEvaluation(
        slot,
        parts,
        missing,
        [...flags, { code: 'carried_previous', slot: slot.code }],
        null,
        fractionNode,
        contributionNode,
        scoreOf(fractionNode),
        rule.record,
        false
      );
    }
  }
}

function slotRule(
  rule: PreparedRounding | undefined,
  node: TraceNode
): { node: TraceNode; record: RoundingRecord | null } {
  if (rule === undefined) return { node, record: null };
  const rounded = roundTrace(node, 'slot', rule.precision, rule.mode, true);
  return {
    node: rounded,
    record: {
      stage: 'slot',
      precision: rule.precision,
      mode: rule.mode,
      input: node.value,
      output: rounded.value,
    },
  };
}

function countedSlot(
  prepared: PreparedScheme,
  slot: PreparedSlot,
  counted: readonly (AssessmentOutcome & { score: Exact; max: Exact; fraction: Exact; fractionNode: TraceNode })[],
  parts: readonly SlotPartTrace[],
  missing: readonly MissingDecision[],
  flags: readonly EngineFlag[],
  incomplete: boolean
): SlotEvaluation {
  const mode: SlotCombine = slot.multi ? slot.combine : 'sum';
  const bestOf = mode === 'best_of' ? slot.bestOf ?? 1 : undefined;
  const combineParts = counted.map((outcome) => ({
    key: outcome.assessment,
    value: outcome.fraction,
    weight: mode === 'sum' ? outcome.max : ONE,
    node: outcome.fractionNode,
  }));
  const selected = bestOf === undefined ? undefined : bestKeys(combineParts, bestOf);
  const combine = combineTrace(
    mode,
    combineParts.map((part) => ({ key: part.key, part: part.node, weight: part.weight })),
    { ...(bestOf === undefined ? {} : { bestOf }), ...(selected === undefined ? {} : { selected }) }
  );
  const rule = slotRule(prepared.rounding.get('slot'), combine);
  const fractionNode = fractionTrace(rule.node, exactOf(combine.max));
  const fraction = scoreOf(fractionNode);
  const contributionNode = scaleTrace(fractionNode, ONE, slot.weight);
  const policy = preparedPolicy(missing);

  return countedEvaluation(
    slot,
    parts,
    missing,
    flags,
    combine,
    fractionNode,
    contributionNode,
    fraction,
    rule.record,
    incomplete,
    policy
  );
}

function preparedPolicy(missing: readonly MissingDecision[]): MissingPolicy | null {
  return missing[0]?.policy ?? null;
}

// ----------------------------------------------------------------- slot result

function countedEvaluation(
  slot: PreparedSlot,
  parts: readonly SlotPartTrace[],
  missing: readonly MissingDecision[],
  flags: readonly EngineFlag[],
  combine: CombineNode | null,
  fractionNode: TraceNode,
  contributionNode: TraceNode,
  fraction: Exact,
  rounding: RoundingRecord | null,
  incomplete: boolean,
  policy: MissingPolicy | null = preparedPolicy(missing)
): CountedSlotEvaluation {
  const contribution = scoreOf(contributionNode);
  const result: SlotResult = {
    slot: slot.code,
    label: slot.label,
    outcome: 'counted',
    policy,
    raw: slot.max === null ? null : formatExact(multiplyExact(fraction, slot.max)),
    raw_max: slot.max === null ? null : formatExact(slot.max),
    fraction: formatExact(fraction),
    weight: formatExact(slot.weight),
    contribution: formatExact(contribution),
    rounding,
    missing,
  };
  const trace: SlotTrace = {
    slot: slot.code,
    outcome: 'counted',
    policy,
    slot_max: slot.max === null ? null : formatExact(slot.max),
    weight: formatExact(slot.weight),
    parts,
    missing,
    combine,
    fraction: fractionNode,
    contribution: contributionNode,
  };
  return { counted: true, result, trace, incomplete, flags, weight: slot.weight, fraction, contribution, contributionNode };
}

function uncountedEvaluation(
  slot: PreparedSlot,
  outcome: Exclude<SlotOutcome, 'counted'>,
  policy: MissingPolicy | null,
  parts: readonly SlotPartTrace[],
  missing: readonly MissingDecision[],
  flags: readonly EngineFlag[]
): UncountedSlotEvaluation {
  const result: SlotResult = {
    slot: slot.code,
    label: slot.label,
    outcome,
    policy,
    raw: null,
    raw_max: null,
    fraction: null,
    weight: null,
    contribution: null,
    rounding: null,
    missing,
  };
  const trace: SlotTrace = {
    slot: slot.code,
    outcome,
    policy,
    slot_max: slot.max === null ? null : formatExact(slot.max),
    weight: null,
    parts,
    missing,
    combine: null,
    fraction: null,
    contribution: null,
  };
  return { counted: false, result, trace, incomplete: false, flags };
}

// ------------------------------------------------------------------------ total

interface TotalEvaluation {
  readonly total: string | null;
  readonly exactTotal: string | null;
  readonly percent: string | null;
  readonly outOf: string;
  readonly rounding: RoundingRecord | null;
  readonly totalNode: TraceNode | null;
  readonly percentNode: TraceNode | null;
  readonly countedWeight: string;
}

function evaluateTotal(
  prepared: PreparedScheme,
  counted: readonly CountedSlotEvaluation[]
): TotalEvaluation {
  const declaredWeight = sumExact(prepared.included.map((slot) => slot.weight));
  if (counted.length === 0) {
    const outOf = prepared.outOf ?? declaredWeight;
    return {
      total: null,
      exactTotal: null,
      percent: null,
      outOf: formatExact(outOf),
      rounding: null,
      totalNode: null,
      percentNode: null,
      countedWeight: '0',
    };
  }

  const countedWeight = sumExact(counted.map((evaluation) => evaluation.weight));
  const outOf = prepared.outOf ?? countedWeight;
  const contributions = counted.map((evaluation) => evaluation.contributionNode);
  const summed = sumTrace(contributions);
  const ratio = ratioTrace(summed, countedWeight, outOf);
  const rule = prepared.rounding.get('learning_area_score');
  const totalNode = rule === undefined ? ratio : roundTrace(ratio, 'learning_area_score', rule.precision, rule.mode, true);
  const percentNode = percentTrace(totalNode, outOf);

  return {
    total: totalNode.value,
    exactTotal: ratio.value,
    percent: percentNode.value,
    outOf: formatExact(outOf),
    rounding:
      rule === undefined
        ? null
        : {
            stage: 'learning_area_score',
            precision: rule.precision,
            mode: rule.mode,
            input: ratio.value,
            output: totalNode.value,
          },
    totalNode,
    percentNode,
    countedWeight: formatExact(countedWeight),
  };
}

function scoreOf(node: TraceNode): Exact {
  return exactOf(node.value);
}
