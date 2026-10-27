# ug-lsc - Uganda Lower Secondary (S1 to S4), competency-based curriculum

Lower secondary pack for Uganda: Senior 1 to 4 under the competency-based curriculum rolled out from
S1 in 2020, ending at the Uganda Certificate of Education (UCE). Spec 03 Appendix D asks the pack to
"encode current UNEB reporting format - verify". **That verification could not be done**: UNEB's live
site was unreachable and the NCDC lower secondary assessment framework was not retrieved. This pack
therefore models the structure and ships a clearly labelled school-internal scale, not UNEB's.

**Verification status: `draft`.**

## What is confirmed, and what is not

| Item | Status | Basis |
| --- | --- | --- |
| New competency-based lower secondary curriculum began with S1 in 2020 | **confirmed** | NCDC, "Lower Secondary Curriculum Embraced" (source 1). |
| UNEB assesses an S3 project against a checklist of competences and indicators | **confirmed** | UNEB, Project theme for Senior Three 2025 (source 2). |
| UNEB's UCE reporting format and achievement levels | **not found** | Gap. No national grade or aggregate is modelled. |
| Weight of continuous assessment and project against the end-of-cycle examination | **unconfirmed** | The 20/80 split here is a school default (it mirrors the 20% NCDC states for General Paper at advanced level, see `ug-uace`); overridable. |
| Subject list | draft | The common core as understood; not taken from an NCDC syllabus list. Compulsory/elective rules are not modelled beyond English and Mathematics. |
| `national_code` | null | The 2016 UCE codes belong to the legacy syllabuses and do not apply. |
| A-E school scale (A 80-100, B 65-79, C 50-64, D 35-49, E 0-34) | **draft, not UNEB's** | A school-overridable default, labelled as such in the scale. |

## Gaps (not modelled)

- UNEB's UCE achievement levels, grading and any aggregate or result category.
- Generic skills and competency descriptors as `competencies`: the NCDC curriculum framework was not retrieved.
- The project as a separate slot: it is folded into the `CA` slot (continuous assessment and project).
- Subject electives and the rules on how many a learner takes; subjects beyond the eleven listed.

## Structure and assessment

One stage `LSC`, levels S1 to S4 (ordinals 8 to 11), the `UCE` at S4. `ug-lsc-internal`: CA (`multi`,
mean, scaled to 20) plus the end-of-term examination (80), out of 100, rounded half-up to a whole percent
before lookup on `lsc_grade`. `lsc_mean_percent` is the mean score over the learner's subjects looked up on
the same scale.

## Conformance vectors

`tests/ug-lsc.vectors.json` has 7 vectors: the A boundary (80, 79.5 and 79.4), CA averaging, the E ceiling,
a mean grade and a promotion. They prove the pack matches its own declared scale, not UNEB's.
Run `node scripts/packs/run-vectors.mjs --pack ug-lsc`; `src/domain/packs/__tests__/ug-packs.test.ts` runs it.

## Sources (read 2026-10-26)

1. NCDC, Lower Secondary Curriculum Embraced - <https://ncdc.go.ug/lower-secondary-curriculum-embraced/>
2. UNEB, Project theme for Senior Three 2025 and the Project Assessment and Observation checklist -
   <http://web.archive.org/web/2026id_/https://uneb.ac.ug/wp-content/uploads/2025/04/Guidelines-and-theme-for-project-assessment.-web.pdf>
3. UNEB, Directorate of Examinations -
   <http://web.archive.org/web/20261018080826/https://uneb.ac.ug/executive-director/directorte_of_examinations/>
4. Ministry of Education and Sports, school calendars - <https://www.education.go.ug/school-calendars/>

The Kiswahili labels (`locales/sw.json`) are a draft translation that no native speaker has reviewed.
