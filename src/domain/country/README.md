# The country module

What a country contributes (identifier schemes, the address hierarchy, public holidays, statutory
returns) lives in a **country pack**, `packs/country/<cc>/country.json`, validated by
`packs/country/schema.json`. This module loads the packs the app ships and answers questions about
them with pure functions. Nothing here knows Kenya: add a pack directory and its country is served.

```ts
import {
  addressLevelChoices,
  countryAddressSchema,
  holidaysOf,
  identifierSchemesFor,
  validateIdentifier,
} from '@/domain/country';

identifierSchemesFor('KE', 'guardian');
// [{ value: 'ke.national_id', label: 'National ID', hint: 'Seven or eight digits.' }, ...]

validateIdentifier('KE', 'ke.kra_pin', ' a123456789z ');   // { ok: true, value: 'A123456789Z' }
validateIdentifier('KE', 'ke.kra_pin', 'A12345');           // { ok: false, message: 'Not a valid KRA PIN. Eleven characters: ...' }

holidaysOf('KE', 2027).find((day) => day.id === 'jamhuri-day');
// { id: 'jamhuri-day', nameKey: '...', date: '2027-12-12', observed: '2027-12-13', verification: 'verified' }

addressLevelChoices('KE', 'county', savedCounty);           // county names; a saved value not on the list comes first
```

## The API

| Export | Signature | What it does |
| --- | --- | --- |
| `getCountryPack` | `(country) => CountryPack \| undefined` | The pack of an ISO 3166-1 alpha-2 code, either case. |
| `countryLabels` | `(country) => Record<string, string>` | The pack's English labels by label key. |
| `COUNTRY_PACK_CODES` | `readonly string[]` | The countries the app ships. |
| `identifierSchemesFor` | `(country, ownerType) => { value, label, hint? }[]` | The schemes for `learner`, `guardian` or `staff`, in the order the pack ranks them. |
| `validateIdentifier` | `(country, scheme, value) => { ok: true, value } \| { ok: false, message }` | Normalises the value as the pack says and checks it. `value` is what to store. A `free` scheme claims no format: only empty or oversize values are refused. An unknown scheme or country is refused. |
| `holidaysOf` | `(country, year) => DatedHoliday[]` | The year's holidays, each with the date the law names and the date observed, in observed order. |
| `easterSunday` | `(year) => 'YYYY-MM-DD'` | The Gregorian computus. |
| `countryAddressSchema` | `(country) => CountryAddressSchema \| undefined` | The address hierarchy in the shape `utils/locale/addresses` uses. |
| `addressLevelOptions` | `(country, levelKey) => { code, name }[]` | A level's fixed list (Kenya's 47 counties); empty when the level is free text. |
| `addressLevelChoices` | `(country, levelKey, current?) => string[]` | The names for a select that stores the name; a stored value not on the list is kept selectable. |

## Rules the functions follow

- **Normalisation order** is fixed (trim, remove spaces, remove hyphens, upper-case) whatever order a
  pack lists the steps in, and the pattern is tested against the normalised value.
- **Holiday dating.** A holiday applies to a year when its date falls within `effectiveFrom` and
  `effectiveTo`; so the 10 October holiday takes the name in force on that date. A `byYear` holiday
  exists only for the years listed.
- **The Sunday rule.** A `sunday_to_monday` holiday on a Sunday is observed on the first following day
  that is not itself a holiday, and no two holidays share an observed day.
- **No rates.** A country pack states returns, authorities and due rules, never a contribution rate.

## Who uses it

- `src/utils/locale/addresses.ts`: the `KE` address schema comes from the pack.
- `src/modules/admissions/data/admissionForm.ts`: the identifier scheme lists, the validation of
  `identifier_value` and `guardian_identifier_value`, and the normalised value stored.
- The application forms (`ApplicationFormPage`, `PublicApplicationPage`): the county select.

## The module

| File | Holds |
| --- | --- |
| `types.ts` | The pack document's shape and the module's return types. |
| `registry.ts` | The bundled packs and labels, found by an eager glob. |
| `identifiers.ts` | Scheme listing and value validation. |
| `holidays.ts` | Easter, rule resolution, effective dating and the Sunday rule. |
| `address.ts` | The address schema and the fixed level lists. |
| `index.ts` | The public API; a caller imports from here. |

## The tests

| File | Guards |
| --- | --- |
| `__tests__/countryPackSchema.test.ts` | The KE pack validates; broken documents (wrong country code, bad id, scheme without prefix, duplicate item, unknown rule type, impossible month, extra property at every level, a rate on a return, missing sections) are refused; the cross-field checks pass on the real pack and fail on seeded faults. |
| `__tests__/countrySemantics.ts` | The cross-field checks themselves (unique scheme ids and the country prefix, resolving source refs and label keys, compiling patterns). |
| `__tests__/country.test.ts` | Identifier and holiday behaviour driven by `packs/country/ke/tests/ke.vectors.json`, the address schema and the county list. |

The admission form's and the address schema's own tests live beside them:
`src/modules/admissions/data/__tests__/admissionForm.test.ts` and
`src/utils/locale/__tests__/addresses.test.ts`.
