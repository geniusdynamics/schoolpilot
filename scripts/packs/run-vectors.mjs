#!/usr/bin/env node
// ABOUTME: Conformance runner for every curriculum pack's test vectors: loads each pack through the
// ABOUTME: real registry, executes its vectors through the scheme, scale, aggregation and progression
// ABOUTME: engines, and exits nonzero when an executable vector disagrees with the pack.

import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { register } from 'tsx/esm/api';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const DEFAULT_PACKS_DIR = join(ROOT, 'packs');
const EXIT_OK = 0;
const EXIT_MISMATCH = 1;
const EXIT_USAGE = 2;

/** A vector the engine cannot execute; the runner reports it as SKIPPED, never as a pass. */
class SkipVector extends Error {}

/** A vector that contradicts the pack's own declarations; that is a conformance failure. */
class VectorDataError extends Error {}

// ----------------------------------------------------------------------- CLI

function usage() {
  return [
    'Usage: node scripts/packs/run-vectors.mjs [options]',
    '',
    'Options:',
    '  --packs-dir <dir>  Directory holding the packs (default: packs/).',
    '  --pack <code>      Run one pack, by manifest code or directory name.',
    '  --verbose          Print one line per vector, not only the summary.',
    '  --help             Show this message.',
    '',
    'Exit codes: 0 every executable vector matches, 1 a vector mismatched or a pack failed,',
    '2 the command line is invalid. Skipped vectors are listed with their reason and do not',
    'make the run fail; a mismatch always does.',
  ].join('\n');
}

function parseArgs(argv) {
  const options = { packsDir: DEFAULT_PACKS_DIR, pack: null, verbose: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--pack' || arg === '--packs-dir') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new UsageError(`${arg} needs a value`);
      }
      if (arg === '--pack') options.pack = value;
      else options.packsDir = resolve(process.cwd(), value);
      index += 1;
    } else {
      throw new UsageError(`unknown option ${arg}`);
    }
  }
  return options;
}

class UsageError extends Error {}

// -------------------------------------------------------------------- engine

/**
 * Loads the product modules through tsx.
 *
 * The runner is plain Node; the engine is TypeScript. tsx is already a dev dependency, so no
 * second copy of the assessment logic is written here: every number comes from the same modules
 * the application calls.
 */
async function loadEngine() {
  register();
  const moduleUrl = (path) => pathToFileURL(resolve(ROOT, path)).href;
  const [registry, engine, scales, aggregation, progression] = await Promise.all([
    import(moduleUrl('src/domain/curriculum/registry/load.ts')),
    import(moduleUrl('src/domain/assessment/engine/index.ts')),
    import(moduleUrl('src/domain/assessment/scales/index.ts')),
    import(moduleUrl('src/domain/assessment/aggregation/index.ts')),
    import(moduleUrl('src/domain/assessment/progression/index.ts')),
  ]);
  return {
    loadPack: registry.loadPack,
    compareExact: engine.compareExact,
    parseExact: engine.parseExact,
    evaluateScheme: engine.evaluateScheme,
    prepareGradingScale: scales.prepareGradingScale,
    lookupScaleBand: scales.lookupScaleBand,
    givenScore: scales.givenScore,
    evaluateAggregation: aggregation.evaluateAggregation,
    evaluateProgression: progression.evaluateProgression,
    councilSuggestions: progression.COUNCIL_SUGGESTIONS,
  };
}

// --------------------------------------------------------------------- input

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJsonFile(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`cannot read ${relative(ROOT, path)}: ${error.message}`);
  }
}

function jsonFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => join(directory, name));
}

/** The pack document the registry loads, assembled exactly as the pack layout on disk states it. */
function readPackDocument(directory) {
  const vectorFiles = jsonFiles(join(directory, 'tests')).filter((file) =>
    file.endsWith('.vectors.json')
  );
  const vectors = vectorFiles.flatMap((file) => {
    const document = readJsonFile(file);
    if (!Array.isArray(document.vectors)) {
      throw new Error(`${relative(ROOT, file)} has no vectors array`);
    }
    return document.vectors;
  });
  if (vectorFiles.length === 0) {
    throw new Error(`${relative(ROOT, directory)} has no tests/*.vectors.json file`);
  }

  const locales = Object.fromEntries(
    jsonFiles(join(directory, 'locales')).map((file) => [
      basename(file, '.json'),
      readJsonFile(file),
    ])
  );

  return {
    pack: readJsonFile(join(directory, 'pack.json')),
    structure: readJsonFile(join(directory, 'structure.json')),
    learning_areas: readJsonFile(join(directory, 'learning-areas.json')),
    assessment: readJsonFile(join(directory, 'assessment.json')),
    progression: readJsonFile(join(directory, 'progression.json')),
    reports: jsonFiles(join(directory, 'reports')).map(readJsonFile),
    locales,
    tests: { vectors },
  };
}

