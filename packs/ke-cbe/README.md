# ke-cbe — Kenya Competency-Based Education

Pack code `ke-cbe`, version `2026.1.0`, effective 2026-01-01, country `KE`.
Issuers: KICD, KNEC, Ministry of Education.

**Verification status: `draft`.** No curriculum officer has reviewed this pack. The manifest's
`verification.notes` lists every item that still needs checking. Nothing in this directory should
be presented to a school as an authoritative national rule until that review is recorded.

## What the pack declares

| Section | Contents |
| --- | --- |
| `structure.json` | PP1–PP2, G1–G3, G4–G6, G7–G9, G10–G12; 14 levels with global ordinals 1–14; stage exits at PP2, G3, G6 (KPSEA), G9 (KJSEA) and G12 (KSSEA); STEM, SOC and ASS senior pathways; calendar-year template with three terms. |
| `learning-areas.json` | 35 learning areas across the five stages, one learning area with papers (`INT-SCI`: theory 80 + practical 20), 7 core competencies and 8 values, six subject-combination rules. |
| `assessment.json` | A formative rubric scheme for PP1–G6 on the 4-level scale, a marks scheme for G7–G12 on the 8-level scale, a mean-percent and a mean-rubric-level aggregation, ranking off, and a 30/30/40 term-to-annual weighted mean. |
| `progression.json` | Automatic promotion inside a stage; stage transitions at PP2, G3, G6 and G9; graduation at G12. |
| `reports/` | `primary-term`, `junior-school-term` and `senior-school-term` templates built from the schema's block types. |
| `locales/` | `en` and `sw` labels, descriptors for both scales, and comment-bank seeds. |
| `tests/grading.vectors.json` | 24 conformance vectors: the 8-level and 4-level boundaries, three aggregation rounding cases. |

## Scales

- **`cbe_8_level`** (Junior and Senior School): `numeric_bands` on percent, upper bound inclusive —
  EE1 90–100 (8 points), EE2 75–89 (7), ME1 58–74 (6), ME2 41–57 (5), AE1 31–40 (4), AE2 21–30 (3),
  BE1 11–20 (2), BE2 0–10 (1).
- **`cbe_4_level`** (PP1–G6): `rubric` on rubric levels — EE 4, ME 3, AE 2, BE 1.

The 8-level cut-offs are the bands printed in platform spec 03 §5, which itself asks for
confirmation against the current KNEC circular. BE2 starts at 0 rather than the spec example's 1 so
that a zero score still grades; that is a deliberate pack change, not a transcription error. The
bands are whole percentages, so `cbe_mean_percent` rounds to a whole percent (`precision: 0`)
before the lookup; a fractional mean would otherwise fall between two bands.

## Conformance vectors

`tests/grading.vectors.json` follows `packs/schema/tests.schema.json`. Each vector names the
aggregation it pins:

- `cbe_mean_percent` — `input` values are learning-area percentages (0–100). The test runs every
  input through the pack's `ke-cbe-terminal` scheme with the engine and then applies the declared
  mean.
- `cbe_primary_mean_level` — `input` values are rubric levels (1–4) directly, because the primary
  scheme is formative and has no marks.

`value` is the operator result rounded to the aggregation's declared `precision`; `grade` and
`points` come from the aggregation's `result_scale`. The conformance test lives at
`src/domain/packs/__tests__/ke-cbe.test.ts` because the quality gate's related-test step only runs
tests reached from `src/`.

## Sources

All five links returned a live document on 2026-10-21. Reachability was checked; the contents were
not certified.

| Document | Issuer | URL |
| --- | --- | --- |
| Basic Education Curriculum Framework (2019) | KICD | https://kicd.ac.ke/wp-content/uploads/2019/08/BASIC-EDUCATION-CURRICULUM-FRAMEWORK-2019.pdf |
| National Curriculum Policy (2019) | KICD | https://kicd.ac.ke/wp-content/uploads/2019/05/National-curriculum-policy-revised-on-may-9-2019.pdf |
| Competency Based Assessment Framework (age-based, regular learners) | KNEC | https://www.knec.ac.ke/wp-content/uploads/2021/06/CBA-Age-Based-Regular-Framework.pdf |
| KJSEA Regulations | KNEC | https://www.knec.ac.ke/wp-content/uploads/2026/02/KJSEA-REGULATIONS.pdf |
| PP1 Curriculum Designs (December 2017) | KICD | https://kicd.ac.ke/wp-content/uploads/2018/02/PP-1-Curriculum-Designs-Dec-2017C-1-min.pdf |

## Known gaps

- The schema cannot declare percentage thresholds for a formative scheme's `summative_slots`;
  `maps_to` names the scale but not the cut-offs, so an end-of-term test's conversion to EE/ME/AE/BE
  stays a school policy.
- The Grade 12 national assessment code `KSSEA` and the senior pathway subject combinations are
  illustrative pending confirmation (see `verification.notes`).
- No `outcomes_ref` files are shipped; outcome-level CBC observations are a later task, so the
  learning areas omit the optional `outcomes_ref`.

## Maintainers

Not yet assigned. A curriculum officer from KICD or KNEC must be recorded in
`pack.json` → `verification.verified_by` before the status can move from `draft` to `verified`.
