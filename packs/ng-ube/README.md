# ng-ube - Nigeria Universal Basic Education (Primary 1 to JSS 3)

The basic-education pack: Primary 1 to 6 and Junior Secondary School 1 to 3 under the revised
9-year Basic Education Curriculum, continuous assessment plus an end-of-term examination, a
WAEC-style grade scale, and a terminal report that carries the affective and psychomotor domains.
Senior secondary is the sibling pack `ng-sss`.

**Verification status: `draft`.** No NERDC, UBEC or Federal Ministry of Education officer has
reviewed this version. Below, each rule is marked **sourced** (an official document fetched for
this pack states it) or **draft** (it is not confirmed, and the reason is given). Sources were read
on 2026-10-26.

## Sources

| Document | Issuer | URL | Used for |
| --- | --- | --- | --- |
| Revised 9-Year Basic Education Curriculum: implementation strategy | NERDC | https://www.nerdc.gov.ng/content_manager/Revised%209%20Year%20BEC%20Implementation%20Strategy%203.pdf | Subject lists, subject counts, trade subjects. **Fetched and read.** |
| UBEC frequently asked questions | UBEC | https://ubec.gov.ng/faqs | The CA / external-examination split under UBE. **Read from the search index only: the page returned HTTP 522 when fetched.** |
| WAEC Grading System Explained (A1 to F9) | ExamGuide (secondary) | https://examguide.com/forums/discussion/topic/874951967103 | The nine-grade table. Secondary: WAEC's own pages (waecnigeria.org, read 2026-10-26) publish no percentage table. |
| New curriculum in Nigeria: full list of subjects | BBC News Pidgin (secondary) | https://www.bbc.com/pidgin/articles/c80d84mz3yxo | Date of the Ministry's announcement (3 September 2025), effective 2025/26. |

## Structure

| Stage | Levels | National assessment |
| --- | --- | --- |
| Primary (`PRI`) | P1 to P6 | none modelled |
| Junior Secondary School (`JSS`) | JSS1 to JSS3 | BECE at JSS3 (spec 03 Appendix G; no source fetched) |

`ordinal` runs 1 to 9. The session runs September to July in three terms (`T1`, `T2`, `T3`);
the typical term windows are wizard pre-fills only, and the state ministry's calendar governs.
**Not modelled:** nursery and pre-primary levels (no source for their length or names was
fetched), and typical ages (no source fetched).

## Subjects (sourced: NERDC strategy document)

| Level | Compulsory | Optional | Min / max subjects |
| --- | --- | --- | --- |
| P1 to P3 | English Studies, Mathematics, Nigerian Language (one of Hausa, Igbo, Yoruba), Basic Science, Physical and Health Education, CRS or IS, Nigerian History, Social and Citizenship Studies, Cultural and Creative Arts | Arabic | 9 / 10 |
| P4 to P6 | the same with Basic Science and Technology, plus Basic Digital Literacy and Pre-vocational Studies | French, Arabic | 11 / 13 |
| JSS1 to JSS3 | English Studies, Mathematics, Nigerian Language, Intermediate Science, Physical and Health Education, Digital Technologies, CRS or IS, Nigerian History, Social and Citizenship Studies, Cultural and Creative Arts, Business Studies, one trade subject | French, Arabic | 12 / 14 |

CRS (Christian pupils) and IS (Muslim pupils) count as one subject: `combination_rules` writes
them as the alternatives `CRS|ISL`. The six trade subjects are Solar Photovoltaic installation and
maintenance, Fashion design and garment making, Livestock farming, Beauty and cosmetology,
Computer hardware and GSM repairs, and Horticulture and crop production; a learner takes one
(`group` rule, min 1, max 1), and the document says a school offers a minimum of one and a
maximum of three. The test suite fails if the counts above stop matching the rules.
The Nigerian-language choice (Hausa, Igbo or Yoruba) is from the BBC report of the Ministry's
announcement (secondary); the NERDC document says "one Nigerian Language". It is one learning area
here, `NGL`; a school records which language in its own subject name.

The earlier 2014 curriculum (about 20 subjects) is not modelled.

## Assessment

Scheme `ng-ca-exam` for every level: two continuous assessments scaled to 20 marks each
(`CA1`, `CA2`) and an end-of-term examination scaled to 60 (`EXAM`), totalling 100.

