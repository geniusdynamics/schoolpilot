# ug-ple - Uganda Primary (P1 to P7), Primary Leaving Examination

Primary pack for Uganda: Primary 1 to 7, the four PLE subjects, the nine-grade D1 to F9 scale and the
PLE aggregate with its divisions. Spec: `docs/specs/multi-curriculum-platform/03-curriculum-and-assessment.md`
Appendix D.

**Verification status: `draft`.** No UNEB or NCDC officer has reviewed this version. UNEB's live site
(uneb.ac.ug) was unreachable when the pack was written; its pages were read from the Internet Archive
copy. Those pages carry no grading rules, so most of what follows is **not confirmed** and says so.

## What is confirmed, and what is not

| Item | Status | Basis |
| --- | --- | --- |
| The PLE reports Divisions 1, 2, 3, 4, U and X | **confirmed** | UNEB, PLE 2020 divisional score distribution table (source 1). X is a candidate with no result and is not a band. |
| Four examined subjects: English, Mathematics, Science, Social Studies | spec only | Spec 03 Appendix D; no UNEB source read. |
| Grades D1 (1) to F9 (9), aggregate 4 to 36 | spec only | Spec 03 Appendix D. |
| Division ranges I 4-12, II 13-23, III 24-29, IV 30-34, U 35-36 | **draft, unconfirmed** | Not stated in any fetched source; the spec says only "per UNEB ranges". Check against the current UNEB circular. |
| Percent boundaries D1 90-100, D2 80-89, C3 70-79, C4 60-69, C5 55-59, C6 50-54, P7 45-49, P8 40-44, F9 0-39 | **draft, unconfirmed** | No source read. A school-overridable default for internal reports; UNEB awards the national grade itself. |
| School weights CA 30 / end-of-term 70, annual 30/30/40 | draft | A school default, not a UNEB rule; overridable. |
| Term windows | draft | Typical windows; the Ministry's 2026 calendar is a scanned PDF that could not be read as text. |
| SCI and SST offered from P4; RE offered at every level | draft | Assumed from the thematic curriculum (lower primary is taught in themes); not confirmed. |

## Gaps (not modelled)

- **`fail_if` on a failed English or Mathematics.** Spec 03 section 6 shows `fail_if {any_grade: F9, in: [ENG, MTC], then_max_division: IV}` only as an illustration of the escape hatch. No UNEB source for the rule was found, and spec 03 requires every such rule to cite its source, so it is **not** in the pack. Add it only with a citation and vectors.
- Nursery (pre-primary) is not modelled.
- National subject codes: none published in a source read, so `national_code` is null.
- Subject papers and maxima: a PLE subject is one score here.
- Any language-of-instruction or local-language subject for P1 to P3.

## Structure

One stage `PRI`, levels P1 to P7 (ordinals 1 to 7, so `ug-lsc` continues at 8). P7 is the stage exit with
the `PLE`. A calendar year with three terms.

## Assessment

`ug-ple-internal` (P1 to P7): continuous assessment (a `multi` slot, mean, scaled to 30) plus the
end-of-term examination (70), a total out of 100 rounded half-up to a whole percent before lookup on
`ple_subject`. A missing CA is excluded; a missing ET is incomplete.

`ple_division` sums the grade points of ENG, MTC, SCI and SST and looks the aggregate up on
`ple_divisions`. Lower is better.

## Conformance vectors

`tests/ug-ple.vectors.json` has 15 vectors: both edges of every division (4, 12, 13, 23, 24, 29, 30, 34,
35, 36), the half-up rounding at the D1/D2 boundary (89.5 and 89.4), the F9 ceiling and a promotion.
Run `node scripts/packs/run-vectors.mjs --pack ug-ple`; `src/domain/packs/__tests__/ug-packs.test.ts`
runs it and checks the schema, the semantic rules and that the scales cover every value once. The
vectors prove the pack matches its own declared ranges; they do not prove the ranges match UNEB.

## Sources (all read 2026-10-26)

1. UNEB, PLE 2020 divisional score distribution table by district -
   <http://web.archive.org/web/2026id_/https://uneb.ac.ug/wp-content/uploads/2021/07/PLE2020_SUMMARY_STATISTICS.pdf>
2. UNEB, Directorate of Examinations (mandate) -
   <http://web.archive.org/web/20261018080826/https://uneb.ac.ug/executive-director/directorte_of_examinations/>
3. NCDC - <https://ncdc.go.ug/>
4. Ministry of Education and Sports, school calendars - <https://www.education.go.ug/school-calendars/>

The Kiswahili labels (`locales/sw.json`) are a draft translation that no native speaker has reviewed.
