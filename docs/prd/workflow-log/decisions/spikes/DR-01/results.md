# DR-01 spike results — learner + enrolment

**Date:** 2026-10-19 · **Task:** P1-A01 · **Machine:** Intel Core i7-8550U, 23.9 GiB RAM, Windows 11 Pro 10.0.22631 x64
**Runtime:** Node v24.21.0 · TypeScript 5.7.3 · zod 3.25.76 (`zod/v4`) · Ajv 8.20.0

Both implementations model the same slice of spec 02: `learner` (13 fields, two enums, ISO date,
optional names/ids/arrays/JSON attributes) and `enrolment` (14 fields, three enums, ISO dates,
seven foreign keys, two cross-field rules). Storage metadata (primary key, indexes, composite
unique key, FK targets, encrypted columns) is carried beside each schema because neither source
expresses all of it.

```
zod/entity.ts                  zod schemas, inferred types, storage metadata
zod/validate.ts                safeParse wrappers
zod/dump.ts                    prints the JSON Schema emitted by z.toJSONSchema
json-schema/entity.schema.json authored draft-07 JSON Schema + x-storage
json-schema/codegen.mjs        stand-in JSON Schema -> TypeScript generator
json-schema/entity.generated.ts generated interfaces
json-schema/validate.ts        Ajv compile + date/date-time/uuid formats
shared/to-storage.ts           standard JSON Schema + storage metadata -> DatabaseSchema
bench.ts / results.json        throughput, errors, DDL, sizes
typecheck.ts                   compile-time assertions for both options
bundle/                        esbuild entries and size measurement
ddl-types.ts                   SQLite type-mapping probe (output shown below)
```

## Prerequisites

The spike ran against the worktree's installed tree, not a clean frozen install. It needs
`zod@3.25.76` (imported as `zod/v4`) and `ajv@8.20.0`, plus the existing `tsx@4.7.1` and
`esbuild@0.25.9` dev tooling.

Neither zod nor ajv is a declared dependency. zod 3.25.76 is linked through the **production**
`puppeteer@24.19.0 -> chromium-bidi@8.0.0` chain (and several dev tools); ajv 8.20.0 comes
through the **dev** `vite-plugin-pwa@1.3.0 -> workbox-build@7.4.1 -> @apideck/better-ajv-errors`
chain (eslint pulls a separate ajv 6.12.6). A clean `pnpm install --frozen-lockfile` does not
link either package at the repository root, so `tsx bench.ts` fails with `MODULE_NOT_FOUND`.

To reproduce, install them as dev-only spike dependencies (this edits `package.json` and the
lockfile, so do it in a scratch copy or revert it afterwards; the spike did not commit them):

```
pnpm add -D zod@3.25.76 ajv@8.20.0
```

P1-A03 adds `zod@3.25.76` as a production dependency. `ajv` is not a product dependency.

## Commands

Run from this folder (`docs/prd/workflow-log/decisions/spikes/DR-01`). `TSC` and `TSX` are
`../../../../../../node_modules/.bin/{tsc,tsx}`.

| # | Command | Result |
| --- | --- | --- |
| 1 | `node json-schema/codegen.mjs` | generated 46 lines, 40 of them non-comment |
| 2 | `tsc -p tsconfig.json` | **exit 0**, no diagnostics |
| 3 | `tsx bench.ts` | **exit 0**; structured output in `results.json` |
| 4 | `tsx ddl-types.ts` | **exit 0**; DDL shown below |
| 5 | `esbuild bundle/zod-entry.ts ...` | 238.8 KiB minified |
| 6 | `esbuild bundle/ajv-entry.ts ...` | 116.5 KiB minified |
| 7 | `node bundle/measure.mjs` | gzip sizes + `new Function` check |

## Type inference

`tsc -p tsconfig.json` typechecks both `zod/entity.ts` and `json-schema/entity.generated.ts`
against `typecheck.ts`. The file contains valid literals plus `@ts-expect-error` assertions;
an unused directive is itself a compile error. All of these compiled as intended:

- Zod `z.infer` and the generated interfaces both accept the same valid learner/enrolment literal.
- Both reject an unknown `status`, a missing `family_name`, a `Date` object in `date_of_birth`,
  and a widened enum value.
- Enrolment types are mutually assignable in both directions; learner types are mutually
  assignable once `attributes` is omitted (see next point).
- Zod types `attributes` as `Record<string, JsonValue>` via `z.json()`; the generated type is
  `Record<string, unknown>` because the authored JSON Schema uses `additionalProperties: true`.
  A JSON Schema could model the recursive JSON value explicitly, at a cost in schema size and
  a matching codegen feature.

