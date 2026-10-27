# ng-sss - Nigeria Senior Secondary School (SS 1 to SS 3)

The senior-secondary pack: SS 1 to SS 3 with four departments as pathways, continuous assessment
plus an end-of-term examination, the WAEC-style grade scale, credit counts that mirror how
WASSCE and NECO results are read, and the terminal report with the affective and psychomotor
domains. Basic education is the sibling pack `ng-ube`; the two share one scheme, one scale and
one report layout, so read `packs/ng-ube/README.md` for the reasoning behind each.

**Verification status: `draft`, and weaker than `ng-ube`.** No official senior-secondary subject
list or syllabus was fetched for this pack. Sources were read on 2026-10-26.

## Sources

| Document | Issuer | URL | Used for |
| --- | --- | --- | --- |
| WASSCE for school candidates | WAEC Nigeria | https://www.waecnigeria.org/ | That WAEC conducts the WASSCE for school candidates. **Fetched.** The site publishes no grade table. |
| New curriculum in Nigeria: full list of subjects | BBC News Pidgin (secondary) | https://www.bbc.com/pidgin/articles/c80d84mz3yxo | Senior secondary takes 8 to 9 subjects; core areas are English, Mathematics, Civic Education, Humanities, Trade/Entrepreneurship, Science and Mathematics, Technology and Business. A news report of the Ministry's announcement of 3 September 2025. |
| WAEC Grading System Explained (A1 to F9) | ExamGuide (secondary) | https://examguide.com/forums/discussion/topic/874951967103 | The nine-grade table. |
| Revised 9-Year Basic Education Curriculum: implementation strategy | NERDC | https://www.nerdc.gov.ng/content_manager/Revised%209%20Year%20BEC%20Implementation%20Strategy%203.pdf | Context only; it covers basic education, not SS. |

## Structure

One stage (`SSS`), levels `SS1` to `SS3` with `ordinal` 10 to 12 (basic education is years 1 to 9),
the WASSCE as the national assessment at `SS3` (NECO's SSCE is the other external route and is not
a separate code). Four pathways: Science (`SCI`), Arts (`ART`), Commercial (`COM`), Technical
(`TEC`). **Draft:** the departments are from spec 03 Appendix G; the Ministry report names
Humanities, Sciences, Business, Trade and Technology areas, so a school may rename them.

## Subjects (draft)

Core at every level: English Language, General Mathematics, Civic Education, and Trade and
Entrepreneurship Studies. Electives are WASSCE subject names grouped by department:

| Department | Subjects |
| --- | --- |
| Science | Biology, Chemistry, Physics, Further Mathematics, Agricultural Science |
| Arts | Literature in English, Government, History, Christian Religious Studies, Islamic Studies, Economics |
| Commercial | Financial Accounting, Commerce, Economics |
| Technical | Technical Drawing |

A learner takes the four core subjects and four to five electives from the chosen department
(8 to 9 subjects, from the news report). **No WAEC or NECO subject code is modelled** and the list is
not exhaustive: the technical department in particular offers far more subjects; a school adds
its own. The test suite pins the core list and that each elective names a department.

## Assessment

Identical to `ng-ube`: scheme `ng-ca-exam` (CA1 20, CA2 20, EXAM 60, total rounded half-up to a
whole mark), scale `ng_waec_9` (A1 75-100 down to F9 0-39; **draft**, no official table found),
`ng_domain_rating_5` for the affective and psychomotor domains (draft descriptors), the
term total and average, class position as N of M, and the session mean of three terms.

### Credits

`credits_count` counts the learning areas graded A1 to C6, and `core_credits` counts the same over
English and Mathematics. They are counts for the report and for advising SS 3 candidates; the
common admission wording "five credits including English and Mathematics" is an institution's
rule, not a result rule, and is **not encoded**: compare the two counts against the institution's
requirement. Both read the grade, so a D7 or E8 is a pass, not a credit.

### Promotion (draft)

`class_council` suggests promotion at a session average of 40 (the lowest passing grade). SS 3
graduates. No national promotion rule is cited.

## Languages

`locales/ha.json` is a **draft Hausa translation written without a native-speaker review.**

## Conformance vectors

`tests/ng-sss.vectors.json` holds twelve vectors, run by `node scripts/packs/run-vectors.mjs --pack
ng-sss`: the grade boundaries (75, 74, 49.6 to 50, 49.3 to 49, 40, 39), rescaling of raw marks, the
term total and average, two credit counts (five credits among eight subjects; D7 in English not a
credit) and the two promotion suggestions.

## Known gaps

1. An official senior-secondary subject list, syllabus and department structure.
2. WAEC and NECO percentage boundaries and subject codes.
3. The institution-specific five-credit requirement.
4. Technical-school (NABTEB) subjects and the 28 trade subjects the Ministry says NABTEB administers.
5. The Hausa labels (no native-speaker review).
