// ABOUTME: Validation and preparation for the progression rules of spec 03 section 7: resolve the
// ABOUTME: exact threshold bounds and defaults, refuse a rule form the evaluator cannot run, and
// ABOUTME: check the pack's levels and stages before any learner is evaluated.

import { formatExact, parseExact } from '../engine';
import { decimalOfNumber } from './decimal';
import type {
  PreparedCondition,
  PreparedGraduationRule,
  PreparedPromotionRule,
  ProgressionContext,
  ProgressionDefinition,
  ProgressionIssue,
  ProgressionIssueCode,
  ProgressionPreparation,
  PromotionRuleKind,
  ThresholdFallback,
} from './types';
import { PROMOTION_RULES, THRESHOLD_FALLBACKS } from './types';

function issue(code: ProgressionIssueCode, path: string, detail: string): ProgressionIssue {
  return { code, path, detail };
}

/** A threshold as exact text, or null when it is not a finite number or a decimal string. */
function thresholdText(value: unknown): string | null {
  if (typeof value === 'number') {
    const decimal = decimalOfNumber(value);
    if (decimal === null) return null;
    const exact = parseExact(decimal);
    return exact === null ? null : formatExact(exact);
  }
  if (typeof value === 'string') {
    const exact = parseExact(value);
    return exact === null ? null : formatExact(exact);
  }
  return null;
}

const METRIC = /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$/;

function readLevels(value: unknown, path: string, issues: ProgressionIssue[]): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(issue('invalid_levels', path, 'levels must name at least one level'));
    return [];
  }
  const levels: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index];
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      issues.push(issue('invalid_levels', `${path}[${index}]`, 'a level code must be a non-empty string'));
      continue;
    }
    if (levels.includes(raw)) {
      issues.push(issue('invalid_levels', `${path}[${index}]`, `level "${raw}" is named twice`));
      continue;
    }
    levels.push(raw);
  }
  return levels;
}

function readCondition(
  raw: unknown,
  path: string,
  issues: ProgressionIssue[]
): PreparedCondition | null {
  if (typeof raw !== 'object' || raw === null) {
    issues.push(issue('invalid_condition', path, 'a condition must be an object'));
    return null;
  }
  const record = raw as Record<string, unknown>;
  const metric = typeof record.metric === 'string' ? record.metric : null;
  if (metric === null || metric.length < 3 || metric.length > 100 || !METRIC.test(metric)) {
    issues.push(
      issue('invalid_metric', `${path}.metric`, 'a metric is scope.name in letters, digits and underscores, with at least one dot')
    );
    return null;
  }
  const gte = thresholdText(record.gte);
  if (gte === null) {
    issues.push(issue('invalid_threshold', `${path}.gte`, 'gte must be a finite number'));
    return null;
  }
  return { metric, gte };
}

const isRuleKind = (value: unknown): value is PromotionRuleKind =>
  PROMOTION_RULES.some((kind) => kind === value);

const isFallback = (value: unknown): value is ThresholdFallback =>
  THRESHOLD_FALLBACKS.some((fallback) => fallback === value);

function readRequires(value: unknown, path: string, issues: ProgressionIssue[]): readonly string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(issue('invalid_requires', path, 'requires must name at least one record when declared'));
    return [];
  }
  const names: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index];
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      issues.push(issue('invalid_requires', `${path}[${index}]`, 'a requirement must be a non-empty name'));
      continue;
    }
    if (names.includes(raw)) {
      issues.push(issue('invalid_requires', `${path}[${index}]`, `requirement "${raw}" is named twice`));
      continue;
    }
    names.push(raw);
  }
  return names;
}

interface Structure {
  readonly levels: ReadonlyMap<string, { readonly next: string | null }> | null;
  readonly stages: ReadonlyMap<string, { readonly levels: readonly string[] }> | null;
}

