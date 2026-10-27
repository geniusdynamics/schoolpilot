# Country pack: Cameroon (CM)

Identifiers, address hierarchy, public holidays and statutory returns for Cameroon (the Francophone subsystem), in the
format of `packs/country/README.md`. Labels: `locales/fr.json` (primary, a draft no native speaker reviewed) and
`locales/en.json`.

**Verification status: `draft`.** Every datum below is a draft; sources were read on 2026-10-27. The Ministry of
Secondary Education's site (`minesec.gov.cm`) served unrelated content when fetched, so no Ministry text was used.

## Sources

| Source | URL | Used for |
| --- | --- | --- |
| ISO 3166-2:CM (secondary copy of the ISO table) | https://en.wikipedia.org/wiki/ISO_3166-2:CM | The 10 regions and their codes. |
| Public holidays in Cameroon (secondary) | https://en.wikipedia.org/wiki/Public_holidays_in_Cameroon | The fixed and Easter-based holidays. |
| Calendrier fiscal | https://www.impots.cm/fr/calendrier-fiscal | A monthly declaration and payment 15 days after the month (a road-transporter row, art. 91 CGI). **Fetched.** |

## What is in the pack

- **Identifiers (draft, free text).** `cm.national_id` (guardian, staff) and `cm.birth_certificate` (learner). No format found.
- **Address.** Region (required, 10 values with ISO codes, draft) and division (free text).
- **Holidays (draft).** New Year, Youth Day (11 February), Good Friday, Labour Day, Ascension (Easter + 39), National Day (20 May), Assumption, Christmas.
- **Statutory return (draft).** `monthly-vs-irpp-tva`: monthly, due on the 15th of the following month. It is read from a table for road transporters; whether it applies unchanged to a school's payroll withholding is unconfirmed. No rate is stated.

## Known gaps

1. The statute that sets the public holidays; Korite and Tabaski, which depend on the moon, are not listed.
2. Identifier formats; the division list; the return applicable to a school employer, and the social-security (CNPS) return.
3. The Anglophone (GCE) subsystem has no country-pack content of its own: the pack's `languages` list English, and a bilingual school needs a second curriculum programme.
4. French and English labels not reviewed by a native speaker.

`tests/cm.vectors.json` holds the identifier and holiday vectors that `src/domain/country/__tests__/frCountryPacks.test.ts` runs.
