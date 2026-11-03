// ABOUTME: Reads an assessment scheme's free-form pack definition into the lines a school reads:
// ABOUTME: its assessment slots and weights, how the subject score is built and its grading scale.

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function list(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function slotLine(value: unknown): string | null {
  const slot = asRecord(value);
  if (slot === null) return null;
  const code = asText(slot.code);
  if (code === null) return null;
  const label = asText(slot.label);
  const kind = asText(slot.kind);
  const weight = asNumber(slot.scale_to) ?? asNumber(slot.weight);

  let line = code;
  if (label !== null && label !== code) line += ` — ${label}`;
  const details: string[] = [];
  if (kind !== null) details.push(kind);
  if (slot.combine === 'mean' || slot.multi === true) details.push('mean of several');
  if (weight !== null) details.push(`${weight}`);
  if (details.length > 0) line += ` (${details.join(', ')})`;
  return line;
}

/** The readable lines of a scheme definition; an unknown shape becomes pretty JSON. */
export function definitionLines(definition: unknown): readonly string[] {
  const record = asRecord(definition);
  if (record === null) return ['The scheme definition is not a readable object.'];

  const lines: string[] = [];

  const slots = list(record.slots).map(slotLine).filter((line): line is string => line !== null);
  if (slots.length > 0) lines.push(`Assessment slots: ${slots.join(' · ')}`);

  const summative = list(record.summative_slots)
    .map(slotLine)
    .filter((line): line is string => line !== null);
  if (summative.length > 0) lines.push(`Summative: ${summative.join(' · ')}`);

  const score = asRecord(record.learning_area_score);
  if (score !== null) {
    const op = asText(score.op) ?? 'combine';
    const of = list(score.of)
      .map(asText)
      .filter((entry): entry is string => entry !== null);
    const outOf = asNumber(score.out_of);
    let line = `Subject score: ${op}`;
    if (of.length > 0) line += ` of ${of.join(', ')}`;
    if (outOf !== null) line += ` out of ${outOf}`;
    lines.push(line);
  }

  const components = asRecord(record.component_policy);
  if (components !== null) {
    const papers = asText(components.papers);
    const outOf = asNumber(components.out_of);
    if (papers !== null || outOf !== null) {
      lines.push(
        `Components: ${[papers, outOf === null ? null : `out of ${outOf}`].filter(Boolean).join(' ')}`
      );
    }
  }

  const gradingScale = asText(record.grading_scale);
  if (gradingScale !== null) lines.push(`Grading scale: ${gradingScale}`);

  const evidence = asText(record.evidence);
  if (evidence !== null) lines.push(`Evidence: ${evidence.replace(/_/g, ' ')}`);

  const observationScale = asText(record.observation_scale);
  if (observationScale !== null) lines.push(`Observation scale: ${observationScale}`);

  const reportShows = list(record.report_shows)
    .map(asText)
    .filter((entry): entry is string => entry !== null);
  if (reportShows.length > 0) lines.push(`Report shows: ${reportShows.join(', ')}`);

  const missing = asRecord(record.missing);
  if (missing !== null) {
    const entries = Object.entries(missing)
      .map(([slot, rule]) => {
        const text = asText(rule);
        return text === null ? null : `${slot} ${text}`;
      })
      .filter((entry): entry is string => entry !== null);
    if (entries.length > 0) lines.push(`Missing marks: ${entries.join('; ')}`);
  }

  const rounding = list(record.rounding)
    .map((value) => {
      const stage = asRecord(value);
      if (stage === null) return null;
      const name = asText(stage.stage);
      if (name === null) return null;
      const precision = asNumber(stage.precision);
      const mode = asText(stage.mode);
      const detail = precision === null ? '' : ` to ${precision} dp`;
      return `${name}${detail}${mode === null ? '' : ` (${mode})`}`;
    })
    .filter((entry): entry is string => entry !== null);
  if (rounding.length > 0) lines.push(`Rounding: ${rounding.join('; ')}`);

  if (lines.length === 0) return [JSON.stringify(definition, null, 2)];

  const annual = asRecord(record.annual);
  if (annual !== null) {
    const op = asText(annual.op);
    const weights = asRecord(annual.of);
    if (op !== null || weights !== null) {
      const weightText =
        weights === null
          ? ''
          : Object.entries(weights)
              .map(([term, weight]) => `${term} ${String(weight)}`)
              .join(', ');
      lines.push(`Annual: ${[op, weightText].filter(Boolean).join(' — ')}`);
    }
  }

  return lines;
}

/** The grading scale a scheme's definition names, if it names one. */
export function schemeGradingScale(definition: unknown): string | null {
  return asText(asRecord(definition)?.grading_scale);
}
