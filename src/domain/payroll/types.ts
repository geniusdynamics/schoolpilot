// ABOUTME: The types of the payroll module: a loaded country payroll pack (effective-dated rule entries
// ABOUTME: with exact money and rate values), the pay profile and period a payslip is computed from, and
// ABOUTME: the payslip and the statutory return export it produces.

import type { CurrencyCode, Money, RoundingMode } from '@/domain/money';

/** verified: every figure was read from the cited official source; draft: a figure still needs confirming. */
export type Verification = 'verified' | 'draft';

/** The two sides a contribution may fall on. */
export type Party = 'employee' | 'employer';

/** The pay a percentage or an earnings limit is read against. */
export type PayBase = 'gross_pay' | 'basic_pay';

/** A rate as an exact fraction of whole numbers: `0.0275` is 275 / 10000. */
export interface Rate {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

/** Where an amount comes from: an earlier rule's result for one party, or a declared input. */
export type AmountSource =
  | { readonly from: 'rule'; readonly ruleId: string; readonly party: Party }
  | { readonly from: 'input'; readonly key: string };

export interface PackSource {
  readonly id: string;
  readonly title: string;
  readonly publisher: string;
  readonly url: string;
  readonly retrieved: string;
  readonly note?: string;
}

export interface InputDeclaration {
  readonly key: string;
  readonly labelKey: string;
  /** True when the amount is also taken out of net pay, false when it only feeds a relief or deduction. */
  readonly deductedFromPay: boolean;
}

export interface TaxBand {
  /** Cumulative upper bound of the band in taxable pay per month; null for the open top band. */
  readonly upTo: Money | null;
  readonly rate: Rate;
}

export interface TaxableDeduction {
  readonly id: string;
  readonly labelKey: string;
  readonly capMonthly: Money | null;
  readonly sources: readonly AmountSource[];
}

export interface TaxRelief {
  readonly id: string;
  readonly labelKey: string;
  readonly rate: Rate;
  readonly capMonthly: Money | null;
  readonly source: AmountSource;
}

export interface IncomeTaxParams {
  readonly bands: readonly TaxBand[];
  readonly personalRelief: Money;
  readonly taxableDeductions: readonly TaxableDeduction[];
  readonly reliefs: readonly TaxRelief[];
}

export interface SocialSecurityParams {
  readonly base: PayBase;
  readonly lowerEarningsLimit: Money;
  readonly upperEarningsLimit: Money;
  readonly employeeRate: Rate;
  readonly employerRate: Rate;
}

export interface HealthInsuranceParams {
  readonly base: PayBase;
  readonly rate: Rate;
  readonly minimum: Money;
  readonly maximum: Money | null;
}

export interface LevyParams {
  readonly base: PayBase;
  readonly employeeRate: Rate | null;
  readonly employerRate: Rate | null;
  /** A flat employer amount per employee per month. */
  readonly employerFlat: Money | null;
}

export type RuleKind = 'income_tax' | 'social_security' | 'health_insurance' | 'levy';

interface RuleEntryCommon {
  readonly ruleId: string;
  readonly labelKey: string;
  /** First day the entry applies (YYYY-MM-DD). */
  readonly effectiveFrom: string;
  /** Last day the entry applies, or null while it is current. */
  readonly effectiveTo: string | null;
  readonly sourceRef: string;
  readonly verification: Verification;
  readonly note?: string;
}

/** An effective-dated entry of one rule: its parameters, or a statement that the period is not modelled. */
export type PayrollRuleEntry =
  | (RuleEntryCommon & { readonly kind: 'income_tax'; readonly params: IncomeTaxParams; readonly notModelled?: undefined })
  | (RuleEntryCommon & {
      readonly kind: 'social_security';
      readonly params: SocialSecurityParams;
      readonly notModelled?: undefined;
    })
  | (RuleEntryCommon & {
      readonly kind: 'health_insurance';
      readonly params: HealthInsuranceParams;
      readonly notModelled?: undefined;
    })
  | (RuleEntryCommon & { readonly kind: 'levy'; readonly params: LevyParams; readonly notModelled?: undefined })
  | (RuleEntryCommon & { readonly kind: RuleKind; readonly params?: undefined; readonly notModelled: string });

export interface ReturnColumn {
  readonly key: string;
  readonly labelKey: string;
  /** A payslip field: employeeId, periodStart, periodEnd, grossPay, taxablePay, netPay, or `line:<code>`. */
  readonly source: string;
}

export interface ReturnLayout {
  readonly id: string;
  readonly labelKey: string;
  readonly authority: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly sourceRef: string;
  readonly verification: Verification;
  readonly note?: string;
  readonly columns: readonly ReturnColumn[];
}

/** A loaded, validated country payroll pack. */
export interface PayrollPack {
  readonly id: string;
  readonly country: string;
  readonly currency: CurrencyCode;
  readonly version: string;
  readonly verification: Verification;
  readonly sources: readonly PackSource[];
  readonly rounding: RoundingMode;
  readonly inputs: readonly InputDeclaration[];
  /** The order the rules apply in. */
  readonly order: readonly string[];
  readonly rules: readonly PayrollRuleEntry[];
  readonly returns: readonly ReturnLayout[];
  /** Display text by label key; a key without text shows as the key. */
  readonly labels: Readonly<Record<string, string>>;
}

/** An allowance paid on top of basic pay. */
export interface AllowanceInput {
  readonly code: string;
  readonly label: string;
  readonly amount: Money;
  /** Whether the allowance counts as taxable pay. */
  readonly taxable: boolean;
}

/** A deduction the employer makes after the statutory lines, such as a loan repayment. */
export interface OtherDeductionInput {
  readonly code: string;
  readonly label: string;
  readonly amount: Money;
}

/** A staff pay profile for one payroll period. */
export interface PayrollInput {
  readonly employeeId: string;
  /** The payroll period; the rule entries in force on its first day apply to the whole period. */
  readonly period: { readonly start: string; readonly end: string };
  readonly basicPay: Money;
  readonly allowances?: readonly AllowanceInput[];
  /** Amounts the pack declares as inputs (premiums paid, pension contributions and so on), by key. */
  readonly inputs?: Readonly<Record<string, Money>>;
  readonly otherDeductions?: readonly OtherDeductionInput[];
}

export type PayslipLineKind = 'earning' | 'deduction' | 'employer_cost' | 'memo';

export interface PayslipLine {
  readonly code: string;
  readonly kind: PayslipLineKind;
  readonly labelKey: string;
  readonly label: string;
  readonly amount: Money;
}

/** The rule entry a payslip used, so the figures can be traced to their source. */
export interface AppliedRule {
  readonly ruleId: string;
  readonly effectiveFrom: string;
  readonly sourceRef: string;
  readonly verification: Verification;
}

export interface Payslip {
  readonly packId: string;
  readonly packVersion: string;
  readonly employeeId: string;
  readonly period: { readonly start: string; readonly end: string };
  readonly currency: CurrencyCode;
  readonly lines: readonly PayslipLine[];
  readonly grossPay: Money;
  readonly taxablePay: Money;
  readonly totalDeductions: Money;
  readonly employerCost: Money;
  readonly netPay: Money;
  /** verified only when every rule entry the payslip used is verified. */
  readonly verification: Verification;
  readonly rulesApplied: readonly AppliedRule[];
}

/** A statutory return ready to export: the column list of the layout and one row per payslip. */
export interface ReturnExport {
  readonly id: string;
  readonly labelKey: string;
  readonly label: string;
  readonly authority: string;
  readonly verification: Verification;
  readonly columns: ReadonlyArray<{ readonly key: string; readonly label: string }>;
  readonly rows: readonly (readonly string[])[];
}
