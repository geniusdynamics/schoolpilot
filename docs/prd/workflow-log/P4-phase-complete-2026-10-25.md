# P4 (Multi-user, sync and security) phase complete - 2026-10-25

**12 of 12 tasks done**, merged to `consolidation` by wave PR: **#44** (W1: the sync decision and the hub
skeleton), **#46** (W2: sync protocol and server authentication), **#48** (D01 backups), **#49** (W3:
packaging, sequences, server RBAC, OIDC, the health page and hardening) and **#51** (W4: GP-7 and the
ledger). The ledger records each task's commit and what it leaves open.

## The exit criteria, one by one

**1. "Three devices edit concurrently (GP-7) with deterministic outcomes." - met.**
`server/__tests__/gp7MultiDevice.test.ts`: a bursar's PC and two teachers' phones, each with its own
database, against one real hub over HTTP with authentication. Five receipts each from hub-allocated
blocks, none repeated; a block used up offline is refused loudly; marks on two different papers both
survive the merge; the same cell folds into the first row, holds the later write and is surfaced as a
`cell_identity` conflict; every device ends with exactly the hub's rows for every entity. It was checked
for teeth (one receipt number stamped on every payment turns it red). It is a **Node-level journey run in
the unit-test job**, not a Playwright one, because the browser app holds no hub client.

**2. "Hub runs on Windows, Ubuntu and Raspberry Pi with one installer each." - PARTLY met.**
The three installers exist. Fresh install to first request measured **67 s on Windows** and **114 s on
Ubuntu 22.04 under WSL2**, against a 15-minute bar. **Raspberry Pi was a dry run only.** systemd, the
firewall rules, the Windows scheduled task and two-machine LAN discovery were not verified. The phase's
own exit evidence asks for the three platforms verified; **this criterion stays open until it is run on a
real Pi.**

**3. "Automatic encrypted backups and a verified restore (GP-8)." - met, with one gap.**
AES-256-GCM archives with a scrypt key, retention, restore into a new instance verified by SHA-256 and
per-table digests, the restore drill and the export. GP-8 (`tests/e2e/gp8-backup-restore.spec.ts`) passed
when run, including the logical-checksum comparison, and the backup suites run in CI. **The GP-8 spec is
not in CI's Playwright job**, which lists only GP-1-lite, GP-6, the finance path and the CSP spec; adding
it is a follow-up that should be done with a CI run to watch, not blind.

**4. "Server-side permission checks mirror client checks." - met for the entity, service, approval and
backup APIs; not for the rest.**
`server/__tests__/rbac.test.ts` holds the hub beside the client's own authorizer for **every role** (140
decisions: list, read, create, remove) and they agree, plus default-deny, field redaction by role, the
maker-checker rules and the bootstrap across restarts. **`/api/sync`, `/api/sequences` and `/api/health`
are authenticated but not permission-gated** - any signed-in session can pull every row from `/api/sync`,
restricted fields included. The role catalogue has no permission for them yet, so closing it is a design
task, not a patch.

**5. "`gate.mjs phase --probe` - GATE PASSED; baseline tightened; phase-complete log written." - met.**
The final run on a quiet machine (other projects' dev servers stopped): **GATE PASSED, 11 checks, 0
failed.** G1 typecheck 2306/2500; G2 and G5-G8 clean; P1 full suite **2 failed files against a baseline of
4** (6,203 tests); P2 build; probe checks C01-C16 with **15 PASS and 1 SKIP**.

The first run of the same gate **failed**, and not from load: probe checks C11 and C12 drove screens that
had since been redesigned (the payments page is a tab hub; marks entry now picks a period and a teaching
group). The probe was fixed to drive the real flows, not relaxed. C13 (attendance roll-call) failed once
in four runs with a click timeout and passed in the others, so it has a real flake rate.

**Baseline tightened:** the probe floor goes from 0 to **14** of 16, not 15 - C13's flake would fail a
floor at 15 spuriously. `failedFiles` is deliberately **not** tightened: the two files that fail in a full
local run (`scripts/prd/fix-encoding.test.mjs`, a Windows-only load error, and
`scripts/prd/__tests__/eslint-gate.test.ts`) differ from the four CI knows about, which all pass here, and
the baseline is calibrated to the Linux CI runner. Typecheck is left alone for the same reason.

## P3's exit verdict

P3's criterion 5 was waiting on a quiet re-run. It has now run and **P3 passes**: the same gate, with the
probe at 15 PASS and 1 SKIP. The two failures the P3 log recorded were load artefacts, as it said, but the
quiet run also found two that were **not**: the probe's C11 and C12 had gone stale against redesigned
screens. Both are fixed. P3's criterion 4 (GP-4 has no billing steps) still needs amending in the phase
document rather than satisfying.

## What is open, in one place

- A real Raspberry Pi install (criterion 2).
- GP-8 in CI's Playwright job (criterion 3).
- Permissions for `/api/sync`, `/api/sequences`, `/api/health` (criterion 4).
- **No screen uses the hub yet.** The browser holds no hub connection, so receipts are still numbered
  locally (the payments page still issues a counted number, `RCT-000001`), the Health tab takes a hub
  address and token typed into the page, and there is no "Sign in with Google" button or callback page.
  The hub's behaviour is proven over HTTP; the app's use of it is the next phase's job.
- OIDC has only been run against a provider in the test process, never Google or Microsoft.
- `sync_change.payload` is plaintext, so encryption at rest does not cover the sync change log.
- Authorise-then-validate order: a caller lacking a permission sees 400/404, not 403, for a malformed
  body or a missing row.
