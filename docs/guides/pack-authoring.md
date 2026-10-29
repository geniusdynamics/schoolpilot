# Pack authoring guide

A pack is data, not code: a curriculum, a country or a payroll rulebook, written as JSON and
validated by schema. The engine never names a curriculum — it reads the pack that the school's
programme is pinned to.

This guide is for someone adding or correcting a pack. It covers the three kinds, the file layout,
a worked minimal example built from the repository's own example, how to run the conformance
vectors, and the rules that decide whether a pack may say `verified`.

## The three kinds of pack

| Kind | Path | Schema | What it carries |
| --- | --- | --- | --- |
| **Curriculum** | `packs/<code>/` (for example `packs/ke-cbe`) | `packs/schema/pack.schema.json` and its section schemas | Stages, levels, pathways, learning areas, assessment schemes, grading scales, aggregations, ranking, progression, report templates, locales, vectors |
| **Country** | `packs/country/<code>/` (for example `packs/country/ke`) | `packs/country/schema.json` | Identifier schemes, addresses, public holidays, statutory return deadlines, national labels |
| **Payroll** | `packs/payroll/<code>/` (for example `packs/payroll/ke`) | `packs/payroll/schema.json` | Effective-dated statutory rules: tax bands, reliefs, social security, health insurance, levies, rounding, return layouts |

All three are data-licensed (CC-BY-4.0, see `packs/LICENSE`) and every one of them cites the
official documents it came from.

## A curriculum pack on disk

From `packs/schema/README.md` (spec 03 §2.1):

```
packs/ke-cbe/
  pack.json                  the manifest: code, version, country, issuers, sources, verification
  structure.json             stages, levels, pathways, calendar template and periods
  learning-areas.json        learning areas, components, competencies, combination rules
  assessment.json            schemes, slots, scales, aggregations, annual rule
  progression.json           promotion, stage transitions, graduation
  reports/*.report.json      one file per report template
  locales/<lang>.json        labels, descriptors, comment-bank seeds
  tests/*.vectors.json       conformance vectors
  README.md                  what it declares, its sources, its known gaps, its maintainer
```

Each section file validates against its own schema; the assembled document validates against
`pack.schema.json`. `packs/schema/examples/ke-cbe.pack.json` is a complete assembled example (1002
lines) with a section-by-section commentary in
[`packs/schema/examples/README.md`](../../packs/schema/examples/README.md).

## A worked minimum

The honest way to start a pack is to copy the repository's example and change what differs, rather
than to type a document from memory. The fragments below are real, abridged from this repository,
with `…` where content is omitted and `<…>` where you must supply a value the schema enumerates.

### 1. The manifest

```json
{
  "code": "xx-cbe",
  "name": "Example Competency-Based Education, Grade 1 to Grade 6",
  "version": "2026.1.0",
  "country": "XX",
  "issuers": ["Example Ministry of Education"],
  "effective_from": "2026-01-01",
  "languages": ["en"],
  "requires_engine": ">=1.0.0",
  "sources": [
    {
      "title": "National Curriculum Framework (2025)",
      "issuer": "Example Ministry of Education",
      "url": "https://example.edu/framework-2025.pdf",
      "retrieved": "2026-10-28"
    }
  ],
  "verification": {
    "status": "draft",
    "verified_by": [],
    "notes": "Draft: the bands are transcribed from the framework, not confirmed by a curriculum officer."
  },
  "overridable": ["grading_scales.cbe_6_level.bands", "reports.*.page"]
}
```

`code` must match the schema's pattern; `version` is a strict semver; `languages` must each have a
locale file; `requires_engine` is the core range you tested against.

### 2. Structure

```json
{
  "stages": [
    { "code": "LP", "name": "Lower Primary", "levels": ["G1", "G2", "G3"] },
    { "code": "UP", "name": "Upper Primary", "levels": ["G4", "G5", "G6"] }
  ],
  "levels": [
    { "code": "G1", "name": "Grade 1", "ordinal": 1, "typical_age": 6, "next": "G2", "is_stage_exit": false, "national_assessment": null },
    { "code": "G2", "name": "Grade 2", "ordinal": 2, "typical_age": 7, "next": "G3", "is_stage_exit": false, "national_assessment": null },
    …
  ],
  "calendar_template": { … }
}
```