- **Draft.** Spec 03 Appendix G gives the common split as CA 40 (two tests and an assignment) and
  exam 60, school-configurable. The pack folds the assignment into the two CA slots so the report
  can print CA1, CA2, Exam and Total as the spec lists them. The UBEC FAQ (search index only)
  gives school-based assessment 60 and the external examination 40 for basic education; both are
  `slots.*.scale_to` overrides.
- **Draft.** A missing CA1, CA2 or exam makes the result `incomplete`; the pack does not guess
  whether a missed test counts as zero. A school records a zero or an exemption itself.
- Scores are stored raw and scaled to the slot; the learning-area total is rounded half-up to a
  whole mark for lookup (vectors 3 to 5 pin it: 49.6 is 50, C6; 49.3 is 49, D7).

### Grade scale `ng_waec_9` (draft)

A1 75-100, B2 70-74, B3 65-69, C4 60-64, C5 55-59, C6 50-54, D7 45-49, E8 40-44, F9 0-39.
A1 to C6 are credits, D7 and E8 passes, F9 a fail. The table is spec 03 Appendix G and every
secondary source read; **no WAEC or NECO document fetched for this pack states percentage
boundaries**, and WAEC awards each subject's grades itself, so the table is a school default.
The scale is school-overridable. Primary schools often grade A to F with descriptors; no official
boundaries were found, so primary uses this scale too. Grades carry no points: WAEC publishes none.

### Domains

`ng_domain_rating_5` is a five-level rubric (5 to 1). Spec 03 Appendix G says traits are rated 1
to 5; no official wording for the levels was found, so the locale descriptors name only the highest
and lowest (draft). The six affective traits (punctuality, neatness, politeness, honesty,
attentiveness, leadership) are `attitude` competencies and the four psychomotor skills
(handwriting, games, crafts, drawing) are `core_competency` ones, as the spec lists them
("leadership ..." and "drawing ..." in the spec are open-ended; a school adds traits).

### Aggregation, ranking, session

`term_total` (sum) and `term_average` (mean, two places) feed the report's overall total and
average. Position in class is ranked on `term_average` with competition ties (1-2-2-4) and
printed as N of M. `annual` is the mean of the three terms with missing terms renormalised: the
spec's "cumulative (average of 3 terms)" on the third-term report.

### Promotion (draft)

`class_council` suggests promotion at a session average of 40, the lowest passing grade (E8).
Nigeria publishes no national promotion rule this pack cites; the council decides. Primary 6 is a
stage transition to JSS, and JSS3 graduates (basic education ends there). The BECE is a
national assessment on `JSS3` per spec 03 Appendix G; no source for it was fetched.

## Report templates

`primary-term` (P1 to P6) and `jss-term` (JSS1 to JSS3), A4 portrait. Subject table columns are
CA1, CA2, Exam, Total, Grade, Position in subject, Class average, Highest, Lowest and Remark; then
the summary (overall total, average, position N of M), the affective and psychomotor block,
class teacher and principal comments, the cumulative result and promotion decision (third term),
next term begins, an optional fees block (school policy decides whether it prints), signatures
and the verification QR.

## Languages

`locales/en.json` is the English text. `locales/ha.json` is a **draft Hausa translation written
without a native-speaker review**: treat every string as unchecked.

## Conformance vectors

`tests/ng-ube.vectors.json` holds twelve vectors, all run by `node scripts/packs/run-vectors.mjs
--pack ng-ube`: the A1 lower boundary (75), the B2 top (74), raw marks rescaled to 20, 20 and 60,
the half-up cases (49.6 to 50, 49.3 to 49), the E8 floor (40), F9 (39), a six-subject total and
average, an average of 70.5 kept unrounded, and the three progression rules.

## Known gaps

1. WAEC and NECO percentage boundaries (draft, above).
2. The CA split and the 40/60 against 60/40 discrepancy (draft, above).
3. Primary A to F boundaries; nursery and pre-primary levels; typical ages.
4. A national promotion rule, if one is published.
5. The BECE and the junior school certificate as national assessments of record.
6. The Hausa labels (no native-speaker review). Igbo and Yoruba are not shipped.
