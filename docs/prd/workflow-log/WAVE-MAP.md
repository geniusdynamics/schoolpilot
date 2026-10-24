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

## The P4-W2 blocker, with the fix ready to apply

`prd/P4-W2` carries **A02 + C01**, merge-resolved and lint-clean (`0f3d850`), and its gate fails **only**
on G3: 10 tests in `server/__tests__/sync.test.ts` get `{"code":"unauthenticated"}` (and one asserts
`400` where it now gets `401`). C01 made every route but `/health` and the sign-in endpoints require a
bearer session; A02's sync suite and D01's backup suite were written before that and call those routes
with no token.

**The fix, worked out and not yet applied** — in `server/__tests__/sync.test.ts` and
`server/__tests__/backupRoutes.test.ts`:

1. `const USERNAME = 'grace.wekesa'; const PASSWORD = 'mwangaza-hub-2027';` and `let token: string | undefined;`
2. import `hashPassword` from `../auth/passwords`.
3. In `beforeAll`, **before** `seeded.close()` and before the hub starts, give the seeded user a password
   the hub can verify — the fixture's hash is a placeholder, and the hub has **no** administrator of its
   own, it authenticates against the canonical `user` table:
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
   `Cannot read properties of undefined (reading 'actor')`. This is the step that cost the most to find.
4. After `hub.start()`, sign in and keep the token:
   `const login = await api('POST', '/api/auth/login', { username: USERNAME, password: PASSWORD }); token = (login.body as { token: string }).token;`
5. In each suite's request helper, carry `...(token === undefined ? {} : { authorization: \`Bearer ${token}\` })`
   in the headers.

Then re-run the wave gate and open the P4-W2 PR.


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
