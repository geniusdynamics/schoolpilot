# fr-africa-cm - Cameroun francophone, secondary general (6e to Terminale)

Francophone pack of the family `fr-africa-*`, same shape as `fr-africa-ci` (read its README for the reasoning behind
the scheme, the aggregation and the mention scale). French is the primary language of the labels, English the second.

**Verification status: `draft`.** Sources were read on 2026-10-27. The Cameroonian official sites reachable were the
Office du Baccalaureat du Cameroun; the Ministry's own site (`minesec.gov.cm`) served unrelated content when it was
fetched, so no Ministry text was used.

## Sources

| Document | Issuer | URL | Used for |
| --- | --- | --- | --- |
| Decret n°95-035 du 24 fevrier 1995, organisation des baccalaureats | Office du Baccalaureat du Cameroun | https://officedubac.cm/wp-content/uploads/2025/03/Decret-N%C2%B095-035-du-24-fevrier-1995-portant-organisation-des-baccalaureats-de-lenseignement-secondaire.pdf | Marks out of 20; each mark multiplied by the coefficient set by arrete; admission at a moyenne of 10 out of 20; the four mentions. **Fetched, a scanned image read by OCR** (articles 12, 19, 21, 22). |
| Recueil des textes sur les examens ESG et STT | Office du Baccalaureat du Cameroun | https://officedubac.cm/textes/ | The index of the arretes (coefficients per series) the decree defers to; **none of them was read**. |

## What is modelled

Structure (6e to Terminale; BEPC at 3e, BAC at Tle), one /20 mark per subject, the coefficient-weighted moyenne kept
to two places, the mention scale (Passable from 10 and below 12, Assez bien from 12, Bien from 14, Tres bien from 16:
the decree's wording; OCR garbled the lower bound of Passable and it is taken as 10), a class-council suggestion at 10,
and the annual moyenne as the plain mean of three trimestres. The decree governs the **baccalaureate**; applying its
mentions to a school's trimestre moyenne is a draft choice.

## Known gaps

1. **Coefficients**: every coefficient is 1; the arretes per series were not read. The school replaces them.
2. **School-year rules** (trimestres, sequences, annual moyenne, the 10 threshold, conseil de classe): no fetched Cameroonian text states them; they follow spec 03 Appendix J. The year may use sequences inside trimestres.
3. The probatoire (end of 1ere) and the BEPC are named without rules; series and subjects per series; primary; **the Anglophone GCE subsystem** (a bilingual school needs a second programme); the optional-test and EPS bonus rule (only points above 10 count).
4. French and English labels not reviewed by a native speaker.

## Conformance vectors

`tests/fr-africa-cm.vectors.json`: fourteen vectors (`node scripts/packs/run-vectors.mjs --pack fr-africa-cm`).
