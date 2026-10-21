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

The calendar is an academic year with three terms, each with a half-term. A
southern-hemisphere school overrides `structure.calendar_template.periods`, which the
manifest declares overridable; the structure schema allows one template per pack.

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
0.65) on the components themselves, because `component_policy` has no `weights`
field. Those weights are proportional to the paper marks (70 and 130), so
`weighted` and `scale_each_then_sum` agree for this subject; the vector pins the
combine either way.

As in every British pack here, the `component` schema is scoped to the learning area
and not to a level, so Mathematics cannot declare one paper set for IGCSE and another
for A Level. The IGCSE schemes declare the component policy; the AS and A Level
schemes do not.

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

A formative scheme must carry at least one `summative_slots` entry in this schema, so
each of the two observational schemes declares the end-of-term assessment that maps
onto its rubric. That is a schema gap, not a Cambridge requirement.

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

## Known gaps in the pack schema

1. **Grade codes cannot hold `+`, `-` or `*`.** A* is spelled `A_STAR` and the printed
   grade is the band label. Four packs have now hit this (`ke-844`, `gb-national`,
   `cambridge-intl`, `pearson-intl`).
2. **Components are scoped to a learning area, not a level**, so one subject cannot
   carry an IGCSE paper set and an advanced paper set.
3. **`component_policy` cannot declare weights**; the share is declared on the
   component, and the engine's weight map is keyed by component code only, so two
   learning areas that both use `P2` with different shares would collide.
4. **A formative scheme must declare `summative_slots`**, which a purely
   observational scheme (EYFS, Cambridge Primary) does not have.
5. **One calendar template per pack**, so the northern and southern variants cannot
   both be declared.
6. **`combination_rules` cannot express a minimum from a group or a maximum count**,
   so "three or four electives including at least one humanity" is not expressible.
7. **No per-level grade scale choice**: a school running A* to G and 9-1 syllabuses
   side by side needs both schemes, and nothing in the pack declares which subject
   uses which.

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
