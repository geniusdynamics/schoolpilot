# pearson-intl - Pearson Edexcel iPrimary to International A Level

Pearson Edexcel's international route from Year 1 to Year 13: iPrimary,
iLowerSecondary, International GCSE and International A Level (IAL, with
International AS in Year 12). International GCSEs are graded 9-1; qualifications
from the earlier A* to G generation are still reported in some schools, so both
scales ship.

**Verification status: `draft`.** No Pearson Edexcel examiner or school reviewer has
checked this version. Everything marked *placeholder* is a school default, not a
published boundary.

## Structure

| Stage | Levels | Board assessment |
| --- | --- | --- |
| iPrimary (IPRIMARY) | Y1 to Y6 | none declared |
| iLowerSecondary (ILOWER) | Y7 to Y9 | none declared |
| International GCSE (IGCSE) | Y10, Y11 | International GCSE at Y11 |
| International A Level (IAL) | Y12, Y13 | International AS at Y12 (optional), International A Level at Y13 |

`ordinal` runs 0 to 12. Year 6 and Year 9 are stage exits for progression, but they
carry **no** national assessment: the iPrimary and iLowerSecondary assessments are
optional school assessments and calling them board or national assessments would
overclaim. The other two British packs in this repository do declare a checkpoint at
those levels; this one deliberately does not.

The calendar declares both academic-year variants spec 03 Appendix C names: northern
(August to July, the default) and southern (January to November). Both use the same
period codes, names and sequences, so annual weights resolve under either; only the
dates differ, and `structure.calendar_template.variants.*.periods` is overridable.

## Subjects

Sixteen learning areas across the four stages.

| Code | Subject | Levels |
| --- | --- | --- |
| ENG | English | Y1 to Y13 |
| ENG_LIT | English Literature | Y12, Y13 |
| ESL | English as a Second Language | Y1 to Y11 |
| MAT | Mathematics (Paper 1 of 100, Paper 2 of 100) | Y1 to Y13 |
| SCI | Science | Y1 to Y11 |
| BIO, CHE, PHY | Biology, Chemistry, Physics | Y10 to Y13 |
| GC | Global Citizenship | Y1 to Y11 |
| HIS, GEO | History, Geography | Y7 to Y13 |
| ECO | Economics | Y12, Y13 |
| ART, MUS, PE | Art and Design, Music, Physical Education | Y1 to Y11 |
| COMP | Computing | Y1 to Y13 |

The International GCSE Mathematics A papers are both 100 marks and half the
qualification each; the share is declared in `component_policy.weights` under `MAT`,
so a second subject that also calls a paper `P1` cannot collide. Components carry a
level scope (`component.levels`), so one subject can declare a GCSE paper set and an
advanced paper set under the same paper codes; this pack declares the International
GCSE papers only, because no International A Level paper maxima were verified, and
the AS and A Level schemes carry no component policy.

Mathematics declares its grade set per level: `grade_scales` names
`international_gcse_9_1` at Y10-Y11, the 4MA1 syllabus the modelled papers belong to.

## Assessment

| Scheme | Levels | Shape | Scale |
| --- | --- | --- | --- |
| `pearson-iprimary` | Y1 to Y6 | formative observations + one summative slot | `pearson_attainment` |
| `pearson-ilower-secondary` | Y7 to Y9 | formative observations + one summative slot | `pearson_attainment` |
| `pearson-international-gcse-9-1` | Y10, Y11 | coursework 40 + mock 60, papers weighted | `international_gcse_9_1` |
| `pearson-international-gcse-legacy` | Y10, Y11 | coursework 40 + mock 60, papers weighted | `international_gcse_a_star_g` |
| `pearson-ias` | Y12 | coursework 40 + mock 60 | `international_as` |
| `pearson-ial` | Y13 | coursework 40 + mock 60 | `international_a_level` |

The coursework/mock split here is 40/60, unlike the 20/80 in `cambridge-intl`: a
school weighting is a pack decision, not a board rule, and each pack states its own.

Two International GCSE schemes exist because a school's qualification is either 9-1
or the legacy A* to G grade set. International AS has no A* and stops at A.

### Grade boundaries are placeholders, and say so

Pearson sets grade boundaries for each qualification and each exam series after
marking, so no fixed percentage-to-grade table exists. Every percentage scale in this
pack is a **school default for mocks**, says so in its `verification` field, and is
overridable:

