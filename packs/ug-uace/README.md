# ug-uace - Uganda Advanced Secondary (S5 and S6), UACE

Advanced secondary pack for Uganda: Senior 5 and 6, principal subjects graded A to F with points,
subsidiaries worth one point on a pass, and the UACE points total. Spec 03 Appendix D.

**Verification status: `draft`.**

## What is confirmed, and what is not

| Item | Status | Basis |
| --- | --- | --- |
| Principal subjects are graded with letters; a principal pass is A to E; an O grade sits below E (reported "A-O") | **confirmed** | UNEB, 2022 UACE Statement of Release of Results (source 1). |
| A candidate with one principal and two subsidiary passes qualifies for some tertiary admission | **confirmed** | Same statement; not modelled. |
| Subject codes (e.g. P425 Mathematics, P510 Physics, S101 General Paper) | **confirmed for the legacy syllabuses** | UNEB, UACE 2016 timetable (source 2). They may change under the new curriculum. |
| The Advanced Secondary Curriculum is competency-based; General Paper continuous assessment is a 10% project plus a 10% extended essay, 20% of the final grade | **confirmed** | NCDC, General Paper Assessment Guidelines (source 3) and NCDC news of 27 July 2026 (source 4). |
| Points A 6, B 5, C 4, D 3, E 2, O 1, F 0; a subsidiary pass is 1 point | spec only | Spec 03 Appendix D; no UNEB source read for the points. |
| Percent boundaries A 80-100, B 70-79, C 60-69, D 50-59, E 40-49, O 35-39, F 0-34; subsidiary pass at 50 | **draft, unconfirmed** | No source read. School-overridable defaults for internal reports, not UNEB's boundaries. |
| Combinations PCM, BCM, HEG | spec only | Spec 03 Appendix D (examples), not an official list. |
| Subjects listed | draft | Twelve principals, General Paper, Subsidiary Mathematics and Subsidiary ICT; other UNEB subjects (languages, art, technical subjects) are not modelled. |

## Gaps (not modelled)

- **UNEB's grading under the Advanced Secondary Curriculum.** NCDC released the assessment guidelines in
  July 2026 and says UNEB is moving to competency-based assessment; no grading or points rule for it was
  found. This pack models the legacy letter-and-points grading from the spec.
- How many principal subjects count towards the total (the pack sums every result it is given; the usual
  maximum of 20 is three principals plus two subsidiaries, which the vectors show, but the rule is not
  enforced) and which subsidiary a learner must take.
- Subject papers and maxima (components are empty); the internal 30/70 CA/exam weights are a school default.
- Admission rules based on points.

## Structure and assessment

One stage `ADV`, levels S5 and S6 (ordinals 12 and 13), the `UACE` at S6, pathways PCM, BCM and HEG.
`ug-uace-internal`: CA (mean, scaled to 30) plus the end-of-term examination (70), out of 100, rounded
half-up, looked up on `uace_principal`. General Paper and the two subsidiaries choose `uace_subsidiary`
through their `grade_scales` entry. `uace_points` sums the points of every result supplied.
Combination rules: General Paper is required, plus three principal electives.

## Conformance vectors

`tests/ug-uace.vectors.json` has 8 vectors: a PCM combination (17 points), the maximum (20), O and F
(3 points), the A, B, O and F boundaries by half-up rounding, and a promotion. Subsidiary results are given as
`{grade, points}` records because the runner maps a grade code to a scale through the scheme and the
scheme grades principals. They prove the pack matches its declared scales, not UNEB's.
Run `node scripts/packs/run-vectors.mjs --pack ug-uace`.

## Sources (read 2026-10-27)

1. UNEB, 2022 UACE Statement of Release of Results -
   <http://web.archive.org/web/20260616031044/https://uneb.ac.ug/wp-content/uploads/2023/03/2022-UACE-STATEMENT-OF-RELEASE-OF-RESULTS-ED.pdf>
2. UNEB, UACE 2016 timetable - <http://web.archive.org/web/2026id_/http://uneb.ac.ug:80/wp-content/uploads/2014/07/UACE%202016.pdf>
3. NCDC, General Paper Assessment Guidelines -
   <https://ncdc.go.ug/wp-content/uploads/2026/07/General-Paper-Assessment-Guidelines_Final-edit-24.07.2026_Web-file.pdf>
4. NCDC, assessment guidelines for the Advanced Secondary Curriculum -
   <https://ncdc.go.ug/2026/07/27/ncdc-releases-assessment-guidelines-to-support-effective-implementation-of-the-advanced-secondary-curriculum/>
5. Ministry of Education and Sports, school calendars - <https://www.education.go.ug/school-calendars/>

The Kiswahili labels (`locales/sw.json`) are a draft translation that no native speaker has reviewed.
