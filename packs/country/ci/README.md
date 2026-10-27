# Country pack: Cote d'Ivoire (CI)

Identifiers, address hierarchy, public holidays and statutory returns for Cote d'Ivoire, in the format of `packs/country/README.md`.
Labels: `locales/fr.json` (primary, a draft no native speaker reviewed) and `locales/en.json`.

**Verification status: `draft`.** Every datum below is a draft; sources were read on 2026-10-27. The Ministry of National Education's
site was reachable but it publishes no holiday statute, so nothing is marked `verified`.

## Sources

| Source | URL | Used for |
| --- | --- | --- |
| ISO 3166-2:CI (secondary copy of the ISO table) | https://en.wikipedia.org/wiki/ISO_3166-2:CI | The 14 districts (in force since 27 November 2015) and their codes. |
| Public holidays in Ivory Coast (secondary) | https://en.wikipedia.org/wiki/Public_holidays_in_Ivory_Coast | The fixed and Easter-based holidays. |

## What is in the pack

- **Identifiers (draft, free text).** `ci.national_id` (guardian, staff) and `ci.birth_certificate` (learner). No format found.
- **Address.** District (required, 14 values with ISO codes, draft) and region (free text; no region list is bundled).
- **Holidays (draft).** New Year, Easter Monday, Labour Day, Ascension (Easter + 39), Whit Monday (Easter + 50), Independence Day (7 August), Assumption, All Saints, National Peace Day (15 November), Christmas.
- **Statutory returns.** None: the CNPS and tax pages fetched give no due day.

## Known gaps

1. The statute that sets the public holidays; the moon-dependent holidays (the day after the Prophet's birthday, the day after Laylat al-Qadr, Korite, Tabaski): none is listed.
2. Identifier formats; the region list; the monthly CNPS and tax returns.
3. French and English labels not reviewed by a native speaker.

`tests/ci.vectors.json` holds the identifier and holiday vectors that `src/domain/country/__tests__/frCountryPacks.test.ts` runs.
