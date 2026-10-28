# Pack stewardship

A pack encodes what a country or a board says. It is data, validated by schema,
but data that a school prints on a report card and a bursar pays a salary from.
Stewardship is who answers for that data.

## What a steward is

A steward is the named person accountable for **one** pack:

- They know the system it encodes (an educator, a curriculum officer, an
  accountant for a payroll pack), ideally from the country it serves.
- They can read the official source and tell a transcription error from a policy
  change.
- They answer the pull requests and issues that touch their pack, and they say
  "I cannot confirm that" instead of guessing.

A steward is not a lawyer and not the authority that publishes the rules. Their
signature means "this is what the cited document says, and I checked it", not
"this is legally binding".

## The rules a steward enforces

**A correction needs a cited official source.** No correction is merged without
a document that states the value: a title, the issuing body, a URL and the date
it was retrieved, plus the page, table or clause. Anecdote, a blog post, a
textbook and another school's practice are not sources. Where two official
sources disagree, the pack records the disagreement in
`verification.notes` and picks the more recent instrument — it does not quietly
pick one.

**`verified` requires conformance vectors traced to an official example.** The
status ladder is the schema's (`packs/schema/manifest.schema.json`):

| Status | Requires |
| --- | --- |
| `draft` | Nothing. Every list and band still needs checking; `verified_by` may be empty. |
| `reviewed` | A named reviewer checked this version against its sources. `verified_by` names them. |
| `verified` | Reviewed, **and** the pack's `tests/*.vectors.json` pin its results, at least one vector traced to an official worked example — a published band table, a sample result slip, a marking scheme with its total (spec 03 §12). |

A vector the author invented from the same arithmetic that produced the pack
proves nothing: it pins the engine against regressions, not the pack against
reality. The pack's `README.md` names, per vector or per group of vectors, the
official example it was traced to; where there is none, the pack stays `draft`
and the README says which figures are school-overridable defaults.

**Version bumps follow spec 03 §2.3.** Patch for a label, comment or typo; minor
for a new option or template; major for a structural change to levels, learning
areas or a result a school has already reported. A correction that changes a
result must say so in the issue
([`.github/ISSUE_TEMPLATE/pack_correction.md`](../../.github/ISSUE_TEMPLATE/pack_correction.md))
and in the pack's `verification.notes`.

## How to become a steward

1. Read the pack's `README.md` and its `verification.notes`. Every open item is
   a job someone has to do; pick one you can answer with a document.
2. Open a pack correction, or comment on an existing one, with the source.
3. Ask the maintainers to record you as steward for that pack. Expect a second
   person who knows the system to accept your first review before you sign one
   alone.
4. Once recorded, your name goes in the table below and in the pack's
   `verification.verified_by` when you review a version.

TODO: owner to confirm the process for recording a steward (this document as the
record, or a `CODEOWNERS` entry per pack directory) and whether a steward must
sign a contribution licence agreement.

## Packs that need a steward

Every pack in this repository is `verification: draft` and **unassigned**. None
of these names is a person: `unassigned` means no one has agreed to review the
pack, and the placeholders must not be filled in with an invented name.

| Pack | Path | Version | Verification today | Steward |
| --- | --- | --- | --- | --- |
| `country-ke` (Kenya) | `packs/country/ke` | 1.0.0 | draft | unassigned |
| `country-ug` (Uganda) | `packs/country/ug` | 1.0.0 | draft | unassigned |
| `country-tz` (Tanzania) | `packs/country/tz` | 1.0.0 | draft | unassigned |
| `country-rw` (Rwanda) | `packs/country/rw` | 1.0.0 | draft | unassigned |
| `country-ng` (Nigeria) | `packs/country/ng` | 1.0.0 | draft | unassigned |
| `country-gh` (Ghana) | `packs/country/gh` | 1.0.0 | draft | unassigned |
| `country-za` (South Africa) | `packs/country/za` | 1.0.0 | draft | unassigned |
| `country-sn` (Senegal) | `packs/country/sn` | 1.0.0 | draft | unassigned |
| `country-ci` (Côte d'Ivoire) | `packs/country/ci` | 1.0.0 | draft | unassigned |
| `country-cm` (Cameroon) | `packs/country/cm` | 1.0.0 | draft | unassigned |
| `ke-cbe` (Kenya CBE, PP1–G12) | `packs/ke-cbe` | 2026.1.0 | draft | unassigned |
| `ke-844` (Kenya 8-4-4, F3–F4) | `packs/ke-844` | 1.0.0 | draft | unassigned |
| `ug-ple` (Uganda PLE) | `packs/ug-ple` | 1.0.0 | draft | unassigned |
| `ug-lsc` (Uganda lower secondary) | `packs/ug-lsc` | 1.0.0 | draft | unassigned |
| `ug-uace` (Uganda UACE) | `packs/ug-uace` | 1.0.0 | draft | unassigned |
| `tz-national` (Tanzania national) | `packs/tz-national` | 1.0.0 | draft | unassigned |
| `rw-cbc` (Rwanda CBC) | `packs/rw-cbc` | 1.0.0 | draft | unassigned |
| `ng-ube` (Nigeria UBE) | `packs/ng-ube` | 1.0.0 | draft | unassigned |
| `ng-sss` (Nigeria senior secondary) | `packs/ng-sss` | 1.0.0 | draft | unassigned |
| `gh-sbc` (Ghana standards-based curriculum) | `packs/gh-sbc` | 1.0.0 | draft | unassigned |
| `gh-shs` (Ghana senior high) | `packs/gh-shs` | 1.0.0 | draft | unassigned |
| `za-caps` (South Africa CAPS) | `packs/za-caps` | 1.0.0 | draft | unassigned |
| `fr-africa-ci` (Côte d'Ivoire, French) | `packs/fr-africa-ci` | 1.0.0 | draft | unassigned |
| `fr-africa-cm` (Cameroon, French) | `packs/fr-africa-cm` | 1.0.0 | draft | unassigned |
| `fr-africa-sn` (Senegal, French) | `packs/fr-africa-sn` | 1.0.0 | draft | unassigned |
| `cambridge-intl` (Cambridge International) | `packs/cambridge-intl` | 1.0.0 | draft | unassigned |
| `pearson-intl` (Pearson Edexcel International) | `packs/pearson-intl` | 1.0.0 | draft | unassigned |
| `gb-national` (England national) | `packs/gb-national` | 1.0.0 | draft | unassigned |
| `ke-payroll` (Kenya payroll rules) | `packs/payroll/ke` | 1.0.0 | draft | unassigned |

A new pack arrives with a steward named in its pull request, or with
`unassigned` and a note that says who should be asked. The table is the record:
when a steward is agreed, the row changes and the pack's
`verification.verified_by` gains the name on the review that earns it.

## What a steward is asked for, in order

1. **Payroll (`ke-payroll`) and the country packs first.** A wrong statutory
   rate pays someone the wrong salary; a wrong holiday closes a school on the
   wrong day. The payroll pack's README asks for an accountant before it is used
   to pay anyone.
2. **A flagship pack per system** — CBE primary, transitional secondary, British
   international, and one non-Kenyan national system — because the pilot
   programme (spec 08 §7) needs a school and a steward to sign a release
   candidate off.
3. The rest, as people volunteer.
