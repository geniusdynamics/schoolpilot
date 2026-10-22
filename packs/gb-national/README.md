# gb-national - England national curriculum, EYFS to A Level

The England national curriculum from Nursery to Year 13: the Early Years Foundation
Stage, key stages 1 to 4, GCSE, and A Level. It follows the DfE programmes of study
and the EYFS statutory framework; assessment follows the Ofqual 9-1 GCSE and A*
to E grade scales, with the UCAS Tariff as an optional points total.

**Verification status: `draft`.** No DfE, Ofqual or school reviewer has checked this
version. Everything below marked *placeholder* is a school default, not a published
table. Use the pack for internal reporting and check every national value before a
return.

## Structure

| Stage | Levels | Exit assessment |
| --- | --- | --- |
| EYFS | N1 Nursery (FS1), N2 Reception (FS2) | EYFS Profile at N2 |
| KS1 | Y1, Y2 | none (KS1 SATs became non-statutory) |
| KS2 | Y3, Y4, Y5, Y6 | KS2 SATs at Y6 |
| KS3 | Y7, Y8, Y9 | none; Y9 is the options year |
| KS4 | Y10, Y11 | GCSE at Y11 |
| KS5 | Y12, Y13 | A Level at Y13 |

`ordinal` runs 0 to 14 across the programme. The calendar declares both British
academic-year variants spec 03 Appendix C names: **northern** (September to July,
the default) and **southern** (January to November). Both declare the same period
codes, names and sequences, so annual weights and conformance vectors resolve
whichever variant a school picks; only the dates differ, and
`structure.calendar_template.variants.*.periods` stays overridable for a school
whose term dates fall outside the typical window.

Year 2 has no national assessment because KS1 SATs are no longer statutory; Year 12
has none because AS levels are decoupled and optional. A school that still enters
candidates for either records them as school assessments, not as pack data.

## Subjects

Twenty-five learning areas: the seven EYFS areas of learning, then the national
curriculum subjects.

| Code | Subject | Levels |
| --- | --- | --- |
| EY_CL, EY_PD, EY_PSED, EY_LIT, EY_MAT, EY_UW, EY_EAD | The seven EYFS areas of learning | N1, N2 |
| ENG | English (two papers of 80) | Y1-Y11 |
| ENG_LIT | English Literature | Y12, Y13 |
| LANG | Modern foreign languages | Y3-Y11 |
| MAT | Mathematics (three papers of 80) | Y1-Y13 |
| SCI | Science (combined) | Y1-Y11 |
| BIO, CHE, PHY | Separate sciences | Y10-Y13 |
| HIS, GEO | History, Geography | Y1-Y13 |
| RE | Religious education (locally agreed syllabus) | Y1-Y11 |
| CIT | Citizenship | Y7-Y11 |
| ECO | Economics | Y12, Y13 |
| ART, MUS, PE, DT | Art and design, Music, PE, Design and technology | Y1-Y11 (ART to Y13) |
| COMP | Computing | Y1-Y13 |

England has no national subject codes of the KNEC kind, so `national_code` is `null`
throughout rather than a DfE census code invented for this pack.

Only English and mathematics declare papers, and both have **equal** paper maxima
(two of 80, three of 80). That is what makes `component_policy: scale_each_then_sum`
fair here: summing raw marks weights each paper equally. A subject whose papers have
different maxima would need `weighted`, and the share is declared in
`component_policy.weights` under the learning area's code, so two subjects can both
call a paper `P1` with different shares. A component's own `weight` remains as the
fallback when the policy names no entry for it.

Components carry a level scope: `component.levels` says which levels a paper set is
examined at, and the uniqueness rule is (learning area, level set, code). Mathematics
could therefore declare a GCSE paper set at Y10-Y11 and an A Level paper set at
Y12-Y13 under the same paper codes. This pack does not do that, because no A Level
paper maxima were verified; it declares the GCSE papers only and the A Level scheme
records a single mock mark.

## Assessment

| Scheme | Levels | Shape | Scale |
| --- | --- | --- | --- |
| `gb-eyfs-profile` | N1, N2 | formative observations + one summative slot | `eyfs_emerging_expected` |
| `gb-attainment` | Y1-Y9 | formative observations + one summative slot | `attainment_4_level` |
| `gb-gcse` | Y10, Y11 | classwork 50 + mock 50 | `gcse_9_1` |
| `gb-alevel` | Y12, Y13 | classwork 50 + mock 50 | `alevel_a_star_e` |

- EYFS is a teacher judgement against the 17 Early Learning Goals, recorded as
  Expected or Emerging. `gb-eyfs-profile` also declares the share of the 17 goals met
  as an end-of-term assessment, because a school records one; the schema no longer
  requires a marks-based slot, so a purely observational scheme can omit
  `summative_slots` and compute a best-fit rubric level per learning area instead.
- Key stage 1 to 3 attainment is a four-level judgement (greater depth, expected,
  working towards, below) because England has had no statutory level scale since
  2015. It is the school's rubric, declared so it is reported consistently.
- Classwork is a multi slot averaged across its assessments; a missing classwork mark
  is excluded and the total renormalises. A missing mock makes the result incomplete.
- The learning-area total is rounded half-up to a whole percent before grade lookup,
  because the declared grade bands are whole percentages. 89.5 rounds to 90.

