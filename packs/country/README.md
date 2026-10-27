# Country packs

A country pack is the data one country contributes to the platform: the identifier schemes people
hold there, the address hierarchy its forms collect, its public holidays and the statutory returns
a school files. Packs are data, validated by schema and versioned (spec 06 section 10). They hold
**no code and no rates**.

```
packs/country/
  schema.json            JSON Schema 2020-12 of country.json
  <cc>/                  one directory per country, lower-case ISO 3166-1 alpha-2
    country.json        the pack document
    locales/en.json     labels (curriculum-pack locale schema: { "labels": { key: text } })
    locales/<lang>.json other languages, same keys
    tests/<cc>.vectors.json  conformance vectors
    README.md           every source with its URL, and every datum marked verified or draft
```

## The document

`country.json` carries `schemaVersion` 1, `id` `country-<cc>`, `kind` `country`, `country`, `name`,
a semver `version`, `verification`, `sources`, `defaults`, `identifiers`, `addressHierarchy`,
`holidays` and `statutoryReturns`. The schema sets `additionalProperties: false` throughout, so a
misspelt key fails.

| Section | What it states |
| --- | --- |
| `sources` | Each document the pack relies on: id, title, publisher, https URL, the date it was read. |
| `defaults` | Currency, languages, IANA time zone, phone region, calendar and first weekday. |
| `identifiers` | A scheme id `<cc>.<name>`, its label and hint keys, the owner types it applies to (`learner`, `guardian`, `staff`), an optional `order` per owner type, and its validation: `{type:"pattern", pattern, normalise[]}` or `{type:"free"}` (no format claimed). |
| `addressHierarchy` | The levels in order (key, label key, required, optional fixed `options.values[{code,name}]`), whether a city is collected or required, and the postal code rule. |
| `holidays` | Each holiday's rule (`fixed` month and day, `easter` offset in days, or `byYear` dates a gazette published), the dates it is in effect, whether a Sunday holiday is `observed` on the next free day, and its source. |
| `statutoryReturns` | The return's authority, frequency and due rule. **No rate, band or amount appears here**: statutory contribution rates are effective-dated payroll data (task P5-D01). |

Every identifier, holiday and statutory return carries `verification`: `verified` only when an
official source the pack cites states it, otherwise `draft`. The pack's own `verification` is
`verified` only when every datum is. A verified identifier must name its `sourceRef`; a draft one
with no published format has none and says so in its `note`.

## What the schema cannot say

Four rules need a second pass, which `src/domain/country/__tests__/countrySemantics.ts` runs over the
real pack: scheme ids are unique and start with `<cc>.`; every `sourceRef` names a source; every
label, hint and name key exists in `locales/en.json`; every pattern compiles. The schema's
`uniqueItems` refuses an identifier repeated byte for byte; two schemes with the same id but
different text are refused by the second pass.

## Adding a country

1. Create `packs/country/<cc>/country.json`, `locales/en.json`, `tests/<cc>.vectors.json` and a README.
2. Cite each source in the README with its URL and say, for every datum, whether it is verified or draft.
3. The registry (`src/domain/country/registry.ts`) bundles every `packs/country/*/country.json`, so
   no registry change is needed to ship a pack. The schema, semantic and vector tests in
   `src/domain/country/__tests__/` currently name the KE pack's files; a new country adds its own
   cases there.
