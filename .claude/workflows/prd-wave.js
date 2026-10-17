export const meta = {
  name: 'prd-wave',
  description: 'Run one PRD wave: implement and verify tasks in parallel worktrees, integrate serially behind the gate, write the wave log',
  whenToUse: 'Execute the next open wave of docs/prd (find it with: node scripts/prd/status.mjs). Args: { wave, date, push?, only?, maxParallel?, trailers?, models?, opusTasks? }',
  phases: [
    { title: 'Load', detail: 'read runnable tasks of the wave from docs/prd/tasks.json' },
    { title: 'Implement', detail: 'one implementer per task in its own git worktree, test first, task gate' },
    { title: 'Verify', detail: 'adversarial verifier per task; one fix round when blocking findings exist' },
    { title: 'Integrate', detail: 'serial squash-merge onto consolidation, gate, one commit per task' },
    { title: 'Log', detail: 'wave log, ledger commit shas, PROGRESS.md, optional push' },
  ],
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------
const A = args || {}
if (!A.wave || !A.date) throw new Error('args.wave (e.g. "P0-W1") and args.date (YYYY-MM-DD) are required')
const WAVE = A.wave
const DATE = A.date
const MAX_PARALLEL = A.maxParallel || 4
const TRAILERS = A.trailers || 'Co-Authored-By: Claude <noreply@anthropic.com>'

// Model policy (docs/prd/workflow-log/decisions/2026-10-17-model-policy.md): cheap models for mechanical
// stages, Sonnet implements at an effort matched to task size, Opus reviews large tasks and every re-review.
// Override any role with args.models = { role: { model, effort } }; args.opusTasks forces Opus for a task.
const SIZE_EFFORT = { S: 'low', M: 'medium', L: 'high' }
function route(role, t) {
  const size = (t && t.size) || 'M'
  const forced = t && (A.opusTasks || []).includes(t.id)
  const defaults = {
    load: { model: 'haiku', effort: 'low' },
    implement: forced ? { model: 'opus', effort: 'medium' } : { model: 'sonnet', effort: SIZE_EFFORT[size] || 'medium' },
    verify: size === 'L' || forced ? { model: 'opus', effort: 'medium' } : { model: 'sonnet', effort: 'high' },
    fix: size === 'L' || forced ? { model: 'opus', effort: 'medium' } : { model: 'sonnet', effort: 'high' },
    reverify: { model: 'opus', effort: 'medium' },
    integrate: { model: 'sonnet', effort: 'medium' },
    log: { model: 'haiku', effort: 'medium' },
  }
  return Object.assign({}, defaults[role], (A.models || {})[role])
}

const COMMON = `
Repository: SchoolPilot (React + TypeScript + Vite). Integration branch: consolidation.
Binding rules: docs/prd/EXECUTION.md (read §2–§5 before starting). CLAUDE.md applies (ABOUTME headers, TDD, no --no-verify, no unrelated changes).
The gate is: node scripts/prd/gate.mjs task --task <id>   (must end with "GATE PASSED"; any FAIL is blocking).
Never edit scripts/prd/gate-baseline.json or .type-ratchet to make a gate pass. Never skip, delete or weaken tests.
`

const WORKTREE_SETUP = `
Worktree setup (you are in a fresh git worktree):
  MAIN=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
  [ -e node_modules ] || ln -s "$MAIN/node_modules" node_modules
If the task card says deps_install=true, instead run: rm -f node_modules && pnpm install (this updates pnpm-lock.yaml; commit it).
`

const TASK_RESULT = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ready', 'blocked'] },
    branch: { type: 'string' },
    head_sha: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    tests_added: { type: 'array', items: { type: 'string' } },
    gate_passed: { type: 'boolean' },
    gate_table: { type: 'string' },
    test_waiver: { type: 'string' },
    summary: { type: 'string' },
    blockers: { type: 'array', items: { type: 'string' } },
    i18n_pending: { type: 'boolean' },
  },
  required: ['status', 'branch', 'gate_passed', 'summary', 'blockers'],
}

const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['approve', 'changes_required'] },
    acceptance: { type: 'array', items: { type: 'object', properties: { criterion: { type: 'string' }, met: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['criterion', 'met', 'evidence'] } },
    blocking_findings: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, file: { type: 'string' }, fix: { type: 'string' } }, required: ['issue', 'fix'] } },
    non_blocking: { type: 'array', items: { type: 'string' } },
    scope_ok: { type: 'boolean' },
    test_fails_on_base: { type: 'boolean' },
    gate_passed: { type: 'boolean' },
  },
  required: ['verdict', 'acceptance', 'blocking_findings', 'scope_ok', 'gate_passed'],
}

