export const meta = {
  name: 'prd-phase-exit',
  description: 'Close a PRD phase: phase gate with probe, exit-criteria evidence, adversarial re-check, baseline tightening, phase-complete log',
  whenToUse: 'After every task of a phase is done or deferred (node scripts/prd/status.mjs). Args: { phase, date, push?, trailers? }',
  phases: [
    { title: 'Check', detail: 'phase gate (full tests, build, probe) and evidence for each exit criterion' },
    { title: 'Challenge', detail: 'independent skeptic re-checks every criterion claimed as met' },
    { title: 'Close', detail: 'tighten baseline, mark phase complete, write phase log, commit' },
  ],
}

const A = args || {}
if (!A.phase || !A.date) throw new Error('args.phase (e.g. "P0") and args.date (YYYY-MM-DD) are required')
const TRAILERS = A.trailers || 'Co-Authored-By: Claude <noreply@anthropic.com>'

const EVIDENCE = {
  type: 'object',
  properties: {
    open_tasks: { type: 'array', items: { type: 'string' } },
    gate_passed: { type: 'boolean' },
    gate_table: { type: 'string' },
    probe_report: { type: 'string' },
    criteria: { type: 'array', items: { type: 'object', properties: {
      criterion: { type: 'string' }, met: { type: 'boolean' }, evidence: { type: 'string' }, command: { type: 'string' },
    }, required: ['criterion', 'met', 'evidence'] } },
  },
  required: ['open_tasks', 'gate_passed', 'criteria'],
}

phase('Check')
const ev = await agent(`Repository root, branch consolidation. Do not modify tracked files.
1. Read docs/prd/tasks.json and list every task of phase ${A.phase} whose status is not done/deferred (open_tasks); "node scripts/prd/status.mjs" shows the summary.
2. Run: node scripts/prd/gate.mjs phase --probe   (it starts its own dev server on port 5299). Capture .prd-gate/report.md as gate_table and .prd-gate/probe.md as probe_report.
3. For EACH exit criterion of phase ${A.phase} in docs/prd/tasks.json (phases[].exit_criteria) and in docs/prd/phases/${A.phase}-*.md "Exit criteria",
   run the command that proves it and record criterion, met, evidence (output excerpt) and command. Unverifiable means met=false.`,
  { label: `check:${A.phase}`, phase: 'Check', schema: EVIDENCE })

phase('Challenge')
const claimed = ((ev && ev.criteria) || []).filter((c) => c.met)
const challenged = await parallel(claimed.map((c, i) => () => agent(`Skeptically re-verify this phase-exit claim for ${A.phase} in the repository (read-only).
Claim: ${c.criterion}
Evidence given: ${c.evidence}
Command given: ${c.command || 'none'}
Re-run the check independently (do not trust the evidence). Default to refuted=true if you cannot confirm it.`,
  { label: `challenge:${i + 1}`, phase: 'Challenge', effort: 'high', schema: {
    type: 'object', properties: { refuted: { type: 'boolean' }, reason: { type: 'string' } }, required: ['refuted', 'reason'] } })))
const refuted = claimed
  .map((c, i) => ({ c, r: challenged[i] }))
  .filter((x) => !x.r || x.r.refuted)
  .map((x) => ({ criterion: x.c.criterion, reason: x.r ? x.r.reason : 'challenger failed' }))
const unmet = ((ev && ev.criteria) || []).filter((c) => !c.met).map((c) => ({ criterion: c.criterion, reason: c.evidence }))
const passed = !!ev && ev.gate_passed && ev.open_tasks.length === 0 && unmet.length === 0 && refuted.length === 0
log(passed ? `${A.phase} meets every exit criterion` : `${A.phase} not ready: ${ev ? ev.open_tasks.length : '?'} open task(s), ${unmet.length} unmet, ${refuted.length} refuted`)

phase('Close')
const report = { phase: A.phase, date: A.date, passed, open_tasks: ev ? ev.open_tasks : [], gate_passed: ev ? ev.gate_passed : false, unmet, refuted, criteria: ev ? ev.criteria : [] }
const close = await agent(`Main checkout, branch consolidation. Phase exit result for ${A.phase}:
${JSON.stringify(report, null, 2)}
Gate report:
${ev ? ev.gate_table : 'n/a'}
Probe report:
${ev ? ev.probe_report : 'n/a'}

${passed ? `The phase PASSED:
1. node scripts/prd/gate.mjs baseline --update --full --date ${A.date}   (tightens thresholds; never loosens)
2. node scripts/prd/status.mjs --complete-phase ${A.phase} --date ${A.date}
3. Write docs/prd/workflow-log/${A.phase}-phase-complete-${A.date}.md using the "Phase completion" section of docs/prd/workflow-log/TEMPLATE.md:
   exit criteria with evidence, gate and probe reports, baseline before/after (git diff scripts/prd/gate-baseline.json), deferred tasks with owners,
   lessons learned, and exact steps to start the next phase(s) (node scripts/prd/status.mjs output).`
  : `The phase did NOT pass. Write docs/prd/workflow-log/${A.phase}-phase-exit-attempt-${A.date}.md using the template: every unmet/refuted criterion,
open tasks, gate failures, and a concrete remediation list. For each remediation that is not covered by an existing task, add a task to docs/prd/tasks.json
(id ${A.phase}-Q<nn>, wave = the phase's last wave + 1, lane Q, status todo, with files/acceptance/test filled) and add the wave name to the phase's "waves".`}
4. node scripts/prd/status.mjs --write
5. git add docs/prd scripts/prd/gate-baseline.json && git commit -m "chore(prd): ${A.phase} ${passed ? 'phase complete' : 'phase exit attempt'} [${A.phase}]" -m "${TRAILERS}"
${A.push ? '6. git push -u origin consolidation (retry with backoff on network errors).' : '6. Do not push.'}
Return a short summary with the log path and commit sha.`, { label: `close:${A.phase}`, phase: 'Close' })

return { report, close }
