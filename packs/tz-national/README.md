# tz-national: Tanzania, Standard I to VII and Form I to IV

Pack `tz-national`, version `1.0.0`, country `TZ`, languages English and Swahili.

**Verification status: `draft`.** Nobody at NECTA or the Ministry has reviewed it. The Swahili labels
(`locales/sw.json`) are a draft translation no native speaker has reviewed. Sources were read on
2026-10-27. "Fetched" means the page loaded and the datum was read in it; "search index" means the
datum was read only in a search result because the document (a PDF) would not fetch.

## Sources

| Source | Used for | How read |
| --- | --- | --- |
| NECTA CSEE page, https://www.necta.go.tz/pages/csee | seven core subjects, optional subject groups, at most ten subjects, Form Two eligibility | fetched |
| NECTA home page, https://www.necta.go.tz | exam types SFNA, PSLE, FTNA, CSEE, ACSEE | fetched |
| NECTA PSLE 2024 item response analysis (Social Studies), https://www.necta.go.tz/publications/Performance%20Analysis%20Books/Candidates'%20Item%20Response%20Analysis%20(CIRA)%20Reports%20/PSLE/2024/03E_SOCIAL_STUDIES_AND_VOCATIONAL_SKILLS.pdf | paper grades A to E over 50 marks, pass A to C | search index only |
| NECTA PSLE format 2024, https://necta.go.tz/publications/Approved%20Exam%20Formats/PSLE_FORMAT_ENGLISH_2024.pdf | the six PSLE subjects | search index only |
| Matokeo, https://matokeo.co/pages/how-grading-works/ (secondary) | CSEE grades, points, divisions | fetched |
| Msingi, https://www.msingischool.com/grading/csee-division-calculator (secondary) | CSEE marks per grade, divisions | search index only |
| Darasa Huru, https://darasahuru.ac.tz/necta-new-grading-system-final-form-four-csee-exams/ (secondary) | shows NECTA revised grading for the 2023 curriculum; its tables are images and were not read | fetched |

## What is modelled

- Structure: Standard I to VII (PSLE at the end, SFNA at Standard IV) and Form I to IV (FTNA at Form II, CSEE at
  Form IV), calendar year in two terms.
- Subjects: the six PSLE subjects for every standard; the seven CSEE core subjects (Civics, History, Geography,
  Kiswahili, English Language, Biology, Basic Mathematics) plus the optional subjects NECTA lists.
- Scales: PSLE paper grades A to E (A 41-50 of 50, B 31-40, C 21-30, D 11-20, E 0-10) stored as percents; CSEE
  grades A 75-100 (1 point), B 65-74 (2), C 45-64 (3), D 30-44 (4), F 0-29 (5); divisions over the total of seven
  subjects: I 7-17, II 18-21, III 22-25, IV 26-33, 0 34-35.
- Schemes: one term paper per subject, 50 marks in the standards and 100 in the forms; term total, average, rank,
  annual mean of two terms; promotion is a class-council suggestion.

## Draft items (every one is unconfirmed and listed in `pack.json`)

1. **The CSEE marks, points and division bands are secondary-sourced** (three sites that agree); no NECTA
   document fetched states them. NECTA revised its grading for the 2023 curriculum and the revised tables could not
   be read, so the scale may be out of date.
2. **The division is the sum of the seven core subjects, not NECTA's best seven.** The engine's `best_n` keeps the
   highest values and NECTA keeps the lowest points. A candidate whose best seven are not the core seven needs the
   school to enter the points.
3. Other conditions of a division (minimum passes, conduct assessment, Civics) differ between sources: not modelled.
4. **ACSEE (Form V and VI) is not modelled**: its grades and divisions were not confirmed.
5. NECTA's continuous-assessment weights were not found: each scheme is one term paper; schools override it.
6. The PSLE subjects are applied to every standard; Standard VI's national assessment is not modelled; the
   overall PSLE grade over six papers and its boundaries were not found.
7. The technical and home-economics subjects of the CSEE are not all listed.
8. Typical term dates are pre-fills; the Ministry publishes the calendar.
9. Promotion thresholds (21 of 50, 30 of 100) are the lower bounds of the pass grade, a suggestion not a national rule.
10. The Swahili labels.

## Vectors

`tests/tz-national.vectors.json` (34): each CSEE and PSLE grade at its boundary, a rescaled and a rounded mark, every
division boundary (7, 17, 18, 21, 22, 25, 26, 33, 34, 35), term total and average, and the promotion rules. Run with
`node scripts/packs/run-vectors.mjs --pack tz-national`; the tests are `src/domain/packs/__tests__/tz-national.test.ts`.