function readStructure(context: ProgressionContext, issues: ProgressionIssue[]): Structure {
  let levels: Map<string, { next: string | null }> | null = null;
  if (context.levels !== undefined) {
    levels = new Map();
    context.levels.forEach((level, index) => {
      if (typeof level.code !== 'string' || level.code.trim().length === 0) {
        issues.push(issue('invalid_definition', `levels[${index}].code`, 'a level needs a non-empty code'));
        return;
      }
      levels?.set(level.code, { next: level.next ?? null });
    });
  }

  let stages: Map<string, { levels: readonly string[] }> | null = null;
  if (context.stages !== undefined) {
    stages = new Map();
    context.stages.forEach((stage, index) => {
      if (typeof stage.code !== 'string' || stage.code.trim().length === 0) {
        issues.push(issue('invalid_definition', `stages[${index}].code`, 'a stage needs a non-empty code'));
        return;
      }
      if (!Array.isArray(stage.levels) || stage.levels.length === 0) {
        issues.push(issue('empty_stage', `stages[${index}].levels`, `stage "${stage.code}" names no level`));
        return;
      }
      stages?.set(stage.code, { levels: stage.levels });
    });
  }

  return { levels, stages };
}

/**
 * Validates a progression document and resolves every bound to exact text.
 *
 * The rule forms are refused as a whole when they are malformed. The structure checks are only
 * possible when the caller supplies the pack's levels and stages; a document with a rule that
 * needs them cannot be evaluated without them, so that is an issue rather than a silent referral.
 */
