// ABOUTME: Loads and validates a country payroll pack document into exact money and rate values, checks
// ABOUTME: that its effective-dated rules do not contradict each other, and selects the entry of a rule
// ABOUTME: that is in force on a date, refusing when there is none.

import {
  ROUNDING_MODES,
  fromMajor,
  isCurrencyCode,
  type CurrencyCode,
  type Money,
  type RoundingMode,
} from '@/domain/money';

import { isIsoDate, isWithin } from './dates';
import { PayrollError } from './errors';
import { parseRate } from './rate';
import type {
  AmountSource,
  HealthInsuranceParams,
  IncomeTaxParams,
  InputDeclaration,
  LevyParams,
  PackSource,
  PayBase,
  PayrollPack,
  PayrollRuleEntry,
  Rate,
  ReturnColumn,
  ReturnLayout,
  RuleKind,
  SocialSecurityParams,
  TaxBand,
  Verification,
} from './types';

type Shape = Record<string, unknown>;

const RULE_KINDS: readonly RuleKind[] = ['income_tax', 'social_security', 'health_insurance', 'levy'];
const PAY_BASES: readonly PayBase[] = ['gross_pay', 'basic_pay'];
const VERIFICATIONS: readonly Verification[] = ['verified', 'draft'];

function invalid(path: string, problem: string): PayrollError {
  return new PayrollError('invalid_pack', `${path}: ${problem}`);
}

function record(value: unknown, path: string): Shape {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalid(path, 'must be an object');
  }
  return value as Shape;
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw invalid(path, 'must be an array');
  return value;
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) throw invalid(path, 'must be a non-empty string');
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  const candidate = text(value, path);
  const found = allowed.find((option) => option === candidate);
  if (found === undefined) throw invalid(path, `must be one of ${allowed.join(', ')}; got "${candidate}"`);
  return found;
}

function date(value: unknown, path: string): string {
  const candidate = text(value, path);
  if (!isIsoDate(candidate)) throw invalid(path, `"${candidate}" is not a calendar date written YYYY-MM-DD`);
  return candidate;
}

function nullableDate(value: unknown, path: string): string | null {
  return value === null ? null : date(value, path);
}

function flag(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw invalid(path, 'must be true or false');
  return value;
}

/** A non-negative amount written as decimal text, read exactly in the pack's currency. */
function amount(value: unknown, currency: CurrencyCode, path: string): Money {
  const candidate = text(value, path);
  if (candidate.startsWith('-')) throw invalid(path, `"${candidate}" must not be negative`);
  try {
    return fromMajor(candidate, currency);
  } catch (error) {
    throw invalid(path, `"${candidate}" is not an exact ${currency} amount: ${(error as Error).message}`);
  }
}

function nullableAmount(value: unknown, currency: CurrencyCode, path: string): Money | null {
  return value === null ? null : amount(value, currency, path);
}

function rate(value: unknown, path: string): Rate {
  const candidate = text(value, path);
  const parsed = parseRate(candidate);
  if (parsed === null) throw invalid(path, `"${candidate}" is not a rate written as a decimal fraction from 0 to 1`);
  return parsed;
}

function nullableRate(value: unknown, path: string): Rate | null {
  return value === null ? null : rate(value, path);
}

function amountSource(value: unknown, path: string): AmountSource {
  const shape = record(value, path);
  if (shape.from === 'rule') {
    return {
      from: 'rule',
      ruleId: text(shape.ruleId, `${path}.ruleId`),
      party: oneOf(shape.party, ['employee', 'employer'] as const, `${path}.party`),
    };
  }
  if (shape.from === 'input') return { from: 'input', key: text(shape.key, `${path}.key`) };
  throw invalid(path, 'from must be "rule" or "input"');
}

