# za-caps - South Africa, Grade R to Grade 12 (CAPS, NSC)

One pack for the whole national curriculum: Grade R to Grade 12 in four phases, with the National
Senior Certificate at the end of Grade 12.

**Verification status: `draft`.** No DBE or Umalusi officer has reviewed it. Sources were read on
2026-10-27. The isiZulu labels (`locales/zu.json`) are a **draft translation that no native speaker has
reviewed.**

## Sources

| Document | Issuer | URL | Used for |
| --- | --- | --- | --- |
| National policy pertaining to the programme and promotion requirements of the NCS Grades R-12 (Gazette 36042 of 28 December 2012, amended to 2015) | DBE | https://www.education.gov.za/LinkClick.aspx?fileticket=--ph1R-R4vQ%3d&tabid=419&portalid=0&mid=4018 | **Everything firm in this pack:** subjects of each phase, progression and promotion requirements, SBA and exam weights, the scale of achievement, the 40 and 30 percent pass thresholds, the half-up rounding example, Annexure B. **Fetched, text extracted.** |
| National Curriculum Statements Grades R-12 | DBE | https://www.education.gov.za/Curriculum/NationalCurriculumStatementsGradesR-12.aspx | Where the policy, CAPS and National Protocol for Assessment are listed. Listed, **not read**. |
| Curriculum Assessment Policy Statements | DBE | https://www.education.gov.za/Curriculum/CurriculumAssessmentPolicyStatements(CAPS).aspx | The phase documents. Listed, **not read**. |
| NSC examinations | DBE | https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations.aspx | The NSC examination, written in the last term. Fetched. |

## Structure

Phases `FND` (Grade R to 3), `INT` (4 to 6), `SNR` (7 to 9), `FET` (10 to 12); level codes `GR`, `G1` to
`G12` with `ordinal` 0 to 12; pathways Academic (General) `GEN` and Technical `TPW` for Grades 10 to 12
(policy paragraph 26A). Four terms from January (typical windows are draft pre-fills).

## Subjects (policy paragraphs 6, 12, 19, 27 and Annexure B)

| Grades | Compulsory |
| --- | --- |
| R | Home Language, Mathematics, Life Skills |
| 1 to 3 | Home Language, First Additional Language, Mathematics, Life Skills |
| 4 to 6 | Home Language, First Additional Language, Mathematics, Natural Sciences and Technology, Life Skills, Social Sciences |
| 7 to 9 | Home Language, First Additional Language, Mathematics, Natural Sciences, Life Orientation, Social Sciences, Technology, Creative Arts (called Arts and Culture in the policy), Economic and Management Sciences |
| 10 to 12 | Home Language, a second language (modelled as First Additional Language), Mathematics or Mathematical Literacy or Technical Mathematics, Life Orientation, and three Group B subjects |

The Group B list is the policy's Annexure B (agriculture, culture and arts, business, engineering and
technology, humanities, sciences, services). Second Additional Languages and non-official languages
are not listed.

## Assessment

| Scheme | Levels | Slots | Policy |
| --- | --- | --- | --- |
| `za-foundation` | R to 3 | SBA 100 | paragraph 8(2) |
| `za-intermediate` | 4 to 6 | SBA 75, exam 25 | paragraph 15(2) |
| `za-senior` | 7 to 9 | SBA 40, exam 60 | paragraph 22(3) |
| `za-fet` | 10, 11 | SBA 25, exam 75 | paragraph 30(1) |
| `za-nsc` | 12 | SBA 25, external 75 | paragraph 31(1) |

Scale `za_achievement_7` (Tables 4, 17, 19): 7 Outstanding 80-100, 6 Meritorious 70-79, 5 Substantial
60-69, 4 Adequate 50-59, 3 Moderate 40-49, 2 Elementary 30-39, 1 Not achieved 0-29. Totals are rounded
half-up first (paragraph 31(3): 70,3 is 70 and 70,6 is 71).

### NSC counts

`nsc_subjects_at_40`, `nsc_subjects_at_30` and `nsc_home_language_at_40` count subjects at or above 40 and
30 percent. The pass rule (paragraph 29(1)(a)) needs 40 percent in three subjects, one a home language, and
30 percent in three subjects; the caller compares the counts, as `ng-sss` does for credits.

### Promotion

| Grades | Rule | Modelled |
| --- | --- | --- |
| R | automatic | The policy's definition of progression excludes Grade R. |
| 1 to 3 | class council, home language 50 | Guidelines in the policy (paragraph 7): home language 50, second language 40, Mathematics 40; only the first is modelled. |
| 4 to 9 | threshold: home language 50, first additional language 40, Mathematics 40; else repeat or council | Paragraphs 14 and 21 add conditions on other subjects, not modelled. |
| 10, 11 | threshold: home language 40; else repeat or council | Paragraph 29 also needs 40 percent in three subjects and 30 in three. |
| 12 | graduate | The NSC counts above. |

## Known gaps (all draft)

1. Amendments to the policy after 2015 were not checked.
2. CAPS phase documents and the National Protocol for Assessment were not read: task counts, practical
   assessment tasks and the Life Orientation rule (100 percent SBA in Grades 10 to 12, paragraphs 30 and
   31) are not modelled, because a scheme applies to a level.
3. The other-subject promotion conditions of Grades 4 to 9 and the count conditions of Grades 10 and 11.
4. NSC Bachelor, Diploma and Higher Certificate categories, the university admission point score and the
   one-subject condonation of up to 2 percent (paragraph 29(1)(b)).
5. The Grade 10 to 12 second language is modelled as First Additional Language; the policy allows Home Language.
6. Term dates are typical pre-fills.
7. The isiZulu labels.

## Conformance vectors

`tests/za-caps.vectors.json`: 23 vectors, run by `node scripts/packs/run-vectors.mjs --pack za-caps`: every
scheme with the boundaries of the seven levels, rescaling, the half-up rounding examples, the term
average, two NSC count cases and promotion rules. The runner cannot assert a threshold's outcome, so
`src/domain/packs/__tests__/za-caps.test.ts` runs the progression engine and asserts it: a Grade 5
learner at exactly 50, 40 and 40 is promoted and one point under any threshold is not.