function discoverPackDirectories(directory) {
  if (!existsSync(directory)) {
    throw new UsageError(`the packs directory does not exist: ${directory}`);
  }
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(directory, entry.name))
    .filter((path) => existsSync(join(path, 'pack.json')))
    .sort((left, right) => left.localeCompare(right));
}

// ------------------------------------------------------------------ vectors

/**
 * Flattens a vector input into `slot[.assessment[.component]]` keys.
 *
 * The flat form (`{"MOCK.MAT.P1": "72/80"}`) passes through. A structured value is accepted too:
 * `{"MOCK.MAT": {"papers": [{"code": "P1", "score": 72, "max": 80}]}}` becomes
 * `MOCK.MAT.P1 = "72/80"`, and an object carrying `score` and `max` at a leaf becomes one mark.
 */
function flattenSchemeInput(input) {
  const flat = {};
  const walk = (node, prefix) => {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix === '' ? key : `${prefix}.${key}`;
      if (isRecord(value)) {
        const mark = markOfObject(value);
        if (mark !== null) {
          flat[path] = mark;
          continue;
        }
        if (Object.prototype.hasOwnProperty.call(value, 'score')) {
          throw new SkipVector(
            `structured input ${path} has a score but no max, so the runner cannot form a mark`
          );
        }
        walk(value, path);
        continue;
      }
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (!isRecord(item)) {
            throw new SkipVector(
              `structured input ${path}[${index}] is not an object the runner can map to a mark`
            );
          }
          const code = typeof item.code === 'string' ? item.code : String(index);
          const mark = markOfObject(item);
          if (mark !== null) flat[`${path}.${code}`] = mark;
          else walk(item, `${path}.${code}`);
        });
        continue;
      }
      if (value === null) {
        throw new SkipVector(
          `input ${path} is null; the runner has no absent-mark mapping for a scheme vector`
        );
      }
      flat[path] = value;
    }
  };
  walk(input, '');
  return flat;
}

function markOfObject(value) {
  const max = value.max ?? value.max_score;
  const score = value.score;
  if (
    (typeof score === 'number' || typeof score === 'string') &&
    (typeof max === 'number' || typeof max === 'string')
  ) {
    return `${score}/${max}`;
  }
  return null;
}

function schemeNamed(pack, code) {
  return pack.assessment.schemes.find((scheme) => scheme.code === code);
}

function aggregationNamed(pack, code) {
  return pack.assessment.aggregations.find((aggregation) => aggregation.code === code);
}

function scaleNamed(pack, code) {
  return pack.assessment.gradingScales.find((scale) => scale.code === code);
}

function schemeSlot(scheme, code) {
  return scheme.slots.find((slot) => slot.code === code);
}

function learningAreaNamed(pack, code) {
  return pack.learningAreas.find((area) => area.code === code);
}

/** The learning area a weighted component policy must be built for, from the vector's marks. */
function weightedAreaOf(input) {
  const areas = new Set();
  for (const key of Object.keys(input)) {
    const [slot, area, component] = key.split('.');
    if (slot !== undefined && area !== undefined && component !== undefined) areas.add(area);
  }
  if (areas.size > 1) {
    throw new SkipVector(
      `the weighted component policy is declared per learning area, but this vector names ${[
        ...areas,
      ].join(', ')}; the engine cannot hold two weight maps at once`
    );
  }
  return [...areas][0];
}

function componentWeightsOf(scheme, areaCode) {
  const weights = scheme.component_policy?.weights?.[areaCode];
  if (weights === undefined) {
    throw new SkipVector(
      `scheme ${scheme.code} weights its papers but declares no component_policy.weights for ${areaCode}`
    );
  }
  return Object.fromEntries(
    Object.entries(weights).map(([code, weight]) => [code, String(weight)])
  );
}

