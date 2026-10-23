# Wave map — 2026-10-23 (evening)

A live index of where the PRD stands, so the next session does not have to reconstruct it from a chat
log. It is updated as waves land; the per-wave logs under `workflow-log/` are the detail.

## Merged into `consolidation`

| PR | What it carried |
| --- | --- |
| #39 | **P3, the finance phase end to end** — closes Phase P3 (20/20). |
| #40 | **UI density** — one heading per page, nothing removed without a tooltip. |
| #41 | The tab context menu's **bulk closes and the pin label**. |
| #42 | The phase gate's **port-collision fix** (it probed a stranger's dev server) and `P3-phase-complete-2026-10-23.md`. |
| #43 | The sidebar's **active item, minimize, mobile rail width**, and **pin/unpin**. |
| #44 | **P4-W1** — the DR-02 sync decision and the hub server skeleton. |

## Phases

| Phase | State |
| --- | --- |
| P0 | 52/52 done, merged. |
| P1 | 28/28 done, merged. |
| P2 | 22/22 done, merged. |
| P3 | 20/20 done, merged. **Phase exit gate owed a quiet re-run** — its two failures were a stale dev server holding the probe's port and a load artefact from agents running alongside it; both are recorded with causes in the phase log. |
| P4 | **W1 merged.** W2 and part of W3 in flight (below). W4 not started. |
| P5 | **W1 in flight** (allowed early: P5 depends only on P2, and the phase doc says W1 may start during P1). W2/W3 not started. |
| P6 | Not started — it depends on P2, P3 **and P4**. |

## In flight

Each task has its own worktree and branch, and is briefed to run its gate **in the foreground**: an
earlier implementer backgrounded it, ended its turn, and left its work uncommitted for the integrator.

| Wave | Task | Branch | Based on |
| --- | --- | --- | --- |
| P4-W2 | A02 sync protocol: change log, HLC, scoped replicas, the three conflict policies, conflict-log UI | `prd/P4-A02` | `prd/P4-W1` |
| P4-W2 | C01 server authentication: sessions, lockout, password reset, TOTP, phone OTP | `prd/P4-C01` | `prd/P4-W1` |
| P4-W2 | D01 backups: encrypted daily, retention, restore-to-new-instance, restore drill, export, GP-8 | `prd/P4-D01` | `prd/P4-W1` |
| P4-W3 | D02 packaging: installers, LAN discovery, TLS | `prd/P4-D02` | `consolidation` |
| P4-W3 | D04 hardening: CSP, rate limits, scanning, encryption at rest, access logs | `prd/P4-D04` | `consolidation` |
| P5-W1 | A01 i18n infrastructure: namespaces, extraction, platform sync, pseudo-locale CI check | `prd/P5-A01` | `consolidation` |
| P5-W1 | A02 locale formats and RTL layout | `prd/P5-A02` | `consolidation` |

## The workflow every wave follows

1. Cut the wave branch from the current `consolidation`; merge the finished task branches into it.
2. **Verify the commit, not the report** — read the diff, run the tests, check the acceptance.
3. Run the wave gate **in the foreground**; it must pass before the commit is trusted.
4. Push, open the PR, and merge it with a merge commit once CI is green.

## Open limitations carried forward

- **P3 phase-exit verdict** — needs a quiet `node scripts/prd/gate.mjs phase --probe`; see the note above.
- **DR-02's candidate B** was measured PouchDB-to-PouchDB, not against a real CouchDB (Docker is not
  available here), so the HTTP wire, `_changes` and filtered replication are assumptions. The decision
  record states this as a limitation of its evidence.
- **The RBAC layer is built and wired into nothing** (P4-C02 is where the server-side checks land), and
  **the payments page issues a counted receipt number** while the cashier uses the sequences module
  (P4-A03 owns receipt numbering across devices).
- **No screen records a learner's fee category**, so a schedule declaring two categories refuses every
  learner — correct, but useless.
