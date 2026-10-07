// ABOUTME: Reads and updates the PRD task ledger (docs/prd/tasks.json): progress, next runnable tasks, task details.
// ABOUTME: `--write` regenerates docs/prd/workflow-log/PROGRESS.md so anyone can see where work stopped and what is next.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LEDGER = path.join(ROOT, 'docs', 'prd', 'tasks.json');
const PROGRESS = path.join(ROOT, 'docs', 'prd', 'workflow-log', 'PROGRESS.md');
const STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked', 'deferred'];
const CLOSED = new Set(['done', 'deferred']);

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };

const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const byId = new Map(ledger.tasks.map((t) => [t.id, t]));
const phaseOf = (id) => ledger.phases.find((p) => p.id === id);
const waveNo = (w) => Number(String(w).split('-W')[1]);
const save = () => fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');

function waveClosed(waveId) {
  return ledger.tasks.filter((t) => t.wave === waveId).every((t) => CLOSED.has(t.status));
}
function phaseStarted(phase) {
  if (!phase.start_after) return true;
  const [pid] = phase.start_after.split('-');
  return ledger.tasks.filter((t) => t.phase === pid && waveNo(t.wave) <= waveNo(phase.start_after)).every((t) => CLOSED.has(t.status));
}
function runnable(t) {
  if (t.status !== 'todo') return false;
  if (!phaseStarted(phaseOf(t.phase))) return false;
  if (!t.depends_on.every((d) => byId.get(d) && byId.get(d).status === 'done')) return false;
  // earlier waves of the same phase must be closed (waves are integration checkpoints)
  return ledger.tasks.filter((x) => x.phase === t.phase && waveNo(x.wave) < waveNo(t.wave)).every((x) => CLOSED.has(x.status));
}
function phaseSummary(p) {
  const ts = ledger.tasks.filter((t) => t.phase === p.id);
  const count = (s) => ts.filter((t) => t.status === s).length;
  const openWave = Object.keys(p.waves).find((w) => !waveClosed(w)) || null;
  return { id: p.id, name: p.name, total: ts.length, done: count('done'), deferred: count('deferred'), blocked: count('blocked'),
    inProgress: count('in_progress') + count('review'), status: p.completed_at ? 'complete' : (count('done') || count('in_progress') ? 'in progress' : (phaseStarted(p) ? 'ready' : 'waiting')), openWave };
}
function lastDone() {
  return ledger.tasks.filter((t) => t.status === 'done' && t.completed_at).sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))[0] || null;
}
function nextByLane() {
  const out = {};
  for (const t of ledger.tasks.filter(runnable)) (out[`${t.phase} · ${t.lane}`] ||= []).push(t);
  return out;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
if (has('help')) {
  console.log(`node scripts/prd/status.mjs                       progress, blocked, next runnable tasks per lane
node scripts/prd/status.mjs --show P0-C03           full task card
node scripts/prd/status.mjs --wave P0-W1 [--json]   tasks of a wave with readiness
node scripts/prd/status.mjs --next [--json]         runnable tasks
node scripts/prd/status.mjs --set P0-C03 done --commit <sha> --date 2026-10-08 [--note "..."]
node scripts/prd/status.mjs --complete-phase P0 --date 2026-10-20
node scripts/prd/status.mjs --write                 regenerate workflow-log/PROGRESS.md`);
  process.exit(0);
}

if (opt('set')) {
  const id = opt('set');
  const status = argv[argv.indexOf('--set') + 2];
  const t = byId.get(id);
  if (!t) { console.error(`Unknown task ${id}`); process.exit(1); }
  if (!STATUSES.includes(status)) { console.error(`Status must be one of ${STATUSES.join(', ')}`); process.exit(1); }
  t.status = status;
  if (opt('commit')) t.commit = opt('commit');
  if (opt('note')) t.notes = [t.notes, opt('note')].filter(Boolean).join(' | ');
  if (status === 'done') t.completed_at = opt('date') || t.completed_at || null;
  save();
  console.log(`${id} → ${status}${t.commit ? ' @' + t.commit : ''}`);
}

if (opt('complete-phase')) {
  const p = phaseOf(opt('complete-phase'));
  const open = ledger.tasks.filter((t) => t.phase === p.id && !CLOSED.has(t.status));
  if (open.length) { console.error(`Cannot complete ${p.id}: open tasks ${open.map((t) => t.id).join(', ')}`); process.exit(1); }
  p.completed_at = opt('date') || 'unknown';
  save();
  console.log(`${p.id} marked complete (${p.completed_at})`);
}

if (opt('show')) {
  const t = byId.get(opt('show'));
  if (!t) { console.error('Unknown task'); process.exit(1); }
  const deps = t.depends_on.map((d) => `${d} (${byId.get(d)?.status})`).join(', ') || '—';
  console.log(`${t.id} — ${t.title}
phase ${t.phase} · wave ${t.wave} · lane ${t.lane} · size ${t.size} · status ${t.status}${t.commit ? ' @' + t.commit : ''}
runnable now: ${runnable(t) ? 'yes' : 'no'}
depends on: ${deps}
requirements: ${t.reqs.join(', ') || '—'} · findings: ${t.findings.join(', ') || '—'}
spec: ${t.spec || '—'}${t.deps_install ? '\nchanges dependencies: yes (only one such task per wave)' : ''}
files (lane ownership):
${t.files.map((f) => '  - ' + f).join('\n')}
acceptance:
${t.acceptance.map((a) => '  - ' + a).join('\n')}
test first: ${t.test || '—'}
notes: ${t.notes || '—'}`);
}

if (opt('wave')) {
  const w = opt('wave');
  const rows = ledger.tasks.filter((t) => t.wave === w).map((t) => ({
    id: t.id, lane: t.lane, title: t.title, status: t.status, runnable: runnable(t),
    waiting_on: t.depends_on.filter((d) => byId.get(d)?.status !== 'done'), files: t.files, acceptance: t.acceptance,
    test: t.test, spec: t.spec, findings: t.findings, reqs: t.reqs, deps_install: t.deps_install, depends_on: t.depends_on,
  }));
  if (has('json')) console.log(JSON.stringify({ wave: w, description: ledger.phases.find((p) => p.waves[w])?.waves[w], tasks: rows }, null, 2));
  else for (const r of rows) console.log(`${r.runnable ? 'READY ' : r.status.toUpperCase().padEnd(6)} ${r.id} [${r.lane}] ${r.title}${r.waiting_on.length ? '  (waiting on ' + r.waiting_on.join(', ') + ')' : ''}`);
}

if (has('next')) {
  const list = ledger.tasks.filter(runnable);
  if (has('json')) console.log(JSON.stringify(list.map((t) => ({ id: t.id, wave: t.wave, lane: t.lane, title: t.title })), null, 2));
  else for (const t of list) console.log(`${t.id} (${t.wave}, lane ${t.lane}) ${t.title}`);
}

function renderProgress() {
  const L = [];
  L.push('# PRD Progress', '', '_Generated by `node scripts/prd/status.mjs --write` — do not edit by hand. Source of truth: [`../tasks.json`](../tasks.json)._', '');
  const last = lastDone();
  L.push(`**Last completed task:** ${last ? `\`${last.id}\` ${last.title} (${last.completed_at}${last.commit ? `, commit \`${last.commit}\`` : ''})` : 'none yet'}`, '');
  L.push('## Phases', '', '| Phase | Name | Status | Done | Deferred | Blocked | In progress | Total | Open wave |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const p of ledger.phases) {
    const s = phaseSummary(p);
    L.push(`| ${s.id} | ${s.name} | ${s.status} | ${s.done} | ${s.deferred} | ${s.blocked} | ${s.inProgress} | ${s.total} | ${s.openWave || '—'} |`);
  }
  const blocked = ledger.tasks.filter((t) => t.status === 'blocked' || t.status === 'review');
  L.push('', '## Blocked / awaiting review', '');
  L.push(blocked.length ? blocked.map((t) => `- \`${t.id}\` (${t.status}) ${t.title} — ${t.notes || 'no note'}`).join('\n') : '_None._');
  L.push('', '## Next runnable tasks by lane', '');
  const next = nextByLane();
  const keys = Object.keys(next);
  L.push(keys.length ? keys.map((k) => `- **${k}:** ${next[k].map((t) => `\`${t.id}\` ${t.title}`).join('; ')}`).join('\n') : '_Nothing runnable — check blocked tasks or complete the current phase._');
  const current = ledger.phases.find((p) => !p.completed_at);
  if (current) {
    L.push('', `## ${current.id} task status`, '', '| Task | Wave | Lane | Status | Commit | Title |', '| --- | --- | --- | --- | --- | --- |');
    for (const t of ledger.tasks.filter((x) => x.phase === current.id)) L.push(`| \`${t.id}\` | ${t.wave} | ${t.lane} | ${t.status} | ${t.commit ? `\`${t.commit}\`` : ''} | ${t.title.replace(/\|/g, '/')} |`);
  }
  L.push('', '## How to continue', '', '1. `node scripts/prd/status.mjs` (this summary) and read the newest file in `docs/prd/workflow-log/`.',
    '2. Run a wave with sub-agents: `Workflow({ name: "prd-wave", args: { wave: "<open wave>", date: "<YYYY-MM-DD>" } })`, or do one task by hand following [EXECUTION.md §8](../EXECUTION.md#8-resuming-manually-runbook).',
    '3. Before every commit: `node scripts/prd/gate.mjs task --task <id>` must print GATE PASSED.', '');
  return L.join('\n');
}

if (has('write')) {
  fs.mkdirSync(path.dirname(PROGRESS), { recursive: true });
  fs.writeFileSync(PROGRESS, renderProgress());
  console.log('Wrote docs/prd/workflow-log/PROGRESS.md');
}

const ran = ['set', 'complete-phase', 'show', 'wave'].some((n) => opt(n)) || has('next') || has('write');
if (!ran) {
  for (const p of ledger.phases) {
    const s = phaseSummary(p);
    console.log(`${s.id} ${s.name.padEnd(34)} ${s.status.padEnd(11)} ${s.done}/${s.total} done${s.blocked ? `, ${s.blocked} blocked` : ''}${s.openWave ? `, open wave ${s.openWave}` : ''}`);
  }
  const last = lastDone();
  console.log(`\nLast completed: ${last ? `${last.id} (${last.completed_at}${last.commit ? ' @' + last.commit : ''})` : 'none'}`);
  const next = nextByLane();
  console.log('\nNext runnable by lane:');
  for (const [k, ts] of Object.entries(next)) console.log(`  ${k}: ${ts.map((t) => t.id).join(', ')}`);
  if (!Object.keys(next).length) console.log('  (none)');
}
