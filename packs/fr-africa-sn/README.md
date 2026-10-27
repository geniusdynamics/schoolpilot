# fr-africa-sn - Senegal, moyen and secondary general (6e to Terminale)

Francophone pack of the family `fr-africa-*`, same shape as `fr-africa-ci` (read its README for the reasoning). French
is the primary language of the labels, English the second.

**Verification status: `draft`, and the weakest of the three: nothing in it is confirmed for Senegal.** Sources were
read on 2026-10-27. The reachable Senegalese official sites (the Ministry of National Education `education.sn`, the
Office du baccalaureat `officedubac.sn`, the labour ministry) publish news, examination calendars and papers, and no
grading regulation; several other official domains did not resolve.

## Sources

| Document | Issuer | URL | Used for |
| --- | --- | --- | --- |
| Systeme educatif | Ministere de l'Education Nationale | https://education.sn/system-educatifs | That the system has preschool, elementary, middle and secondary levels. **Fetched; no rule.** |
| Office du baccalaureat | Office du baccalaureat (UCAD) | https://officedubac.sn/ | That the baccalaureate has a general and a technical stream and a 2026 calendar. **Fetched; no rule.** |
| Decret n°95-035 du 24 fevrier 1995 (Cameroon) | Office du Baccalaureat du Cameroun | https://officedubac.cm/wp-content/uploads/2025/03/Decret-N%C2%B095-035-du-24-fevrier-1995-portant-organisation-des-baccalaureats-de-lenseignement-secondaire.pdf | The wording of the four mentions, borrowed as the draft. **Fetched, OCR.** |

## What is modelled (all draft)

The same structure as `fr-africa-ci` with the BFEM at 3e, a /20 mark per subject, the coefficient-weighted moyenne
kept to two places, the mention scale, a class-council suggestion at 10 and the annual moyenne as the mean of three
trimestres. Every figure is from spec 03 Appendix J or the Cameroon decree.

## Known gaps

1. **Coefficients**: every coefficient is 1; no Senegalese table was found. The school replaces them.
2. **Trimestres or semestres**: not confirmed for the secondary school year in Senegal.
3. The conseil de classe rules, the annual moyenne and the mentions of the Senegalese baccalaureate; series (L, S, STEG...); primary (CFEE).
4. French and English labels not reviewed by a native speaker.

## Conformance vectors

`tests/fr-africa-sn.vectors.json`: fourteen vectors (`node scripts/packs/run-vectors.mjs --pack fr-africa-sn`).
