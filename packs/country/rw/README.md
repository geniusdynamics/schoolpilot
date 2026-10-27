# country-rw: Rwanda

Pack `country-rw`, version `1.0.0`, country `RW`, schema `packs/country/schema.json`.

**Verification status: `draft`.** Below, every datum is marked **verified** (a fetched official or legal source states
it) or **draft** (it is not confirmed; the reason is given). Sources were read on 2026-10-27. The Kinyarwanda labels
(`locales/rw.json`) are a **draft translation** no native speaker has reviewed. French is not shipped.

## Sources

| Id | Document | URL | How read |
| --- | --- | --- | --- |
| `presidential-order-54-2017` | Presidential Order 54 of 2017 determining Official Public Holidays (RwandaLII, "latest version") | https://rwandalii.org/akn/rw/act/po/2017/54/eng@2017-03-13 | fetched |
| `govrw-holidays` | Holidays 2026 (Government of Rwanda) | https://www.gov.rw/holidays | fetched |
| `iso-3166-2-rw` | ISO 3166-2:RW (Wikipedia, secondary) | https://en.wikipedia.org/wiki/ISO_3166-2:RW | fetched |
| `id4d-rwanda` | Country Diagnostic: Rwanda, the 16-digit NIN (World Bank) | https://thedocs.worldbank.org/en/doc/573111524689463285-0190022018/original/RwandaID4DDiagnosticWeb040318.pdf | search index only |
| `rra-paye` | Pay Employment tax (PAYE), Rwanda Revenue Authority | https://www.rra.gov.rw/en/domestic-tax-services/employment-tax-paye/pay-paye | fetched |
| `rra-rssb` | Declaration and payment of RSSB contributions, Rwanda Revenue Authority | https://www.rra.gov.rw/en/domestic-tax-services/rssb-contributions/declaration-payment-of-rssb-contributions | fetched |

## Identifier schemes

`rw.nid` (learner, guardian, staff): sixteen digits, spaces and hyphens removed. **Draft**: the length is from the
World Bank description read from the search index; the last two digits are a secret check, so only the shape is
validated. `rw.birth_certificate`, `rw.tin`, `rw.rssb_number`, `rw.passport`: free text, draft, no published format.

## Addresses

Province (the City of Kigali and four provinces, ISO 3166-2:RW codes `RW-01` to `RW-05`; **draft**, secondary copy of
the ISO table), district (required, free text), sector (optional, free text); city optional; no postal code.
`src/utils/locale/addresses.ts` now reads the RW entry from this pack; its keys and label keys are unchanged. No
district, sector or cell list is bundled.

## Public holidays

Articles 3 and 4 of the Order (**verified**, effective 2017-03-13): New Year's Day, the day after, National Heroes'
Day (1 February), Good Friday, Easter Monday, Genocide Memorial Day (7 April), Labour Day, Independence Day
(1 July), Liberation Day (4 July), Assumption Day (15 August), Christmas, Boxing Day.

- **Umuganura: draft.** The Order says the Friday of the first week of August, which a date rule cannot state, so
  the dates are listed for 2025 to 2027. The government page lists **1 August 2026, a Saturday**, not the first Friday
  (7 August); the pack follows the page for 2026.
- **Eid el Fitr and Eid al-Adha** are announced each year by the Rwanda Muslim Association: **no date is listed for
  any year** because none was fetched.
- **Weekend rule (Article 4):** a holiday on a weekend moves to the following working day, except 7 April; two
  consecutive weekend holidays are compensated in one working day. The pack's `sunday_to_monday` covers the Sunday
  move (it reproduces the government page's 2 February 2026); **the Saturday move and the compensation are not
  modelled**.
- A secondary site says a 2022 Presidential Order (062/01) repeats the list; it was not fetched, so whether the 2017
  text is still current is unconfirmed.

## Statutory returns (no rates)

| Return | Due | Status |
| --- | --- | --- |
| PAYE, monthly | 15th of the following month | **verified** (`rra-paye`; quarterly declaration for small taxpayers is not modelled) |
| RSSB contributions, monthly | 15th of the following month | **verified** (`rra-rssb`) |

No rate, band or amount appears in this pack.

## Draft items to resolve

1. The 2022 holiday order; the Saturday rule and the compensation rule (need a schema extension).
2. Umuganura's date rule and its 2026 date; Eid dates as announced each year.
3. The NIN format from an issuer's document; the other identifier formats.
4. An official province code list; district and sector lists.
5. The Kinyarwanda labels, by a native speaker.

## Vectors

`tests/rw.vectors.json`: identifier accept and reject cases with the value each is stored as, Easter Sunday for 2018,
2026 and 2027, and every public holiday for 2018, 2026 (a Sunday Heroes' Day moved to 2 February) and 2027 (Sunday
Liberation Day, Assumption and Boxing Day moved). Run by `src/domain/country/__tests__/rwCountryPack.test.ts`.