`levels` must be ordered by `ordinal` and every `next` must resolve; a stage exit needs the
assessment it exits through. The calendar template declares the period codes the annual weightings
will name.

### 3. Learning areas

```json
{
  "learning_areas": [
    {
      "code": "MAT",
      "name": "Mathematics",
      "kind": "core",
      "levels": ["G1", "G2", "G3", "G4", "G5", "G6"],
      "coefficient": 1,
      "components": []
    },
    {
      "code": "INT-SCI",
      "name": "Integrated Science",
      "kind": "core",
      "levels": ["G4", "G5", "G6"],
      "coefficient": 1,
      "components": [
        { "code": "TH", "name": "Theory", "max_score": 80 },
        { "code": "PR", "name": "Practical", "max_score": 20 }
      ]
    }
  ],
  "competencies": [ … ],
  "combination_rules": [ … ]
}
```

A component's `max_score` is the maximum a marks entry against that paper accepts. Change it after
a school has marked, and the marks already keyed against it are invalid.

### 4. Assessment

A marks scheme, and the scale it maps into:

```json
{
  "schemes": [
    {
      "code": "xx-terminal",
      "levels": ["G4", "G5", "G6"],
      "slots": [
        { "code": "SBA", "label": "School-based assessment", "kind": "portfolio", "scale_to": 60 },
        { "code": "ET", "label": "End-of-term assessment", "kind": "end_term", "scale_to": 40 }
      ],
      "learning_area_score": { "op": "sum", "of": ["SBA", "ET"], "out_of": 100 },
      "missing": "<a policy code from packs/schema/assessment.schema.json>",
      "rounding": [{ "stage": "learning_area_score", "precision": 0, "mode": "half_up" }],
      "grading_scale": "xx_6_level"
    }
  ],
  "grading_scales": [
    {
      "code": "xx_6_level",
      "kind": "numeric_bands",
      "input": "percent",
      "upper": "inclusive",
      "bands": [
        { "code": "EE", "label": "Exceeding expectations", "min": 80, "max": 100, "points": 4 },
        { "code": "ME", "label": "Meeting expectations", "min": 50, "max": 79, "points": 3 },
        { "code": "AE", "label": "Approaching expectations", "min": 25, "max": 49, "points": 2 },
        { "code": "BE", "label": "Below expectations", "min": 0, "max": 24, "points": 1 }
      ]
    }
  ],
  "aggregations": [ … ],
  "annual": { … }
}
```

The rounding vocabulary is the engine's (`half_up`, `half_down`, `half_even`, `up`, `down`);
`floor`/`ceil`/`truncate` are refused. Bands must not overlap or leave a hole, and a whole-number
ladder may not miss a point — the schema cannot check that, the loader does.

### 5. Progression

```json
{
  "progression": [
    { "levels": ["G1", "G2", "G3", "G4", "G5"], "rule": "automatic" },
    { "levels": ["G6"], "rule": "stage_transition", "to_stage": "JS", "requires": ["national_assessment_recorded"] }
  ],
  "graduation": [{ "levels": ["G12"], "rule": "graduate" }]
}
```

This is the data the **Promotion Run** follows. A rule that cannot decide becomes a conflict the
school must settle by hand, which is why a stage transition names what it requires.

### 6. Locale and reports

A locale file holds `labels`, `descriptors` (per scale band) and comment-bank seeds; every report
`label_key` must exist in every declared language. A report template names its page setup, its
blocks and its result columns — see `packs/ke-cbe/reports/primary-term.report.json` for a real one.

### 7. Vectors

```json
{
  "vectors": [
    {
      "name": "90 percent is the EE floor",
      "programme": "xx-cbe",
      "input": { "MAT": 90 },
      "expect": { "xx_mean_percent": { "value": 90, "grade": "EE", "points": 4 } }
    }
  ]
}
```

A vector names the aggregation (or scheme, or `progression`) it pins, the input, and the expected
result. The runner executes them through the real engine.

## Validate a pack

The schemas are JSON Schema 2020-12 with an `$id` under
`https://schemas.schoolpilot.app/curriculum-pack/v1/`; register every file in `packs/schema/`
before compiling `pack.schema.json`. The runnable snippet is in
[`packs/schema/README.md`](../../packs/schema/README.md#validating-a-pack) (`strictRequired` off,
every other strict check on).

