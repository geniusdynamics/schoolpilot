# country-ug: Uganda

Pack `country-ug`, version `1.0.0`, country `UG`, schema `packs/country/schema.json`.

**Verification status: `draft`.** Below, every datum is marked **verified** (an official source the
pack cites states it) or **draft**. Sources were read on 2026-10-27. The Kiswahili labels
(`locales/sw.json`) are a **draft translation** no native speaker has reviewed.

## Sources

| Id | Document | Publisher | URL |
| --- | --- | --- | --- |
| `ulii-public-holidays` | ULII legislation search for "public holidays": lists the Public Holidays Act (Act 23 of 1965) and the Declaration of a Public Holiday, 2026. **The Act's text could not be read**: ULII blocked the document pages to the fetcher. | Uganda Legal Information Institute | https://ulii.org/legislation/?q=public+holidays |
| `ura-returns` | Domestic taxes: returns. Monthly returns, including PAYE, are due on the 15th day of the month following the return period. | Uganda Revenue Authority | https://ura.go.ug/en/domestic-taxes/returns/ |

## Identifier schemes

| Scheme | Applies to | Validation | Status |
| --- | --- | --- | --- |
| `ug.lin` | learner | free text | draft: no published format |
| `ug.birth_certificate` | learner, guardian | free text | draft |
| `ug.nin` | learner, guardian, staff | `^C[MF][0-9A-Z]{12}$` (14 characters), spaces removed, upper-cased | draft: a working rule from the usual shape; no NIRA source cited |
| `ug.tin` | staff | ten digits | draft: no URA source cited |
| `ug.nssf_number` | staff | free text | draft |
| `ug.passport` | staff | free text | draft |

## Addresses

District (required), sub-county (required) and parish (optional) are free text; city is collected and
optional, no postal code is required. **No district list is bundled**: no official list with codes was
reachable (the UBOS census dissemination PDF is a scanned image). The levels are the ones the app's UG address
form already had, so the form is unchanged; `src/utils/locale/addresses.ts` now reads them from this pack.

## Public holidays (all draft)

Fixed: New Year's Day (1 Jan), NRM Liberation Day (26 Jan), Archbishop Janani Luwum Day (16 Feb),
International Women's Day (8 Mar), Labour Day (1 May), Uganda Martyrs' Day (3 Jun), National Heroes' Day
(9 Jun), Independence Day (9 Oct), Christmas Day, Boxing Day. Easter-based: Good Friday and Easter Monday.

Every holiday is **draft**: the Public Holidays Act could not be read, so the list and dates are the
Act as remembered and ULII's listing only confirms the Act exists. The same applies to the Sunday rule (a
holiday on a Sunday is observed on the next free day, as in the KE pack), modelled as `sunday_to_monday`.
Holidays start at 2020-01-01, the pack's coverage, not the year each was enacted.

**Not modelled:** Eid-ul-Fitr and Eid-ul-Adha (moon-dependent: the declaration was not read, so no dated
list is given and none was invented), and one-off days declared by statutory instrument (ULII lists
"Declaration of a Public Holiday, 2026", not read).

## Statutory returns (no rates)

| Return | Authority | Due | Status |
| --- | --- | --- | --- |
| PAYE, monthly | Uganda Revenue Authority | 15th of the following month | **verified** (`ura-returns`) |
| NSSF, monthly | National Social Security Fund | 15th of the following month | draft: assumed to match PAYE; no NSSF source read |

No rate, percentage, band or amount of any contribution appears in this pack.

## Draft items to resolve

1. Read the Public Holidays Act and confirm the list, the dates and the Sunday rule; add the Eid dates from each declaration.
2. Identifier formats for the LIN (UNEB/Ministry), NIN (NIRA) and TIN (URA).
3. An official district list with codes, and the sub-county and parish lists if published.
4. The NSSF due day.
5. The Kiswahili labels, by a native speaker.

## Vectors

`tests/ug.vectors.json`: identifier accept and reject cases with the normalised value, Easter Sunday for
three years, and every holiday, nominal and observed, for 2024 (Heroes' Day on a Sunday moves to the Monday),
2026 (Women's Day on a Sunday moves to the Monday) and 2027 (Boxing Day on a Sunday moves to the Monday).
They check the pack against its own rules; because the rules are draft they are not evidence of the law.
The tests that run them are `src/domain/country/__tests__/ug.test.ts`.
