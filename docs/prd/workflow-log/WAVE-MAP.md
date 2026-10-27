# Wave map — 2026-10-26

The live index of what is merged, what is in flight, and what each wave still owes. Update it when a
wave lands, not at the end.

## Merged into `consolidation`

| PR | What it carried |
| --- | --- |
| #39 | **P3, the finance phase end to end** — closes Phase P3 (20/20). |
| #40 | **UI density** — one heading per page, nothing removed without a tooltip. |
| #41 | The tab context menu's **bulk closes and the pin label**. |
| #42 | The phase gate's **port-collision fix** (it probed a stranger's dev server) and `P3-phase-complete-2026-10-23.md`. |
| #43 | The sidebar's **active item, minimize, mobile rail width**, and **pin/unpin**. |
| #44 | **P4-W1** — the DR-02 sync decision and the hub server skeleton. |
| #45 | This wave map. |
| #46 | **P4-W2** — A02 the sync protocol and C01 server authentication. |
| #47 | **P5-W1** — A01 the i18n infrastructure. |
| #48 | **P4-D01** — encrypted backups, restore, the restore drill, GP-8; and the first-run fix below. |
| #49 | **P4-W3** — packaging, sequences, server RBAC, OIDC SSO, the health page and hardening. |
| #50 | **P5-A02** — locale formats and right-to-left layout. |
| #51 | **P4-W4** — GP-7, the multi-device golden path, and the P4 ledger. |
| #52 | The **P3 and P4 phase exits** — probe fix, baseline, phase-complete logs. |

## Phases