The schema is not the whole contract. The runtime checks it cannot express — unique codes, resolved
references, weights summing to 1, ordered non-overlapping bands, every locale key translated — are
implemented in `src/domain/packs/__tests__/packSemantics.ts` and exercised by
`src/domain/packs/__tests__/packSchema.test.ts`:

```bash
pnpm vitest run src/domain/packs/__tests__/packSchema.test.ts
```

## Run the conformance vectors

```bash
node scripts/packs/run-vectors.mjs                          # every pack under packs/
node scripts/packs/run-vectors.mjs --pack ke-cbe            # one pack, by manifest code or directory
node scripts/packs/run-vectors.mjs --pack ke-cbe --verbose   # one line per vector
node scripts/packs/run-vectors.mjs --help
```

Exit codes: `0` every executable vector matched, `1` a mismatch or a pack the loader refused, `2` a
usage mistake. A vector the runner cannot execute is reported **SKIPPED with its reason and never
counted as a pass** — that distinction is the point of the tool.

Run during this review, on this machine:

```
$ node scripts/packs/run-vectors.mjs --pack ke-cbe
Pack conformance: 1 pack, 24 vectors
PACK                 VECTORS   EXECUTED   SKIPPED   FAILED
ke-cbe               24        24         0         0
```

## Country and payroll packs

A country pack is a different schema (`packs/country/schema.json`) with its own vectors. The Kenyan
one is the model to copy: [`packs/country/ke/README.md`](../../packs/country/ke/README.md) marks
every datum **verified** (an official source states it) or **draft** (with the reason), and its
vectors pin identifier accept/reject cases, Easter, and the full holiday list for several years.

A payroll pack (`packs/payroll/schema.json`) carries **no rates in code**: every amount and rate is
effective-dated data with a `sourceRef`. [`packs/payroll/README.md`](../../packs/payroll/README.md)
has the field list and the rule kinds; the Kenyan pack's README states which rates need an
accountant's confirmation.

Two rules that come out of those documents and apply to every pack:

- **Money and rates are data.** If you find yourself editing a TypeScript constant to change a
  statutory rate, stop: that is a pack change.
- **A pack that pays a salary or closes a school for a holiday is not a place for a guess.** Leave
  the item `draft`, say what is missing in `verification.notes`, and ask for a steward.

## Verification, stewardship and correction

The status ladder is in [`packs/schema/manifest.schema.json`](../../packs/schema/manifest.schema.json)
and stated in [`docs/packs/STEWARDSHIP.md`](../packs/STEWARDSHIP.md):

| Status | Requires |
| --- | --- |
| `draft` | Nothing. Every list and band still needs checking. |
| `reviewed` | A named reviewer checked this version against its sources; `verified_by` names them. |
| `verified` | Reviewed, and the vectors pin its results, with at least one vector traced to an official worked example. |

A vector invented from the same arithmetic that produced the pack proves nothing. To correct a
pack, open the pack-correction issue (`.github/ISSUE_TEMPLATE/pack_correction.md`) with the pack id
and version and a URL for the official document that states the value. Anecdote, a blog post, a
textbook and another school's practice are not sources.

## A pack author's checklist

- [ ] Directory layout matches a shipped pack; every section file validates against its schema.
- [ ] The assembled document validates against `pack.schema.json`.
- [ ] `packs/schema/README.md`'s runtime checks pass (the semantics tests).
- [ ] Every declared language has a locale file, and every report label key is translated.
- [ ] `node scripts/packs/run-vectors.mjs --pack <code>` passes, with skips explained.
- [ ] Every source is cited with title, issuer, URL and retrieval date.
- [ ] `verification.status` is the truthful one, and `verification.notes` lists what is unconfirmed.
- [ ] The pack's `README.md` says what it declares, its sources, its known gaps and its maintainer.
- [ ] You have not changed a rate, band or name that a school has already reported on without
      saying so in the notes and bumping the version as spec 03 §2.3 requires.

---

Every command and path in this guide was taken from the repository or run on 2026-10-28. The
validator snippet is the one in `packs/schema/README.md`; the vector run is quoted from the actual
run. How the pack looks inside the app (the **Programmes** page, the wizard's **Curriculum Packs**
step) is described in [the administrator's guide](administrator.md) and
[the exams officer's guide](exams-officer.md).
