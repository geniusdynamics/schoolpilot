# country-za: South Africa

Pack `country-za`, version `1.0.0`, country `ZA`, schema `packs/country/schema.json`.

**Verification status: `draft`.** The twelve public holidays are verified; the identifiers, the province
codes and the statutory return are drafts. Sources were read on 2026-10-27; "read" means the cited text was
found at the URL. The isiZulu labels (`locales/zu.json`) are a **draft translation that no native speaker
has reviewed.**

## Sources

| Id | Document | Publisher | URL |
| --- | --- | --- | --- |
| `gov-za-holidays` | Public holidays in South Africa: twelve days under the Public Holidays Act 36 of 1994; a Sunday holiday is observed on the Monday; lists for 2026 and 2027 | South African Government | https://www.gov.za/about-sa/public-holidays |
| `gov-za-provinces` | South Africa's provinces | South African Government | https://www.gov.za/about-sa/south-africas-provinces |
| `iso-3166-2-za` | ISO 3166-2:ZA (secondary copy of the ISO table) | Wikipedia | https://en.wikipedia.org/wiki/ISO_3166-2:ZA |
| `sars-paye` | Pay As You Earn: employer declarations (names EMP201 and EMP501; states no EMP201 due day) | SARS | https://www.sars.gov.za/types-of-tax/pay-as-you-earn/ |

## Identifier schemes

| Scheme | Applies to | Validation | Status |
| --- | --- | --- | --- |
| `za.id_number` | learner, guardian, staff | `^[0-9]{13}$`, spaces and hyphens removed | draft: thirteen digits is common knowledge but no fetched source states it; the check digit is not validated |
| `za.lurits` | learner | free text | draft |
| `za.tax_number` | staff | free text | draft |
| `za.passport` | learner, staff | free text | draft |

## Addresses

- **Provinces: names read, codes draft.** The nine provinces (`gov-za-provinces`) with ISO 3166-2 codes
  (`ZA-EC`, `ZA-KZN` and so on) from a secondary copy of the ISO table, so the level is a draft.
- **Municipality: not bundled**, free text and required. City optional; the postal code is required.
- `src/utils/locale/addresses.ts` reads the ZA entry from this pack; its keys (`province`, `municipality`),
  label keys and required flags are unchanged.

## Public holidays (verified)

New Year's Day, Human Rights Day (21 March), Good Friday (Easter -2), Family Day (Easter +1), Freedom Day
(27 April), Workers' Day, Youth Day (16 June), National Women's Day (9 August), Heritage Day (24 September),
Day of Reconciliation (16 December), Christmas Day and Day of Goodwill. Coverage begins 2000-01-01.

**The Sunday rule (verified, `gov-za-holidays`):** a holiday on a Sunday is observed on the following Monday.
The module moves it to the first following day that is not itself a holiday, so Sunday Christmas 2022 is
observed on Tuesday 27 December (Boxing Day holds the Monday). The vectors for 2026 and 2027 equal the
government's lists (Women's Day observed on 10 August 2026, Human Rights Day on 22 March 2027).

**Not modelled:** one-off holidays the President declares, school holidays, and amendments to the Act (its text
was not fetched).

## Statutory returns (no rates)

| Return | Authority | Due | Status |
| --- | --- | --- | --- |
| EMP201 monthly employer declaration | SARS | 7th of the following month | draft: the day is commonly stated; the fetched page does not give it |

No rate, percentage or amount appears in the pack, its labels or its tests.

## Draft items to resolve

1. The ID number format and check digit; LURITS and tax number formats.
2. The ISO 3166-2 province codes; the municipality list.
3. The Public Holidays Act text and its amendments.
4. The EMP201 due day, and the other employer returns (UIF, skills levy).
5. The isiZulu labels, by a native speaker.

## Vectors

`tests/za.vectors.json`: identifier accept and reject cases, Easter Sunday for 2022, 2026 and 2027, and the full
holiday lists for 2022 (a Sunday Christmas), 2026 and 2027. Tests: `src/domain/country/__tests__/zaCountryPack.test.ts`
and the shared `countryPackSchema.test.ts`.