function incomeTaxParams(value: unknown, currency: CurrencyCode, path: string): IncomeTaxParams {
  const shape = record(value, path);
  const bands: TaxBand[] = list(shape.bands, `${path}.bands`).map((entry, index) => {
    const band = record(entry, `${path}.bands[${index}]`);
    return {
      upTo: nullableAmount(band.upTo, currency, `${path}.bands[${index}].upTo`),
      rate: rate(band.rate, `${path}.bands[${index}].rate`),
    };
  });
  if (bands.length === 0) throw invalid(`${path}.bands`, 'needs at least one band');
  bands.forEach((band, index) => {
    const last = index === bands.length - 1;
    if (last && band.upTo !== null) throw invalid(`${path}.bands`, 'the last band must be open (upTo null)');
    if (!last && band.upTo === null) throw invalid(`${path}.bands`, 'only the last band may be open');
    const previous = index === 0 ? null : bands[index - 1].upTo;
    if (band.upTo !== null && previous !== null && band.upTo.amount_minor <= previous.amount_minor) {
      throw invalid(`${path}.bands`, 'band bounds must rise');
    }
  });
  return {
    bands,
    personalRelief: amount(shape.personalRelief, currency, `${path}.personalRelief`),
    taxableDeductions: list(shape.taxableDeductions, `${path}.taxableDeductions`).map((entry, index) => {
      const at = `${path}.taxableDeductions[${index}]`;
      const group = record(entry, at);
      const sources = list(group.sources, `${at}.sources`).map((source, position) =>
        amountSource(source, `${at}.sources[${position}]`)
      );
      if (sources.length === 0) throw invalid(`${at}.sources`, 'needs at least one source');
      return {
        id: text(group.id, `${at}.id`),
        labelKey: text(group.labelKey, `${at}.labelKey`),
        capMonthly: nullableAmount(group.capMonthly, currency, `${at}.capMonthly`),
        sources,
      };
    }),
    reliefs: list(shape.reliefs, `${path}.reliefs`).map((entry, index) => {
      const at = `${path}.reliefs[${index}]`;
      const relief = record(entry, at);
      return {
        id: text(relief.id, `${at}.id`),
        labelKey: text(relief.labelKey, `${at}.labelKey`),
        rate: rate(relief.rate, `${at}.rate`),
        capMonthly: nullableAmount(relief.capMonthly, currency, `${at}.capMonthly`),
        source: amountSource(relief.source, `${at}.source`),
      };
    }),
  };
}

function socialSecurityParams(value: unknown, currency: CurrencyCode, path: string): SocialSecurityParams {
  const shape = record(value, path);
  const params: SocialSecurityParams = {
    base: oneOf(shape.base, PAY_BASES, `${path}.base`),
    lowerEarningsLimit: amount(shape.lowerEarningsLimit, currency, `${path}.lowerEarningsLimit`),
    upperEarningsLimit: amount(shape.upperEarningsLimit, currency, `${path}.upperEarningsLimit`),
    employeeRate: rate(shape.employeeRate, `${path}.employeeRate`),
    employerRate: rate(shape.employerRate, `${path}.employerRate`),
  };
  if (params.lowerEarningsLimit.amount_minor > params.upperEarningsLimit.amount_minor) {
    throw invalid(path, 'the lower earnings limit is above the upper earnings limit');
  }
  return params;
}

function healthInsuranceParams(value: unknown, currency: CurrencyCode, path: string): HealthInsuranceParams {
  const shape = record(value, path);
  const params: HealthInsuranceParams = {
    base: oneOf(shape.base, PAY_BASES, `${path}.base`),
    rate: rate(shape.rate, `${path}.rate`),
    minimum: amount(shape.minimum, currency, `${path}.minimum`),
    maximum: nullableAmount(shape.maximum, currency, `${path}.maximum`),
  };
  if (params.maximum !== null && params.maximum.amount_minor < params.minimum.amount_minor) {
    throw invalid(path, 'the maximum is below the minimum');
  }
  return params;
}

function levyParams(value: unknown, currency: CurrencyCode, path: string): LevyParams {
  const shape = record(value, path);
  return {
    base: oneOf(shape.base, PAY_BASES, `${path}.base`),
    employeeRate: nullableRate(shape.employeeRate, `${path}.employeeRate`),
    employerRate: nullableRate(shape.employerRate, `${path}.employerRate`),
    employerFlat: nullableAmount(shape.employerFlat, currency, `${path}.employerFlat`),
  };
}

function ruleEntry(value: unknown, currency: CurrencyCode, path: string): PayrollRuleEntry {
  const shape = record(value, path);
  const common = {
    ruleId: text(shape.ruleId, `${path}.ruleId`),
    labelKey: text(shape.labelKey, `${path}.labelKey`),
    effectiveFrom: date(shape.effectiveFrom, `${path}.effectiveFrom`),
    effectiveTo: nullableDate(shape.effectiveTo, `${path}.effectiveTo`),
    sourceRef: text(shape.sourceRef, `${path}.sourceRef`),
    verification: oneOf(shape.verification, VERIFICATIONS, `${path}.verification`),
    ...(shape.note === undefined ? {} : { note: text(shape.note, `${path}.note`) }),
  };
  if (common.effectiveTo !== null && common.effectiveTo < common.effectiveFrom) {
    throw invalid(path, 'the entry ends before it starts');
  }
  const kind = oneOf(shape.kind, RULE_KINDS, `${path}.kind`);
  if (shape.notModelled !== undefined) {
    if (shape.params !== undefined) throw invalid(path, 'an entry is either modelled (params) or not (notModelled)');
    return { ...common, kind, notModelled: text(shape.notModelled, `${path}.notModelled`) };
  }
  const paramsPath = `${path}.params`;
  switch (kind) {
    case 'income_tax':
      return { ...common, kind, params: incomeTaxParams(shape.params, currency, paramsPath) };
    case 'social_security':
      return { ...common, kind, params: socialSecurityParams(shape.params, currency, paramsPath) };
    case 'health_insurance':
      return { ...common, kind, params: healthInsuranceParams(shape.params, currency, paramsPath) };
    case 'levy':
      return { ...common, kind, params: levyParams(shape.params, currency, paramsPath) };
  }
}