### Grade scales are placeholders, and say so

Ofqual does not publish a fixed percentage-to-grade table. Grade boundaries are set
by each board for each subject and each exam series after the papers are marked, and
A* is awarded by a subject-level rule above the A boundary. A pack that hard-coded
"90% is a 9" as a national fact would be wrong.

Both scales therefore declare themselves placeholders in their `verification` text
and both are overridable:

- `grading_scales.gcse_9_1.bands` - the school replaces the ten-point ladder with the
  board's boundaries for the session.
- `grading_scales.alevel_a_star_e.bands` - likewise.

The `points` on those bands are fixed, published values and are not placeholders:
the DfE 9-1 points used in Attainment 8 (9 down to 1, U is 0) and the UCAS Tariff
for a UK A level (A* 56, A 48, B 40, C 32, D 24, E 16, U 0).

### UCAS Tariff

`ucas_tariff` is a plain `sum` of the A Level grades' grade points: the tariff is
**per grade**, not per grade and subject, so a candidate's total is the sum over the
qualifications taken. The pack does not model BTEC or other tariff-bearing
qualifications, and it does not claim AS points, because the post-2017 tariff
treatment of AS levels was not verified here.

### Attainment 8 is expressible; this pack reports the total

`gcse_points_total` is a plain sum of GCSE points. The DfE Attainment 8 average takes
the best eight subjects, counts English and mathematics twice, and divides by ten.
The aggregation schema now expresses that directly: `multipliers` counts a selected
result more than once and `divisor` declares what the multiplied aggregate is divided
by (Attainment 8 declares 10, though only eight subjects count). This pack does not
ship the Attainment 8 aggregation, because the grade bands it would read are
placeholders and an Attainment 8 figure computed from unverified boundaries would
look authoritative when it is not. It reports the points total instead.

## Conformance vectors

`tests/gb-national.vectors.json` holds ten vectors:

1. a GCSE mathematics mock at 90 percent (three papers of 72/80) is grade 9, 9 points;
2. 89.5 rounds half-up to grade 9, 9 points;
3. 89 stays grade 8, 8 points;
4. English papers of 64/80 and 56/80 combine to 75 percent inside the mock slot, and
   the scheme total is 82.5, rounded to 83;
5. an A Level mock at 90 percent is A* with 56 tariff points;
6. a GCSE points total over eight subjects is a plain sum (40);
7. a three A level UCAS total is the per-grade sum (56 + 48 + 40 = 144);
8. leaving Year 6 is a stage transition into KS3, next level Y7;
9. Year 11 with 24 GCSE points is steered towards the sixth form (threshold 20);
10. Year 11 with 19 points is referred to the class council.

Vectors 1 to 5 run through the assessment engine (P2-B01) and the grading-scale
lookup (P2-B02). Vectors 6 and 7 run through the aggregation engine (P2-B03) over the
grade points this pack's scales declare, and vectors 8 to 10 run through the
progression engine (P2-B04). None of them hard-codes a value the code does not
produce: change a band's points, a paper maximum or a threshold and the vector fails.

The `input` map is flat because the vector schema allows only scalar values:
`"CW.CW1": "27/30"` is one classwork mark, `"MOCK.MAT.P1": "72/80"` is a paper mark
whose maximum must match the declared component, and `"MAT": "A*"` is a subject grade
for a points total. Progression vectors use `"leaving_level": "Y6"` to name the level
being left.

## Known gaps in this pack

The pack-schema gaps the first version of this README listed are closed by the
schema revision (P2-A01a): grade codes carry the printed symbol (`A*`, `A-`, `B+`),
components carry a level scope, `component_policy` declares per-area weights,
`summative_slots` is optional, the calendar declares named variants, combination
rules express a group minimum and a maximum, and aggregations carry per-area
multipliers and a divisor. What remains is about this pack, not the format:

1. **No A Level paper sets.** Only the GCSE English and mathematics papers were
   verified, so the A Level schemes record a single mock mark rather than a paper
   breakdown that would be invented.
2. **Attainment 8 is not shipped.** The format expresses it, but the grade bands are
   placeholders, so an Attainment 8 figure would rest on unverified boundaries.
3. **Option blocks are not constrained.** England's option-block structure is a
   school choice, not a national rule, so the pack declares no combination rules for
   key stage 4.

## Sources

All five links resolved to the named page on 2026-10-21.

- DfE, Early years foundation stage statutory framework -
  <https://www.gov.uk/government/publications/early-years-foundation-stage-framework--2>
- DfE, National curriculum in England: framework for key stages 1 to 4 -
  <https://www.gov.uk/government/publications/national-curriculum-in-england-framework-for-key-stages-1-to-4>
- Ofqual, GCSE (9 to 1) qualification-level conditions and requirements -
  <https://www.gov.uk/government/publications/gcse-9-to-1-qualification-level-conditions>
- DfE, Secondary accountability measures (including Progress 8 and Attainment 8) -
  <https://www.gov.uk/government/publications/progress-8-school-performance-measure>
- UCAS, UCAS Tariff points -
  <https://www.ucas.com/applying/before-you-apply/what-and-where-to-study/entry-requirements/ucas-tariff-points>
  (page verified; the tariff table is rendered client-side and was **not** read off
  the live page, so the per-grade numbers come from spec 03 Appendix C and still need
  checking)
