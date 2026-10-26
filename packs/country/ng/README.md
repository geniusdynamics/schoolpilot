# country-ng: Nigeria

Pack `country-ng`, version `1.0.0`, country `NG`, schema `packs/country/schema.json`.

**Verification status: `draft`.** The pack is draft because part of it is. Below, every datum is
marked **verified** (an official source the pack cites states it) or **draft** (it is not confirmed,
and the reason is given). Sources were read on 2026-10-26; "read" means the cited text was found at
the URL, not that a Nigerian lawyer or accountant has reviewed the pack. The Hausa labels
(`locales/ha.json`) are a **draft translation**: no native speaker has reviewed them. Igbo and
Yoruba are not shipped.

## Sources

| Id | Document | Publisher | URL |
| --- | --- | --- | --- |
| `public-holidays-act` | Public Holidays Act (1979 No. 31, amended 1984 and 2000): sections 1 to 5 and the Schedule | Policy and Legal Advocacy Centre | https://www.placng.org/lawsofnigeria/print.php?sn=467 |
| `democracy-day-amendment` | June 12: Buhari signs Public Holiday Amendment Bill (news report, secondary; the page body did not render, the headline and snippet were read) | Premium Times | https://www.premiumtimesng.com/news/top-news/334317-june-12-buhari-signs-public-holiday-amendment-bill.html |
| `fmino-fitr-2026` | Declaration of 19 and 20 March 2026 for Eid-ul-Fitr | Federal Ministry of Information and National Orientation | https://fmino.gov.ng/federal-government-declares-thursday-19th-and-friday-20th-march-2026-as-public-holidays-to-mark-eid-ul-fitr/ |
| `fmino-adha-2026` | Declaration of 27 and 28 May 2026 for Eid ul Adha | same | https://fmino.gov.ng/federal-government-declares-wednesday-27th-may-and-thursday-28th-may-2026-as-public-holidays-to-mark-eid-ul-adha-celebration |
| `fmino-mawlid-2026` | Declaration of Tuesday 25 August 2026 for Eid ul Mawlid | same | https://fmino.gov.ng/fg-declares-tuesday-public-holiday-as-nation-marks-eid-ul-mawlid |
| `constitution-1999` | Constitution of the Federal Republic of Nigeria 1999, Chapter I Part I, section 3 | Jurist.ng | https://jurist.ng/constitution/chapter-1/part-I |
| `iso-3166-2-ng` | ISO 3166-2:NG (secondary copy of the ISO table) | Wikipedia | https://en.wikipedia.org/wiki/ISO_3166-2:NG |
| `ncc-nin-faq` | About the NIN: the 11-digit number issued by NIMC | Nigerian Communications Commission | https://ncc.gov.ng/frequently-asked-questions/about-nin |
| `fctirs-faq` | FAQ: PAYE due on the 10th of the month following deduction | FCT Internal Revenue Service | https://fctirs.gov.ng/faq |
| `pencom-remittance` | Framework for recovery of outstanding pension contributions (Pension Reform Act 2004, section 11) | National Pension Commission | https://www.pencom.gov.ng/framework-for-recovery-of-outstanding-pension-contributions-and-interest-penalty-from-defaulting-employers |
| `nsitf` | NSITF services (the Employees' Compensation Act 2010) | Nigeria Social Insurance Trust Fund | https://nsitf.gov.ng/services (**read from the search index only**; it is listed but no datum depends on it) |
| `gx-nigeria-payroll` | Hire employees in Nigeria (secondary) | Global Expansion | https://www.globalexpansion.com/countrypedia/nigeria |

## Identifier schemes

| Scheme | Applies to | Validation | Status | Basis |
| --- | --- | --- | --- | --- |
| `ng.nin` | learner, guardian, staff | `^[0-9]{11}$`, spaces and hyphens removed | **verified** | `ncc-nin-faq`: the NIN is 11 digits. A well-formed NIN is not proof that NIMC issued it. |
| `ng.birth_certificate` | learner | free text | draft | No published format cited. |
| `ng.tin` | staff | free text | draft | No published format cited. |
| `ng.rsa_pin` | staff | free text | draft | No published format cited. |
| `ng.trcn_number` | staff | free text | draft | No published format cited. |
| `ng.passport` | staff | free text | draft | Differs by issuing country; no format claimed. |

## Addresses

- **States: names verified, codes draft.** The 36 states and the Federal Capital Territory of
  section 3 of the Constitution (`constitution-1999`), in alphabetical order, with ISO 3166-2
  codes (`NG-LA`, `NG-FC` and so on) read from a secondary copy of the ISO table
  (`iso-3166-2-ng`). The level is marked `draft` because of the codes; no official Nigerian code
  list was found.
- **Local government area: not bundled.** The Constitution's First Schedule lists the areas
  (reported as 768 plus six FCT area councils; the figure is from a secondary source), but no
  dataset was fetched, so the area is free text and required.
- City is collected and optional; no postal code is required (NIPOST codes are not modelled).
- `src/utils/locale/addresses.ts` now reads the NG entry from this pack; its keys (`state`, `lga`)
  and label keys (`address.ng.state`, `address.ng.lga`) are unchanged.

## Public holidays

Rules follow the Schedule to the Public Holidays Act (`public-holidays-act`). Coverage begins at
2000-01-01, the year of the last amendment the Act cites; a year before that has none here.

| Holiday | Rule | Status |
| --- | --- | --- |
| New Year's Day | 1 January | verified |
| Good Friday, Easter Monday | Easter offsets -2 and 1 | verified |
| Workers' Day | 1 May | verified |
| Democracy Day | 29 May to 2019-06-09, then 12 June from 2019-06-10 | **draft**: the Schedule names 29 May; the move to 12 June is from news reports (the Act's text was not fetched) and the first year the 29 May entry applied is unconfirmed. |
| Id el Fitr, Id el Kabir | `byYear` 2026: 19 and 20 March; 27 and 28 May (two entries each) | verified for 2026 (Ministry of Interior declarations). Other years have none until their declaration is added. |
| Id el Maulud | `byYear` 2026: 25 August | verified for 2026 |
| Independence Day | 1 October (the Schedule calls it National Day) | verified |
| Christmas Day | 25 December | verified |
| Boxing Day | 26 December | **draft**: the Federal Government declares it; it is not in the Schedule as printed. |

**The weekend rule (verified, `public-holidays-act` section 5):** a holiday on a Saturday or a
Sunday is kept on that day and no day in lieu is given; where a Sunday and a Monday are both
holidays only the Monday is added. `observed: none` expresses it, so the observed date is the
nominal one. The Federal Government sometimes declares a Monday or other day in lieu by notice
under section 2 or 3; those notices are **not modelled**.

**Not modelled:** state holidays (a Governor may appoint days under section 2(2), and states keep
days of their own), the one-off days the President appoints, and Muslim festivals for years other
than 2026.

## Statutory returns (no rates)

| Return | Authority | Due | Status | Basis |
| --- | --- | --- | --- | --- |
| PAYE, monthly | State internal revenue service (FCT-IRS in the FCT) | 10th of the following month | **verified** | `fctirs-faq`; other states' services are assumed to follow it. |
| Pension remittance, monthly | Pension Fund Administrator, supervised by PenCom | 7th working day of the following month | draft | The Commission cites section 11 of the 2004 Act: within 7 days of the day the employee is paid; a secondary source says 7 working days under the 2014 Act. The due rule cannot say "after the salary is paid"; the pack assumes salary is paid at month end. |
| NSITF, monthly | Nigeria Social Insurance Trust Fund | 16th of the following month | draft | `gx-nigeria-payroll` (secondary); no official due day found. |

No rate, percentage, band or amount of any contribution appears in this pack, in its labels or in
its tests; payroll reads those from effective-dated payroll data (task P5-D01). The Industrial
Training Fund (an annual return) is not modelled.

## Draft items to resolve

1. `ng.birth_certificate`, `ng.tin`, `ng.rsa_pin`, `ng.trcn_number`, `ng.passport`: find the
   issuing authority's published format, or keep them free.
2. The ISO 3166-2 state codes, against ISO or an official Nigerian code list.
3. The local government area list (First Schedule of the Constitution).
4. The Public Holidays (Amendment) Act 2019 text and the 29 May start date; Boxing Day's basis.
5. Muslim festival declarations for years other than 2026, as each is published.
6. The pension and NSITF due days, against the Acts and the authorities' notices; the other
   states' PAYE due days.
7. The Hausa labels, by a native speaker.

## Vectors

`tests/ng.vectors.json` holds identifier accept and reject cases with the value each is stored
as, Easter Sunday for 2018, 2019, 2026 and 2027, and the full list of public holidays for those
years: 2018 (29 May), 2019 (both Democracy Days), 2026 (every Muslim festival) and 2027 (a Saturday
12 June and Christmas, a Sunday Boxing Day, none moved). The tests that run them are
`src/domain/country/__tests__/ngCountryPack.test.ts` (schema, semantic, behaviour and the address
entry) and the shared `countryPackSchema.test.ts`.