Branded ids are a separate finding (probe files were temporary; output recorded verbatim):

```
$ tsx brand-probe.ts
transform parse: true jsonSchema: THREW: Transforms cannot be represented in JSON Schema
custom parse: true jsonSchema: THREW: Custom types cannot be represented in JSON Schema

$ tsc -p brand-tsconfig.json
error TS2322: Type 'string & $brand<"learner">' is not assignable to type 'Id<"learner">'.
  Property '__entity' is missing in type 'String & $brand<"learner">' but required in type
  '{ readonly __entity: "learner"; }'.
error TS2322: Type 'Id<"learner">' is not assignable to type 'string & $brand<"learner">'.
  Property '[$brand]' is missing in type 'String & { readonly __entity: "learner"; }' but
  required in type '$brand<"learner">'.
```

So `z.string().uuid().brand<T>()` infers a branded string and `z.toJSONSchema` still exports
`type: "string"`, but the brand is Zod's `$brand<T>`, not `Id<T> = string & { __entity: T }`.
`.transform()`/`z.custom<Id<T>>()` would preserve the app brand but cannot be exported to JSON
Schema. P1-A02 must settle this shape.

## Runtime validation

Valid learner and enrolment samples are accepted by both. The invalid-throughput batches are
**single-defect**: every learner has `status: "not_a_status"` and every enrolment has
`entry_reason: "not_a_reason"`; the mixed batches alternate valid and invalid items. A separate
four-defect learner (empty `admission_number`, missing `family_name`, `2026-02-30`, invalid
`status`) returns four errors from both: Zod `issues[]` (code/path/message, e.g.
`invalid_format` at `date_of_birth`; `invalid_value` at `status`) and Ajv `errors[]`
(`keyword`, `instancePath`, `message`, e.g. "must be equal to one of the allowed values").
Ajv needed explicit `date`, `date-time` and `uuid` formats; `ajv-formats` is not installed,
so `validate.ts` implements them (~25 lines).

Unknown-key policy: the spike switched Zod to `z.strictObject`, so both implementations reject
an unknown top-level key (`errors.unknownKeys` in `results.json`). The JSON Schema already uses
`additionalProperties: false`. Arbitrary keys remain legal inside `attributes`: both accepted
`attributes: { "ke.kemis_upi": "UPI-1", nested: { a: 1 } }` (`errors.attributes`).

The cross-field rule `end_date >= start_date` is enforced by Zod (`.refine`) and **not** by
Ajv: draft-07 cannot compare two instance values without the non-standard `$data` option.
The `exit_reason required when status is left/completed` rule is expressible as `if/then` and
both reject it. Date ordering therefore remains a repository check under option B.

## Throughput (10,000 objects, 2,000 warm-up, 9 paired runs, median)

Each round alternates which implementation runs first, so CPU/JIT drift affects both. The
invalid batches are all-invalid (every item has exactly one defect); the mixed batches
alternate valid and invalid items.

| Validation | zod µs/object | zod ops/s | Ajv µs/object | Ajv ops/s |
| --- | --- | --- | --- | --- |
| learner, valid | 10.24 | 97,699 | 17.19 | 58,174 |
| learner, invalid (1 defect: status) | 166.03 | 6,023 | 15.18 | 65,879 |
| learner, mixed (50% invalid) | 67.73 | 14,764 | 11.83 | 84,525 |
| enrolment, valid | 8.56 | 116,798 | 11.77 | 84,948 |
| enrolment, invalid (1 defect: entry_reason) | 128.42 | 7,787 | 14.60 | 68,493 |
| enrolment, mixed (50% invalid) | 78.53 | 12,734 | 15.79 | 63,320 |

Valid input is 1.4–1.7× faster in Zod on this machine. All-invalid input is **8.8–10.9×
slower** because Zod builds human-readable issue objects; Ajv returns generic keyword records.
Mixed batches are 5.0–5.7× slower. An import of 10,000 all-invalid rows costs ~1.28–1.66 s in
Zod versus ~0.15 s in Ajv. The reviewer's probe saw ~10% spread; this laptop's heavier throttling
produced a 15–53% IQR and across-session medians that moved by up to ~1.8×, so absolute timings
are indicative and the ratios (8.8–10.9×) are the evidence.

Schema construction / validator compilation (9 runs, median):

| | ms |
| --- | --- |
| Zod builds both entity schemas | 6.71 |
| Ajv compiles both validators (runtime) | 55.12 |

Ajv compiles validators at startup. At two entities that is ~55 ms; at 100 entities the same
linear path is ~2.8 s. Precompiled standalone validators would move this to the build, but
`ajv-standalone` is not installed and would add generated files.

## SQLite DDL and column typing

