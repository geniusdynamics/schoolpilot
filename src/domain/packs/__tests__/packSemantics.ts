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

  // Calendar variants: named templates with a default. The period keys (code, name and
  // T{sequence}) feed annual weights, so every variant must agree on them.
  const calendarNode = asObject(structure.calendar_template);
  const calendarVariants = Array.isArray(calendarNode.variants)
    ? items(calendarNode.variants)
    : [calendarNode];
  const variantCodes = calendarVariants
    .map((variant) => asString(variant.code))
    .filter((code): code is string => code !== undefined);
  unique('structure.calendar_template.variants', variantCodes);
  const defaultCalendarCode = asString(calendarNode.default);
  const defaultCalendar =
    defaultCalendarCode === undefined
      ? calendarVariants[0]
      : calendarVariants.find((variant) => asString(variant.code) === defaultCalendarCode);
  if (defaultCalendar === undefined) {
    issue(
      'structure.calendar_template.default',
      `default variant "${defaultCalendarCode}" is not declared`,
    );
  }

  const periodKeysOf = (template: JsonObject | undefined): Set<string> => {
    const keys = new Set<string>();
    for (const period of items(asObject(template).periods)) {
      const code = asString(period.code);
      const name = asString(period.name);
      const sequence = asNumber(period.sequence);
      if (code !== undefined) keys.add(code);
      if (name !== undefined) keys.add(name);
      if (sequence !== undefined) keys.add(`T${sequence}`);
    }
    return keys;
  };

  const periodKeys = periodKeysOf(defaultCalendar);
  if (calendarVariants.length > 1) {
    for (const variant of calendarVariants) {
      const code = asString(variant.code) ?? '?';
      const keys = periodKeysOf(variant);
      const differs =
        [...periodKeys].some((key) => !keys.has(key)) ||
        [...keys].some((key) => !periodKeys.has(key));
      if (differs) {
        issue(
          `structure.calendar_template.variants[${code}].periods`,
          'period keys differ from the default variant, so annual weights cannot resolve',
        );
      }
    }
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

    const scaleByLevel = new Map<string, string>();
    for (const choice of items(area.grade_scales)) {
      const at = `learning_areas.learning_areas[${code}].grade_scales`;
      const scale = asString(choice.scale);
      expectScale(at, scale);
      for (const level of asArray(choice.levels)) {
        const levelCode = asString(level);
        if (levelCode === undefined) continue;
        expectLevel(at, levelCode);
        const previous = scaleByLevel.get(levelCode);
        if (previous !== undefined && previous !== scale) {
          issue(at, `level "${levelCode}" is assigned both "${previous}" and "${scale ?? '?'}"`);
        }
        if (scale !== undefined) scaleByLevel.set(levelCode, scale);
      }
    }

    const areaLevels = asArray(area.levels)
      .map(asString)
      .filter((level): level is string => level !== undefined);
    const components = items(area.components);
    const scoped = components.map((component) => {
      const componentCode = asString(component.code) ?? '?';
      const declared = asArray(component.levels)
        .map(asString)
        .filter((level): level is string => level !== undefined);
      for (const level of declared) {
        expectLevel(`learning_areas.learning_areas[${code}].components[${componentCode}].levels`, level);
      }
      return { code: componentCode, scope: new Set(declared.length > 0 ? declared : areaLevels) };
    });
    for (let left = 0; left < scoped.length; left += 1) {
      for (let right = left + 1; right < scoped.length; right += 1) {
        const a = scoped[left];
        const b = scoped[right];
        if (a === undefined || b === undefined || a.code !== b.code) continue;
        if (a.scope.size > 0 && b.scope.size > 0 && [...a.scope].some((level) => b.scope.has(level))) {
          issue(
            `learning_areas.learning_areas[${code}].components`,
            `component "${a.code}" is declared twice for an overlapping level set`,
          );
        }
      }
    }
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

  const areasAtLevel = (level: string): JsonObject[] =>
    learningAreas.filter((area) => asArray(area.levels).some((candidate) => asString(candidate) === level));

  for (const rule of combinationRules) {
    const summary = asString(rule.rule) ?? '?';
    const levels = asArray(rule.levels)
      .map(asString)
      .filter((level): level is string => level !== undefined);
    for (const level of levels) {
      expectLevel(`learning_areas.combination_rules[${summary}].levels`, level);
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

    const at = `learning_areas.combination_rules[${summary}]`;
    if (summary === 'group') {
      const group = asString(rule.group);
      const least = asNumber(rule.min);
      const most = asNumber(rule.max);
      if (group !== undefined && !areaGroups.has(group)) {
        issue(`${at}.group`, `unknown learning-area group "${group}"`);
      } else if (group !== undefined && least !== undefined) {
        for (const level of levels) {
          const members = areasAtLevel(level).filter((area) => asString(area.group) === group).length;
          if (least > members) {
            issue(
              `${at}.min`,
              `needs ${least} results from group "${group}" at ${level} but only ${members} learning areas are offered there`,
            );
          }
        }
      }
      if (least !== undefined && most !== undefined && most < least) {
        issue(`${at}.max`, `max ${most} is below min ${least}`);
      }
    }

    if (summary === 'electives') {
      const count = asNumber(rule.count);
      const most = asNumber(rule.max);
      if (count !== undefined && most !== undefined && most < count) {
        issue(`${at}.max`, `max ${most} is below count ${count}`);
      }
      if (count !== undefined) {
        for (const level of levels) {
          const required = combinationRules
            .filter((candidate) => asString(candidate.rule) === 'core_all')
            .filter((candidate) => asArray(candidate.levels).some((entry) => asString(entry) === level))
            .reduce((total, candidate) => total + asArray(candidate.of).length, 0);
          const offered = areasAtLevel(level).length;
          if (count + required > offered) {
            issue(
              `${at}.count`,
              `asks for ${count} electives after ${required} core choices but only ${offered} learning areas are offered at ${level}`,
            );
          }
        }
      }
    }
  }

  // The resolved component weights of a weighted scheme: the policy's per-area map wins over
  // each component's own weight, and the resolved weights must sum to 1.
  for (const scheme of schemes) {
    const policy = asObject(scheme.component_policy);
    if (asString(policy.papers) !== 'weighted') continue;
    const schemeCode = asString(scheme.code) ?? '?';
    const schemeLevels = new Set(asArray(scheme.levels).map(asString));
    const policyWeights = asObject(policy.weights);
    for (const key of Object.keys(policyWeights)) {
      if (!areaCodes.has(key)) {
        issue(`assessment.schemes[${schemeCode}].component_policy.weights`, `unknown learning area "${key}"`);
      }
    }
    for (const area of learningAreas) {
      const areaCode = asString(area.code) ?? '?';
      const areaLevels = asArray(area.levels).map(asString);
      const components = items(area.components).filter((component) => {
        const declared = asArray(component.levels).map(asString);
        const scope = declared.length > 0 ? declared : areaLevels;
        return scope.some((level) => level !== undefined && schemeLevels.has(level));
      });
      if (components.length === 0) continue;
      const areaWeights = asObject(policyWeights[areaCode]);
      const at = `assessment.schemes[${schemeCode}].component_policy.weights[${areaCode}]`;
      for (const code of Object.keys(areaWeights)) {
        if (!components.some((component) => asString(component.code) === code)) {
          issue(at, `unknown component "${code}" on learning area "${areaCode}"`);
        }
      }
      const resolved = components.map(
        (component) => asNumber(areaWeights[asString(component.code) ?? '?']) ?? asNumber(component.weight),
      );
      const missing = components
        .filter((_component, index) => resolved[index] === undefined)
        .map((component) => asString(component.code) ?? '?');
      if (missing.length > 0) {
        issue(
          `learning_areas.learning_areas[${areaCode}].components`,
          `a scheme uses component_policy weighted but no weight is declared for ${missing.join(', ')}`,
        );
      } else if (!sumsToOne(resolved as readonly number[])) {
        issue(at, 'the weights resolved for this learning area must sum to 1');
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
        continue;
      }
      const hole = current.min - previous.max;
      if (hole > 1 || (!inclusiveUpper && hole > 0)) {
        issue(
          `assessment.grading_scales[${code}].bands`,
          `bands "${previous.code}" and "${current.code}" leave a gap between ${previous.max} and ${current.min}`,
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

    const multipliers = asObject(aggregation.multipliers);
    const multiplierKeys = Object.keys(multipliers);
    if (multiplierKeys.length > 0) {
      const scope = new Set(asArray(aggregation.over).map(asString));
      for (const key of multiplierKeys) {
        if (!areaCodes.has(key)) {
          issue(`assessment.aggregations[${code}].multipliers`, `unknown learning area "${key}"`);
        } else if (scope.size > 0 && !scope.has(key)) {
          issue(
            `assessment.aggregations[${code}].multipliers`,
            `counting "${key}" twice but it is not among the aggregation's over list`,
          );
        }
      }
      if (asString(aggregation.op) === 'count_where' || asString(aggregation.op) === 'rubric_profile') {
        issue(
          `assessment.aggregations[${code}].multipliers`,
          'a distribution has no single value to multiply',
        );
      }
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

  // A pack cannot claim it was reviewed without naming who reviewed it (spec 03 §2.2, §12).
  const status = asString(asObject(manifest.verification).status);
  if (status === 'reviewed' || status === 'verified') {
    if (asArray(asObject(manifest.verification).verified_by).length === 0) {
      issue('pack.verification.verified_by', `a ${status} pack names at least one reviewer`);
    }
  }

  return issues;
}