/** The engine's typed scheme, read from the pack's declared scheme rather than from a copy. */
function engineScheme(pack, scheme, flatInput) {
  if (scheme.kind !== 'marks') {
    throw new SkipVector(`scheme ${scheme.code} is a formative scheme; the engine evaluates no marks for it`);
  }
  if (scheme.learning_area_score.op !== 'sum') {
    throw new SkipVector(
      `scheme ${scheme.code} uses learning_area_score.op "${scheme.learning_area_score.op}"; the engine evaluates only sum`
    );
  }

  let componentPolicy;
  if (scheme.component_policy !== undefined) {
    const policy = scheme.component_policy;
    let weights;
    if (policy.papers === 'weighted') {
      const areaCode = weightedAreaOf(flatInput);
      if (areaCode !== undefined) weights = componentWeightsOf(scheme, areaCode);
    }
    componentPolicy = {
      papers: policy.papers,
      out_of: String(policy.out_of),
      ...(weights === undefined ? {} : { weights }),
      ...(policy.best_of === undefined ? {} : { best_of: policy.best_of }),
    };
  }

  return {
    code: scheme.code,
    slots: scheme.slots.map((slot) => ({
      code: slot.code,
      label: slot.label,
      ...(slot.max === undefined ? {} : { max: String(slot.max) }),
      ...(slot.scale_to === undefined ? {} : { scale_to: String(slot.scale_to) }),
      ...(slot.multi === undefined ? {} : { multi: slot.multi }),
      ...(slot.combine === undefined ? {} : { combine: slot.combine }),
    })),
    learning_area_score: {
      op: 'sum',
      of: scheme.learning_area_score.of,
      out_of: String(scheme.learning_area_score.out_of),
    },
    ...(componentPolicy === undefined ? {} : { component_policy: componentPolicy }),
    missing: scheme.missing,
    rounding: scheme.rounding.map((rule) => ({
      stage: rule.stage,
      precision: rule.precision,
      mode: rule.mode,
    })),
  };
}

/**
 * Reads the marks a vector states. A component's declared `max_score` must agree with the pack, so
 * a vector cannot drift away from `learning-areas.json`; a disagreement is a vector error, not a
 * reason to skip.
 */
function marksFromInput(pack, scheme, flatInput) {
  return Object.entries(flatInput).map(([key, value]) => {
    const parts = key.split('.');
    if (parts.length < 1 || parts.length > 3) {
      throw new VectorDataError(`not a slot[.assessment[.component]] key: ${key}`);
    }
    const [slotCode, assessmentCode, component] = parts;
    const slot = slotCode === undefined ? undefined : schemeSlot(scheme, slotCode);
    if (slotCode === undefined || slot === undefined) {
      throw new VectorDataError(`${key} names no slot of scheme ${scheme.code}`);
    }

    let score;
    let maxScore;
    if (typeof value === 'number') {
      const declaredMax = slot.max ?? slot.scale_to;
      if (declaredMax === undefined) {
        throw new VectorDataError(`${key} is a bare score but slot ${slotCode} declares no maximum`);
      }
      score = String(value);
      maxScore = String(declaredMax);
    } else if (typeof value === 'string' && value.split('/').length === 2) {
      [score, maxScore] = value.split('/');
    } else {
      throw new VectorDataError(`${key} needs score/max, got ${JSON.stringify(value)}`);
    }
    if (score === undefined || maxScore === undefined) {
      throw new VectorDataError(`${key} needs score/max, got ${JSON.stringify(value)}`);
    }

    if (component !== undefined && assessmentCode !== undefined) {
      const area = learningAreaNamed(pack, assessmentCode);
      const declared = area?.components.find((candidate) => candidate.code === component);
      if (declared === undefined) {
        throw new VectorDataError(`${key} names no paper declared on ${assessmentCode}`);
      }
      if (String(declared.max_score) !== maxScore) {
        throw new VectorDataError(
          `${key} says the paper is out of ${maxScore}, but ${assessmentCode}.${component} declares ${declared.max_score}`
        );
      }
    }

    return {
      slot: slotCode,
      assessment: assessmentCode ?? slotCode,
      ...(component === undefined ? {} : { component }),
      score,
      max_score: maxScore,
      status: 'present',
    };
  });
}

// ------------------------------------------------------------------- scales

/** The scale a learning area's grade belongs to, using the same rule the pack tests use. */
function scaleForGrade(pack, area, grade) {
  const covering = pack.assessment.schemes.filter(
    (scheme) =>
      scheme.kind === 'marks' &&
      scheme.levels.some((level) => area.levels.includes(level))
  );
  const candidates = covering.filter((scheme) => {
    const scale = scaleNamed(pack, scheme.grading_scale);
    return scale !== undefined && scale.bands.some((band) => band.code === grade || band.label === grade);
  });
  const lastLevel = area.levels.at(-1);
  const terminal =
    lastLevel === undefined
      ? []
      : candidates.filter((scheme) => scheme.levels.includes(lastLevel));
  const resolved = terminal.length > 0 ? terminal : candidates;
  if (resolved.length !== 1) {
    throw new SkipVector(
      `${area.code} grade ${grade} matches ${resolved.length} schemes: ${resolved
        .map((scheme) => scheme.code)
        .join(', ')}`
    );
  }
  const scaleCode = resolved[0]?.grading_scale;
  const scale = scaleCode === undefined ? undefined : scaleNamed(pack, scaleCode);
  if (scale === undefined) throw new SkipVector(`${area.code} names no grading scale`);
  return scale;
}

