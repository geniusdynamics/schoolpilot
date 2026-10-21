// ABOUTME: Runtime checks for the cross-field rules in spec 03 that JSON Schema cannot express.
// ABOUTME: Pack schemas run first; this reports duplicate codes, dangling references, weight sums and band order.

export interface SemanticIssue {
  /** Dotted path to the offending value, for example "structure.levels[G7].next". */
  readonly path: string;
  /** What is wrong and which spec rule it breaks. */
  readonly message: string;
}

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function items(value: unknown): JsonObject[] {
  return asArray(value).map(asObject);
}

function codesOf(collection: readonly JsonObject[]): string[] {
  return collection
    .map((item) => asString(item.code))
    .filter((code): code is string => code !== undefined);
}

const WEIGHT_TOLERANCE = 1e-9;

function sumsToOne(weights: readonly number[]): boolean {
  return Math.abs(weights.reduce((total, weight) => total + weight, 0) - 1) <= WEIGHT_TOLERANCE;
}

/**
 * Checks the rules that cannot be stated in JSON Schema: uniqueness of a property across
 * array items, referential integrity between sections, weight totals, band ordering and
 * locale coverage. Callers must run the JSON Schema first; this assumes the document is
 * structurally valid and only looks for semantic contradictions.
 */
export function checkPackSemantics(document: unknown): SemanticIssue[] {
  const issues: SemanticIssue[] = [];
  const issue = (path: string, message: string): void => {
    issues.push({ path, message });
  };

  const root = asObject(document);
  const manifest = asObject(root.pack);
  const structure = asObject(root.structure);
  const learningAreaDoc = asObject(root.learning_areas);
  const assessment = asObject(root.assessment);
  const progressionDoc = asObject(root.progression);
  const reports = items(root.reports);
  const locales = asObject(root.locales);
  const testsDoc = asObject(root.tests);

  const stages = items(structure.stages);
  const levels = items(structure.levels);
  const pathways = items(structure.pathways);
  const learningAreas = items(learningAreaDoc.learning_areas);
  const competencies = items(learningAreaDoc.competencies);
  const combinationRules = items(learningAreaDoc.combination_rules);
  const schemes = items(assessment.schemes);
  const scales = items(assessment.grading_scales);
  const aggregations = items(assessment.aggregations);
  const vectors = items(testsDoc.vectors);
  const promotionRules = items(progressionDoc.progression);
  const graduationRules = items(progressionDoc.graduation);

  const unique = (path: string, values: readonly string[]): void => {
    const seen = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) issue(path, `duplicate code "${value}"`);
      seen.add(value);
    }
  };

  unique('structure.stages', codesOf(stages));
  unique('structure.levels', codesOf(levels));
  unique('structure.pathways', codesOf(pathways));
  unique('learning_areas.learning_areas', codesOf(learningAreas));
  unique('learning_areas.competencies', codesOf(competencies));
  unique('assessment.schemes', codesOf(schemes));
  unique('assessment.grading_scales', codesOf(scales));
  unique('assessment.aggregations', codesOf(aggregations));
  unique('reports', codesOf(reports));

  const levelCodes = new Set(codesOf(levels));
  const stageCodes = new Set(codesOf(stages));
  const pathwayCodes = new Set(codesOf(pathways));
  const areaCodes = new Set(codesOf(learningAreas));
  const areaGroups = new Set(
    learningAreas
      .map((area) => asString(area.group))
      .filter((group): group is string => group !== undefined),
  );
  const scaleCodes = new Set(codesOf(scales));

  const expectLevel = (path: string, code: string | undefined): void => {
    if (code !== undefined && !levelCodes.has(code)) issue(path, `unknown level "${code}"`);
  };
  const expectStage = (path: string, code: string | undefined): void => {
    if (code !== undefined && !stageCodes.has(code)) issue(path, `unknown stage "${code}"`);
  };
  const expectPathway = (path: string, code: string | undefined): void => {
    if (code !== undefined && !pathwayCodes.has(code)) issue(path, `unknown pathway "${code}"`);
  };
  const expectArea = (path: string, code: string | undefined): void => {
    if (code !== undefined && !areaCodes.has(code)) issue(path, `unknown learning area "${code}"`);
  };
  const expectScale = (path: string, code: string | undefined): void => {
    if (code !== undefined && !scaleCodes.has(code)) issue(path, `unknown grading scale "${code}"`);
  };

  for (const stage of stages) {
    const code = asString(stage.code) ?? '?';
    for (const level of asArray(stage.levels)) {
      expectLevel(`structure.stages[${code}].levels`, asString(level));
    }
  }

  for (const level of levels) {
    const code = asString(level.code) ?? '?';
    expectLevel(`structure.levels[${code}].next`, asString(level.next));
  }

  for (const pathway of pathways) {
    const code = asString(pathway.code) ?? '?';
    for (const level of asArray(pathway.levels)) {
      expectLevel(`structure.pathways[${code}].levels`, asString(level));
    }
  }

  const periods = items(asObject(structure.calendar_template).periods);
  const periodKeys = new Set<string>();
  for (const period of periods) {
    const code = asString(period.code);
    const name = asString(period.name);
    const sequence = asNumber(period.sequence);
    if (code !== undefined) periodKeys.add(code);
    if (name !== undefined) periodKeys.add(name);
    if (sequence !== undefined) periodKeys.add(`T${sequence}`);
  }

  for (const area of learningAreas) {
    const code = asString(area.code) ?? '?';
    for (const level of asArray(area.levels)) {
      expectLevel(`learning_areas.learning_areas[${code}].levels`, asString(level));
    }
    for (const pathway of asArray(area.pathways)) {
      expectPathway(`learning_areas.learning_areas[${code}].pathways`, asString(pathway));
    }
    for (const alternative of asArray(area.alternatives)) {
      expectArea(`learning_areas.learning_areas[${code}].alternatives`, asString(alternative));
    }

    const components = items(area.components);
    unique(`learning_areas.learning_areas[${code}].components`, codesOf(components));
    const weights = components
      .map((component) => asNumber(component.weight))
      .filter((weight): weight is number => weight !== undefined);
    if (weights.length > 0 && !sumsToOne(weights)) {
      issue(
        `learning_areas.learning_areas[${code}].components`,
        'component weights must sum to 1 when any component weight is declared (spec 03 §4 component_policy weighted)',
      );
    }
  }

  for (const rule of combinationRules) {
    const summary = asString(rule.rule) ?? '?';
    for (const level of asArray(rule.levels)) {
      expectLevel(`learning_areas.combination_rules[${summary}].levels`, asString(level));
    }
    for (const required of asArray(rule.of)) {
      const alternatives = asString(required)?.split('|') ?? [];
      for (const alternative of alternatives) {
        expectArea(`learning_areas.combination_rules[${summary}].of`, alternative);
      }
    }
    if (rule.from_pathway === true && pathwayCodes.size === 0) {
      issue(
        `learning_areas.combination_rules[${summary}].from_pathway`,
        'rule takes electives from a pathway but the structure declares no pathways',
      );
    }
  }

  const usesComponentWeights = schemes.some(
    (scheme) => asString(asObject(scheme.component_policy).papers) === 'weighted',
  );
  if (usesComponentWeights) {
    for (const area of learningAreas) {
      const components = items(area.components);
      if (components.length > 0 && components.every((component) => asNumber(component.weight) === undefined)) {
        const code = asString(area.code) ?? '?';
        issue(
          `learning_areas.learning_areas[${code}].components`,
          'a scheme uses component_policy weighted but this learning area declares no component weights',
        );
      }
    }
  }

  for (const scheme of schemes) {
    const code = asString(scheme.code) ?? '?';
    for (const level of asArray(scheme.levels)) {
      expectLevel(`assessment.schemes[${code}].levels`, asString(level));
    }

    const slots = items(scheme.slots);
    unique(`assessment.schemes[${code}].slots`, codesOf(slots));
    const slotCodes = new Set(codesOf(slots));

    const score = asObject(scheme.learning_area_score);
    for (const slot of asArray(score.of)) {
      const slotCode = asString(slot);
      if (slotCode !== undefined && !slotCodes.has(slotCode)) {
        issue(
          `assessment.schemes[${code}].learning_area_score.of`,
          `unknown slot "${slotCode}"`,
        );
      }
    }

    for (const slotCode of Object.keys(asObject(scheme.missing))) {
      if (!slotCodes.has(slotCode) && slots.length > 0) {
        issue(`assessment.schemes[${code}].missing`, `unknown slot "${slotCode}"`);
      }
    }

    expectScale(`assessment.schemes[${code}].grading_scale`, asString(scheme.grading_scale));
    expectScale(
      `assessment.schemes[${code}].observation_scale`,
      asString(scheme.observation_scale),
    );

    const summativeSlots = items(scheme.summative_slots);
    unique(`assessment.schemes[${code}].summative_slots`, codesOf(summativeSlots));
    for (const slot of summativeSlots) {
      expectScale(
        `assessment.schemes[${code}].summative_slots[${asString(slot.code) ?? '?'}].maps_to`,
        asString(slot.maps_to),
      );
    }
  }

  for (const scale of scales) {
    const code = asString(scale.code) ?? '?';
    const bands = items(scale.bands).map((band) => ({
      code: asString(band.code) ?? '?',
      min: asNumber(band.min),
      max: asNumber(band.max),
    }));
    unique(`assessment.grading_scales[${code}].bands`, bands.map((band) => band.code));

    const bounded = bands.filter(
      (band): band is { code: string; min: number; max: number } =>
        band.min !== undefined && band.max !== undefined,
    );
    for (const band of bounded) {
      if (band.min > band.max) {
        issue(
          `assessment.grading_scales[${code}].bands[${band.code}]`,
          `min ${band.min} is greater than max ${band.max}`,
        );
      }
    }

    const sorted = [...bounded].sort((left, right) => left.min - right.min);
    const inclusiveUpper = asString(scale.upper) === 'inclusive';
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const overlaps = inclusiveUpper
        ? previous.max >= current.min
        : previous.max > current.min;
      if (overlaps) {
        issue(
          `assessment.grading_scales[${code}].bands`,
          `bands "${previous.code}" and "${current.code}" overlap`,
        );
      }
    }
  }

  const usesCoefficients = aggregations.some(
    (aggregation) => asString(aggregation.weights) === 'coefficient',
  );
  if (usesCoefficients) {
    for (const area of learningAreas) {
      if (asNumber(area.coefficient) === undefined) {
        issue(
          `learning_areas.learning_areas[${asString(area.code) ?? '?'}].coefficient`,
          'an aggregation weights by coefficient but this learning area declares no coefficient',
        );
      }
    }
  }

  for (const aggregation of aggregations) {
    const code = asString(aggregation.code) ?? '?';
    expectScale(
      `assessment.aggregations[${code}].result_scale`,
      asString(aggregation.result_scale),
    );

    const failIf = asObject(aggregation.fail_if);
    for (const area of asArray(failIf.in)) {
      expectArea(`assessment.aggregations[${code}].fail_if.in`, asString(area));
    }

    const scope = asArray(aggregation.over);
    const scopeSize = scope.length > 0 ? scope.length : learningAreas.length;
    const keep = asNumber(aggregation.n);
    if (keep !== undefined && keep > scopeSize) {
      issue(
        `assessment.aggregations[${code}].n`,
        `best_n keeps ${keep} results but only ${scopeSize} learning areas are in scope`,
      );
    }

    for (const group of items(aggregation.groups)) {
      for (const area of asArray(group.require_all)) {
        expectArea(`assessment.aggregations[${code}].groups.require_all`, asString(area));
      }
      const groupName = asString(group.group);
      if (groupName !== undefined && !areaGroups.has(groupName)) {
        issue(
          `assessment.aggregations[${code}].groups`,
          `unknown learning-area group "${groupName}"`,
        );
      }
    }

    const weights = asObject(aggregation.weights);
    const explicitWeights = Object.keys(weights)
      .map((key) => asNumber(weights[key]))
      .filter((weight): weight is number => weight !== undefined);
    if (explicitWeights.length > 0 && !sumsToOne(explicitWeights)) {
      issue(
        `assessment.aggregations[${code}].weights`,
        'explicit aggregation weights must sum to 1',
      );
    }
  }

  const annual = asObject(assessment.annual);
  const annualOp = asString(annual.op);
  const annualOf = annual.of;
  if (annualOp === 'weighted_mean' && typeof annualOf === 'object' && annualOf !== null && !Array.isArray(annualOf)) {
    const weights = Object.entries(annualOf as JsonObject)
      .map(([, value]) => asNumber(value))
      .filter((weight): weight is number => weight !== undefined);
    if (!sumsToOne(weights)) {
      issue('assessment.annual.of', 'annual weights must sum to 1 (spec 03 §4.1)');
    }
  }
  if (Array.isArray(annualOf)) {
    for (const period of annualOf) {
      const key = asString(period);
      if (key !== undefined && !periodKeys.has(key)) {
        issue('assessment.annual.of', `unknown period "${key}"`);
      }
    }
  } else if (typeof annualOf === 'object' && annualOf !== null) {
    for (const key of Object.keys(annualOf as JsonObject)) {
      if (!periodKeys.has(key)) issue('assessment.annual.of', `unknown period "${key}"`);
    }
  }

  const singleInstanceBlocks = new Set([
    'header',
    'learner',
    'attendance',
    'summary',
    'comments',
    'progression',
    'fees',
    'calendar',
    'signatures',
    'verification',
  ]);
  for (const report of reports) {
    const code = asString(report.code) ?? '?';
    for (const level of asArray(report.levels)) {
      expectLevel(`reports[${code}].levels`, asString(level));
    }
    const seenBlocks = new Set<string>();
    for (const block of items(report.blocks)) {
      const type = asString(block.type);
      if (type === undefined) continue;
      if (singleInstanceBlocks.has(type) && seenBlocks.has(type)) {
        issue(`reports[${code}].blocks`, `block "${type}" appears more than once`);
      }
      seenBlocks.add(type);
    }
  }

  const languages = asArray(manifest.languages)
    .map(asString)
    .filter((language): language is string => language !== undefined);
  for (const language of languages) {
    if (!Object.prototype.hasOwnProperty.call(locales, language)) {
      issue('locales', `manifest language "${language}" has no locale entry`);
    }
  }
  for (const language of Object.keys(locales)) {
    if (!languages.includes(language)) {
      issue('locales', `locale "${language}" is not listed in manifest languages`);
    }
  }

  const reportLabelKeys = reports.flatMap((report) =>
    items(report.blocks)
      .map((block) => asString(block.label_key))
      .filter((key): key is string => key !== undefined),
  );
  for (const language of Object.keys(locales)) {
    const labels = asObject(asObject(locales[language]).labels);
    for (const key of reportLabelKeys) {
      if (!Object.prototype.hasOwnProperty.call(labels, key)) {
        issue(`locales[${language}].labels`, `report label key "${key}" is not translated`);
      }
    }
  }

  const packCode = asString(manifest.code);
  for (const vector of vectors) {
    const programme = asString(vector.programme);
    if (programme !== undefined && packCode !== undefined && programme !== packCode) {
      issue(
        `tests.vectors[${asString(vector.name) ?? '?'}].programme`,
        `vector names programme "${programme}" but the pack code is "${packCode}"`,
      );
    }
  }

  const promotedLevels = new Set<string>();
  for (const rule of promotionRules) {
    const ruleName = asString(rule.rule) ?? '?';
    for (const level of asArray(rule.levels)) {
      const code = asString(level);
      if (code === undefined) continue;
      expectLevel(`progression.progression[${ruleName}].levels`, code);
      if (promotedLevels.has(code)) {
        issue(`progression.progression[${ruleName}].levels`, `level "${code}" has more than one progression rule`);
      }
      promotedLevels.add(code);
    }
    expectStage(`progression.progression[${ruleName}].to_stage`, asString(rule.to_stage));
  }

  for (const rule of graduationRules) {
    for (const level of asArray(rule.levels)) {
      expectLevel('progression.graduation.levels', asString(level));
    }
  }

  return issues;
}
