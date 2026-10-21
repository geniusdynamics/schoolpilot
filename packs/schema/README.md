# Curriculum Pack JSON Schemas

Published schemas for the Curriculum Pack format defined by
[spec 03](../docs/specs/multi-curriculum-platform/03-curriculum-and-assessment.md). A pack is
plain JSON validated by these files; the engine never names a curriculum (spec 03 C-2).

## Files

| File | Defines | Spec |
| --- | --- | --- |
| `pack.schema.json` | Root document composing every section below | 03 §2.1 |
| `manifest.schema.json` | `pack.json`: code, version, country, issuers, effective dates, languages, engine range, sources, verification, overridable paths | 03 §2.2, §2.3 |
| `structure.schema.json` | `structure.json`: stages, levels, pathways, calendar template and periods | 03 §3 |
| `learning-areas.schema.json` | `learning-areas.json`: learning areas, components, competencies, combination rules | 03 §3 |
| `assessment.schema.json` | `assessment.json`: schemes, slots, learning-area score, component policy, missing policy, rounding, formative observations, period-to-annual rule | 03 §4, §4.1 |
| `grading-scale.schema.json` | One grading scale and its bands | 03 §5 |
| `aggregation.schema.json` | One result aggregation, its group constraints and `fail_if` | 03 §6 |
| `ranking.schema.json` | Ranking policy | 03 §6.1 |
| `progression.schema.json` | `progression.json`: promotion and graduation rules | 03 §7 |
| `report.schema.json` | One report template, its page setup, blocks and result columns | 03 §8.1 |
| `locale.schema.json` | One locale: labels, descriptors, comment-bank seeds | 03 §2.1, §8.2 |
| `tests.schema.json` | `tests/*.vectors.json`: conformance vectors | 03 §12 |
| `common.schema.json` | Shared scalars: codes, names, dates, semver, locale tags, weights, precision, override paths | 03 §2.1, §2.3; 02 §1.2 |

The root is a **composition**. On disk a pack is split per spec 03 §2.1 (`pack.json`,
`structure.json`, `learning-areas.json`, `assessment.json`, `progression.json`, `reports/`,
`locales/`, `tests/`). Each section file validates against its own schema; the assembled
document validates against `pack.schema.json`. `examples/ke-cbe.pack.json` shows the assembled
form.

Spec 03 prints the `schemes`, `annual` and `aggregations` blocks as fragments rather than whole
`assessment.json` documents. `assessment.schema.json` exposes matching wrappers under `$defs`
(`schemesSection`, `annualSection`, `aggregationsSection`) so each printed block is validated
exactly as written.

## Draft and references

- JSON Schema draft 2020-12.
- Every file has an `$id` under
  `https://schemas.schoolpilot.app/curriculum-pack/v1/`. Cross-file `$ref`s are relative to that
  base, so a validator must register all files (any order) before compiling `pack.schema.json`.
- No remote `$ref` is used; validation works offline.
- The schemas are developer-facing. They contain no user-visible copy, so there is nothing to
  translate.

## Validating a pack

`ajv` (already in the dependency tree as a transitive package) is the validator used by the
tests:

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';