Both paths feed the same `createDatabaseSchema` -> `SchemaConverter` pipeline. The generated
`CREATE TABLE` statements are **identical** (`ddl.learner.identical = true`,
`ddl.enrolment.identical = true`). Index arrays are derived from the same sidecar metadata, so
they are identical by construction; composite unique indexes are emitted from that sidecar for
both paths. This comparison does not independently validate index SQL, and identical output
does not prove the converter correct: the two defects below are present in both paths.
Learner `CREATE TABLE`:

```sql
CREATE TABLE IF NOT EXISTS "learner" (
  "id" TEXT PRIMARY KEY,
  "institution_id" TEXT,
  "admission_number" TEXT,
  "given_name" TEXT,
  "middle_names" TEXT,
  "family_name" TEXT,
  "gender" TEXT,
  "date_of_birth" TEXT,
  "status" TEXT,
  "residence_status" TEXT,
  "house_id" TEXT,
  "special_needs" TEXT,
  "attributes" TEXT,
  "created_at" TEXT,
  "updated_at" TEXT,
  "deleted_at" TEXT
)
```

The converter maps `integer -> INTEGER`, `number -> REAL`, `boolean -> INTEGER`, and
`string`/date/enum/array/object -> TEXT. Probe output:

```sql
CREATE TABLE IF NOT EXISTS "type_probe" (
  "id" TEXT PRIMARY KEY,
  "capacity" INTEGER,
  "weight" REAL,
  "active" INTEGER,
  "opened_on" TEXT,
  "kind" TEXT,
  "tags" TEXT,
  "metadata" TEXT,
  ...
)
```

Two pre-existing converter defects surfaced, independent of the schema source:

1. `SchemaConverter.convertFieldToSQLiteColumn` reads `fieldDef.required` instead of the root
   `required` list, so every non-PK column is nullable. The spike's DDL shows no `NOT NULL`
   on `learner.family_name` or `enrolment.learner_id`.
2. `DatabaseSchema.indexes` cannot express a composite unique key. The spike adds
   `CREATE UNIQUE INDEX uq_learner_institution_id_admission_number` from sidecar metadata
   (10 lines). Foreign keys are also sidecar metadata; the converter only turns them into
   indexes, not `REFERENCES` constraints.

## Bundle size

| Bundle (esbuild, minified, browser, es2020) | raw KiB | gzip KiB | contains `new Function` |
| --- | --- | --- | --- |
| zod entity + parse | 238.8 | 46.7 | no |
| Ajv + schema + compile | 116.5 | 35.7 | **yes** |

The Ajv path is 11.0 KiB gzip smaller, but its runtime compilation uses `new Function`, which
would require `script-src 'unsafe-eval'` in the content-security policy required by 06 §8.2.
Ajv standalone codegen would remove both the eval and the compile cost, but adds a build step
and a package that is not installed.

## Source size

| File | total lines | non-comment lines |
| --- | --- | --- |
| `zod/entity.ts` (schemas + types + storage metadata) | 129 | 112 |
| `json-schema/entity.schema.json` | 136 | 135 |
| `json-schema/codegen.mjs` (stand-in generator) | 64 | 54 |
| `json-schema/entity.generated.ts` (generated) | 46 | 40 |
| `shared/to-storage.ts` (needed by both paths) | 94 | 84 |

The comparison uses non-comment counts: 112 for the Zod entity versus 135 + 54 + 40 = 229 for
the JSON Schema path. The 84-line adapter is needed by both paths and is not included in either
figure.

JSON Schema bytes: 1,481 (learner) / 1,665 (enrolment). Zod-emitted JSON Schema: 3,144 / 3,541,
because Zod writes explicit date/uuid patterns; those patterns are ignored by the DDL adapter.

## Limitations

- One laptop, Node 24, not a browser; treat absolute throughput as indicative. The within-run
  IQR spread was 15–53% on this throttling laptop, and across repeated runs the medians moved by
  up to ~1.8×; the Zod/Ajv ratios stayed in the same band (8.8–10.9× for all-invalid input).
- The generator is a 54-line stand-in, not `json-schema-to-typescript`; a mature tool would
  improve edge cases but not remove the build step or dependency.
- Ajv was measured in runtime-compile mode only; standalone precompilation was not available.
- zod 3.25.76 is not a declared dependency. It is linked through the production
  `puppeteer -> chromium-bidi` chain and several dev tools; ajv 8.20.0 comes through the dev
  `vite-plugin-pwa -> workbox-build -> @apideck/better-ajv-errors` chain. See Prerequisites.
- Invalid-input timings intentionally include constructing the error/issue objects, because
  repositories and forms consume them.