function bandForGrade(pack, area, grade) {
  const scale = scaleForGrade(pack, area, grade);
  const band = scale.bands.find((candidate) => candidate.code === grade || candidate.label === grade);
  if (band === undefined) {
    throw new SkipVector(`${scale.code} declares no band ${grade}`);
  }
  return band;
}

/** Looks a percent up through the declared scale, using the shared exact lookup. */
function lookupPercent(engine, pack, scaleCode, percent) {
  const definition = scaleCode === undefined ? undefined : scaleNamed(pack, scaleCode);
  if (definition === undefined) {
    throw new SkipVector(`the scheme names no grading scale in scope`);
  }
  const preparation = engine.prepareGradingScale(definition);
  if (!preparation.ok) {
    throw new SkipVector(
      `scale ${scaleCode} cannot be prepared: ${preparation.issues
        .map((issue) => `${issue.code} at ${issue.path}`)
        .join(', ')}`
    );
  }
  const value = engine.parseExact(String(percent));
  if (value === null) throw new SkipVector(`percent ${percent} is not a decimal`);
  return engine.lookupScaleBand(preparation.scale, engine.givenScore(value));
}

// -------------------------------------------------------------- expectation

function exactEquals(engine, expected, actual) {
  if (actual === null || actual === undefined) return false;
  const left = engine.parseExact(String(expected));
  const right = engine.parseExact(String(actual));
  if (left !== null && right !== null) return engine.compareExact(left, right) === 0;
  return String(expected) === String(actual);
}

