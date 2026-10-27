# Country pack: Senegal (SN)

Identifiers, address hierarchy, public holidays and statutory returns for Senegal, in the format of `packs/country/README.md`.
Labels: `locales/fr.json` (primary, a draft no native speaker reviewed) and `locales/en.json`.

**Verification status: `draft`.** Every datum below is a draft; sources were read on 2026-10-27. No Senegalese statute or gazette was
reachable, so nothing is marked `verified`.

## Sources

| Source | URL | Used for |
| --- | --- | --- |
| ISO 3166-2:SN (secondary copy of the ISO table) | https://en.wikipedia.org/wiki/ISO_3166-2:SN | The 14 regions and their codes. |
| Public holidays in Senegal (secondary) | https://en.wikipedia.org/wiki/Public_holidays_in_Senegal | The fixed and Easter-based holidays. |

## What is in the pack

- **Identifiers (draft, free text).** `sn.national_id` (guardian, staff) and `sn.birth_certificate` (learner). No format was found in a fetched source, so none is claimed.
- **Address.** Region (required, 14 values with ISO codes, draft) and department (free text).
- **Holidays (draft).** New Year, Independence Day (4 April), Easter Monday, Labour Day, Ascension (Easter + 39 days), Whit Monday (Easter + 50), Assumption, All Saints, Christmas. A holiday on a Sunday keeps its own day.
- **Statutory returns.** None: the DGID pages fetched name the returns (CFCE, TVA, IS) but no due day or a school's obligations.

## Known gaps

1. The statute that sets the public holidays.
2. The moon-dependent holidays (Korite, Tabaski, Maouloud, Tamkharit, Grand Magal of Touba): no declaration was fetched, so none is listed.
3. Identifier formats (national identity number, NINEA).
4. The department list and official region codes from a gazette.
5. Statutory returns and their due days (CFCE, social security).
6. French and English labels not reviewed by a native speaker.

`tests/sn.vectors.json` holds the identifier and holiday vectors that `src/domain/country/__tests__/frCountryPacks.test.ts` runs.