- `grading_scales.international_gcse_9_1.bands`
- `grading_scales.international_gcse_a_star_g.bands`
- `grading_scales.international_a_level.bands`
- `grading_scales.pearson_attainment.bands`

The `international_gcse_9_1` points are the school's internal points equal to the
grade number, used by `igcse_points_total`. They are not DfE Attainment 8 points:
those apply to England-registered GCSEs, not International GCSEs.

### UCAS

`ial_ucas_tariff` is a plain `sum` of the A Level grades' grade points. The tariff is
**per grade** (A* 56, A 48, B 40, C 32, D 24, E 16, U 0), not per grade and subject: a
candidate's total is the sum over the qualifications taken. The pack does not model
BTEC or other tariff-bearing qualifications.

No tariff is declared for International AS or for International GCSE, because neither
could be verified here; those scales carry no points rather than invented ones.

## Conformance vectors

`tests/pearson-intl.vectors.json` holds ten vectors:

1. an International GCSE mock at 90 percent is grade 9 with 9 points;
2. a mock at 89 percent is grade 8;
3. the same 90 percent mock is A* on the legacy A* to G scale, with no points;
4. the two 100-mark papers at 80 and 90 percent combine to 85 percent, giving
   87 overall and grade 8;
5. an International A Level mock at 90 percent is A* with 56 tariff points;
6. a three A Level UCAS total is 56 + 48 + 40 = 144;
7. an International GCSE points total over three 9-1 subjects is 24;
8. leaving Year 6 is a stage transition into iLowerSecondary, next level Y7;
9. Year 11 with 24 points is steered towards the sixth form (threshold 20);
10. Year 11 with 19 points is referred to the class council.

Vectors 1 to 5 run through the assessment engine (P2-B01) and the grading-scale
lookup (P2-B02), including the weighted paper combine. Vectors 6 and 7 run through the
aggregation engine (P2-B03) over the grade points this pack's scales declare, and
vectors 8 to 10 run through the progression engine (P2-B04). No expected value is
hard-coded that the code does not produce.

## Known gaps in this pack

The pack-schema gaps the first version of this README listed are closed by the schema
revision (P2-A01a): grade codes carry the printed symbol, components carry a level
scope, `component_policy` declares per-area weights, `summative_slots` is optional,
the calendar declares named variants, combination rules express a group minimum and a
maximum, and a learning area declares its grade scale per level. What remains is about
this pack:

1. **No advanced paper sets.** Only the International GCSE Mathematics A papers were
   verified, so the International AS and A Level schemes record a single mock mark.
2. **One grade set per subject.** Mathematics is declared on the 9-1 syllabus because
   that is the paper set modelled; a school on the legacy A*-G qualification uses the
   legacy scheme and records the choice as a programme override.
3. **Option-block constraints are not declared.** Pearson's combinations are a school
   timetable decision, so the pack leaves them to the school.

## Sources

All seven links resolved to the named page on 2026-10-21.

- Pearson, International GCSEs -
  <https://qualifications.pearson.com/en/qualifications/edexcel-international-gcses.html>
- Pearson, The 9-1 grading scale explained -
  <https://qualifications.pearson.com/en/qualifications/edexcel-international-gcses/the-9-1-grading-scale-explained.html>
- Pearson, Edexcel International GCSE Mathematics A (2016) -
  <https://qualifications.pearson.com/en/qualifications/edexcel-international-gcses/international-gcse-mathematics-a-2016.html>
- Pearson, International Advanced Levels -
  <https://qualifications.pearson.com/en/qualifications/edexcel-international-advanced-levels.html>
- Pearson, International Primary Curriculum (iPrimary) -
  <https://qualifications.pearson.com/en/qualifications/edexcel-international-primary-curriculum.html>
- Pearson, International Lower Secondary Curriculum (iLowerSecondary) -
  <https://qualifications.pearson.com/en/qualifications/edexcel-international-lower-secondary-curriculum.html>
- UCAS, UCAS Tariff points -
  <https://www.ucas.com/applying/before-you-apply/what-and-where-to-study/entry-requirements/ucas-tariff-points>
  (page verified; the tariff table is rendered client-side and was **not** read off
  the live page, so the per-grade numbers come from spec 03 Appendix C and still need
  checking)

The International GCSE Mathematics A paper maxima come from the published
specification and were not re-read from the specification PDF in this environment;
the manifest records that.
