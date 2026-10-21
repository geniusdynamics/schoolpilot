# Example Curriculum Pack

`ke-cbe.pack.json` is a complete, documented example of the composed pack document validated by
`../pack.schema.json`. It is a **Junior and Senior School slice** of a Kenya CBE pack, not a
releasable pack:

- `verification.status` is `draft` and `verified_by` is empty.
- The 8-level bands are the ones printed in spec 03 §5; the 4-level rubric uses level values
  4 to 1 because the spec gives the level names but not percentage ranges.
- Calendar dates and the learning-area list are illustrative. Confirm both against the current
  KICD, KNEC and Ministry of Education documents before release.
- `learning_areas[].outcomes_ref` points at outcome files that a full pack ships; this example
  does not include them.

## What each section shows

| Section | Points of interest |
| --- | --- |
| `pack` | Two languages, a `supersedes` reference, an engine range, one cited source, draft verification and overridable paths |
| `structure` | Two stages, six levels with `next`, a stage exit at G9 with KJSEA, three pathways, three terms with period codes `T1` to `T3` |
| `learning_areas` | Core, optional and elective areas, an alternative language (KSL), components on Integrated Science, core competencies and values, a `core_all` rule with an alternative set, and an electives rule constrained to the learner's pathway |
| `assessment` | A two-slot scheme with `scale_to`, a missing-mark policy, a rounding rule and an overridable slot path; the CBE 8-level scale and a 4-level rubric; one mean aggregation; ranking disabled; annual weights 0.3 / 0.3 / 0.4 |
| `progression` | Automatic promotion within Junior School, a stage transition at G9 that requires the national assessment and a pathway placement, and graduation at G12 |
| `reports` | Two templates with different result columns, page setup, comment limits and locale keys |
| `locales` | English and Kiswahili labels and comment-bank seeds |
| `tests` | One conformance vector pinning the mean-percent lookup to EE2 |

## Using it

A real pack is split across files as in spec 03 §2.1. Split this document by section:

```
packs/ke-cbe/
  pack.json               <- pack
  structure.json          <- structure
  learning-areas.json     <- learning_areas
  assessment.json         <- assessment
  progression.json        <- progression
  reports/js-term.report.json
  reports/ss-term.report.json
  locales/en.json
  locales/sw.json
  tests/grading.vectors.json
  README.md
```

Each file validates against its section schema (`manifest.schema.json`,
`structure.schema.json`, and so on), and the assembled document validates against
`pack.schema.json`. To validate this file directly, register every schema in `packs/schema/`
first; `../README.md` has a runnable snippet.

Copy the document into a new pack, change `pack.code`, `pack.name` and `pack.sources`, then work
through the runtime checks listed in `../README.md` before marking verification `verified`.
