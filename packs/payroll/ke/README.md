# Kenya payroll pack (`ke-payroll`)

> **A payroll accountant must confirm this pack before it is used to pay anyone.** The pack is
> `verification: draft`: several figures could not be confirmed from an official source (listed
> below), the pack covers PAYE, NSSF, SHIF, the Affordable Housing Levy and the NITA levy only, and
> nobody who knows Kenyan payroll has checked it. Do not run a payroll from it until the draft entries
> are confirmed and an accountant has signed the pack off.

Statutory payroll rules for Kenya as effective-dated data (spec 05 §9, spec 06 §10). The code that reads
it is `src/domain/payroll`; no rate, band or limit lives there. A payslip is computed with the entry of
each rule in force on the **first day of the payroll period**, in the order `nssf`, `shif`, `ahl`,
`nita`, `paye`. A period no entry covers, or one an entry marks `notModelled`, is refused.

## What the pack holds

| Rule | Entries (effective from) | Notes |
| --- | --- | --- |
| `nssf` (social security) | 2023-02-01 (Year 1), 2024-02-01 (Year 2), 2025-02-01 (Year 3), 2026-02-01 (Year 4) | 6% employee and 6% employer of gross pay, tier I up to the lower earnings limit and tier II up to the upper limit. |
| `shif` (health insurance) | 2023-07-01 not modelled (NHIF), 2024-10-01 | 2.75% of gross pay, minimum KSh 300, no maximum. |
| `ahl` (Affordable Housing Levy) | 2023-07-01 not modelled, 2024-04-01 | 1.5% of gross pay for the employee and 1.5% for the employer. |
| `nita` (industrial training levy) | 2023-07-01 | KSh 50 per employee per month, paid by the employer. |
| `paye` (income tax) | 2023-07-01, 2024-12-01 | Five bands (10%, 25%, 30%, 32.5%, 35%), personal relief KSh 2,400 a month, insurance relief; the December 2024 entry makes the levy, SHIF, pension and NSSF, mortgage interest and post-retirement medical contributions deductible. |

Return layouts (`kra_paye_return`, `nssf_return`, `sha_return`, `ahl_return`, `nita_return`) are column
lists mapped to payslip fields.

## Official sources that were fetched

Every entry cites one of these in `pack.json` (`sources`), all retrieved on 2026-10-26:

