# Pilot sign-off — pack, school, term

> Copy this file to `sign-offs/<pack>-<school>-<term>.md` and fill it in. A sign-off is the school's
> acceptance of the pilot. It is **not** a curriculum officer's verification; the pack stays
> `verification: draft` until the separate review below is signed.

## Parties and term

| Field | Value |
| --- | --- |
| Pack (id and version) | `<packs/...>` version `<...>` |
| School | `<legal name>` |
| Country / curriculum | `<...>` |
| Term | `<name, start date – end date>` |
| Build / commit | `<tag or sha>` (not a branch head) |
| Deployment | single device / LAN hub / other: `<...>` |
| Pilot lead (product) | `<name>` |
| School lead | `<name, role>` |
| Technical contact | `<name, role>` |
| Data-protection contact | `<name, role>` |

## Scope

What the school actually ran this term (tick every one used; write "not in scope" for the rest):

- [ ] First-run setup and school profile
- [ ] Admission and enrolment
- [ ] Attendance (which classes and how many days: `<...>`)
- [ ] Fee structures, invoices and receipts
- [ ] Statements and defaulter follow-up
- [ ] Assessment, marks and published reports
- [ ] Promotion preview or run
- [ ] Guardian portal (state whether a staff login was linked to a guardian)
- [ ] Backup and restore drill

## Evidence

| Golden path | Date | Evidence (file, screenshot or report id) | Result |
| --- | --- | --- | --- |
| Setup | | | |
| Admission | | | |
| Billing | | | |
| Payment and receipt | | | |
| Attendance | | | |
| Assessment and report | | | |
| Promotion | | | |
| Backup and restore | | | |

## Issues at exit

| ID | Severity | Opened | Closed | Resolution or signed workaround |
| --- | --- | --- | --- | --- |
| | P1/P2/P3/P4 | | | |

State the count: P1 open `<n>`, P2 open `<n>`, P3 open `<n>`, P4 open `<n>`.

## Pack corrections

Every correction the school found, with the source the school used. "No change" is a valid entry.

| Pack item (file / key) | Current value | Correction | Source (document, page, date) | Checked by |
| --- | --- | --- | --- | --- |
| | | | | |

## Curriculum verification (separate from this sign-off)

This section is for a curriculum officer, not the school. Leave it unsigned until that review
happens; the pack's `verification.status` moves off `draft` only when this is complete.

| Field | Value |
| --- | --- |
| Reviewer and role | `<name, institution>` |
| Items reviewed | `<the list in the pack's verification.notes>` |
| Date | `<...>` |
| Result | approved / approved with conditions / rejected |
| Conditions | `<...>` |

## Declaration

The school confirms that:

- it used the build for the full term and the dates above are correct;
- the data in the system is the school's, and the school has been told how to export or delete it;
- the issues table is complete to the best of its knowledge;
- the evidence listed was produced by the school or in its presence;
- it understands that the pack remains a draft until the curriculum review above is signed.

## Decision

- [ ] **Pass** — the school would use the next release and will take a reference call.
- [ ] **Conditional pass** — the school would continue if the listed conditions are met by the date
      below.
- [ ] **Fail** — the school would not continue; the reasons are in the issues table.

Conditions and dates: `<...>`

| Signatory | Name | Role | Signature | Date |
| --- | --- | --- | --- | --- |
| School lead | | | | |
| Bursar | | | | |
| Registrar | | | | |
| IT contact | | | | |
| Pilot lead (product) | | | | |