function returnLayout(value: unknown, path: string): ReturnLayout {
  const shape = record(value, path);
  const columns: ReturnColumn[] = list(shape.columns, `${path}.columns`).map((entry, index) => {
    const at = `${path}.columns[${index}]`;
    const column = record(entry, at);
    return {
      key: text(column.key, `${at}.key`),
      labelKey: text(column.labelKey, `${at}.labelKey`),
      source: text(column.source, `${at}.source`),
    };
  });
  if (columns.length === 0) throw invalid(`${path}.columns`, 'needs at least one column');
  const layout: ReturnLayout = {
    id: text(shape.id, `${path}.id`),
    labelKey: text(shape.labelKey, `${path}.labelKey`),
    authority: text(shape.authority, `${path}.authority`),
    effectiveFrom: date(shape.effectiveFrom, `${path}.effectiveFrom`),
    effectiveTo: nullableDate(shape.effectiveTo, `${path}.effectiveTo`),
    sourceRef: text(shape.sourceRef, `${path}.sourceRef`),
    verification: oneOf(shape.verification, VERIFICATIONS, `${path}.verification`),
    ...(shape.note === undefined ? {} : { note: text(shape.note, `${path}.note`) }),
    columns,
  };
  if (layout.effectiveTo !== null && layout.effectiveTo < layout.effectiveFrom) {
    throw invalid(path, 'the layout ends before it starts');
  }
  return layout;
}

/** Refuses two entries (rules or layouts) of one id whose date ranges share a day. */
function checkNoOverlap(
  entries: ReadonlyArray<{ readonly id: string; readonly from: string; readonly to: string | null }>,
  what: string
): void {
  const sorted = [...entries].sort((left, right) => (left.from < right.from ? -1 : left.from > right.from ? 1 : 0));
  sorted.forEach((entry, index) => {
    const previous = sorted.slice(0, index).filter((other) => other.id === entry.id);
    for (const other of previous) {
      if (other.to === null || other.to >= entry.from) {
        throw invalid(what, `"${entry.id}" has entries that overlap: one from ${other.from}, one from ${entry.from}`);
      }
    }
  });
}

function checkRules(
  rules: readonly PayrollRuleEntry[],
  order: readonly string[],
  inputs: readonly InputDeclaration[],
  sourceIds: ReadonlySet<string>
): void {
  const inputKeys = new Set(inputs.map((input) => input.key));
  const kinds = new Map<string, RuleKind>();
  for (const entry of rules) {
    if (!sourceIds.has(entry.sourceRef)) {
      throw invalid('rules', `"${entry.ruleId}" from ${entry.effectiveFrom} cites the unknown source "${entry.sourceRef}"`);
    }
    const known = kinds.get(entry.ruleId);
    if (known !== undefined && known !== entry.kind) {
      throw invalid('rules', `"${entry.ruleId}" is both ${known} and ${entry.kind}`);
    }
    kinds.set(entry.ruleId, entry.kind);
  }
  checkNoOverlap(
    rules.map((entry) => ({ id: entry.ruleId, from: entry.effectiveFrom, to: entry.effectiveTo })),
    'rules'
  );
  if (new Set(order).size !== order.length) throw invalid('order', 'lists a rule twice');
  for (const ruleId of order) {
    if (!kinds.has(ruleId)) throw invalid('order', `names "${ruleId}", which has no rule entry`);
  }
  for (const ruleId of kinds.keys()) {
    if (!order.includes(ruleId)) throw invalid('order', `does not list "${ruleId}", so it would never apply`);
  }
  for (const entry of rules) {
    if (entry.params === undefined || entry.kind !== 'income_tax') continue;
    const sources: AmountSource[] = [
      ...entry.params.taxableDeductions.flatMap((group) => group.sources),
      ...entry.params.reliefs.map((relief) => relief.source),
    ];
    for (const source of sources) {
      if (source.from === 'input') {
        if (!inputKeys.has(source.key)) {
          throw invalid('rules', `"${entry.ruleId}" reads the input "${source.key}", which the pack does not declare`);
        }
      } else if (order.indexOf(source.ruleId) < 0 || order.indexOf(source.ruleId) >= order.indexOf(entry.ruleId)) {
        throw invalid('order', `"${entry.ruleId}" reads "${source.ruleId}", which must come before it`);
      }
    }
  }
}

