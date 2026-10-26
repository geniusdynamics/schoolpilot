# The payroll module

Payroll in this platform is an **interface**: the core computes a payslip from a staff pay profile, and a
Country Payroll Pack (`packs/payroll/<country>/pack.json`, schema `packs/payroll/schema.json`) supplies
every statutory rule as effective-dated data. **No rate, band, limit or amount lives in this code**: a
test (`__tests__/noRatesInCode.test.ts`) fails on any numeric literal other than zero, one and the
decimal base, and on any country or authority name. Money is the integer-minor-unit `Money` of
`src/domain/money`; every line is rounded once, by the pack's rounding mode, on its exact value.

```ts
import { computePayslip, exportReturn, loadPayrollPack } from '@/domain/payroll';
import { fromMajor } from '@/domain/money';

const pack = loadPayrollPack(keDocument, enLabels);
const payslip = computePayslip(pack, {
  employeeId: 'EMP-001',
  period: { start: '2026-02-01', end: '2026-02-28' },
  basicPay: fromMajor('250000.00', 'KES'),
  allowances: [{ code: 'housing', label: 'House allowance', amount: fromMajor('50000.00', 'KES'), taxable: true }],
});
payslip.netPay;                                             // Money
exportReturn(pack, 'nssf_return', [payslip]).rows;          // string[][]
```

## The API

| Export | Does |
| --- | --- |
| `loadPayrollPack(document, labels?)` | Validates a pack document into exact money and rate values. Refuses a malformed pack, an unlisted source, overlapping entries, bands that do not rise, a rule listed before one it reads. `invalid_pack`. |
| `selectRule(pack, ruleId, onDate)` | The entry of a rule in force on a date. No entry is `no_rule_in_force`; the code never uses the nearest rate. |
| `computePayslip(pack, input)` | The payslip of one pay profile and period: every earning, deduction, employer cost and memo line, the totals and the net pay. |
| `exportReturn(pack, returnId, payslips)` | The rows of a statutory return layout for the payslips of one period. |
| `ENGINE_LABEL_KEYS` | The `payroll.*` label keys the engine uses; a pack's locale file must define them. |

## How a payslip is computed

1. The input is checked: money in the pack's currency and not negative, a real period, unique codes, and
   only inputs the pack declares.
2. Gross pay is basic pay plus every allowance; taxable gross is basic pay plus the taxable allowances.
3. The rules apply in the order of `pack.order`, each with the entry in force on the **period's first
   day** (`selectRule`). A `notModelled` entry stops the computation (`rule_not_modelled`).
4. `social_security`: pay read against the base, capped at the upper limit, split at the lower limit
   into two tiers, each tier rounded then added. `health_insurance`: a rate of pay, at least the minimum
   and at most the maximum. `levy`: an employee rate, an employer rate and a flat employer amount.
5. `income_tax`: taxable gross less the capped deduction groups (which read earlier rules and inputs) is
   taxed over the bands, summed exactly and rounded once; the personal relief and each relief (a rate of
   an amount, capped) come off, never below zero.
6. Inputs the pack marks `deductedFromPay` and the other deductions follow. If the deductions exceed
   the gross pay the payslip is refused (`net_pay_negative`).

Lines have a `code` (`basic_pay`, `allowance.<code>`, `<ruleId>.employee`, `<ruleId>.employer`,
`<ruleId>.taxable_pay`, `<ruleId>.tax_before_relief`, `<ruleId>.personal_relief`,
`<ruleId>.relief.<id>`, the income tax rule's own id, `input.<key>`, `other.<code>`), a `kind`
(`earning`, `deduction`, `employer_cost`, `memo`), a `labelKey` and the resolved `label`, and an
`amount`. A payslip is `verification: verified` only when every rule entry it used is verified, and
`rulesApplied` lists those entries.

## Limits

- Periods are treated as calendar months: monthly caps and bands are applied as given, with no
  proration for a part month.
- A pack describes one currency; a payslip in another is refused.
- Disbursement files (bank or mobile-money) are not produced here; the return layouts are column lists
  mapped to payslip fields, not the authorities' file formats.
- Nothing in the app calls this module yet; wiring the HR pages is a follow-up.

## The module

| File | Holds |
| --- | --- |
| `types.ts` | The pack, input, payslip and return types. |
| `pack.ts` | `loadPayrollPack`, the validation and `selectRule`. |
| `compute.ts` | `computePayslip` and the rule kinds. |
| `returns.ts` | `exportReturn`. |
| `rate.ts` | Exact rates read from decimal text. |
| `dates.ts` | Calendar-date checks. |
| `errors.ts` | `PayrollError` and its codes. |
| `index.ts` | The public API. |

## The tests

| File | Guards |
| --- | --- |
| `__tests__/payrollSchema.test.ts` | The JSON Schema accepts the Kenya and a fictional pack and refuses broken documents. |
| `__tests__/payrollPack.test.ts` | Loading, the checks that refuse a broken pack, and the effective-date boundaries. |
| `__tests__/computePayslip.fakePack.test.ts` | A fictional pack with other rates gives a hand-computed payslip; the same input differs from Kenya's. |
| `__tests__/kePayslipFixtures.test.ts` | Every Kenya fixture to the cent, the labels, the README's draft list. |
| `__tests__/statutoryReturns.test.ts` | The return export. |
| `__tests__/noRatesInCode.test.ts` | No statutory figure in the source. |