function show(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => JSON.stringify(entry)).join(', ')}]`;
  if (typeof value === 'string') return JSON.stringify(value);
  return String(value);
}

function problem(field, expected, actual) {
  return { field, expected, actual };
}

function compareField(engine, problems, field, expected, actual) {
  if (!exactEquals(engine, expected, actual)) problems.push(problem(field, expected, actual));
}

function unknownFields(expected, allowed) {
  return Object.keys(expected).filter((field) => !allowed.includes(field));
}

function checkSchemeExpectation(engine, pack, scheme, expectation, result) {
  const allowed = ['exact_total', 'total', 'percent', 'grade', 'points'];
  if (Object.keys(expectation).length === 0) {
    throw new SkipVector(`scheme ${scheme.code} expectation states no values to compare`);
  }
  const unknown = unknownFields(expectation, allowed);
  if (unknown.length > 0) {
    throw new SkipVector(
      `scheme ${scheme.code} expectation field${unknown.length === 1 ? '' : 's'} ${unknown
        .map((field) => JSON.stringify(field))
        .join(', ')} have no engine mapping`
    );
  }

  const problems = [];
  if (result.status !== 'complete') {
    problems.push(problem('status', 'complete', result.status));
    return problems;
  }
  for (const field of ['exact_total', 'total', 'percent']) {
    if (expectation[field] !== undefined) {
      compareField(engine, problems, `${scheme.code}.${field}`, expectation[field], result[field]);
    }
  }

  const needsBand = expectation.grade !== undefined || expectation.points !== undefined;
  if (needsBand) {
    if (result.percent === null) {
      problems.push(problem(`${scheme.code}.percent`, 'a complete result', null));
    } else {
      const lookup = lookupPercent(engine, pack, scheme.grading_scale, result.percent);
      if (!lookup.matched) {
        problems.push(
          problem(`${scheme.code}.grade`, expectation.grade ?? 'a declared band', `no band in ${scheme.grading_scale} covers ${result.percent}`)
        );
      } else {
        const scale = scaleNamed(pack, scheme.grading_scale);
        const expectedBand = scale?.bands.find(
          (band) =>
            band.code === String(expectation.grade) || band.label === String(expectation.grade)
        );
        if (expectation.grade !== undefined) {
          if (expectedBand === undefined) {
            problems.push(
              problem(`${scheme.code}.grade`, expectation.grade, `no band in ${scheme.grading_scale} has that code or label`)
            );
          } else {
            if (lookup.band.code !== expectedBand.code) {
              problems.push(problem(`${scheme.code}.grade`, expectedBand.code, lookup.band.code));
            }
            if (lookup.band.label !== String(expectation.grade)) {
              problems.push(problem(`${scheme.code}.grade`, expectation.grade, lookup.band.label));
            }
          }
        }
        if (expectation.points !== undefined) {
          compareField(engine, problems, `${scheme.code}.points`, expectation.points, lookup.band.points);
        }
      }
    }
  }
  return problems;
}

function checkAggregationExpectation(engine, code, expectation, result) {
  const keys = Object.keys(expectation);
  const hasTotal = keys.includes('total_points');
  const hasValue = keys.includes('value');
  const hasGrade = keys.includes('grade');
  const hasPoints = keys.includes('points');

  let allowed;
  if (hasTotal) allowed = ['total_points', 'points', 'grade', 'division'];
  else if (hasValue && hasGrade) allowed = ['value', 'grade', 'points', 'division'];
  else if (hasValue && !hasPoints) allowed = ['value', 'division'];
  else {
    throw new SkipVector(
      `aggregation ${code} expectation {${keys.join(', ')}} is ambiguous: the runner maps either ` +
        '{total_points, points, grade}, {value, grade, points} or {value}'
    );
  }
  const unknown = unknownFields(expectation, allowed);
  if (unknown.length > 0) {
    throw new SkipVector(
      `aggregation ${code} expectation field${unknown.length === 1 ? '' : 's'} ${unknown
        .map((field) => JSON.stringify(field))
        .join(', ')} have no engine mapping`
    );
  }

  const problems = [];
  if (result.status !== 'complete') {
    problems.push(problem('status', 'complete', result.status));
    return problems;
  }

  if (expectation.total_points !== undefined) {
    compareField(engine, problems, `${code}.total_points`, expectation.total_points, result.subtotal);
  }
  if (expectation.value !== undefined) {
    compareField(engine, problems, `${code}.value`, expectation.value, result.value);
  }
  if (expectation.points !== undefined) {
    if (hasTotal) {
      compareField(engine, problems, `${code}.points`, expectation.points, result.value);
    } else {
      compareField(engine, problems, `${code}.points`, expectation.points, result.grade?.points);
    }
  }
  if (expectation.grade !== undefined) {
    const actual = result.grade?.band ?? null;
    if (actual === null) {
      problems.push(problem(`${code}.grade`, expectation.grade, 'no band was awarded'));
    } else {
      const expected = String(expectation.grade);
      const matches =
        expected === result.grade.band || expected === result.grade.label;
      if (!matches) problems.push(problem(`${code}.grade`, expectation.grade, actual));
    }
  }
  if (expectation.division !== undefined) {
    const actual = result.grade?.band ?? null;
    if (actual === null) {
      problems.push(problem(`${code}.division`, expectation.division, 'no band was awarded'));
    } else if (String(expectation.division) !== actual) {
      problems.push(problem(`${code}.division`, expectation.division, actual));
    }
  }
  return problems;
}

// ------------------------------------------------------------- aggregation

const AREA_FIELDS = [
  'score',
  'grade',
  'points',
  'grade_points',
  'rubric_level',
  'coefficient',
  'credit',
  'complete',
  'exempt',
];

function aggregationInput(pack, aggregation, code, value) {
  const area = learningAreaNamed(pack, code);
  if (area === undefined) {
    throw new SkipVector(`input "${code}" is not a learning area of ${pack.code}`);
  }
  const base = { code, ...(area.group === undefined ? {} : { group: area.group }) };

  if (isRecord(value)) {
    const result = { ...base };
    for (const [field, raw] of Object.entries(value)) {
      if (!AREA_FIELDS.includes(field)) {
        throw new SkipVector(`input ${code}.${field} is not a learning-area result field`);
      }
      if (raw === null) continue;
      if (field === 'complete' || field === 'exempt') result[field] = Boolean(raw);
      else result[field] = String(raw);
    }
    return result;
  }

  if (value === null) {
    throw new SkipVector(`input ${code} is null; the runner has no absent-result mapping`);
  }

  if (aggregation.value === 'score' || aggregation.value === 'score_20') {
    if (typeof value !== 'number' && typeof value !== 'string') {
      throw new SkipVector(`input ${code} must be a score for aggregation ${aggregation.code}`);
    }
    return { ...base, score: String(value) };
  }
  if (aggregation.value === 'rubric_level') {
    if (typeof value !== 'number' && typeof value !== 'string') {
      throw new SkipVector(`input ${code} must be a rubric level for aggregation ${aggregation.code}`);
    }
    return { ...base, rubric_level: String(value) };
  }
  if (
    aggregation.value === 'grade' ||
    aggregation.value === 'points' ||
    aggregation.value === 'grade_points'
  ) {
    if (typeof value !== 'string') {
      throw new SkipVector(`input ${code} must be a grade code for aggregation ${aggregation.code}`);
    }
    const band = bandForGrade(pack, area, value);
    if (band.points === undefined) {
      throw new SkipVector(`band ${band.code} of ${area.code} declares no points`);
    }
    return {
      ...base,
      grade: value,
      points: String(band.points),
      grade_points: String(band.points),
    };
  }
  throw new SkipVector(
    `aggregation ${aggregation.code} consumes value "${aggregation.value}", which the runner has no input mapping for`
  );
}

function aggregationInputs(pack, aggregation, input) {
  return Object.entries(input).map(([code, value]) =>
    aggregationInput(pack, aggregation, code, value)
  );
}

/**
 * The pack loader normalises an absent list to `[]`; the aggregation engine distinguishes an
 * absent field (every area is in scope) from an empty one (a declaration that names nothing and
 * is refused). The runner hands the engine the absent form when the pack declared no list.
 */
function aggregationDefinition(aggregation) {
  const { over, ...rest } = aggregation;
  return {
    ...rest,
    ...(over === undefined || over.length === 0 ? {} : { over }),
  };
}

// -------------------------------------------------------------- progression

function progressionDefinition(pack) {
  return {
    progression: pack.progression.progression.map((rule) => ({
      levels: rule.levels,
      rule: rule.rule,
      ...(rule.to_stage === undefined ? {} : { to_stage: rule.to_stage }),
      ...(rule.requires.length === 0 ? {} : { requires: rule.requires }),
      ...(rule.conditions.length === 0 ? {} : { conditions: rule.conditions }),
      ...(rule.else === undefined ? {} : { else: rule.else }),
      ...(rule.suggest === undefined ? {} : { suggest: rule.suggest }),
    })),
    graduation: pack.progression.graduation.map((rule) => ({
      levels: rule.levels,
      rule: 'graduate',
    })),
  };
}

function suppliedMetrics(input) {
  const metrics = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'leaving_level') continue;
    const supplied = isRecord(value)
      ? {
          ...(value.value === undefined || value.value === null ? {} : { value: String(value.value) }),
          ...(value.complete === undefined ? {} : { complete: Boolean(value.complete) }),
        }
      : { value: String(value), complete: true };
    metrics[key] = supplied;
    metrics[`annual.${key}`] = supplied;
  }
  return metrics;
}

function checkProgressionExpectation(engine, expectation, suggestion) {
  const allowed = ['level', 'rule', 'to_stage', 'next_level', 'suggest'];
  if (Object.keys(expectation).length === 0) {
    throw new SkipVector('progression expectation states no values to compare');
  }
  const unknown = unknownFields(expectation, allowed);
  if (unknown.length > 0) {
    throw new SkipVector(
      `progression expectation field${unknown.length === 1 ? '' : 's'} ${unknown
        .map((field) => JSON.stringify(field))
        .join(', ')} have no engine mapping`
    );
  }
  if (
    expectation.suggest !== undefined &&
    !engine.councilSuggestions.includes(expectation.suggest)
  ) {
    throw new SkipVector(
      `the B04 evaluator states a council suggestion as ${engine.councilSuggestions
        .map((outcome) => JSON.stringify(outcome))
        .join(', ')}; ${JSON.stringify(expectation.suggest)} is not in that vocabulary`
    );
  }

  const problems = [];
  const comparisons = [
    ['level', suggestion.level],
    ['rule', suggestion.rule?.rule ?? null],
    ['to_stage', suggestion.to_stage],
    ['next_level', suggestion.to_level],
    ['suggest', suggestion.council?.suggested ?? null],
  ];
  for (const [field, actual] of comparisons) {
    if (expectation[field] !== undefined && String(expectation[field]) !== String(actual)) {
      problems.push(problem(`progression.${field}`, expectation[field], actual));
    }
  }
  return problems;
}

// ------------------------------------------------------------------- runner

/**
 * Executes one vector. Returns `{status: 'pass' | 'skip' | 'fail', reason?, problems?}`.
 *
 * A skip is a statement about the runner, not about the pack: the engine cannot reproduce the
 * vector's semantics, so the vector is visible but is never counted as a pass.
 */
function executeVector(engine, pack, vector) {
  const expectations = Object.entries(vector.expect.aggregates);
  if (expectations.length === 0) {
    return { status: 'skip', reason: 'the vector expects no scheme, aggregation or progression result' };
  }

  const problems = [];
  let selectedChecked = false;

  try {
    for (const [code, expectation] of expectations) {
      const scheme = schemeNamed(pack, code);
      if (scheme !== undefined) {
        const flatInput = flattenSchemeInput(vector.input);
        const definition = engineScheme(pack, scheme, flatInput);
        const marks = marksFromInput(pack, scheme, flatInput);
        const evaluation = engine.evaluateScheme({ scheme: definition, marks });
        if (!evaluation.ok) {
          throw new SkipVector(
            `the assessment engine refused scheme ${code}: ${evaluation.issues
              .map((issue) => `${issue.code} at ${issue.path}`)
              .join(', ')}`
          );
        }
        problems.push(...checkSchemeExpectation(engine, pack, scheme, expectation, evaluation.result));
        continue;
      }

      const aggregation = aggregationNamed(pack, code);
      if (aggregation !== undefined) {
        const inputs = aggregationInputs(pack, aggregation, vector.input);
        const evaluation = engine.evaluateAggregation(aggregationDefinition(aggregation), inputs, {
          scales: pack.assessment.gradingScales,
        });
        if (!evaluation.ok) {
          throw new SkipVector(
            `the aggregation engine refused ${code}: ${evaluation.issues
              .map((issue) => `${issue.code} at ${issue.path}`)
              .join(', ')}`
          );
        }
        problems.push(...checkAggregationExpectation(engine, code, expectation, evaluation.result));

        if (vector.expect.selected.length > 0) {
          const actual = evaluation.result.selected;
          if (actual === null) {
            problems.push(problem(`${code}.selected`, vector.expect.selected, 'the operator selected nothing'));
          } else if (actual.length !== vector.expect.selected.length || actual.some((entry, index) => entry !== vector.expect.selected[index])) {
            problems.push(problem(`${code}.selected`, vector.expect.selected, actual));
          }
          selectedChecked = true;
        }
        continue;
      }

      if (code === 'progression') {
        const definition = progressionDefinition(pack);
        const leaving = vector.input.leaving_level;
        if (typeof leaving !== 'string') {
          throw new SkipVector('a progression vector needs a string leaving_level');
        }
        const evaluation = engine.evaluateProgression(
          definition,
          [{ learner: 'vector', level: leaving }],
          {
            metrics: suppliedMetrics(vector.input),
            levels: pack.structure.levels.map((level) => ({
              code: level.code,
              ...(level.next === undefined ? {} : { next: level.next }),
            })),
            stages: pack.structure.stages.map((stage) => ({
              code: stage.code,
              levels: stage.levels,
            })),
          }
        );
        if (!evaluation.ok) {
          throw new SkipVector(
            `the progression engine refused the pack's rules: ${evaluation.issues
              .map((issue) => `${issue.code} at ${issue.path}`)
              .join(', ')}`
          );
        }
        const suggestion = evaluation.suggestions[0];
        if (suggestion === undefined) {
          throw new SkipVector('the progression engine returned no suggestion');
        }
        problems.push(...checkProgressionExpectation(engine, expectation, suggestion));
        continue;
      }

      throw new SkipVector(
        `the vector names "${code}", which is not a scheme, aggregation or progression result the engine can execute`
      );
    }

    if (vector.expect.selected.length > 0 && !selectedChecked) {
      throw new SkipVector('the vector expects a selected set, but names no aggregation that produces one');
    }
  } catch (error) {
    if (error instanceof SkipVector) return { status: 'skip', reason: error.message };
    if (error instanceof VectorDataError) return { status: 'fail', problems: [problem('input', 'a valid vector', error.message)] };
    throw error;
  }

  if (problems.length > 0) return { status: 'fail', problems };
  return { status: 'pass' };
}

// -------------------------------------------------------------------- report

function pad(value, width) {
  return String(value).padEnd(width);
}

function failureLines(packCode, results) {
  const lines = [];
  for (const result of results) {
    if (result.status !== 'fail') continue;
    lines.push(`- ${packCode} :: ${result.name}`);
    for (const entry of result.problems) {
      lines.push(
        `  ${entry.field}: expected ${show(entry.expected)}, actual ${show(entry.actual)}`
      );
    }
  }
  return lines;
}

function skipLines(packCode, results) {
  const lines = [];
  for (const result of results) {
    if (result.status !== 'skip') continue;
    lines.push(`- ${packCode} :: ${result.name}`);
    lines.push(`  ${result.reason}`);
  }
  return lines;
}

function renderReport(summaries, options) {
  const lines = [];
  const packCount = summaries.length;
  const totals = summaries.reduce(
    (sum, summary) => ({
      total: sum.total + summary.total,
      executed: sum.executed + summary.executed,
      skipped: sum.skipped + summary.skipped,
      failed: sum.failed + summary.failed,
    }),
    { total: 0, executed: 0, skipped: 0, failed: 0 }
  );
  lines.push(
    `Pack conformance: ${packCount} pack${packCount === 1 ? '' : 's'}, ${totals.total} vector${
      totals.total === 1 ? '' : 's'
    }`
  );
  lines.push('');

  if (options.verbose) {
    for (const summary of summaries) {
      for (const result of summary.results) {
        const detail =
          result.status === 'fail'
            ? ` (${result.problems.map((entry) => entry.field).join(', ')})`
            : result.status === 'skip'
              ? ` (${result.reason})`
              : '';
        lines.push(
          `${result.status.toUpperCase()} ${summary.code} :: ${result.name}${detail}`
        );
      }
    }
    lines.push('');
  }

  lines.push(`${pad('PACK', 20)} ${pad('VECTORS', 9)} ${pad('EXECUTED', 10)} ${pad('SKIPPED', 9)} FAILED`);
  for (const summary of summaries) {
    lines.push(
      `${pad(summary.code, 20)} ${pad(summary.total, 9)} ${pad(summary.executed, 10)} ${pad(
        summary.skipped,
        9
      )} ${summary.failed}`
    );
  }
  lines.push(
    `${pad('TOTAL', 20)} ${pad(totals.total, 9)} ${pad(totals.executed, 10)} ${pad(
      totals.skipped,
      9
    )} ${totals.failed}`
  );
  lines.push('');
  lines.push('executed = vectors the engine ran and that matched; total = executed + skipped + failed.');

  const failures = summaries.flatMap((summary) =>
    summary.error === undefined ? failureLines(summary.code, summary.results) : [`- ${summary.code} :: pack refused`, `  ${summary.error}`]
  );
  if (failures.length > 0) {
    lines.push('');
    lines.push('FAILED');
    lines.push(...failures);
  }

  const skips = summaries.flatMap((summary) => skipLines(summary.code, summary.results));
  if (skips.length > 0) {
    lines.push('');
    lines.push('SKIPPED (not executed; not counted as a pass)');
    lines.push(...skips);
  }

  return { text: lines.join('\n'), totals, failures, skips };
}

function writeStepSummary(text) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (target === undefined || target === '') return;
  try {
    appendFileSync(target, `## Pack conformance vectors\n\n\`\`\`\n${text}\n\`\`\`\n`);
  } catch {
    // A missing summary file must not change the conformance result.
  }
}