/**
 * Loads a payroll pack document (the JSON of packs/payroll/<country>/pack.json) into a validated pack.
 *
 * Every amount and rate is read from its decimal text exactly; a malformed document, a rule that
 * contradicts another or a source that is not listed is refused with `invalid_pack`. `labels` is the
 * pack's locale file: display text by label key.
 */
export function loadPayrollPack(document: unknown, labels: Readonly<Record<string, string>> = {}): PayrollPack {
  const shape = record(document, 'pack');
  const currencyText = text(shape.currency, 'currency');
  if (!isCurrencyCode(currencyText)) throw invalid('currency', `"${currencyText}" is not a currency of the money table`);
  const currency: CurrencyCode = currencyText;
  const rounding: RoundingMode = oneOf(record(shape.rounding, 'rounding').mode, ROUNDING_MODES, 'rounding.mode');

  const sources: PackSource[] = list(shape.sources, 'sources').map((entry, index) => {
    const at = `sources[${index}]`;
    const source = record(entry, at);
    return {
      id: text(source.id, `${at}.id`),
      title: text(source.title, `${at}.title`),
      publisher: text(source.publisher, `${at}.publisher`),
      url: text(source.url, `${at}.url`),
      retrieved: date(source.retrieved, `${at}.retrieved`),
      ...(source.note === undefined ? {} : { note: text(source.note, `${at}.note`) }),
    };
  });
  if (sources.length === 0) throw invalid('sources', 'a pack must cite at least one source');

  const inputs: InputDeclaration[] = list(shape.inputs, 'inputs').map((entry, index) => {
    const at = `inputs[${index}]`;
    const input = record(entry, at);
    return {
      key: text(input.key, `${at}.key`),
      labelKey: text(input.labelKey, `${at}.labelKey`),
      deductedFromPay: flag(input.deductedFromPay, `${at}.deductedFromPay`),
    };
  });
  const order = list(shape.order, 'order').map((entry, index) => text(entry, `order[${index}]`));
  const rules = list(shape.rules, 'rules').map((entry, index) => ruleEntry(entry, currency, `rules[${index}]`));
  const returns = list(shape.returns, 'returns').map((entry, index) => returnLayout(entry, `returns[${index}]`));

  const sourceIds = new Set(sources.map((source) => source.id));
  checkRules(rules, order, inputs, sourceIds);
  for (const layout of returns) {
    if (!sourceIds.has(layout.sourceRef)) {
      throw invalid('returns', `"${layout.id}" cites the unknown source "${layout.sourceRef}"`);
    }
  }
  checkNoOverlap(
    returns.map((layout) => ({ id: layout.id, from: layout.effectiveFrom, to: layout.effectiveTo })),
    'returns'
  );

  return {
    id: text(shape.id, 'id'),
    country: text(shape.country, 'country'),
    currency,
    version: text(shape.version, 'version'),
    verification: oneOf(shape.verification, VERIFICATIONS, 'verification'),
    sources,
    rounding,
    inputs,
    order,
    rules,
    returns,
    labels,
  };
}

/**
 * The entry of a rule that is in force on a date.
 *
 * A date no entry covers is refused (`no_rule_in_force`): a payroll never falls back to the nearest
 * rate. An entry that marks the period as not modelled is returned as it is, for the caller to refuse.
 */
export function selectRule(pack: PayrollPack, ruleId: string, onDate: string): PayrollRuleEntry {
  if (!isIsoDate(onDate)) throw new PayrollError('invalid_input', `"${onDate}" is not a calendar date written YYYY-MM-DD`);
  const entry = pack.rules.find(
    (candidate) => candidate.ruleId === ruleId && isWithin(onDate, candidate.effectiveFrom, candidate.effectiveTo)
  );
  if (entry === undefined) {
    throw new PayrollError(
      'no_rule_in_force',
      `${pack.id} has no "${ruleId}" entry in force on ${onDate}; add the table for that period instead of guessing`
    );
  }
  return entry;
}