export function prepareProgression(
  definition: ProgressionDefinition,
  context: ProgressionContext = {}
): ProgressionPreparation {
  const issues: ProgressionIssue[] = [];
  if (typeof definition !== 'object' || definition === null || !Array.isArray(definition.progression)) {
    return { ok: false, issues: [issue('invalid_definition', 'progression', 'progression must be a list of rules')] };
  }
  if (definition.progression.length === 0) {
    issues.push(issue('invalid_definition', 'progression', 'progression must declare at least one rule'));
  }
  if (definition.graduation !== undefined && !Array.isArray(definition.graduation)) {
    issues.push(issue('invalid_definition', 'graduation', 'graduation must be a list of rules when declared'));
  }

  const structure = readStructure(context, issues);
  const rules: PreparedPromotionRule[] = [];
  const graduation: PreparedGraduationRule[] = [];
  const byLevel = new Map<string, PreparedPromotionRule | PreparedGraduationRule>();

  const claim = (level: string, entry: PreparedPromotionRule | PreparedGraduationRule, path: string): void => {
    const seen = byLevel.get(level);
    if (seen !== undefined) {
      issues.push(issue('duplicate_level', path, `level "${level}" already has a rule`));
      return;
    }
    byLevel.set(level, entry);
  };

  definition.progression.forEach((raw: unknown, index) => {
    const path = `progression[${index}]`;
    if (typeof raw !== 'object' || raw === null) {
      issues.push(issue('invalid_rule', path, 'a promotion rule must be an object'));
      return;
    }
    const record = raw as Record<string, unknown>;
    if (!isRuleKind(record.rule)) {
      issues.push(issue('invalid_rule', `${path}.rule`, `unknown promotion rule "${String(record.rule)}"`));
      return;
    }
    const rule = record.rule;
    const levels = readLevels(record.levels, `${path}.levels`, issues);
    const requires = readRequires(record.requires, `${path}.requires`, issues);

    let toStage: string | undefined;
    if (rule === 'stage_transition') {
      if (typeof record.to_stage !== 'string' || record.to_stage.trim().length === 0) {
        issues.push(issue('missing_to_stage', `${path}.to_stage`, 'a stage transition must name the stage it enters'));
      } else {
        toStage = record.to_stage;
      }
    }

    let conditions: readonly PreparedCondition[] = [];
    let fallback: ThresholdFallback | undefined;
    if (rule === 'threshold') {
      if (!Array.isArray(record.conditions) || record.conditions.length === 0) {
        issues.push(issue('missing_conditions', `${path}.conditions`, 'a threshold rule needs at least one condition'));
      } else {
        const read: PreparedCondition[] = [];
        record.conditions.forEach((condition, at) => {
          const prepared = readCondition(condition, `${path}.conditions[${at}]`, issues);
          if (prepared !== null) read.push(prepared);
        });
        conditions = read;
      }
      if (!isFallback(record.else)) {
        issues.push(issue('missing_else', `${path}.else`, 'a threshold rule must say repeat or repeat_or_council'));
      } else {
        fallback = record.else;
      }
    }

    let suggest: PreparedCondition | undefined;
    if (rule === 'class_council') {
      const prepared = readCondition(record.suggest, `${path}.suggest`, issues);
      if (prepared === null) {
        issues.push(issue('missing_suggest', `${path}.suggest`, 'a class council rule needs the metric it suggests on'));
      } else {
        suggest = prepared;
      }
    }

    const prepared: PreparedPromotionRule = {
      index,
      levels,
      rule,
      requires,
      conditions,
      ...(toStage === undefined ? {} : { to_stage: toStage }),
      ...(fallback === undefined ? {} : { else: fallback }),
      ...(suggest === undefined ? {} : { suggest }),
    };
    rules.push(prepared);
    for (const level of levels) claim(level, prepared, `${path}.levels`);
  });

  const graduationRules: readonly unknown[] = Array.isArray(definition.graduation) ? definition.graduation : [];
  graduationRules.forEach((raw: unknown, index) => {
    const path = `graduation[${index}]`;
    if (typeof raw !== 'object' || raw === null) {
      issues.push(issue('invalid_graduation', path, 'a graduation rule must be an object'));
      return;
    }
    const record = raw as Record<string, unknown>;
    if (record.rule !== 'graduate') {
      issues.push(issue('invalid_graduation', `${path}.rule`, 'the only graduation action is graduate'));
      return;
    }
    const levels = readLevels(record.levels, `${path}.levels`, issues);
    const prepared: PreparedGraduationRule = { index, levels, rule: 'graduate' };
    graduation.push(prepared);
    for (const level of levels) claim(level, prepared, `${path}.levels`);
  });

  // ---- structure checks: only the rules that actually need a target
  const needsLevels = rules.length > 0;
  if (needsLevels && structure.levels === null) {
    issues.push(
      issue('missing_structure', 'levels', 'promotion rules need the pack levels to resolve the next level')
    );
  }
  if (rules.some((rule) => rule.rule === 'stage_transition') && structure.stages === null) {
    issues.push(
      issue('missing_structure', 'stages', 'a stage transition needs the pack stages to resolve its target level')
    );
  }

  if (structure.levels !== null) {
    for (const rule of rules) {
      for (const level of rule.levels) {
        const entry = structure.levels.get(level);
        if (entry === undefined) {
          issues.push(issue('unknown_level', `progression[${rule.index}].levels`, `no level "${level}" is declared`));
          continue;
        }
        if (rule.rule !== 'stage_transition' && (entry.next === null || entry.next.length === 0)) {
          issues.push(
            issue(
              'missing_next_level',
              `levels.${level}.next`,
              `level "${level}" uses a rule that promotes but declares no next level`
            )
          );
        }
      }
    }
    for (const rule of graduation) {
      for (const level of rule.levels) {
        if (!structure.levels.has(level)) {
          issues.push(issue('unknown_level', `graduation[${rule.index}].levels`, `no level "${level}" is declared`));
        }
      }
    }
  }

  if (structure.stages !== null) {
    for (const rule of rules) {
      if (rule.rule !== 'stage_transition') continue;
      const stage = rule.to_stage === undefined ? undefined : structure.stages.get(rule.to_stage);
      if (rule.to_stage !== undefined && stage === undefined) {
        issues.push(
          issue('unknown_stage', `progression[${rule.index}].to_stage`, `no stage "${rule.to_stage}" is declared`)
        );
      } else if (stage !== undefined && stage.levels.length === 0) {
        issues.push(issue('empty_stage', `progression[${rule.index}].to_stage`, `stage "${rule.to_stage ?? ''}" names no level`));
      } else if (stage !== undefined && structure.levels !== null && !structure.levels.has(stage.levels[0])) {
        issues.push(
          issue(
            'unknown_level',
            `progression[${rule.index}].to_stage`,
            `stage "${rule.to_stage ?? ''}" enters level "${stage.levels[0]}", which is not declared`
          )
        );
      }
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, rules, graduation, byLevel };
}
