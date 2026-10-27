// ABOUTME: Computes a payslip from a country payroll pack and a staff pay profile for one period: every
// ABOUTME: earning, deduction and employer cost as a labelled line, then the net pay. Pure and
// ABOUTME: deterministic; every rate, band and limit is read from the pack, none lives in this code.

import {
  add,
  compare,
  fromMinor,
  isMoney,
  isNegative,
  multiplyRational,
  subtract,
  zero,
  type Money,
} from '@/domain/money';

import { isIsoDate } from './dates';
import { PayrollError } from './errors';
import { applyRate, commonDenominator } from './rate';
import { selectRule } from './pack';
import type {
  AmountSource,
  AppliedRule,
  HealthInsuranceParams,
  IncomeTaxParams,
  LevyParams,
  PayBase,
  PayrollInput,
  PayrollPack,
  PayrollRuleEntry,
  Payslip,
  PayslipLine,
  PayslipLineKind,
  SocialSecurityParams,
  Verification,
} from './types';

/** The label keys the engine itself uses for lines no rule owns; a pack's locale file must define them. */
export const ENGINE_LABEL_KEYS: readonly string[] = [
  'payroll.basicPay',
  'payroll.grossPay',
  'payroll.taxablePay',
  'payroll.taxBeforeRelief',
  'payroll.personalRelief',
  'payroll.totalDeductions',
  'payroll.employerCost',
  'payroll.netPay',
];

function refuse(problem: string): PayrollError {
  return new PayrollError('invalid_input', problem);
}

/** Everything a rule may read while it is computed: the pay, the declared inputs and earlier results. */
interface Context {
  readonly pack: PayrollPack;
  readonly input: PayrollInput;
  readonly gross: Money;
  readonly taxableGross: Money;
  readonly inputs: Readonly<Record<string, Money>>;
  /** Results of rules computed so far, by `<ruleId>.<party>`. */
  readonly results: Map<string, Money>;
  readonly lines: PayslipLine[];
  taxablePay: Money;
}

function label(pack: PayrollPack, key: string): string {
  return pack.labels[key] ?? key;
}

function lineOf(ctx: Context, code: string, kind: PayslipLineKind, labelKey: string, value: Money): PayslipLine {
  return { code, kind, labelKey, label: label(ctx.pack, labelKey), amount: value };
}

function pushLine(ctx: Context, code: string, kind: PayslipLineKind, labelKey: string, value: Money): void {
  ctx.lines.push(lineOf(ctx, code, kind, labelKey, value));
}

function baseAmount(ctx: Context, base: PayBase): Money {
  return base === 'basic_pay' ? ctx.input.basicPay : ctx.gross;
}

function cappedAt(value: Money, cap: Money | null): Money {
  return cap !== null && compare(value, cap) > 0 ? cap : value;
}

function floorAtZero(value: Money, currency: PayrollPack['currency']): Money {
  return isNegative(value) ? zero(currency) : value;
}

function sourceAmount(ctx: Context, source: AmountSource): Money {
  if (source.from === 'input') return ctx.inputs[source.key] ?? zero(ctx.pack.currency);
  const result = ctx.results.get(`${source.ruleId}.${source.party}`);
  if (result === undefined) {
    throw new PayrollError(
      'invalid_pack',
      `${ctx.pack.id}: a rule reads the ${source.party} result of "${source.ruleId}", which that rule did not produce`
    );
  }
  return result;
}

function sumOf(values: readonly Money[], currency: PayrollPack['currency']): Money {
  return values.reduce(add, zero(currency));
}

function socialSecurity(ctx: Context, entry: PayrollRuleEntry, params: SocialSecurityParams): void {
  const mode = ctx.pack.rounding;
  const earnings = baseAmount(ctx, params.base);
  const pensionable = cappedAt(earnings, params.upperEarningsLimit);
  const lowerTier = cappedAt(pensionable, params.lowerEarningsLimit);
  const upperTier = subtract(pensionable, lowerTier);
  const contribution = (rate: typeof params.employeeRate): Money =>
    add(applyRate(lowerTier, rate, mode), applyRate(upperTier, rate, mode));
  const employee = contribution(params.employeeRate);
  const employer = contribution(params.employerRate);
  ctx.results.set(`${entry.ruleId}.employee`, employee);
  ctx.results.set(`${entry.ruleId}.employer`, employer);
  pushLine(ctx, `${entry.ruleId}.employee`, 'deduction', `${entry.labelKey}.employee`, employee);
  pushLine(ctx, `${entry.ruleId}.employer`, 'employer_cost', `${entry.labelKey}.employer`, employer);
}

function healthInsurance(ctx: Context, entry: PayrollRuleEntry, params: HealthInsuranceParams): void {
  const share = applyRate(baseAmount(ctx, params.base), params.rate, ctx.pack.rounding);
  const atLeast = compare(share, params.minimum) < 0 ? params.minimum : share;
  const employee = cappedAt(atLeast, params.maximum);
  ctx.results.set(`${entry.ruleId}.employee`, employee);
  pushLine(ctx, `${entry.ruleId}.employee`, 'deduction', `${entry.labelKey}.employee`, employee);
}

