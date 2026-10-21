# ke-844 - Kenya 8-4-4 Secondary (KCSE)

The transitional 8-4-4 secondary pack: Forms 1 to 4, the KCSE subject list with its
papers, the KNEC 12-point subject scale and the best-7 mean grade. It runs alongside
`ke-cbe` until the last KCSE cohort completes (final Form 1 intake January 2024,
KCSE 2027).

**Verification status: `draft`.** No KNEC or KICD curriculum officer has reviewed this
version. Codes, papers and maxima follow the published KNEC subject catalogue; the
bands follow KNEC's published grading table. Check every value against the current
KNEC regulations before a school uses the pack for a national return.

## Structure

One stage, Secondary (8-4-4), with levels F1 to F4. `ordinal` continues the 8-4-4
school year count, so Form 1 is year 9. The calendar is a calendar year with three
terms; the Ministry publishes exact dates each year.

Pathways are not modelled: 8-4-4 secondary forms streams, not the senior-school
pathways of the CBE pack. `structure.json` therefore has no `pathways` entry and the
combination rules do not use `from_pathway`.

## Subjects, codes and papers

Thirteen learning areas are modelled, each with its KNEC code in `national_code`.

| Code | Subject | KNEC | Group | Papers (maximum) |
| --- | --- | --- | --- | --- |
| ENG | English | 101 | languages | P1 60, P2 80, P3 60 |
| KIS | Kiswahili | 102 | languages | P1 40, P2 80, P3 80 |
| MAT | Mathematics (Alternative A) | 121 | mathematics | P1 100, P2 100 |
| BIO | Biology | 231 | sciences | P1 80, P2 80, P3 practical 40 |
| PHY | Physics | 232 | sciences | P1 80, P2 80, P3 practical 40 |
| CHE | Chemistry | 233 | sciences | P1 80, P2 80, P3 practical 40 |
| HIS | History and Government | 311 | humanities | P1 100, P2 100 |
| GEO | Geography | 312 | humanities | P1 100, P2 100 |
| CRE | Christian Religious Education | 313 | humanities | P1 100, P2 100 |
| IRE | Islamic Religious Education | 314 | humanities | P1 100, P2 100 |
| HRE | Hindu Religious Education | 315 | humanities | P1 100, P2 100 |
| AGR | Agriculture | 443 | applied | P1 90, P2 90, P3 project 20 |
| BST | Business Studies | 565 | applied | P1 100, P2 100 |

Every subject's papers total 200 marks. The scheme's `component_policy` is
`scale_each_then_sum` out of 100, so one policy serves every subject: the paper marks
are summed and the subject total is expressed out of 100. A school that changes a
paper maximum must change the subject's components in `learning-areas.json`; the test
suite fails if a subject's maxima stop totalling 200.

Only one of CRE, IRE and HRE may be taken, and only one Mathematics alternative. The
learning-area schema has no "at most one of" rule, so this is a registration rule for
the school, not a pack constraint.

## Assessment

`ke-844-internal` is one marks scheme for F1 to F4:

- CAT (continuous assessment tests): a multi slot that averages its assessments and
  contributes 30 marks. A missing CAT is excluded and the total renormalises.
- ET (end-of-term examination): 70 marks; a missing ET makes the result incomplete.
- The learning-area total is out of 100, rounded half-up to a whole percent for grade
  lookup. Scores are stored raw; rounding happens only at that stage.

The 12-point subject scale (`kcse_subject`) is the KNEC one: A 80-100, A- 75-79,
B+ 70-74, B 65-69, B- 60-64, C+ 55-59, C 50-54, C- 45-49, D+ 40-44, D 35-39,
D- 30-34, E 0-29, with points 12 down to 1. Bands are a school-overridable default.

Band **codes** spell the sign (`A_MINUS`, `B_PLUS`) because the pack schema's code
alphabet allows letters, digits, dot, underscore and hyphen, but not `+`, and forbids
a leading hyphen. Each band's `label` carries the grade a transcript prints, and the
conformance vectors state the printed grade.

## The best-7 rule

`kcse_mean_grade` selects seven results with the rule in spec 03 section 6 and
Appendix B, which matches regulation 4.2.2 of the KNEC KCSE regulations:

1. English (101), Kiswahili (102) and Mathematics (121) always count.
2. At least two sciences from Biology, Physics and Chemistry.
3. At least one humanities subject from History and Government, Geography and
   CRE/IRE/HRE.
4. The remaining place or places come from the best of any other subject taken.

The compulsory-subject part of the rule is not an assumption: the spec states it and
the KNEC regulations state it. A candidate may sit up to nine subjects; the operator
picks the best seven of those supplied.

The selected points are summed and averaged to three decimal places, and the mean
points are looked up on `kcse_mean_grade`. That scale is KNEC's published
aggregate-points table divided by seven: grade k covers aggregates 7(k-1)+1 to 7k,
which is mean points above k-1 up to k. It therefore puts 64 aggregate points at B+,
as the published table does; a "round the mean to the nearest whole point" reading
would put 64 at B. The table governs.

`ranking` is disabled: positions are an internal school choice (spec 03 section 6.1,
Appendix B), and neither report template prints a position column.

## Conformance vectors

`tests/ke-844.vectors.json` holds four vectors:

1. the spec's worked best-7 example with three sciences (69 points, mean 9.857, B+);
2. the lower B+ boundary at 64 aggregate points, where a nearest-point reading would
   disagree;
3. and 4. a Form 4 term result whose Biology papers combine to 74.5 and 74.4, pinning
   the half-up rounding and the A-/B+ subject boundary.

The vector `input` is flat because the schema allows only scalar values:

- `"ENG": "B+"` is a subject grade for the best-7 aggregation.
- `"CAT.CAT1": "24/30"` is a score and maximum for one assessment of the CAT slot.
- `"ET.BIO.P1": "60/80"` is a paper score; the middle segment names the learning area
  whose declared component maximum the mark must match.

`expect` is keyed by the code being checked: `kcse_mean_grade` for the aggregation,
`ke-844-internal` for the scheme evaluation.

## Known gaps

- Only the sighted Option A route is modelled. Mathematics Alternative B (122) with
  General Science (237), Biology for the Blind (236) and Kenyan Sign Language (504)
  for hearing-impaired candidates are not represented.
- `combination_rules` can express `core_all` and a count of electives but not the
  KCSE minimum of two sciences and one humanities, nor the maximum of nine subjects.
  The best-7 aggregation enforces the selection rule that matters for results.
- No outcomes files ship with this pack; the 8-4-4 syllabus is content, not assessment
  structure, and is out of scope for this version.

## Sources

- KNEC, KCSE Regulations 2024 -
  <https://knec.ac.ke/wp-content/uploads/2026/01/KCSE_Regulations_2024.pdf>
- KNEC 12-point scale and aggregate-points table (reproduced by Africa Check) -
  <https://africacheck.org/sites/default/files/media/documents/2021-07/KCSE%20Grading%20System.pdf>
- KCSE Rules, Legal Notice 176 of 2009 -
  <https://new.kenyalaw.org/akn/ke/act/ln/2009/176/eng@2022-12-31>
- KICD secondary curriculum - <https://kicd.ac.ke/>
