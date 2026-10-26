# Country Payroll Packs

A Country Payroll Pack carries one country's **statutory payroll rules as effective-dated data**: income
tax bands and reliefs, social security, health insurance, levies, the order they apply in, the rounding
rule and the statutory return layouts (spec 05 §9; spec 06 §10 lists payroll packs in the pack registry).
The platform core owns staff pay profiles, earnings and deductions, payroll periods, payslips and
disbursement; the pack only says what the law requires. Rates change, so none is ever written in code.

- `schema.json`: JSON Schema 2020-12 for a pack document
  (`https://schemas.schoolpilot.app/payroll-pack/v1/payroll.schema.json`).
- `ke/`: the Kenya pack, with its README (sources and draft entries), `locales/en.json` and
  `tests/payslip.fixtures.json`.
- `src/domain/payroll`: the code that loads a pack and computes payslips from it.

## The pack document

| Field | Meaning |
| --- | --- |
| `id`, `country`, `currency`, `version` | Identity; `currency` is a code of the money module's table. |
| `verification` | `verified` or `draft` for the pack as a whole. |
| `sources[]` | The official documents the rules cite, with the date each was retrieved. |
| `rounding.mode` | `half_up`, `half_down`, `half_even`, `up` or `down`, applied once to each computed line. |
| `inputs[]` | Named amounts a pay profile may supply (insurance premiums, a pension contribution); `deductedFromPay` says whether the amount also leaves net pay. |
| `order` | The order the rules apply in; a rule that reads another's result comes after it. |
| `rules[]` | Effective-dated entries (below). |
| `returns[]` | Statutory return layouts: ordered column lists mapped to payslip fields. |

Amounts are decimal strings in major units (`"2400.00"`) and rates are decimal fractions as strings
(`"0.0275"` is 2.75%), so no float is ever read from a pack.

Every rule entry has `ruleId`, `kind`, `labelKey`, `effectiveFrom`, `effectiveTo` (a date or `null`),
`sourceRef` (a source id), `verification` and either `params` or `notModelled` (a sentence saying why
the period is not modelled). Entries of one `ruleId` must not overlap; the code refuses a date no entry
covers. The kinds and their `params`:

| Kind | Params |
| --- | --- |
| `income_tax` | `bands[]` (`upTo` a cumulative monthly bound or `null` for the last, `rate`), `personalRelief`, `taxableDeductions[]` (capped groups of amounts taken off taxable pay) and `reliefs[]` (a rate of an amount, capped, taken off the tax). |
| `social_security` | `base`, `lowerEarningsLimit`, `upperEarningsLimit`, `employeeRate`, `employerRate`: contributions in two tiers, split at the lower limit and capped at the upper. |
| `health_insurance` | `base`, `rate`, `minimum`, `maximum`. |
| `levy` | `base`, `employeeRate`, `employerRate`, `employerFlat` (a flat employer amount per employee per month). |

## Rules for a pack author

- Cite an **official source** for every entry, fetched, and mark an entry `draft` whenever a figure was
  not confirmed from one. Never fill in a number from memory or from a secondary website as `verified`.
- A pack that is `draft` anywhere is not to be used to pay people until an accountant who knows the
  country's payroll has confirmed it.
- A period the law changed gets its own entry with its own dates; never edit an old entry to the new rate.
- A period you cannot model gets a `notModelled` entry so that computing it fails loudly.
- Ship `tests/payslip.fixtures.json` with every expected line and where it comes from, and keep
  the fixtures passing.
