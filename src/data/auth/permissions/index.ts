// ABOUTME: Public surface of the finance permission layer: the segregation-of-duties matrix of spec
// ABOUTME: 05 §11, the roles it binds, and the gate that refuses a role that may not make or check a
// ABOUTME: finance move.

export {
  FINANCE_PERMISSIONS,
  FINANCE_ROLES,
  FinanceDutyError,
  SEGREGATION_OF_DUTIES,
  assertDeciderIsNotMaker,
  assertMayPerform,
  assertSegregatedDuties,
  dutyRule,
  dutyRuleFor,
  mayPerform,
  rolesHolding,
  separationViolations,
  type DutyMechanism,
  type DutyRule,
} from './finance';
