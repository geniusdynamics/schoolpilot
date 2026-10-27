# gh-sbc - Ghana Basic Education (Basic 1 to JHS 3, BECE)

The basic-education pack: Basic 1 to 6 (the Standards-Based Curriculum) and JHS 1 to 3, Basic 7 to 9 (the
Common Core Programme), with the BECE at the end of Basic 9. The senior-secondary sibling is `gh-shs`.

**Verification status: `draft`.** No NaCCA, GES or WAEC officer has reviewed it. Sources were read on
2026-10-27; "read" means the cited text was found at the URL. The Akan (Twi) labels (`locales/ak.json`)
are a **draft translation that no native speaker has reviewed.**

## Sources

| Document | Issuer | URL | Used for |
| --- | --- | --- | --- |
| National Pre-tertiary Education Curriculum Framework (2019), section 8 | NaCCA | https://nacca.gov.gh/wp-content/uploads/2019/04/National-Pre-tertiary-Education-Curriculum-Framework-final.pdf | Tables 3 and 4 (letter bands), Tables 6 and 7 (CA and exam weights), promotion wording, the six core competences. **Fetched, text extracted.** |
| Common Core Programme | NaCCA | https://nacca.gov.gh/common-core-programme-ccp/ | The subject list of Basic 7 to 9. **Fetched.** |
| New Standards-Based Curriculum (2019) | NaCCA | https://nacca.gov.gh/learning-areas-subjects/new-standards-based-curriculum-2019/ | The subject list of Basic 1 to 6. **Fetched.** |
| BECE for school candidates | WAEC Ghana | https://waecgh.org/home/bece-school/ | 30 percent CA and 70 percent external; nine-point scale, Grade 1 highest; the eleven BECE subjects; placement by CSSPS. **Fetched.** |
| BECE regulations, scheme and structure (from 2024) | WAEC Ghana | https://waecgh.org/wp-content/uploads/2024/05/2024-BECE-GUIDELINES-SCHEME-AND-STRUCTURE.pdf | The same 30:70 statement. The PDF holds no grade table. **Fetched, text extracted.** |
| 2026 School Selection Guidelines | MoE Ghana, CSSPS | https://www.cssps.gov.gh/2026-School-Selection-Guidlines.pdf | Placement by aggregate. The extracted text is incomplete and states no aggregate rule. **Fetched.** |

## Structure

Stages `PRI` (B1 to B6) and `JHS` (B7 to B9); `ordinal` 1 to 9; the BECE is the national assessment at B9.
Three terms, September to July; the windows are typical pre-fills (draft).

## Subjects (from the NaCCA pages)

| Levels | Core subjects |
| --- | --- |
| B1 to B3 | English Language, Ghanaian Language, Mathematics, Science, Our World Our People, History, Religious and Moral Education, Creative Arts, Physical Education |
| B4 to B6 | the same plus Computing; French optional |
| B7 to B9 | English Language, Ghanaian Language, Mathematics, Science, Social Studies, Religious and Moral Education, Creative Arts and Design, Physical Education and Health, Computing, Career Technology; French or Arabic optional |

Whether French or Arabic is compulsory at JHS is not stated on the pages read; they are optional here.
Physical Education and Health is not in WAEC's BECE subject list.

## Assessment

| Scheme | Levels | Slots | Source |
| --- | --- | --- | --- |
| `gh-lower-primary` | B1 to B3 | CA 100 | Framework section 8.8: informal CA in the lower phase. End-of-term tests of up to 30 percent are allowed and not modelled. |
| `gh-upper-primary` | B4 to B6 | CA 50, exam 50 | Table 6: all of B5 and B6, and languages in B4. |
| `gh-jhs` | B7, B8 | CA 35, exam 65 | Table 7, content subjects. |
| `gh-bece` | B9 | CA 30, exam 70 | WAEC: CA is 30 percent of the BECE. |

Scale `gh_basic_5`: A 80-100, B 65-79, C 45-64, D 30-44, E 0-29 (Tables 3 and 4), whole marks, so the
learning-area total is rounded half-up first. The class position, the term total and average and the
mean of three terms are the same defaults as `ng-ube` (draft).

### The BECE

`gh_bece_9` holds the nine grades as an **entered-result scale** (grade 1 is the best) with no
percentage range, because none was found. Its points run from 9 (grade 1) to 1 (grade 9) because the
best-n operator keeps the highest values. `bece_aggregate` takes the best six: the four core
subjects (English Language, Mathematics, Science, Social Studies) and the best two others, and the
aggregate is **60 minus the points total** (grade sum, lower is better). The vectors check both.

## Known gaps (all draft)

1. WAEC's percentage ranges for BECE grades 1 to 9 (not found in any fetched document).
2. The BECE aggregate rule is from spec 03 Appendix H; no fetched source states it in full.
3. Two grade scales appear in the framework: Tables 3 and 4 (used) and section 8.5.4.1 (A 80-100, B 70-79,
   C 60-69, D 45-59, E 35-44, U up to 34). Pick one with the school's override.
4. Subject-dependent weights: Basic 4 content subjects (65:35) and JHS languages and career technology
   (50:50) cannot be expressed, since a scheme applies to a level.
5. Kindergarten (a five-point observation scale, no percentages) is not modelled.
6. Promotion is a class-council suggestion at an annual average of 30, the band the framework calls
   sufficient to go on to the next grade; no national promotion rule was found.
7. Term dates are typical pre-fills; GES publishes the calendar.
8. The Akan labels.

## Conformance vectors

`tests/gh-sbc.vectors.json`: 16 vectors, run by `node scripts/packs/run-vectors.mjs --pack gh-sbc`: every
band boundary of `gh_basic_5` across the four schemes, rescaling and half-up rounding, the term total
and average, two BECE aggregates (one where a weak core subject still counts) and four promotion cases.
Pack tests: `src/domain/packs/__tests__/gh-packs.test.ts`.