- KRA, *Pay As You Earn (PAYE)* page: the bands and the personal relief, "as per Finance Act 2023 (effective 1st July 2023)".
- KRA public notice 19/12/2024, *Amendments to PAYE Computation Pursuant to the Tax Laws (Amendment) Act, 2024*: the deductions that apply from the December 2024 period and the reliefs that cease.
- KRA public notice 08/11/2024, *Applicability of Insurance Relief to Contributions made to the Social Health Insurance Fund (SHIF)*: SHIF got no relief before the amendment.
- KRA public notice 21/03/2024, *Collection of Affordable Housing Levy by Kenya Revenue Authority*: 1.5% each side, with effect from 19 March 2024.
- KRA FAQ, *Tax Reliefs*: personal relief and insurance relief (15% of premiums, up to KSh 60,000 a year).
- SHA, *Premium Rates*: 2.75% of gross monthly income, minimum KSh 300, no upper limit.
- SHA employer portal terms (effective date 1 October 2024).
- NSSF notice *Year 2 (February 2024)* and notice *Year 4 (2026)*, both published as images and read from the images: lower and upper earnings limits, 6% each side, "in accordance with the Third Schedule of the NSSF Act". Also the NSSF page *New NSSF Member Contributions* (the Act's first limits).
- NITA, *Levy Inspectorate* page: KSh 50 per employee per month, not a deduction from payroll.

Fetched but not usable as a source of figures: the Kenya Law pages (the site refused the request), the
KRA *Affordable Housing Levy step by step* PDF (its text could not be extracted), the NSSF Act PDF in
the Parliament library (a 112 MB PDF that was downloaded but not read).

## Draft entries and unconfirmed facts

These are `verification: draft` in `pack.json` and **need a payroll accountant's confirmation**. A
payslip that used any of them is `verification: draft`.

| Entry | What is unconfirmed |
| --- | --- |
| `nssf` from 2023-02-01 | Year 1 limits (KES 6,000 and 18,000) come from an NSSF page about the Act's first limits; no Year 1 (2023) notice was fetched, so the period they applied to is unconfirmed. |
| `nssf` from 2025-02-01 | Year 3 limits (KES 8,000 and 72,000): the Year 4 notice confirms Year 3 ended on 31 January 2026, but no NSSF document stating the Year 3 limits was fetched. They come from secondary sources. |
| `shif` from 2023-07-01 | Not modelled: NHIF graduated contributions applied before SHIF; the NHIF table was not fetched. A payslip for those periods is refused. |
| `shif` from 2024-10-01 | The rate and the minimum are from SHA. The start of employer deductions (1 October 2024) is the effective date of the SHA employer portal terms, not the regulation that fixed it. |
| `ahl` from 2023-07-01 | Not modelled: the levy is collected under the Affordable Housing Act 2024 from 19 March 2024; March 2024 is a part-month and anything before the Act is not modelled. Periods up to March 2024 are refused. |
| `nita` from 2023-07-01 | The NITA page states the current amount without a date, so its history from 2023-07-01 is unconfirmed. Whether an employer is liable (registration, number of employees) is not modelled: the line is produced for every employee. |
| `paye` from 2024-12-01 | Everything is from KRA's notices except one reading: that the employee's NSSF contribution shares the KSh 30,000 monthly cap of the registered pension deduction. KRA's notice does not say so. It matters only when pension plus NSSF would exceed 30,000. |
| `paye` from 2023-07-01 | Bands, personal relief and insurance relief are from KRA. Unconfirmed: the Affordable Housing Relief (15% of the levy, capped at KSh 9,000 a month) used before 27 December 2024, and whether the employee's NSSF and pension deduction had a monthly cap then (none is applied). |
| `kra_paye_return`, `nssf_return`, `sha_return`, `ahl_return`, `nita_return` | The column lists are built from payslip fields. The official file layouts (the iTax P10 return, the NSSF returns file, the SHA upload, sheet M of the PAYE return, the NITA return) were not fetched, so they are not those layouts. |

Other things the pack assumes and nobody confirmed:

- NSSF and SHIF and the levy are read against **gross pay** (basic pay plus every allowance). SHA says
  "gross monthly income" and KRA says "gross monthly salary"; the NSSF notices do not state the base.
- The employee's NSSF contribution shares the KSh 30,000 monthly cap of the registered pension
  deduction from December 2024 (KRA notice). Whether NSSF and a pension share one cap is the reading of
  that notice, not stated in it.
- Periods are calendar months: the monthly caps and bands are applied as given, with no proration.
- The pack starts at 2023-07-01 (the first day of the bands the KRA page shows). Earlier periods are
  refused, not computed from the older bands.
- Whether the Court of Appeal proceedings on the NSSF Act change the rates is not modelled; the NSSF
  public statement of June 2026 says the year-four rates stand.

## Locales and fixtures

- `locales/en.json`: the labels of every line, rule, input, relief and return column. The payroll code
  needs the `payroll.*` keys too (`ENGINE_LABEL_KEYS`).
- `tests/payslip.fixtures.json`: eight payslips across seven salary levels and eight periods (October
  2024 to April 2026), each with every expected line. Each fixture's `source` is a **hand computation
  written out step by step** (no official worked example was found for these rules); the expected lines
  were also computed by an independent BigInt calculation before the code was written, and
  `src/domain/payroll/__tests__/kePayslipFixtures.test.ts` asserts the code reproduces every line to the
  cent. Every fixture is `draft` because each uses a draft entry (SHIF start, NSSF Year 3 or the
  pre-December-2024 PAYE entry).

## Wiring

Nothing in the app reads this pack yet. Connecting the HR pages (`src/modules/hr`) to
`computePayslip` is a follow-up task; the staff pay profile an HR record would supply is the
`PayrollInput` of `src/domain/payroll`.
