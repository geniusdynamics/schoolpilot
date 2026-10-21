# cambridge-intl - Cambridge Primary to A Level

Cambridge International from Year 1 to Year 13: Cambridge Primary, Cambridge Lower
Secondary, Cambridge IGCSE and Cambridge Advanced (AS and A Level). It follows the
Cambridge subject offer and reports IGCSE on both the A* to G and the 9-1 scales,
because the board runs both kinds of syllabus.

**Verification status: `draft`.** No Cambridge International examiner or school
reviewer has checked this version. Everything marked *placeholder* is a school
default, not a published threshold.

## Structure

| Stage | Levels | Board assessment |
| --- | --- | --- |
| Cambridge Primary (CP) | Y1 to Y6 | Cambridge Primary Checkpoint at Y6 (optional) |
| Cambridge Lower Secondary (CLS) | Y7 to Y9 | Cambridge Lower Secondary Checkpoint at Y9 (optional) |
| Cambridge Upper Secondary (IGCSE) | Y10, Y11 | IGCSE at Y11 |
| Cambridge Advanced (ADV) | Y12, Y13 | AS at Y12 (optional), A Level at Y13 |

`ordinal` runs 0 to 12. The levels are named by year rather than by Cambridge stage
because that is how a school places learners; the stage name in brackets is the
Cambridge equivalent. Year 12 carries no required board assessment because AS is a
separate, optional qualification.

The calendar declares both academic-year variants spec 03 Appendix C names: northern
(August to July, the default) and southern (January to November). Both use the same
period codes, names and sequences, so annual weights resolve under either; only the
dates differ, and `structure.calendar_template.variants.*.periods` is overridable.
## Subjects

Sixteen learning areas. Cambridge Primary and Lower Secondary offer English,
Mathematics, Science, Global Perspectives, Art and Design, Music, PE, Computing and
English as a Second Language; History and Geography join at Lower Secondary; the
sciences split into Biology, Chemistry and Physics at Advanced level.

| Code | Subject | Levels |
| --- | --- | --- |
| ENG | English | Y1 to Y13 |
| ENG_LIT | English Literature | Y12, Y13 |
| ESL | English as a Second Language | Y1 to Y11 |
| MAT | Mathematics (Paper 2 of 70, Paper 4 of 130) | Y1 to Y13 |
| SCI | Science | Y1 to Y11 |
| BIO, CHE, PHY | Biology, Chemistry, Physics | Y12, Y13 |
| GP | Global Perspectives | Y1 to Y13 |
| HIS, GEO | History, Geography | Y7 to Y13 |
| ECO | Economics | Y12, Y13 |
| ART | Art and Design | Y1 to Y13 |
| MUS, PE | Music, Physical Education | Y1 to Y11 |
| COMP | Computing | Y1 to Y13 |

Cambridge syllabus numbers are not modelled as `national_code`; they differ per
syllabus and per 9-1 variant, and a learning area spans several syllabuses.

The extended-tier IGCSE Mathematics papers carry the published weights (0.35 and
0.65) in the IGCSE schemes' `component_policy.weights`, keyed by the learning area
and then the paper, so a second subject that also calls a paper `P2` cannot collide.
Those weights are proportional to the paper marks (70 and 130), so `weighted` and
`scale_each_then_sum` agree for this subject; the vector pins the combine either way.

Mathematics declares its grade set per level: `grade_scales` on the learning area
names `igcse_a_star_g` at Y10-Y11, because the modelled 0580 papers are the A*-G
syllabus. A school on the 9-1 syllabus declares that through the scheme it uses and
the override path, rather than the pack guessing.

Components carry a level scope (`component.levels`), so one subject can declare a
GCSE paper set and an advanced paper set under the same paper codes; uniqueness is
(learning area, level set, code). This pack declares the IGCSE papers only, because
no A Level paper maxima were verified.

## Assessment

| Scheme | Levels | Shape | Scale |
| --- | --- | --- | --- |
| `cambridge-primary` | Y1 to Y6 | formative observations + one summative slot | `cambridge_attainment` |
| `cambridge-lower-secondary` | Y7 to Y9 | formative observations + one summative slot | `cambridge_attainment` |
| `cambridge-igcse-a-star-g` | Y10, Y11 | coursework 20 + mock 80, papers weighted | `igcse_a_star_g` |
| `cambridge-igcse-9-1` | Y10, Y11 | coursework 20 + mock 80, papers weighted | `igcse_9_1` |
| `cambridge-as` | Y12 | coursework 20 + mock 80 | `cambridge_as_level` |
| `cambridge-a-level` | Y13 | coursework 20 + mock 80 | `cambridge_a_level` |

Two IGCSE schemes exist because a school's syllabus is either A* to G or 9-1, never
both. The Cambridge IGCSE subject list confirms the split: Accounting 0452 is graded
A* to G and Accounting (9-1) 0985 is graded 9-1. The scheme shape is identical; only
the scale differs.