| Phase | State |
| --- | --- |
| P0 | 52/52 done, merged. |
| P1 | 28/28 done, merged. |
| P2 | 22/22 done, merged. |
| P3 | 20/20 done, merged; phase-complete log written (#52). |
| P4 | 12/12 done, merged; phase-complete log written (#52). |
| P5 | **13/13 done and merged; phase complete** (`P5-phase-complete-2026-10-27.md`). Four follow-ups opened as P5-Q01..Q04 and deferred. |
| P6 | 0/11. W1 is runnable; several tasks need owner decisions (licence DR-03, pilot schools, 1.0 release). |

## In flight

Nothing. P5's four waves and the three UI pull requests (#54, #55, #56) are merged into `consolidation`; the next work is P6.

The wave branch is `prd/P5-W2`: tasks are integrated into it one at a time once verified, and it becomes one PR.

Pushed, no PR yet (opening one needs the owner or a GitHub login on this machine):
`prd/ui-brand-home-module-names` (the module-dashboard and brand-home work) and `prd/ui-settings-hubs`
(the Settings overview and three hubs, stacked on it; see `UI-brand-and-settings-hubs-2026-10-26.md`).

## A clean merge is not a working merge

Every wave so far has found its real defect at the seam between two tasks that were each correct
alone. The pattern is worth expecting rather than being surprised by.

**W2 (#46).** C01 made every route but `/health` and the sign-in endpoints require a bearer session.
A02's sync suite, written before authentication existed, called `/api/sync/*` with no token: ten
failures, one of which asserted `400` where the auth refusal now returns `401` first.

**W3 (#49).** Three, none of which the conflict resolution itself could see:

1. D04 replaced the trusted `x-actor` header with `actorOf(req)` — which C01 had **deleted**. Its
   `recordRestrictedAccess` called a function that no longer existed, and its `Router` constructor
   took a positional limiter against the options object authentication had introduced.
2. `src/data/sync` knew nothing about D04's field cipher. With `sealRestrictedData` on,
   `ServerNode.bootstrap()` threw `RepositoryStorageError: Unexpected token 'e', "enc:v1:…" is not
   valid JSON` on the first sealed value — **the hub would not start at all**.
3. D01's backup export called `decodeRow` without a cipher, which D04 had made optional, so a live
   hub's sealed columns reached `JSON.parse` and the export answered `500`.

The gate's G3 is what caught 2 and 3, after the merge had applied cleanly.

## The first-run gap (#48), and why it is written down

C01 built `POST /api/auth/setup` and made it require an `institutionId` naming an **existing**
institution. Every route that can create one requires a session. So a freshly installed hub had no
way to be set up at all: `setupRequired: true` had no way out, nothing in the product called the
endpoint, and P4-D02's "fresh install to first login ≤ 15 min" was unreachable.

`POST /api/auth/setup` now accepts the institution's own fields instead of an id, created in the
same transaction as the administrator, and refuses both forms once an administrator exists.
`server/__tests__/authFirstRun.test.ts` starts a hub over an **unseeded** database and walks it from
`setupRequired` to a working session.

The general lesson: **an endpoint whose precondition no route can satisfy is not a route.** Check the
first-run path whenever a task adds authentication or a required entity.

## The test-fixture recipe, when a suite meets the authenticated hub

The hub has no administrator of its own — it authenticates against the canonical `user` table, whose
fixture hash is a placeholder. A suite that talks to it must leave one account it can sign in with:

1. `const USERNAME = 'grace.wekesa'; const PASSWORD = 'mwangaza-hub-2027';`
2. import `hashPassword` from `../auth/passwords`.
3. **Before** `seeded.close()` and before the hub starts:
   ```ts
   const users = await seeded.repository.list('user', { where: { username: USERNAME } });
   const seededUser = users.items[0];
   if (!seededUser) throw new Error(`the ${USERNAME} fixture was not seeded`);
   await seeded.repository.update(
     'user',
     seededUser.id,
     { password_hash: hashPassword(PASSWORD), status: 'active', mfa: false },
     { expectedVersion: seededUser.rowVersion, actor: seededUser.id, reason: 'test fixture' }
   );
   ```
   **The fourth argument is required** — without it the repository throws
   `Cannot read properties of undefined (reading 'actor')`. This is the step that costs the most to find.
4. After `hub.start()`, sign in and keep the token.
5. Carry `...(token === undefined ? {} : { authorization: `Bearer ${token}` })` in the helper's headers.

A suite that starts **two** hubs needs the treatment for each, on its own database file.

## What the gate does not cover, and what to check instead

- **The task gate's G3 runs only the tests related to the changed files** — four or five of them. It
  does **not** run the Playwright specs in `tests/e2e/`, which CI's "Golden paths" job does. A green
  gate is not a green PR.
- **CI's unit-test job ratchets against `scripts/prd/gate-baseline.json`'s `knownFailingFiles`.** A
  file that fails and is not in that baseline fails the PR even though the wave gate passed. Check
  the CI log's "New failing files" line, not just the gate.
- **The repo-wide mojibake check reads accented text as double-encoded UTF-8.** The pseudo-locale's
  own output tripped it, which failed `fix-encoding.test.mjs`'s "`--check` passes on `src/`" test and
  was the only new failing file in the whole suite. Build such expectations from `\u` escapes, which
  is what `fix-encoding.test.mjs` already does for its own samples.

## The workflow every wave follows

1. Cut the wave branch from the current `consolidation`; merge the finished task branches into it.
2. **Verify the commit, not the report** — read the diff, run the tests, check the acceptance.
3. Run the wave gate **in the foreground**; it must pass before the commit is trusted.
4. Push, open the PR, and merge it with a merge commit once CI is green.
5. Re-read this file: the `consolidation` a wave was cut from moves while the wave is built, so expect
   a second reconcile pass before the PR can merge.

## Open limitations carried forward

- **`sync_change.payload` carries restricted values opened.** D04's encryption at rest covers the
  canonical columns and not the sync change log, so `threat-checklist.md` row 10 is narrower than it
  reads. Closing it means sealing the payload or keeping restricted fields out of the change log, and
  either changes what a device is sent.
- **`--database-file` was dropped** by P4-D02's CLI restructure and restored on `prd/P4-W3`; watch for
  other flags the restructure left behind.
- **P3 phase-exit verdict** — needs a quiet `node scripts/prd/gate.mjs phase --probe`.
- **DR-02's candidate B** was measured PouchDB-to-PouchDB, not against a real CouchDB (Docker is not
  available here), so the HTTP wire, `_changes` and filtered replication are assumptions. The decision
  record states this as a limitation of its evidence.
- **The RBAC layer is built and wired into nothing** (P4-C02 is where the server-side checks land), and
  **the payments page issues a counted receipt number** while the cashier uses the sequences module
  (P4-A03 owns receipt numbering across devices).
- **No screen records a learner's fee category**, so a schedule declaring two categories refuses every
  learner — correct, but useless.
