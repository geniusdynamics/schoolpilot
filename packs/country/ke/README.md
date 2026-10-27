# country-ke: Kenya

Pack `country-ke`, version `1.0.0`, country `KE`, schema `packs/country/schema.json`.

**Verification status: `draft`.** The pack is draft because part of it is. Below, every datum is
marked **verified** (an official source the pack cites states it) or **draft** (it is not confirmed,
and the reason is given). Sources were read on 2026-10-26; "read" means the cited text was found at
the URL, not that a Kenyan lawyer or accountant has reviewed the pack. The Kiswahili labels
(`locales/sw.json`) are a **draft translation**: no native speaker has reviewed them.

## Sources

| Id | Document | Publisher | URL |
| --- | --- | --- | --- |
| `cap110` | Public Holidays Act, Cap. 110 (Schedule Part I; the section on a holiday that falls on a Sunday) | National Council for Law Reporting (Kenya Law) | https://kenyalaw.org/akn/ke/act/1912/21/eng@2022-12-31 |
| `gazette-idd-2024` | Gazette Notice No. 4339, 9 April 2024: Wednesday 10 April 2024 a public holiday to mark Idd-ul-Fitr | Government Printer | https://new.kenyalaw.org/akn/ke/officialGazette/gazette/2024-04-09/46/eng@2024-04-09/source |
| `gazette-idd-2025` | Gazette Notice No. 3861, 28 March 2025: Monday 31 March 2025 | Government Printer | https://new.kenyalaw.org/akn/ke/officialGazette/2025-03-28/62/eng@2025-03-28/source |
| `gazette-idd-2026` | Gazette Notice No. 3955, 18 March 2026: Friday 20 March 2026 | Government Printer | https://new.kenyalaw.org/akn/ke/officialGazette/2026-03-18/50/eng@2026-03-18/source |
| `nation-oct10-names` | Huduma or Utamaduni day? Moi Day renamed twice between 2019 and 2020 (news explainer, secondary) | Daily Nation | https://nation.africa/kenya/news/explainers/huduma-or-utamaduni-day-moi-day-renamed-twice-between-2019-and-2020--3980276 |
| `cog-counties` | The 47 Counties (numbers 1 to 47) | Council of Governors | https://cog.go.ke/the-47-counties/ |
| `klrc-first-schedule` | Constitution of Kenya, 2010, First Schedule: Counties | Kenya Law Reform Commission | https://klrc.go.ke/index.php/constitution-of-kenya/163-schedules-schedules/165-first-schedule-counties/434-1-counties |
| `kra-pin-format` | KRA PIN structure (A or P, nine digits, a letter; eleven characters) | Kenya Revenue Authority | https://www.kra.go.ke/services/service/16 |
| `kra-paye` | Pay As You Earn: due date of the PAYE return and payment | Kenya Revenue Authority | https://www.kra.go.ke/individual/filing-paying/types-of-taxes/paye |
| `kra-ahl-notice` | Public notice: Collection of the Affordable Housing Levy by KRA | Kenya Revenue Authority | https://www.kra.go.ke/news-center/public-notices/2099-collection-of-the-affordable-housing-levy-by-kenya-revenue-authority-2 |
| `kra-simplified-paye` | Step by step guide for filing the simplified PAYE return | Kenya Revenue Authority | https://www.kra.go.ke/images/publications/STEP-BY-STEP-GUIDE-FOR-THE-SIMPLIFIED-PAYE-RETURN.pdf |
| `pwc-kenya-other-taxes` | Kenya, Individual: Other taxes (secondary) | PwC Worldwide Tax Summaries | https://taxsummaries.pwc.com/kenya/individual/other-taxes |

## Identifier schemes

| Scheme | Applies to | Validation | Status | Basis |
| --- | --- | --- | --- | --- |
| `ke.kemis_upi` | learner | free text | draft | No published format cited; kept as written. |
| `ke.birth_certificate` | learner, guardian | free text | draft | No published format cited; kept as written. |
| `ke.national_id` | learner, guardian, staff | seven or eight digits, spaces removed | draft | A lenient working rule, not a published format; no source cited. |
| `ke.kra_pin` | staff | `^[AP][0-9]{9}[A-Z]$`, spaces removed, upper-cased | **verified** | `kra-pin-format`. A well-formed PIN is not proof KRA issued it. |
| `ke.nssf_number` | staff | free text | draft | No published format cited. |
| `ke.sha_number` | staff | free text | draft | No published format cited. |
| `ke.tsc_number` | staff | free text | draft | No published format cited. |
| `ke.passport` | staff | free text | draft | Differs by issuing country; no format claimed. |

The three schemes the admission form offered before this pack existed keep their values, labels and
order (`ke.kemis_upi`, `ke.birth_certificate`, `ke.national_id` for a learner; `ke.national_id`,
`ke.birth_certificate` for a guardian).

