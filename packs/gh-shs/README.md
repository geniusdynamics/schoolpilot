# gh-shs - Ghana Senior High School (SHS 1 to SHS 3, WASSCE)

The senior-secondary pack: SHS 1 to 3 with the six WAEC programmes as pathways, continuous assessment
plus an end-of-term examination, NaCCA's SHS letter scale, WASSCE credit counts and a terminal report.
The basic-education sibling is `gh-sbc`.

**Verification status: `draft`.** No NaCCA, GES or WAEC officer has reviewed it. Sources were read on
2026-10-27. The Akan (Twi) labels are a **draft translation that no native speaker has reviewed.**

## Sources

| Document | Issuer | URL | Used for |
| --- | --- | --- | --- |
| WASSCE for school candidates | WAEC Ghana | https://waecgh.org/home/wassce-school/ | The four core subjects, the programmes and their options, three or four electives, results in July. **Fetched.** |
| National Pre-tertiary Education Curriculum Framework (2019), section 8 | NaCCA | https://nacca.gov.gh/wp-content/uploads/2019/04/National-Pre-tertiary-Education-Curriculum-Framework-final.pdf | Table 5 (A to G and U) and CA at 30 percent of the final grading. **Fetched, text extracted.** |
| Subject Combination Guidelines | NaCCA | https://nacca.gov.gh/subject-combination-guidelines-secondary-education/ | 7 to 9 subjects externally assessed. The page summary was read; the embedded PDF was not. |

## Structure and subjects

One stage `SHS`, levels `SHS1` to `SHS3` (`ordinal` 10 to 12), the WASSCE at SHS 3. Pathways: Agricultural,
Business, Technical, Vocational, General Arts, General Science (WAEC's programmes; codes `PAG`, `PBU`,
`PTE`, `PVO`, `PGA`, `PGS`). Core: English Language, Mathematics (Core), Integrated Science, Social
Studies. A learner takes three or four electives from the pathway: 7 or 8 subjects, inside NaCCA's 7 to 9.
The electives are a **selection** of those WAEC lists (the page names more, such as the agricultural and
technical option trades and music); a school adds its own. Subject codes of WAEC are not modelled.

## Assessment

Scheme `gh-shs-ca-exam`: CA 30, exam 70, total rounded half-up. Scale `gh_shs_letter` is NaCCA Table 5:
A 80+, B 70-79, C 60-69, D 50-59, E 40-49, F 30-39, G 20-29, U 0-19. `gh_wassce_9` holds the WASSCE grades
A1 to F9 as an **entered-result scale with no percentage range** (none found). `credits_count` counts A1
to C6 and `core_credits` counts them over English and Mathematics; the admission rule is not encoded.

## Known gaps (all draft)

1. WAEC's percentage ranges for A1 to F9 (not found).
2. The elective list is a selection.
3. A credit being A1 to C6 is the common reading, not stated in a fetched Ghanaian document; the admission
   aggregate is not modelled.
4. The framework's SHS cores (English, Mathematics, Ghanaian language, history or geography, computing)
   differ from WAEC's four; WAEC is followed.
5. How many CA marks WAEC receives is not stated; the framework's 30 percent is used.
6. Promotion is a class-council suggestion at an annual average of 40; no national rule was found.
7. The Akan labels.

## Conformance vectors

`tests/gh-shs.vectors.json`: 21 vectors, run by `node scripts/packs/run-vectors.mjs --pack gh-shs`: every Table 5
boundary, rounding, rescaling, the term total and average, two credit counts and two promotion cases.
Pack tests: `src/domain/packs/__tests__/gh-packs.test.ts`.