The primary and lower-secondary attainment levels (exceeding, meeting, approaching,
below) are the school's rubric. Cambridge's Checkpoint reports are board scores, not
school levels, and the pack does not pretend otherwise.

A purely observational scheme needs no marks slot: `summative_slots` is optional, and
with none the term result is the teacher's best-fit rubric level per learning area.
Both observational schemes here also declare the end-of-term assessment a school
actually records, mapped onto the same rubric.

### Grade thresholds are placeholders, and say so

Cambridge sets grade thresholds for each syllabus option and each exam series after
the papers are marked, so no fixed percentage-to-grade table exists. Every
percentage scale in this pack is therefore a **school default for mocks**, says so in
its `verification` field, and is overridable:

- `grading_scales.igcse_a_star_g.bands`
- `grading_scales.igcse_9_1.bands`
- `grading_scales.cambridge_a_level.bands`
- `grading_scales.cambridge_attainment.bands`

A school replaces them with the board's thresholds for the session. The
`igcse_9_1` points are the school's internal points equal to the grade number, used
by `igcse_points_total`; they are not DfE Attainment 8 points, which apply to
England-registered GCSEs and not to Cambridge IGCSE.

### UCAS

`a_level_ucas_tariff` is `sum_points` over A Level grades: the tariff is **per
grade** (A* 56, A 48, B 40, C 32, D 24, E 16, U 0), not per grade and subject, so a
candidate's total is the sum over the qualifications taken.

No tariff is modelled for AS or for IGCSE. The post-2017 treatment of AS
qualifications and any IGCSE tariff could not be verified for this pack, so neither
scale carries points rather than carrying invented ones.

## Conformance vectors

`tests/cambridge-intl.vectors.json` holds ten vectors:

1. an IGCSE mock at 90 percent is A* on the A* to G scale;
2. a mock at 89 percent is A;
3. the same 90 percent mock is grade 9 with 9 points on the 9-1 scale;
4. the extended papers at 70/70 and 104/130 weight to 87 percent, giving 87.6,
   rounded to 88 and grade 8;
5. an A Level mock at 90 percent is A* with 56 tariff points;
6. a three A Level UCAS total is 56 + 48 + 40 = 144;
7. an IGCSE points total over three 9-1 subjects is 24;
8. leaving Year 6 is a stage transition into lower secondary, next level Y7;
9. Year 11 with 24 IGCSE points is steered towards the sixth form (threshold 20);
10. Year 11 with 19 points is referred to the class council.

Vectors 1 to 5 run through the assessment engine (P2-B01) and the grading-scale
lookup (P2-B02), including the weighted paper combine. Vectors 6 and 7
use a test-local reference over the declared `sum_points` aggregation because
P2-B03 has not landed. Vectors 8 to 10 use a test-local reference over the declared
progression rule. No expected value is hard-coded that the code does not produce.

## Known gaps in this pack

The pack-schema gaps the first version of this README listed are closed by the schema
revision (P2-A01a): grade codes carry the printed symbol, components carry a level
scope, `component_policy` declares per-area weights, `summative_slots` is optional,
the calendar declares named variants, combination rules express a group minimum and a
maximum, and a learning area declares its grade scale per level. What remains is about
this pack:

1. **No advanced paper sets.** Only the 0580 paper maxima were verified, so the AS and
   A Level schemes record a single mock mark rather than a paper breakdown.
2. **One grade set per subject.** Mathematics is declared on the A*-G syllabus because
   that is the paper set modelled; a school on a 9-1 syllabus uses the 9-1 scheme and
   records the choice as a programme override.
3. **Option-block constraints are not declared.** Cambridge's advanced combinations
   are a school timetable decision, so the pack leaves them to the school.

## Sources

All six links resolved to the named page on 2026-10-21.

- Cambridge International, Cambridge IGCSE (includes the 9-1 syllabus list) -
  <https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/>
- Cambridge International, Cambridge IGCSE Mathematics (0580) -
  <https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-mathematics-0580/>
- Cambridge International, Cambridge Advanced -
  <https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/>
- Cambridge International, Cambridge Primary -
  <https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-primary/>
- Cambridge International, Cambridge Lower Secondary -
  <https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-lower-secondary/>
- UCAS, UCAS Tariff points -
  <https://www.ucas.com/applying/before-you-apply/what-and-where-to-study/entry-requirements/ucas-tariff-points>
  (page verified; the tariff table is rendered client-side and was **not** read off
  the live page, so the per-grade numbers come from spec 03 Appendix C and still need
  checking)

The 0580 paper maxima (70 and 130) come from the published syllabus and were not
re-read from the syllabus PDF in this environment; the manifest records that.
