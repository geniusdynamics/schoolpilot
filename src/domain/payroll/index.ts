// ABOUTME: The public API of the payroll module: load a country payroll pack, select the rule entry in
// ABOUTME: force on a date, compute a payslip and export a statutory return. A caller imports from
// ABOUTME: here, never from a file inside the module.

export { PayrollError, type PayrollErrorCode } from './errors';
export { loadPayrollPack, selectRule } from './pack';
export { ENGINE_LABEL_KEYS, computePayslip } from './compute';
export { exportReturn } from './returns';

export type {
  AllowanceInput,
  AmountSource,
  AppliedRule,
  HealthInsuranceParams,
  IncomeTaxParams,
  InputDeclaration,
  LevyParams,
  OtherDeductionInput,
  PackSource,
  PayBase,
  PayrollInput,
  PayrollPack,
  PayrollRuleEntry,
  Payslip,
  PayslipLine,
  PayslipLineKind,
  Party,
  Rate,
  ReturnColumn,
  ReturnExport,
  ReturnLayout,
  RuleKind,
  SocialSecurityParams,
  TaxBand,
  TaxRelief,
  TaxableDeduction,
  Verification,
} from './types';