const dir = 'packs/schema';
const ajv = new Ajv2020({ strict: true, strictRequired: false, allErrors: true });
for (const file of readdirSync(dir).filter((name) => name.endsWith('.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(join(dir, file), 'utf8')));
}

const validate = ajv.getSchema(
  'https://schemas.schoolpilot.app/curriculum-pack/v1/pack.schema.json',
);
if (!validate) throw new Error('pack schema not registered');
const valid = validate(JSON.parse(readFileSync('packs/schema/examples/ke-cbe.pack.json', 'utf8')));
```

`strictRequired` is disabled because `required` inside an `if`/`then` branch refers to the
parent object's properties. Every other Ajv strict check is enabled.

## Constraints the schema enforces

- Required sections and required properties in every section.
- Closed objects: unknown keys are refused (`additionalProperties: false`), except the
  intentional escape hatches documented below.
- Enumerations named by the spec: learning-area kinds, component kinds, competency kinds,
  assessment kinds, missing-mark policies, grading-scale kinds, aggregation operators,
  aggregation value selectors, tie methods, promotion rules, report block types and result
  columns.
- Patterns and ranges: pack code, entity code, semver, pack reference, locale tag, calendar
  date shape, MM-DD period bounds, year and month bounds, weight 0 to 1, precision 0 to 6,
  `max`, `scale_to` and `out_of` greater than 0, `ordinal` and `typical_age` ranges.
- Shape conditionals: a slot needs `max` or `scale_to`; `core_all` needs `of`; `electives` needs
  `count`; `stage_transition` needs `to_stage`; `threshold` needs `conditions` and `else`;
  `class_council` needs `suggest`; `weighted_mean` needs `weights`; `best_n` needs `n`, `value`
  and `groups`; `best_of` needs `best_of` or `n`; `papers: best_of` needs `best_of`; an enabled
  ranking needs `scope`, `by` and `ties`; a non-draft verification needs at least one reviewer;
  numeric band scales need `bands`.
- Mutual exclusion: a scheme is either a marks scheme or a formative-evidence scheme, never a
  mixture of both (`oneOf` with closed branches).

## Constraints JSON Schema cannot express

These are runtime checks. `src/domain/packs/__tests__/packSemantics.ts` implements them as the
executable specification for the pack loader (P2-A02), and the tests require each invalid pack
below to be refused.

| Check | Why the schema cannot state it |
| --- | --- |
| Codes are unique across stages, levels, pathways, learning areas, competencies, schemes, scales, aggregations, reports, slots per scheme, bands per scale and summative slots | `uniqueItems` compares whole objects, not one property across array items |
| `next`, stage levels, pathway levels, learning-area levels and pathways, alternatives, scheme levels, report levels, aggregation `over` and group codes, `fail_if.in`, `to_stage`, promotion and graduation levels all resolve | JSON Schema has no cross-array reference |
| Annual weights, explicit aggregation weights and component weights sum to 1 | JSON Schema cannot sum a map or array |
| Every learning area has a `coefficient` when an aggregation uses `weights: "coefficient"` | The need is a cross-document condition |
| Bands are ordered, `min` is not greater than `max`, and bands do not overlap; `upper` decides whether a shared boundary overlaps | JSON Schema cannot compare two sibling numbers |
| Annual period keys match calendar period codes, names or `T{sequence}` | Cross-section reference |
| The scheme's `learning_area_score.of` and `missing` keys are declared slots | The keys of one object must exist in another array |
| Every manifest language has a locale entry, every locale is declared, and every report `label_key` is translated in every locale | Cross-section and cross-file coverage |
| A report template repeats no single-instance block (header, summary and similar) | Counts of a property value across items |
| A `best_n` value does not exceed the learning areas in scope | Requires counting another section |
| Each level has at most one progression rule | A property value must be unique across array items |

Two further checks belong to the loader and pack review, not to this schema:

- **Impossible dates.** The date pattern accepts `2026-02-30`; the loader must validate the real
  calendar date.
- **Source links.** Spec 03 §2.2 prints a placeholder ellipsis for the source URL, so only
  presence is checked; review (P2-A02 and the maintainer review in spec 03 §2.1) confirms the
  link.

## Tests

The suite lives in `src/domain/packs/__tests__/` rather than beside the schemas because the
quality gate's related-test step only targets `src/`, and the runtime rules are part of the
domain contract the loader will reuse.

- `spec03Examples.ts` copies every JSON block in spec 03 verbatim (11 fixtures).
- `packSchema.test.ts` validates those fixtures, the documented example pack, a minimal pack and
  seven schema-invalid packs, plus six packs that are schema-valid but violate a runtime rule.
- `packSemantics.ts` implements the runtime checks listed above.

Run it with:

```
pnpm vitest run src/domain/packs/__tests__/packSchema.test.ts
```
