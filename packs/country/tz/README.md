# country-tz: Tanzania

Pack `country-tz`, version `1.0.0`, country `TZ`, schema `packs/country/schema.json`.

**Verification status: `draft`, and no datum in it is marked verified.** The Tanzanian statute and the revenue
authority's pages could only be read from the search index (the Act is a PDF; tanzanialaws.com returned 404; the TRA
pages gave a transport error), so nothing is claimed as read in a fetched official source. Sources were read on
2026-10-27. The Swahili labels (`locales/sw.json`) are a **draft translation** no native speaker has reviewed.

## Sources

| Id | Document | URL | How read |
| --- | --- | --- | --- |
| `public-holidays-act` | Public Holidays Act, Cap. 35 R.E. 2023, sections 2 to 4 and the Schedule (Office of the Attorney General) | https://oagmis.oag.go.tz/portal/acts/revised/140/download | search index only |
| `bot-holidays-2025` | Public holidays 2025 (Bank of Tanzania) | https://www.bot.go.tz/webdocs/Other/PUBLIC%20HOLIDAYS%202025.pdf | search index only |
| `iso-3166-2-tz` | ISO 3166-2:TZ (Wikipedia, secondary) | https://en.wikipedia.org/wiki/ISO_3166-2:TZ | fetched |
| `nida-nin-validator` | NIDA number validator, 20 digits (ValidateList, secondary) | https://validatelist.com/validate/national-id/tanzania/ | search index only |
| `tra-paying-taxes` | Paying taxes (Tanzania Revenue Authority) | https://www.tra.go.tz/page/paying-taxes | search index only |

## Identifier schemes

`tz.nida` (learner, guardian, staff): twenty digits, spaces and hyphens removed. **Draft**: from a secondary source,
format only; NIDA publishes no format the pack could read. `tz.birth_certificate`, `tz.tin`, `tz.nssf_number`,
`tz.passport`: free text, draft, no published format cited.

## Addresses

Region (31, ISO 3166-2:TZ codes `TZ-01` to `TZ-31`; **draft**, from a secondary copy of the ISO table), district
(required, free text), ward (optional, free text); city optional; no postal code. `src/utils/locale/addresses.ts`
now reads the TZ entry from this pack; its keys and label keys are unchanged. No district or ward list is bundled.

## Public holidays

New Year's Day, Zanzibar Revolution Day (12 January), Good Friday, Easter Monday, Union Day (26 April), Workers' Day,
Peasants' Day (8 August), Nyerere Day (14 October, from 2022-07-01 approximately), Independence and Republic Day
(9 December), Christmas, Boxing Day: in the Schedule as read from the search index. Karume Day (7 April) and Saba Saba
(7 July) are not in the revised Schedule as read and are kept from the Bank of Tanzania's list. Id-ul-Fitr, Id-el-Haj
and Maulidi depend on the moon and are listed for **2025 only** (Bank of Tanzania, one date each; the Act gives two
days for Id-ul-Fitr). **Every holiday is draft.**

**Weekend rule (section 4):** a holiday on a Saturday or Sunday gives the next day that is not itself a holiday as a
holiday in lieu. The pack's `sunday_to_monday` covers the Sunday case; **the Saturday case is not modelled**, so a
Saturday holiday is kept on its Saturday here. Presidential proclamations (section 3) are not modelled.

## Statutory returns (no rates)

| Return | Due | Status |
| --- | --- | --- |
| PAYE, monthly | 7th of the following month | draft (TRA page, search index only) |
| Skills Development Levy, monthly | 7th of the following month | draft; a secondary guide lists registered educational institutions as exempt employers, so whether a school owes it is for its adviser |

NSSF, PSSSF and the Workers Compensation Fund are due "within one month after month end", which the due rules cannot
state, so they are **not modelled**. No rate, band or amount appears in this pack.

## Draft items to resolve

1. Fetch the Act (OAG or TanzLII PDF) and confirm the Schedule, Nyerere Day's start date and whether Karume Day and
   Saba Saba are proclaimed yearly.
2. The Saturday weekend rule (needs a schema extension) and the second day of Id-ul-Fitr.
3. Moon-dependent dates for years other than 2025.
4. The NIDA format; the other identifier formats.
5. An official region code list; district and ward lists.
6. TRA due days from a fetched page; NSSF, PSSSF and WCF dates.
7. The Swahili labels, by a native speaker.

## Vectors

`tests/tz.vectors.json`: identifier accept and reject cases with the value each is stored as, Easter Sunday for 2021,
2025, 2026 and 2027, and every public holiday for 2021 (before Nyerere Day), 2025 (moon-dependent days, a Sunday
Revolution Day), 2026 and 2027 (Sunday moves). Run by `src/domain/country/__tests__/tzCountryPack.test.ts`.