## Addresses

- **Counties: verified.** The 47 counties of the First Schedule of the Constitution (`klrc-first-schedule`),
  numbered 1 to 47 by the Council of Governors (`cog-counties`). The three-digit codes `001` to `047`
  are the zero-padded numbers; the padding is this pack's convention.
- **Sub-county and ward: not bundled.** Both are free text (sub-county required, ward optional). No
  dataset for either is shipped, because none was found in a source that could be cited.
- City is collected and optional; no postal code is required.

## Public holidays

Rules follow the Schedule to the Public Holidays Act, Cap. 110 (`cap110`). The pack's coverage begins
at 2010-08-27, the promulgation of the Constitution; a year before that has no holidays here.

| Holiday | Rule | Status |
| --- | --- | --- |
| New Year's Day | 1 January | verified |
| Good Friday, Easter Monday | Easter offsets -2 and 1 | verified |
| Idd-ul-Fitr | `byYear`: 2024-04-10, 2025-03-31, 2026-03-20 | verified for those three years (the Gazette notices above). Any other year has no Idd-ul-Fitr in this pack until its notice is added. |
| Labour Day | 1 May | verified |
| Madaraka Day | 1 June | verified |
| 10 October | Moi Day (to 2019-10-09), Huduma Day (2019-10-10 to 2020-12-31), Utamaduni Day (2021-01-01 to 2023-10-09), Mazingira Day (from 2023-10-10) | **draft**. The Schedule on the Kenya Law site names the day Mazingira Day; the earlier names and every boundary date come from news reports and are approximate. That the day was observed in each year of the Moi Day period was disputed in court (the pack assumes it was). |
| Mashujaa Day | 20 October | verified |
| Jamhuri Day | 12 December | verified |
| Christmas Day, Boxing Day | 25 and 26 December | verified |

**The Sunday rule (verified, `cap110`):** where a Part I holiday falls on a Sunday, the first
succeeding day that is not itself a public holiday is the holiday, and the Sunday ceases to be one.
`sunday_to_monday` is the pack's name for it; a Sunday Christmas whose Monday is Boxing Day moves
to the Tuesday. The Idd-ul-Fitr date is gazetted as an exact day, so it does not move. (Secondary
sources number this section 3 or 4; the Kenya Law text read for this pack numbers it 3.)

**Not modelled:** Idd-ul-Azha (Part II of the Schedule, a holiday for persons of the Islamic faith),
Diwali (Part III), the polling day of a general election and the day a President-elect is sworn in
(section 2 of the Act), and days the Cabinet Secretary declares by Gazette notice for a one-off
reason.

## Statutory returns (no rates)

| Return | Authority | Due | Status | Basis |
| --- | --- | --- | --- | --- |
| PAYE, monthly | KRA | 9th of the following month | **verified** | `kra-paye` |
| Affordable Housing Levy, monthly | KRA | ninth working day after the end of the month | **verified** | `kra-ahl-notice` |
| NSSF, monthly | NSSF | 9th of the following month | draft | `pwc-kenya-other-taxes` (secondary); another secondary source gives the 15th; confirm against the NSSF Act and the Fund. |
| SHA contribution, monthly | Social Health Authority | 9th of the following month | draft | `pwc-kenya-other-taxes` (secondary). |
| NITA levy, monthly | National Industrial Training Authority | 9th of the following month | draft | KRA's simplified PAYE return carries the levy (`kra-simplified-paye`); NITA's own deadline was not found. |

No rate, percentage, band or amount of any contribution appears in this pack, in its labels or in its
tests; payroll reads those from effective-dated payroll data (task P5-D01).

## Draft items to resolve

1. `ke.kemis_upi`, `ke.birth_certificate`, `ke.nssf_number`, `ke.sha_number`, `ke.tsc_number`,
   `ke.passport`: find the issuing authority's published format, or keep them free.
2. `ke.national_id`: replace the lenient seven-or-eight-digit rule with the Registration of Persons
   Department's format if it publishes one.
3. The names and boundary dates of the 10 October holiday, against the Gazette notices.
4. The NSSF, SHA and NITA due days, against the Acts and the authorities' notices.
5. Idd-ul-Fitr dates for years other than 2024 to 2026, as each notice is published.
6. The Kiswahili labels, by a native speaker.

## Vectors

`tests/ke.vectors.json` holds identifier accept and reject cases (with the normalised value each is
stored as), Easter Sunday for five years and the full list of public holidays, nominal and observed,
for 2022, 2024, 2025, 2026 and 2027, which exercise the Sunday rule, a Sunday Christmas and the
dated names of 10 October. The tests that run them are `src/domain/country/__tests__/country.test.ts`
(behaviour) and `countryPackSchema.test.ts` (schema and cross-field checks).