// ---------------------------------------------------------------------- main

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return EXIT_OK;
  }

  const engine = await loadEngine();
  const directories = discoverPackDirectories(options.packsDir);
  if (directories.length === 0) {
    throw new UsageError(`no packs found under ${options.packsDir}`);
  }

  const summaries = [];
  for (const directory of directories) {
    const directoryCode = basename(directory);
    let manifest;
    try {
      manifest = readJsonFile(join(directory, 'pack.json'));
    } catch (error) {
      summaries.push({
        code: directoryCode,
        total: 0,
        executed: 0,
        skipped: 0,
        failed: 0,
        error: error.message,
        results: [],
      });
      continue;
    }
    const manifestCode =
      isRecord(manifest) && typeof manifest.code === 'string' ? manifest.code : directoryCode;
    if (options.pack !== null && options.pack !== manifestCode && options.pack !== directoryCode) {
      continue;
    }

    let document;
    try {
      document = readPackDocument(directory);
    } catch (error) {
      summaries.push({
        code: manifestCode,
        total: 0,
        executed: 0,
        skipped: 0,
        failed: 0,
        error: error.message,
        results: [],
      });
      continue;
    }

    const loaded = engine.loadPack(document);
    if (!loaded.ok) {
      summaries.push({
        code: manifestCode,
        total: document.tests.vectors.length,
        executed: 0,
        skipped: 0,
        failed: 0,
        error: `the pack loader refused it: ${loaded.issues
          .map((issue) => `${issue.check} at ${issue.path}: ${issue.message}`)
          .join('; ')}`,
        results: [],
      });
      continue;
    }

    const pack = loaded.pack;
    const results = pack.vectors.map((vector) => {
      const outcome = executeVector(engine, pack, vector);
      return { name: vector.name, ...outcome };
    });
    const executed = results.filter((result) => result.status === 'pass').length;
    const skipped = results.filter((result) => result.status === 'skip').length;
    const failed = results.filter((result) => result.status === 'fail').length;
    summaries.push({
      code: pack.code,
      total: results.length,
      executed,
      skipped,
      failed,
      results,
    });
  }

  if (summaries.length === 0) {
    throw new UsageError(`no pack matched --pack ${options.pack}`);
  }

  const report = renderReport(summaries, options);
  console.log(report.text);
  writeStepSummary(report.text);

  const packErrors = summaries.filter((summary) => summary.error !== undefined).length;
  return report.totals.failed > 0 || packErrors > 0 ? EXIT_MISMATCH : EXIT_OK;
}

try {
  process.exitCode = await main();
} catch (error) {
  if (error instanceof UsageError) {
    console.error(`error: ${error.message}`);
    console.error(usage());
    process.exitCode = EXIT_USAGE;
  } else {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = EXIT_MISMATCH;
  }
}