const INTEGRATION = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    status: { type: 'string', enum: ['integrated', 'blocked'] },
    commit_sha: { type: 'string' },
    gate_table: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['id', 'status'],
}

const card = (t) => JSON.stringify({ id: t.id, size: t.size, title: t.title, lane: t.lane, files: t.files, acceptance: t.acceptance, test: t.test, spec: t.spec, findings: t.findings, reqs: t.reqs, depends_on: t.depends_on, deps_install: t.deps_install }, null, 2)

// Small concurrency pool so heavy gates (typecheck) do not exhaust the machine
async function pool(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      try { results[i] = await fn(items[i], i) } catch (e) { results[i] = { id: items[i].id, error: String(e) } }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------
phase('Load')
const loaded = await agent(
  `Run: node scripts/prd/status.mjs --wave ${WAVE} --json   in the repository root and return its JSON verbatim as the structured result.
Do not modify anything.`,
  {
    label: `load:${WAVE}`,
    phase: 'Load',
    ...route('load'),
    schema: {
      type: 'object',
      properties: {
        wave: { type: 'string' },
        description: { type: 'string' },
        tasks: { type: 'array', items: { type: 'object', properties: {
          id: { type: 'string' }, lane: { type: 'string' }, size: { type: 'string' }, title: { type: 'string' }, status: { type: 'string' }, runnable: { type: 'boolean' },
          waiting_on: { type: 'array', items: { type: 'string' } }, files: { type: 'array', items: { type: 'string' } },
          acceptance: { type: 'array', items: { type: 'string' } }, test: { type: 'string' }, spec: { type: 'string' },
          findings: { type: 'array', items: { type: 'string' } }, reqs: { type: 'array', items: { type: 'string' } },
          deps_install: { type: 'boolean' }, depends_on: { type: 'array', items: { type: 'string' } },
        }, required: ['id', 'title', 'status', 'runnable', 'files', 'acceptance'] } },
      },
      required: ['wave', 'tasks'],
    },
  },
)
const all = (loaded && loaded.tasks) || []
const tasks = all.filter((t) => t.runnable && (!A.only || A.only.includes(t.id)))
const skipped = all.filter((t) => !tasks.includes(t))
skipped.forEach((t) => log(`skip ${t.id}: status=${t.status}${t.waiting_on && t.waiting_on.length ? ', waiting on ' + t.waiting_on.join(', ') : ''}`))
if (!tasks.length) {
  log(`Nothing runnable in ${WAVE}.`)
  return { wave: WAVE, runnable: 0, skipped: skipped.map((t) => t.id) }
}
tasks.forEach((t) => log(`${t.id} [${t.size || '?'}]: implement ${route('implement', t).model}/${route('implement', t).effort}, verify ${route('verify', t).model}`))
log(`${tasks.length} runnable task(s) in ${WAVE}; up to ${MAX_PARALLEL} at a time`)

// ---------------------------------------------------------------------------
// Implement → Verify → (Fix → Re-verify)
// ---------------------------------------------------------------------------
const implementPrompt = (t) => `${COMMON}
You are the IMPLEMENTER for PRD task ${t.id} (wave ${WAVE}).
${WORKTREE_SETUP}
Task card:
${card(t)}

Steps:
1. git switch -c prd/${t.id} consolidation   (always branch from consolidation, never from the worktree's default HEAD; if the branch already exists, use prd/${t.id}-retry).
2. Read the spec section in the card (path is relative to docs/prd/), the audit finding(s), and every file you own.
3. Write the failing test described in "test" first; run it and confirm it fails for the right reason.
4. Implement the smallest change that meets every acceptance criterion. Edit ONLY files in the card's "files" list, plus new test/fixture files you create.
   If you must touch another file, STOP and return status "blocked" naming the file and why.
   New user-facing strings: put keys in docs/prd/workflow-log/pending-i18n/${t.id}.json instead of editing large locale files (set i18n_pending=true).
5. Run the related tests until green, then run the gate: node scripts/prd/gate.mjs task --task ${t.id}
   Fix and repeat until GATE PASSED. If a failure is pre-existing and outside your files, return "blocked" with the evidence.
   Only if a test is genuinely impossible, add --no-test-reason "<reason>" and report it in test_waiver.
6. Commit on the branch (git add the changed files; message "wip(${t.id}): <summary>"). Do not push. Do not merge.
Return: status, branch, head_sha (git rev-parse HEAD), files_changed, tests_added, gate_passed, gate_table (contents of .prd-gate/report.md), summary, blockers, test_waiver, i18n_pending.`

const verifyPrompt = (t, impl) => `${COMMON}
You are the adversarial VERIFIER for PRD task ${t.id}. Assume the change is wrong until proven right.
${WORKTREE_SETUP}
Then: git switch --detach ${impl.branch}
BASE=$(git merge-base ${impl.branch} consolidation)
Task card:
${card(t)}
Implementer summary: ${impl.summary}

Check, with evidence (commands and output excerpts):
1. Each acceptance criterion — met or not. If you cannot verify one, mark it not met.
2. Scope: git diff --name-only $BASE..HEAD only contains files from the card's list plus new tests/fixtures (scope_ok).
3. Test quality: the new test exercises the behaviour; restore the base version of the changed source files (git checkout $BASE -- <source files>), run the new test, confirm it FAILS, then restore (git checkout ${impl.branch} -- <source files>). Report test_fails_on_base.
4. Regressions and contract: no new useAppData() mutators that do not exist, no numeric id coercion, no "as any as", no swallowed errors, no hard-coded curriculum/currency terms added to core code.
5. Run the gate yourself: node scripts/prd/gate.mjs task --task ${t.id}
Verdict "approve" only if every criterion is met, scope_ok, gate passes, and there are no blocking findings. Do not modify or commit anything.`

const fixPrompt = (t, impl, v) => `${COMMON}
You are the FIXER for PRD task ${t.id}. A verifier found blocking issues.
${WORKTREE_SETUP}
Then: git switch -c prd/${t.id}-fix1 ${impl.branch}
Task card:
${card(t)}
Blocking findings to resolve:
${JSON.stringify(v.blocking_findings, null, 2)}
Unmet acceptance criteria:
${JSON.stringify((v.acceptance || []).filter((a) => !a.met), null, 2)}
Same rules as the implementer: stay within the card's files, test first, gate until GATE PASSED, commit on the branch ("wip(${t.id}): address review"), do not push.
Return the same structure as the implementer (branch = prd/${t.id}-fix1).`

const reviewed = await pool(tasks, MAX_PARALLEL, async (t) => {
  const impl = await agent(implementPrompt(t), { label: `implement:${t.id}`, phase: 'Implement', ...route('implement', t), isolation: 'worktree', schema: TASK_RESULT })
  if (!impl || impl.status !== 'ready' || !impl.gate_passed) return { task: t, impl, outcome: 'blocked', reason: impl ? (impl.blockers || []).join('; ') || 'gate did not pass' : 'implementer failed' }
  let v = await agent(verifyPrompt(t, impl), { label: `verify:${t.id}`, phase: 'Verify', ...route('verify', t), isolation: 'worktree', schema: VERDICT })
  if (v && v.verdict === 'approve') return { task: t, impl, verdict: v, branch: impl.branch, outcome: 'approved' }
  const fix = await agent(fixPrompt(t, impl, v || { blocking_findings: [{ issue: 'verifier failed to run', fix: 're-run gate and self-review' }] }), { label: `fix:${t.id}`, phase: 'Verify', ...route('fix', t), isolation: 'worktree', schema: TASK_RESULT })
  if (!fix || fix.status !== 'ready' || !fix.gate_passed) return { task: t, impl, verdict: v, fix, outcome: 'review', reason: 'fix round did not pass the gate' }
  const v2 = await agent(verifyPrompt(t, fix), { label: `re-verify:${t.id}`, phase: 'Verify', ...route('reverify', t), isolation: 'worktree', schema: VERDICT })
  if (v2 && v2.verdict === 'approve') return { task: t, impl: fix, verdict: v2, branch: fix.branch, outcome: 'approved' }
  return { task: t, impl: fix, verdict: v2, outcome: 'review', reason: 'still has blocking findings after one fix round' }
})

// ---------------------------------------------------------------------------
// Integrate (strictly serial, in the main checkout)
// ---------------------------------------------------------------------------
phase('Integrate')
const approved = reviewed.filter((r) => r && r.outcome === 'approved').sort((a, b) => a.task.id.localeCompare(b.task.id))
const integrations = []
for (const r of approved) {
  const t = r.task
  const res = await agent(`${COMMON}
You are the INTEGRATOR for PRD task ${t.id}. You work in the main checkout (not a worktree). Work strictly on this one task.
1. git switch consolidation; confirm "git status --porcelain" shows no tracked changes (stop with status "blocked" if it does).
2. git merge --squash ${r.branch}
   Conflicts: resolve only mechanical ones (imports, adjacent edits); otherwise run "git reset --hard HEAD" and return blocked with the conflicting files.
3. If pnpm-lock.yaml changed: pnpm install --frozen-lockfile
4. Gate on the integrated result: node scripts/prd/gate.mjs task --task ${t.id} --base HEAD
   On FAIL: git reset --hard HEAD; node scripts/prd/status.mjs --set ${t.id} blocked --note "integration gate failed: <check ids>"; return blocked (do not commit).
5. On PASS: node scripts/prd/status.mjs --set ${t.id} done --date ${DATE}
   git add -A (only the squashed changes and docs/prd/tasks.json; never .prd-gate/)
   Commit with this exact structure (fill the placeholders from the task card, verifier evidence and gate report):
     <type>(<scope>): <imperative summary> [${t.id}]

     <2–6 lines: what changed and why>

     Findings: ${(t.findings || []).join(', ') || 'none'}
     Requirements: ${(t.reqs || []).join(', ') || 'none'}
     Gate: task PASS — <one-line summary of G1–G7>${r.impl.test_waiver ? '\n     Test waiver: ' + r.impl.test_waiver : ''}

     ${TRAILERS}
   Use type fix/feat/refactor/test/chore/docs/ci as appropriate. Do not push.
6. Return id, status "integrated", commit_sha (git rev-parse HEAD), gate_table (.prd-gate/report.md).`,
    { label: `integrate:${t.id}`, phase: 'Integrate', ...route('integrate', t), schema: INTEGRATION })
  integrations.push(res || { id: t.id, status: 'blocked', reason: 'integrator failed' })
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------
phase('Log')
const summary = {
  wave: WAVE,
  date: DATE,
  integrated: integrations.filter((i) => i.status === 'integrated').map((i) => ({ id: i.id, commit: i.commit_sha })),
  blocked_at_integration: integrations.filter((i) => i.status !== 'integrated').map((i) => ({ id: i.id, reason: i.reason })),
  needs_review: reviewed.filter((r) => r && r.outcome === 'review').map((r) => ({ id: r.task.id, reason: r.reason, findings: r.verdict && r.verdict.blocking_findings })),
  blocked_in_implementation: reviewed.filter((r) => r && r.outcome === 'blocked').map((r) => ({ id: r.task.id, reason: r.reason })),
  skipped: skipped.map((t) => ({ id: t.id, status: t.status, waiting_on: t.waiting_on })),
  details: reviewed.filter(Boolean).map((r) => ({
    id: r.task.id, outcome: r.outcome, branch: r.branch || (r.impl && r.impl.branch), summary: r.impl && r.impl.summary,
    tests_added: r.impl && r.impl.tests_added, test_waiver: r.impl && r.impl.test_waiver, i18n_pending: r.impl && r.impl.i18n_pending,
    verifier_non_blocking: r.verdict && r.verdict.non_blocking,
  })),
}

const logResult = await agent(`${COMMON}
You are the LOGGER for wave ${WAVE}. Work in the main checkout on branch consolidation.
Wave results (JSON):
${JSON.stringify(summary, null, 2)}

1. For each integrated task run: node scripts/prd/status.mjs --set <id> done --commit <commit> --date ${DATE}
   For tasks needing review or blocked: node scripts/prd/status.mjs --set <id> <review|blocked> --note "<short reason>"
2. Write docs/prd/workflow-log/${WAVE}-${DATE}.md following docs/prd/workflow-log/TEMPLATE.md (wave section): tasks and commits,
   gate tables (use "git show <commit> --stat" and the integration gate summaries), verifier non-blocking notes, waivers, pending i18n files,
   blocked/review items with reasons, and an exact "Next steps" list (commands) — including which wave is next (node scripts/prd/status.mjs).
3. node scripts/prd/status.mjs --write
4. git worktree prune; delete local branches of integrated tasks (git branch -D prd/<id> prd/<id>-fix1 if present).
5. git add docs/prd && git commit -m "chore(prd): log ${WAVE} [${WAVE}]" -m "${TRAILERS}"
${A.push ? '6. git push -u origin consolidation (retry up to 4 times with 2s/4s/8s/16s backoff on network errors).' : '6. Do not push.'}
Return a short plain-text summary: log path, commit sha, counts, next wave.`, { label: `log:${WAVE}`, phase: 'Log', ...route('log') })

return { summary, log: logResult }
