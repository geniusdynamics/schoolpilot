# rw-cbc: Rwanda, Primary 1 to 6 and Senior 1 to 3

Pack `rw-cbc`, version `1.0.0`, country `RW`, languages English and Kinyarwanda.

**Verification status: `draft`.** Nobody at REB, NESA or MINEDUC has reviewed it. The Kinyarwanda labels
(`locales/rw.json`) are a draft translation no native speaker has reviewed. Sources were read on 2026-10-27;
"fetched" means the page loaded, "search index" means the datum was read only in a search result.

## Sources

| Source | Used for | How read |
| --- | --- | --- |
| MINEDUC, https://www.mineduc.gov.rw/news-detail/p6-and-s3-national-examinations-results-released | grade values 6 to 0; PLE aggregate 30 over five subjects; O-level aggregate 54 over nine compulsory subjects | fetched |
| MINEDUC, https://www.mineduc.gov.rw/news-detail/mineduc-releases-s6-examinations-results-for-the-school-year-2021-2022 | seven-point scale, subsidiary two-point scale, A-level maximum 60 and minimum 9 | fetched |
| NESA summary note, https://www.nesa.gov.rw/fileadmin/user_upload/NESA/Examination_Process/Summary_Note_on_Minisiterial_Instructions_Governing_National_Examinations_Signed.pdf | grades A to F and values 6 to 0 | search index only |
| KT Press, https://www.ktpress.rw/2022/08/rwanda-national-examination-body-introduces-new-grading-system/ (secondary) | mark range of each grade, the five PLE subjects, divisions removed | fetched |
| MINEDUC 2021 release, https://www.mineduc.gov.rw/news-detail/mineduc-releases-p6-and-s3-examinations-results-for-the-school-year-2021 | the nine O-level subjects | search index only |

## What is modelled

- Structure: P1 to P6 (PLE) and S1 to S3 (O-level examination), three terms.
- Subjects: Mathematics, Kinyarwanda, English, Social and Religious Studies, Science and Elementary Technology in
  primary; Mathematics, Biology, Chemistry, Physics, Geography, History, Kinyarwanda, English, Entrepreneurship in
  S1 to S3.
- Scale `rw_core_7`: A 70-100 (value 6), B 65-69 (5), C 60-64 (4), D 50-59 (3), E 40-49 (2), S 20-39 (1), F 0-19 (0).
- Aggregates `ple_aggregate` (five subjects, 0 to 30) and `olevel_aggregate` (nine subjects, 0 to 54): plain sums of
  grade values. NESA removed divisions, so there is no division band and no pass band.
- One term mark out of 100 per subject, term total, average, rank, annual mean of three terms; promotion is a
  class-council suggestion.

## Draft items (every one is unconfirmed and listed in `pack.json`)

1. **The mark range of each grade is from a news report**; the NESA note that confirms the grades and values was
   readable only from the search index, and no fetched official page gives the ranges.
2. The PLE and O-level subject lists are from KT Press and a MINEDUC release read from the search index; another
   secondary list names French and a combined history-geography group, so the lists may vary by year.
3. **S4 to S6, TVET and TTC are not modelled**: only the maximum 60 and minimum 9 are confirmed, not the subject
   weights ("weighted aggregate").
4. NESA's paper weights and any pass mark were not found; the aggregates have no pass band.
5. No continuous-assessment weights were found: the scheme is one term mark, overridable.
6. The P1 to P3 subject list is not confirmed; the PLE subjects are applied to every primary level.
7. Term dates are unverified pre-fills; the September start of the year was not verified for the current year.
8. Promotion at an average of 40 (the lower bound of grade E) is a suggestion, not a national rule.
9. The Kinyarwanda labels.

## Vectors

`tests/rw-cbc.vectors.json` (26): every grade boundary, a rescaled and a rounded mark, the PLE aggregate at 30, 20
and 0, the O-level aggregate at 54, 36 and 0, term total and average, and the promotion rules. Run with
`node scripts/packs/run-vectors.mjs --pack rw-cbc`; the tests are `src/domain/packs/__tests__/rw-cbc.test.ts`.
