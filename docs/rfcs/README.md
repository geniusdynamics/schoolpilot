# Requests for Comments (RFCs)

An RFC is the written record of a decision that is expensive to reverse. Code
follows the RFC; the RFC does not follow the code.

## When an RFC is required

Write one before you open the implementation pull request if the change touches
any of these:

| Surface | Examples |
| --- | --- |
| **Domain model** (spec 02) | A new entity or aggregate, a renamed field that schools already report on, a change to how enrolments, assessments or invoices relate |
| **Pack schema** (`packs/schema/*.schema.json`) | A new required field, a renamed key, a new block type, a change to how versions or overrides work |
| **Plug-in SDK** (spec 06) | A new hook, a changed contract, a removed capability, anything a third-party plug-in author would have to rewrite |
| **Anything breaking** | Removing a route, a data migration that cannot be rolled back, dropping a supported browser or database, a change that invalidates a published report card |
| **Release policy** (spec 08 §6) | A change to support windows, channels or the no-breaking-upgrade-mid-term rule |

Everything else — a bug fix, a component, a refactor inside a seam, a
documentation fix — does not need an RFC. If you are unsure, ask in the pull
request; a one-paragraph answer is enough to decide.

## Lifecycle

```
draft ──▶ review ──▶ accepted ──▶ implemented
                 └──▶ rejected
```

| State | What it means | Where it lives |
| --- | --- | --- |
| **draft** | The author is still writing. Feedback welcome, nothing decided. | Pull request against `consolidation`, file in `docs/rfcs/` |
| **review** | The draft is complete and the review window is open. | Same pull request, `Status: review` in the header |
| **accepted** | Merged, and the decision is binding. | Merged to `consolidation` |
| **rejected** | Merged with `Status: rejected` and the reason, so nobody proposes it twice for the same reasons. | Merged to `consolidation` |
| **implemented** | The code landed, or the rollout is complete. | A later commit flips the status, with the implementing pull requests linked |
| **superseded** | A later RFC replaces it. | The replacing RFC links back; this one gains `Superseded by: NNNN` |

An accepted RFC that nobody implements within one release is reopened as a
question, not left accepted forever.

## Review window

**14 days** from the moment the pull request is marked `Status: review`. The
window can be shortened only for a security fix or a release blocker, and the
RFC says why in its header. Anyone may comment on the pull request; silence from
a reviewer is not an objection, but the decision-maker must record the decision
with the date.

## Who decides

TODO: owner to confirm the decision rule before publication. The proposal this
repository should record is:

- Two approvals are required, at least one from a maintainer who owns the area
  the RFC touches.
- A pack-schema RFC needs the agreement of a steward for every pack whose files
  would have to change (see [docs/packs/STEWARDSHIP.md](../packs/STEWARDSHIP.md)).
- A domain-model RFC needs the maintainer of the domain the change sits in.
- A tie breaks with the repository owner.

## Writing one

1. Find the next number: `docs/rfcs/NNNN-slug.md`, starting at `0001`.
2. Copy [TEMPLATE.md](./TEMPLATE.md) and fill every section. "None" is a valid
   answer; an empty section is not.
3. Open a pull request against `consolidation` with the subject
   `docs(rfc): <NNNN> <title>`, `Status: draft`.
4. When you think it is ready, change the header to `Status: review`, set the
   review-window dates, and ask for the reviewers the "Who decides" rule names.
5. On the last day of the window the decision-maker records `Status: accepted`,
   `rejected` or `superseded` in the header and merges.
6. The implementation pull request links the RFC. When the last piece lands,
   flip the status to `implemented` and link the pull requests.

Numbering is permanent: a rejected RFC keeps its number, and a rewritten idea
gets a new one that links the old.

## File format

```markdown
# NNNN. Title

- **Status:** draft | review | accepted | rejected | implemented | superseded
- **Date:** YYYY-MM-DD (the date the current status began)
- **Author(s):** name or handle
- **Review window:** YYYY-MM-DD to YYYY-MM-DD
- **Affects:** domain model | pack schema | plug-in SDK | release policy | other
- **Supersedes / Superseded by:** NNNN, or none
```

The body sections are fixed by [TEMPLATE.md](./TEMPLATE.md).
