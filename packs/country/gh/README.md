# country-gh: Ghana

Pack `country-gh`, version `1.0.0`, country `GH`, schema `packs/country/schema.json`.

**Verification status: `draft`.** Only one datum is verified (the PAYE due day). Sources were read on
2026-10-27; "read" means the cited text was found at the URL. The Akan (Twi) labels (`locales/ak.json`)
are a **draft translation that no native speaker has reviewed.**

## Sources

| Id | Document | Publisher | URL |
| --- | --- | --- | --- |
| `gra-paye` | Pay As You Earn: monthly returns on or before the fifteenth day of the following month | Ghana Revenue Authority | https://gra.gov.gh/domestic-tax/tax-types/paye/ |
| `public-holidays-gh` | Public holidays in Ghana (secondary list; cites no statute) | Wikipedia | https://en.wikipedia.org/wiki/Public_holidays_in_Ghana |
| `iso-3166-2-gh` | ISO 3166-2:GH (secondary copy of the ISO table) | Wikipedia | https://en.wikipedia.org/wiki/ISO_3166-2:GH |
| `nia` | National Identification Authority, the Ghana Card (no number format stated) | NIA | https://nia.gov.gh/ |

## Identifier schemes

| Scheme | Applies to | Validation | Status |
| --- | --- | --- | --- |
| `gh.ghana_card` | learner, guardian, staff | free text | draft: no format stated in a cited source |
| `gh.birth_certificate` | learner | free text | draft |
| `gh.tin` | staff | free text | draft |
| `gh.ssnit_number` | staff | free text | draft |
| `gh.passport` | staff | free text | draft |

## Addresses

- **Regions: draft.** The 16 regions with ISO 3166-2 codes (`GH-AA` Greater Accra and so on), read from a
  secondary copy of the ISO table. No official Ghanaian code list was found.
- **District: not bundled.** The metropolitan, municipal or district assembly is free text and required.
- City optional; no postal code required.
- `src/utils/locale/addresses.ts` reads the GH entry from this pack; its keys (`region`, `district`) and
  label keys (`address.gh.region`, `address.gh.district`) are unchanged.

## Public holidays (all draft)

New Year's Day (1 January), Independence Day (6 March), Good Friday and Easter Monday (Easter offsets),
May Day (1 May), Christmas Day, Boxing Day, in effect from 2020-01-01. **No statute was fetched**, so every
holiday is a draft. A weekend holiday is kept on its own day (`observed: none`); the secondary list says
the following Monday is usually declared, and those notices are not modelled.

**Not modelled** (dates and statuses changed between acts and no act was read): Constitution Day, Republic
Day, Founders' Day and Kwame Nkrumah Memorial Day, Farmers' Day, Eid al-Fitr and Eid al-Adha.

## Statutory returns (no rates)

| Return | Authority | Due | Status |
| --- | --- | --- | --- |
| PAYE, monthly | Ghana Revenue Authority | 15th of the following month | **verified** (`gra-paye`) |

SSNIT and tier-two pension remittance days were not found in a fetched source and are not modelled. No
rate, percentage or amount appears in the pack, its labels or its tests.

## Draft items to resolve

1. The Ghana Card, birth certificate, TIN and SSNIT number formats.
2. The ISO 3166-2 region codes against ISO or an official list; the district list.
3. The Public Holidays and Commemorative Days Act and its amendments; the omitted holidays; weekend notices.
4. Eid dates (declared yearly), SSNIT and pension due days.
5. The Akan labels, by a native speaker.

## Vectors

`tests/gh.vectors.json`: identifier accept and reject cases, Easter Sunday for 2024 to 2027 and the full
holiday lists for 2026 and 2027. Tests: `src/domain/country/__tests__/ghCountryPack.test.ts` and the shared
`countryPackSchema.test.ts`.
