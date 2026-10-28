<!-- One task or one coherent change per pull request. Tick every box, or say in
     the description why a line does not apply. -->

## What and why

<!-- Two to six lines: what changed, and the problem it solves. Link the issue,
     the PRD task id or the RFC this implements. -->

## Checklist

- [ ] **Gate.** `node scripts/prd/gate.mjs task --base <ref> --task <task-id>` ended
      `GATE PASSED`, and its table from `.prd-gate/report.md` is pasted below.
      Every `WARN` is explained.
- [ ] **Tests.** They cover the change and fail without it; the failing run was
      seen. `pnpm test:run` passes, or the remaining failures are named and are
      pre-existing on the base ref.
- [ ] **No weakened bar.** No `--no-verify`, no skipped or deleted test, no raised
      `.type-ratchet`, no edit to `docs/prd/gate-baseline.json`.
- [ ] **Docs.** User-facing behaviour, a pack, a schema or an RFC is documented
      where the change touches it.
- [ ] **No secrets.** No tokens, DSNs, API keys or private keys in the diff, the
      description or a commit message. `pnpm secret:scan` is clean.
- [ ] **No personal data.** Nothing in the diff or the description identifies a
      real learner, guardian or member of staff.
- [ ] **Licence of contributed data.** Pack data, fixtures and translations cite
      their source and state a licence or the permission held; a pack correction
      links the official document.
- [ ] **Scope.** The diff stays inside the files this task owns.

## Gate table

<!-- Paste .prd-gate/report.md here. -->

| Check | Verdict | Detail |
| --- | --- | --- |
|  |  |  |

## Verification

- Ran:
- Not verified, and why:

## Reviewer notes

<!-- Anything a reviewer should look at first: a risky migration, a pack figure
     that needs a second source, a UI change that needs a screenshot. -->