function levy(ctx: Context, entry: PayrollRuleEntry, params: LevyParams): void {
  const base = baseAmount(ctx, params.base);
  const mode = ctx.pack.rounding;
  if (params.employeeRate !== null) {
    const employee = applyRate(base, params.employeeRate, mode);
    ctx.results.set(`${entry.ruleId}.employee`, employee);
    pushLine(ctx, `${entry.ruleId}.employee`, 'deduction', `${entry.labelKey}.employee`, employee);
  }
  if (params.employerRate !== null || params.employerFlat !== null) {
    const proportional = params.employerRate === null ? zero(ctx.pack.currency) : applyRate(base, params.employerRate, mode);
    const employer = add(proportional, params.employerFlat ?? zero(ctx.pack.currency));
    ctx.results.set(`${entry.ruleId}.employer`, employer);
    pushLine(ctx, `${entry.ruleId}.employer`, 'employer_cost', `${entry.labelKey}.employer`, employer);
  }
}

/** The tax on taxable pay over the bands, summed exactly and rounded once. */
function taxOnBands(ctx: Context, params: IncomeTaxParams, taxable: Money): Money {
  const currency = ctx.pack.currency;
  const common = commonDenominator(params.bands.map((band) => band.rate));
  let exact = 0n;
  let lower = zero(currency);
  for (const band of params.bands) {
    const ceiling = band.upTo === null || compare(taxable, band.upTo) < 0 ? taxable : band.upTo;
    if (compare(ceiling, lower) > 0) {
      const slice = BigInt(subtract(ceiling, lower).amount_minor);
      exact += slice * band.rate.numerator * (common / band.rate.denominator);
    }
    if (band.upTo !== null) lower = band.upTo;
  }
  // One minor unit scaled by the exact total over the common denominator: a single rounding of the whole tax.
  return multiplyRational(fromMinor(1, currency), exact, common, ctx.pack.rounding);
}

function incomeTax(ctx: Context, entry: PayrollRuleEntry, params: IncomeTaxParams): void {
  const currency = ctx.pack.currency;
  const mode = ctx.pack.rounding;
  const deducted = sumOf(
    params.taxableDeductions.map((group) =>
      cappedAt(sumOf(group.sources.map((source) => sourceAmount(ctx, source)), currency), group.capMonthly)
    ),
    currency
  );
  const taxable = floorAtZero(subtract(ctx.taxableGross, deducted), currency);
  ctx.taxablePay = taxable;
  const before = taxOnBands(ctx, params, taxable);
  const reliefs = params.reliefs.map((relief) => ({
    relief,
    amount: cappedAt(applyRate(sourceAmount(ctx, relief.source), relief.rate, mode), relief.capMonthly),
  }));
  const owed = floorAtZero(
    subtract(subtract(before, params.personalRelief), sumOf(reliefs.map((applied) => applied.amount), currency)),
    currency
  );
  pushLine(ctx, `${entry.ruleId}.taxable_pay`, 'memo', 'payroll.taxablePay', taxable);
  pushLine(ctx, `${entry.ruleId}.tax_before_relief`, 'memo', 'payroll.taxBeforeRelief', before);
  pushLine(ctx, `${entry.ruleId}.personal_relief`, 'memo', 'payroll.personalRelief', params.personalRelief);
  for (const applied of reliefs) {
    pushLine(ctx, `${entry.ruleId}.relief.${applied.relief.id}`, 'memo', applied.relief.labelKey, applied.amount);
  }
  ctx.results.set(`${entry.ruleId}.employee`, owed);
  pushLine(ctx, entry.ruleId, 'deduction', entry.labelKey, owed);
}

function applyEntry(ctx: Context, entry: PayrollRuleEntry): void {
  switch (entry.kind) {
    case 'social_security':
      return entry.params === undefined ? undefined : socialSecurity(ctx, entry, entry.params);
    case 'health_insurance':
      return entry.params === undefined ? undefined : healthInsurance(ctx, entry, entry.params);
    case 'levy':
      return entry.params === undefined ? undefined : levy(ctx, entry, entry.params);
    case 'income_tax':
      return entry.params === undefined ? undefined : incomeTax(ctx, entry, entry.params);
  }
}

function checkMoney(pack: PayrollPack, value: unknown, what: string): Money {
  if (!isMoney(value)) throw refuse(`${what} is not a money amount`);
  if (value.currency !== pack.currency) {
    throw refuse(`${what} is in ${value.currency} but the ${pack.id} pack pays in ${pack.currency}`);
  }
  if (isNegative(value)) throw refuse(`${what} must not be negative`);
  return value;
}

