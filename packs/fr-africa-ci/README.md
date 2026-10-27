# fr-africa-ci - Cote d'Ivoire, secondary general (6e to Terminale)

The first pack of the Francophone family `fr-africa-*` (siblings: `fr-africa-cm`, `fr-africa-sn`): marks out of 20,
subject coefficients, three trimestres, a coefficient-weighted moyenne, the conseil de classe suggestion and the four
mentions. French is the primary language of the labels (`locales/fr.json`), English the second.

**Verification status: `draft`.** Sources were read on 2026-10-27. The Ivorian rules below come from four circulars of
the Ministry for the school year **2023-2024**, which are **scanned images**: they were read by OCR (Windows OCR),
so a reviewer must compare them with the originals, and they are reissued each year.

## Sources

| Document | Issuer | URL | Used for |
| --- | --- | --- | --- |
| Circulaire n°268, modalites de passage en classe superieure | Ministere de l'Education Nationale (CI) | https://www.education.gouv.ci/assets/pdf/Document/Textes/document_54.pdf | Annual moyenne; admission at 10 out of 20. **Fetched, OCR.** |
| Circulaire n°270, coefficients du premier et du second cycle | same | https://www.education.gouv.ci/assets/pdf/Document/Textes/document_56.pdf | Religious instruction and manual work are not counted in the moyennes. **Fetched, OCR; the coefficient table is a rotated scan and could not be read.** |
| Circulaire n°279, note de conduite | same | https://www.education.gouv.ci/assets/pdf/Document/Textes/document_64.pdf | Conduct mark /20 counts with coefficient 1. **Fetched, OCR.** |
| Circulaire n°274, rythme des evaluations | same | https://www.education.gouv.ci/assets/pdf/Document/Textes/document_61.pdf | Fetched; the annexed tables were not read. |
| Decret n°95-035 du 24 fevrier 1995 (Cameroon) | Office du Baccalaureat du Cameroun | https://officedubac.cm/wp-content/uploads/2025/03/Decret-N%C2%B095-035-du-24-fevrier-1995-portant-organisation-des-baccalaureats-de-lenseignement-secondaire.pdf | The four mentions (no Ivorian text was found). **Fetched, OCR.** |

## What is modelled

- **Structure.** College 6e to 3e (BEPC at 3e), lycee 2nde to Terminale (BAC), three trimestres. Trimestre windows are typical, not gazetted.
- **Scheme `fr-moyenne-matiere`.** One mark `MOY` out of 20 per subject per trimestre (rescaled to 20 when entered on another base). How it is composed from compositions and devoirs follows circular 274's tables, which were not read.
- **Aggregation `moyenne_trimestrielle`.** Coefficient-weighted mean of the subject marks, kept to two places, half-up (assumption), then looked up in `mentions_fr`.
- **Annual moyenne** (circular 268, verified from the OCR): `(T1 + 2 x T2 + 2 x T3) / 5`, written as weights 0.2, 0.4, 0.4.
- **Conduct** counts with coefficient 1 (circular 279). Religious instruction and manual work are not learning areas, because circular 270 excludes them.
- **Promotion** is a class-council suggestion at an annual moyenne of 10 (circular 268, learners who have not repeated). The 3e moves into the lycee as a stage transition.
- **Mentions** `mentions_fr`: Passable from 10, Assez bien from 12, Bien from 14, Tres bien from 16 (Cameroon decree wording). Below 10 the code `INS` names "no mention". The scale kind is `numeric_bands` with a /20 input: the assessment engine's scale preparation refuses `mark_out_of_20` (it accepts only `out_of_20`, which the loader projects to `mark_out_of_20`); that mismatch is outside this task and is reported, not fixed.

## Known gaps (all draft or unmodelled)

1. **Subject coefficients.** Every coefficient is 1, a neutral default; the real table is in circular 270's scanned annex. The school replaces them (`learning_areas.*.coefficient` is overridable).
2. **Mentions** are not confirmed by an Ivorian text.
3. **Council rules beyond 10:** advice for 9.50-9.99, repetition for 8.50-9.49, exclusion below 8.50, the rules for repeaters, the 2nde C to 1re C condition (mathematics and physics-chemistry average at least 10), series-specific subjects, the 3e orientation commission (CNO) and the 'report de scolarite'. They are in circular 268 and are not modelled.
4. Series A1, A2, C, D and their subjects; primary (CEPE); the conduct mark's 20-point criteria split.
5. The French and English labels were not reviewed by a native speaker.
6. Current-year circulars (the pack follows 2023-2024).

## Conformance vectors

`tests/fr-africa-ci.vectors.json`: fifteen vectors run by `node scripts/packs/run-vectors.mjs --pack fr-africa-ci`: the mark and its rescaling, the mention boundaries (9.99, 10, 12, 14, 16, 20), a weighted moyenne of 12.2, a rounded 10.33, the conduct mark counted at coefficient 1, and three promotion suggestions.