function checkInput(pack: PayrollPack, input: PayrollInput): Readonly<Record<string, Money>> {
  if (typeof input.employeeId !== 'string' || input.employeeId.length === 0) throw refuse('employeeId is required');
  const { start, end } = input.period;
  if (!isIsoDate(start) || !isIsoDate(end)) throw refuse(`the period ${start} to ${end} is not written YYYY-MM-DD`);
  if (end < start) throw refuse(`the period ends (${end}) before it starts (${start})`);
  checkMoney(pack, input.basicPay, 'basicPay');
  const codes = new Set<string>();
  for (const allowance of input.allowances ?? []) {
    checkMoney(pack, allowance.amount, `allowance ${allowance.code}`);
    if (allowance.code.length === 0 || codes.has(allowance.code)) {
      throw refuse(`allowance codes must be non-empty and unique; "${allowance.code}" is not`);
    }
    codes.add(allowance.code);
  }
  const deductionCodes = new Set<string>();
  for (const deduction of input.otherDeductions ?? []) {
    checkMoney(pack, deduction.amount, `deduction ${deduction.code}`);
    if (deduction.code.length === 0 || deductionCodes.has(deduction.code)) {
      throw refuse(`deduction codes must be non-empty and unique; "${deduction.code}" is not`);
    }
    deductionCodes.add(deduction.code);
  }
  const declared = new Set(pack.inputs.map((declaration) => declaration.key));
  const inputs = input.inputs ?? {};
  for (const [key, value] of Object.entries(inputs)) {
    if (!declared.has(key)) throw refuse(`"${key}" is not an input the ${pack.id} pack declares`);
    checkMoney(pack, value, `input ${key}`);
  }
  return inputs;
}

function overall(applied: readonly AppliedRule[]): Verification {
  return applied.every((rule) => rule.verification === 'verified') ? 'verified' : 'draft';
}

/**
 * The payslip of one staff pay profile for one payroll period under a country pack.
 *
 * The rule entries in force on the period's first day apply to the whole period, in the order the pack
 * lists the rules. A period with no entry for a rule is refused (`no_rule_in_force`), a period the pack
 * does not model is refused (`rule_not_modelled`), and deductions that exceed the gross pay are refused
 * (`net_pay_negative`): payroll never pays on a guess. Every computed line is rounded once, by the
 * pack's rounding mode, on its exact value.
 */
export function computePayslip(pack: PayrollPack, input: PayrollInput): Payslip {
  const currency = pack.currency;
  const inputs = checkInput(pack, input);
  const allowances = input.allowances ?? [];

  const gross = sumOf([input.basicPay, ...allowances.map((allowance) => allowance.amount)], currency);
  const taxableGross = sumOf(
    [input.basicPay, ...allowances.filter((allowance) => allowance.taxable).map((allowance) => allowance.amount)],
    currency
  );
  const ctx: Context = {
    pack,
    input,
    gross,
    taxableGross,
    inputs,
    results: new Map(),
    lines: [],
    taxablePay: taxableGross,
  };

  pushLine(ctx, 'basic_pay', 'earning', 'payroll.basicPay', input.basicPay);
  for (const allowance of allowances) {
    ctx.lines.push({
      code: `allowance.${allowance.code}`,
      kind: 'earning',
      labelKey: `allowance.${allowance.code}`,
      label: allowance.label,
      amount: allowance.amount,
    });
  }

  const applied: AppliedRule[] = [];
  for (const ruleId of pack.order) {
    const entry = selectRule(pack, ruleId, input.period.start);
    if (entry.notModelled !== undefined) {
      throw new PayrollError(
        'rule_not_modelled',
        `${pack.id} does not model "${ruleId}" in the period starting ${input.period.start}: ${entry.notModelled}`
      );
    }
    applied.push({
      ruleId,
      effectiveFrom: entry.effectiveFrom,
      sourceRef: entry.sourceRef,
      verification: entry.verification,
    });
    applyEntry(ctx, entry);
  }

  for (const declaration of pack.inputs) {
    const value = inputs[declaration.key];
    if (declaration.deductedFromPay && value !== undefined) {
      pushLine(ctx, `input.${declaration.key}`, 'deduction', declaration.labelKey, value);
    }
  }
  for (const deduction of input.otherDeductions ?? []) {
    ctx.lines.push({
      code: `other.${deduction.code}`,
      kind: 'deduction',
      labelKey: `other.${deduction.code}`,
      label: deduction.label,
      amount: deduction.amount,
    });
  }

  const total = (kind: PayslipLineKind): Money =>
    sumOf(
      ctx.lines.filter((line) => line.kind === kind).map((line) => line.amount),
      currency
    );
  const totalDeductions = total('deduction');
  const netPay = subtract(gross, totalDeductions);
  if (isNegative(netPay)) {
    throw new PayrollError(
      'net_pay_negative',
      `deductions of ${totalDeductions.amount_minor} minor units exceed the gross pay of ${gross.amount_minor} for ${input.employeeId}`
    );
  }

  return {
    packId: pack.id,
    packVersion: pack.version,
    employeeId: input.employeeId,
    period: input.period,
    currency,
    lines: ctx.lines,
    grossPay: gross,
    taxablePay: ctx.taxablePay,
    totalDeductions,
    employerCost: total('employer_cost'),
    netPay,
    verification: overall(applied),
    rulesApplied: applied,
  };
}
