// ABOUTME: Quality gate run before every PRD task commit ("task") and at every phase exit ("phase").
// ABOUTME: Compares typecheck, contract-scan, tests, lint, encoding and probe results to scripts/prd/gate-baseline.json.

import { summariseVitestRun } from './lib/vitestSummary.mjs';
import { execSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASELINE_FILE = path.join(ROOT, 'scripts', 'prd', 'gate-baseline.json');
const REPORT_DIR = path.join(ROOT, '.prd-gate');

const argv = process.argv.slice(2);
const mode = argv[0] || 'task';
const flag = (name) => argv.includes(`--${name}`);
const option = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

if (!['task', 'phase', 'baseline'].includes(mode) || flag('help')) {
  console.log(`Usage:
  node scripts/prd/gate.mjs task  [--task P0-A01] [--base <ref>] [--no-test-reason "<why>"]
  node scripts/prd/gate.mjs phase [--probe] [--base <ref>]
  node scripts/prd/gate.mjs baseline [--update] [--full]   # --update only ever tightens the baseline`);
  process.exit(mode === 'help' || flag('help') ? 0 : 2);
}

const sh = (cmd, opts = {}) => execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024, ...opts });
const shOk = (cmd) => { try { return { ok: true, out: sh(cmd) }; } catch (e) { return { ok: false, out: `${e.stdout || ''}${e.stderr || ''}`, status: e.status ?? null, signal: e.signal ?? null }; } };
const readBaseline = () => JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));

const results = [];
const record = (id, name, status, detail = '') => {
  results.push({ id, name, status, detail });
  console.log(`${status.padEnd(4)} ${id} ${name}${detail ? ' — ' + detail : ''}`);
};

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------
function measureTypecheck() {
  const r = shOk('pnpm -s typecheck');
  const lines = r.out.split('\n');
  const total = (r.out.match(/error TS\d+/g) || []).length;
  const missingNames = lines.filter((l) => /error TS(2304|2552)/.test(l) && /^src\//.test(l) && !/(\.test\.|\.spec\.|__tests__|\/tests\/|stories)/.test(l)).length;
  return { total, missingNames };
}

function measureContracts() {
  const json = JSON.parse(sh('node scripts/audit/contract-scan.cjs --json'));
  return {
    undefinedCollections: json.undefinedCollections.length,
    missingAppDataFunctions: json.missingAppDataFunctions.reduce((n, r) => n + r.missing.length, 0),
    singleArgUpdateCalls: json.singleArgUpdateCalls.length,
    numericIdWrites: json.numericIdCoercions.writes.length,
    numericIdSelectors: json.numericIdCoercions.selectors.length,
    mockBackedHooksInUi: json.mockBackedHooksInUi.length,
    routesOutsideNavigation: json.routesOutsideNavigation.registrationCopiesRoutes ? 0 : json.routesOutsideNavigation.routes.length,
  };
}

function measureFullTests() {
  const out = path.join(REPORT_DIR, 'vitest.json');
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  shOk(`pnpm -s vitest run --reporter=json --outputFile=${out}`);
  if (!fs.existsSync(out)) return { failedFiles: Infinity, failedTests: Infinity };
  const json = JSON.parse(fs.readFileSync(out, 'utf8'));
  const failedFiles = (json.testResults || []).filter((f) => f.status === 'failed').length;
  return { failedFiles, failedTests: json.numFailedTests ?? 0, totalTests: json.numTotalTests ?? 0 };
}

async function measureProbe() {
  const port = option('port', '5299');
  const server = spawn('pnpm', ['exec', 'vite', '--port', port, '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true });
  try {
    let up = false;
    for (let i = 0; i < 90 && !up; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      // `--strictPort` makes the server we started exit when the port is already taken. Something else
      // then answers the poll below, and the probe measures a stranger's build: a stale dev server from
      // an earlier session left on 5299 held that port for two days, and the probe reported the app
      // never rendering — a verdict about nothing in this tree. Our own server dying is the signal.
      if (server.exitCode !== null || server.signalCode !== null) {
        return { pass: 0, total: 0, error: `the dev server on port ${port} exited before it answered; another process already holds that port. Stop it, or pass --port <free port>.` };
      }
      up = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', `http://localhost:${port}/`], { encoding: 'utf8' }).stdout === '200';
    }
    if (!up) return { pass: 0, total: 0, error: 'dev server did not start' };
    const out = path.join(REPORT_DIR, 'probe.md');
    // A report an earlier run left behind is not this run's evidence. Delete it first, so the count
    // below can only come from the probe about to run: a probe that dies before writing leaves the old
    // file in place, and its PASS rows would be read as this run's.
    fs.rmSync(out, { force: true });
    const run = spawnSync('node', ['scripts/audit/school-ops-probe.mjs', '--out', out], { cwd: ROOT, env: { ...process.env, BASE_URL: `http://localhost:${port}` }, stdio: 'inherit', timeout: 30 * 60 * 1000 });
    const md = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
    const pass = (md.match(/\| PASS \|/g) || []).length;
    const total = (md.match(/^\| C\d+/gm) || []).length;
    // A probe that crashed part-way has a partial report. Counting its PASS rows against a zero
    // baseline would report success for a run that never finished — the vacuous pass this gate is
    // supposed to prevent.
    if (run.status !== 0) {
      return { pass, total, error: `the probe exited with code ${run.status ?? 'null (killed)'} after ${pass}/${total} checks` };
    }
    if (total === 0) return { pass: 0, total: 0, error: 'the probe produced no checks' };
    return { pass, total };
  } finally {
    try { process.kill(-server.pid); } catch { /* already stopped */ }
  }
}

// ---------------------------------------------------------------------------
// Changed files relative to the base ref (committed, staged, unstaged, untracked)
// ---------------------------------------------------------------------------
function resolveBase() {
  const wanted = option('base');
  // Resolve a caller-supplied ref to a full SHA before it reaches a shell: on Windows, cmd.exe
  // strips the caret in refs such as `<sha>^`, which would silently diff against HEAD and skip
  // the content checks while still reporting GATE PASSED.
  if (wanted) {
    const resolved = shOk(`git rev-parse --verify --quiet "${wanted}"`).out.trim();
    // `git rev-parse --verify` echoes an argument it cannot resolve, so the string is not proof
    // that a commit exists. A base that is not a real commit makes the diff empty, and an empty
    // diff makes every content check vacuous — a gate that reports success without testing
    // anything. Fail loudly instead.
    if (resolved && shOk(`git cat-file -e "${resolved}^{commit}"`).ok) return resolved;
    console.error(`FAIL the --base ref "${wanted}" does not resolve to a commit; refusing to gate against an empty diff`);
    process.exit(1);
  }
  for (const ref of ['origin/consolidation', 'consolidation']) {
    if (shOk(`git rev-parse --verify --quiet ${ref}`).ok) return sh(`git merge-base ${ref} HEAD`).trim();
  }
  return 'HEAD';
}

function changedFiles(base) {
  const sets = [
    shOk(`git diff --name-only --diff-filter=ACMR ${base}`).out,
    shOk('git diff --name-only --diff-filter=ACMR --cached').out,
    shOk('git ls-files --others --exclude-standard').out,
  ];
  return [...new Set(sets.join('\n').split('\n').map((s) => s.trim()).filter(Boolean))]
    .filter((f) => fs.existsSync(path.join(ROOT, f)) && !f.startsWith('.prd-gate/'));
}

function addedLines(base, files) {
  const tracked = files.filter((f) => shOk(`git cat-file -e ${base}:"${f}"`).ok);
  const untrackedOrNew = files.filter((f) => !tracked.includes(f));
  const out = [];
  if (tracked.length) {
    const diff = shOk(`git diff -U0 ${base} -- ${tracked.map((f) => `"${f}"`).join(' ')}`).out;
    let file = null;
    for (const line of diff.split('\n')) {
      if (line.startsWith('+++ b/')) file = line.slice(6);
      else if (line.startsWith('+') && !line.startsWith('+++')) out.push({ file, text: line.slice(1) });
    }
  }
  for (const f of untrackedOrNew) {
    for (const text of fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n')) out.push({ file: f, text });
  }
  return out;
}

const isTestFile = (f) => /(\.test\.|\.spec\.|__tests__\/|src\/tests\/|tests\/e2e\/)/.test(f);
const isSourceFile = (f) => /^src\/.*\.(ts|tsx)$/.test(f) && !isTestFile(f);

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------
function compareCounts(id, name, current, baseline, lowerIsBetter = true) {
  const regressions = Object.keys(baseline).filter((k) => (lowerIsBetter ? current[k] > baseline[k] : current[k] < baseline[k]));
  const summary = Object.keys(current).map((k) => `${k} ${current[k]}/${baseline[k]}`).join(', ');
  record(id, name, regressions.length ? 'FAIL' : 'PASS', regressions.length ? `regressed: ${regressions.join(', ')} (${summary})` : summary);
  return current;
}

/**
 * Splits paths into argument lists that fit a Windows command line (~8k characters). A wave that
 * touches hundreds of files would otherwise overflow the shell, and the gate would report a
 * failure for a command that never ran. A single long path still gets its own batch.
 */
function chunkByCommandLength(items, budget = 6000) {
  const batches = [];
  let current = [];
  let length = 0;
  for (const item of items) {
    const cost = item.length + 3;
    if (current.length && length + cost > budget) {
      batches.push(current);
      current = [];
      length = 0;
    }
    current.push(item);
    length += cost;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function runTaskChecks(base, baseline, files) {
  const src = files.filter(isSourceFile);
  const tests = files.filter(isTestFile);

  const tc = measureTypecheck();
  compareCounts('G1', 'Typecheck errors do not increase', tc, { total: baseline.typecheck.total, missingNames: baseline.typecheck.missingNames });

  const contracts = measureContracts();
  compareCounts('G2', 'Contract-scan sections do not increase', contracts, baseline.contracts);

  const testTargets = [...src, ...tests].filter((f) => f.startsWith('src/'));
  if (testTargets.length === 0) {
    record('G3', 'Related tests pass', 'SKIP', 'no src/ files changed');
  } else {
    // Windows caps a command line at ~8k characters. A wave that touches hundreds of files would
    // overflow it, the spawn would fail, and the gate would report a test failure that never ran.
    // Run the targets in batches whose quoted list fits comfortably.
    const batches = chunkByCommandLength(testTargets);
    let failed = null;
    let tail = '';
    for (const batch of batches) {
      const r = shOk(`pnpm -s vitest related --run --passWithNoTests ${batch.map((f) => `"${f}"`).join(' ')}`);
      tail = summariseVitestRun(r.out, r);
      if (!r.ok && !failed) failed = r;
    }
    record('G3', 'Related tests pass', failed ? 'FAIL' : 'PASS', failed ? tail : tail);
  }

  const reason = option('no-test-reason');
  if (src.length === 0) record('G4', 'Source changes include tests (TDD)', 'SKIP', 'no source files changed');
  else if (tests.length > 0) record('G4', 'Source changes include tests (TDD)', 'PASS', `${tests.length} test file(s) changed`);
  else if (reason) record('G4', 'Source changes include tests (TDD)', 'WARN', `waived: ${reason}`);
  else record('G4', 'Source changes include tests (TDD)', 'FAIL', `${src.length} source file(s) changed without a test; add one or pass --no-test-reason`);

  const added = addedLines(base, files.filter((f) => /\.(ts|tsx|js|mjs|cjs|json|md|css|html)$/.test(f)));
  const offenders = (re, filter = () => true) => added.filter((l) => filter(l.file) && re.test(l.text)).map((l) => l.file);
  const uniq = (a) => [...new Set(a)];
  const mojibake = uniq(offenders(/\u00C3[\u0080-\u00BF]|\u00E2\u20AC|\u00F0\u0178/));
  record('G5', 'No mojibake introduced', mojibake.length ? 'FAIL' : 'PASS', mojibake.join(', '));
  const forbidden = uniq([
    ...offenders(/as any as /, isSourceFile),
    ...offenders(/window\.(confirm|alert|prompt)\(|(^|[^.\w])alert\(/, isSourceFile),
    ...offenders(/\b\w*_id\s*:\s*(Number|parseInt)\(/, isSourceFile),
    ...offenders(/set\w*Id\(\s*(?:e\.target\.value\s*\?\s*)?(Number|parseInt)\(/, isSourceFile),
  ]);
  record('G6', 'No forbidden patterns added (as-any casts, alert/confirm, numeric id coercion)', forbidden.length ? 'FAIL' : 'PASS', forbidden.join(', '));

  const lintable = files.filter((f) => /\.(ts|tsx|js|mjs|cjs)$/.test(f));
  if (!lintable.length) record('G7', 'ESLint on changed files', 'SKIP', 'no lintable files changed');
  else {
    // Same command-line cap as G3: lint in batches so a large wave does not overflow the shell.
    let out = '';
    let ok = true;
    for (const batch of chunkByCommandLength(lintable)) {
      const r = shOk(`npx eslint --no-warn-ignored ${batch.map((f) => `"${f}"`).join(' ')}`);
      out += r.out;
      if (!r.ok) ok = false;
    }
    const broken = /ERR_MODULE_NOT_FOUND|Cannot find package/.test(out);
    if (broken && !baseline.lintRequired) record('G7', 'ESLint on changed files', 'WARN', 'ESLint cannot load its config (task P0-G01 fixes this); not enforced yet');
    else record('G7', 'ESLint on changed files', ok ? 'PASS' : 'FAIL', ok ? '' : out.split('\n').filter((l) => /error/.test(l)).slice(0, 3).join(' | '));
  }

  // P4-D04: the repository's own scans, run on every task gate and not only in CI. The dependency
  // scan is offline-tolerant here so a developer without network is not blocked; CI runs the same
  // script without --allow-offline, where an unreachable feed is a hard failure.
  const secretScan = shOk('node scripts/prd/secret-scan.mjs');
  const dependencyScan = shOk('pnpm -s exec tsx scripts/security/dependency-scan.ts --allow-offline');
  const scanTail = (r) => r.out.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 2).join(' | ');
  const scans = [
    secretScan.ok ? 'secret scan clean' : `secret scan: ${scanTail(secretScan)}`,
    dependencyScan.ok ? 'dependency scan clean' : `dependency scan: ${scanTail(dependencyScan)}`,
  ].join('; ');
  record('G8', 'Secret and dependency scans pass', secretScan.ok && dependencyScan.ok ? 'PASS' : 'FAIL', scans);

  return { typecheck: tc, contracts };
}

async function runPhaseChecks(baseline) {
  const tests = measureFullTests();
  record('P1', 'Full test suite: failed files do not increase', tests.failedFiles <= baseline.tests.failedFiles ? 'PASS' : 'FAIL',
    `failed files ${tests.failedFiles}/${baseline.tests.failedFiles}, failed tests ${tests.failedTests}, total ${tests.totalTests}`);
  const build = shOk('pnpm -s build');
  record('P2', 'Production build succeeds', build.ok ? 'PASS' : 'FAIL', build.ok ? '' : build.out.split('\n').slice(-5).join(' | '));
  let probe = null;
  if (flag('probe')) {
    probe = await measureProbe();
    record('P3', 'School-ops probe passes do not decrease', probe.pass >= baseline.probe.pass && !probe.error ? 'PASS' : 'FAIL',
      probe.error || `${probe.pass}/${probe.total} PASS (baseline ${baseline.probe.pass})`);
  } else {
    record('P3', 'School-ops probe', 'SKIP', 'pass --probe to run (required at phase exit)');
  }
  return { tests, probe };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const baseline = readBaseline();
const base = resolveBase();
const files = changedFiles(base);
console.log(`gate ${mode}${option('task') ? ' for ' + option('task') : ''} · base ${base.slice(0, 10)} · ${files.length} changed file(s)`);

// A task gate that checks nothing must not report success: its content checks are computed from the
// changed files. A phase gate is different — it validates the whole tree (tests, build, probe) — so
// an empty diff is normal there.
if (mode === 'task' && files.length === 0 && !flag('allow-empty')) {
  console.error('FAIL the gate found no changed files between the base and the working tree; every content check would be vacuous. Pass --allow-empty if there is genuinely nothing to check.');
  process.exit(1);
}

let measured = {};
if (mode === 'baseline') {
  measured.typecheck = measureTypecheck();
  measured.contracts = measureContracts();
  if (flag('full')) { measured.tests = measureFullTests(); measured.probe = await measureProbe(); }
  console.log(JSON.stringify(measured, null, 2));
  if (flag('update')) {
    const next = structuredClone(baseline);
    const tighten = (a, b) => Math.min(a, b);
    next.typecheck.total = tighten(baseline.typecheck.total, measured.typecheck.total);
    next.typecheck.missingNames = tighten(baseline.typecheck.missingNames, measured.typecheck.missingNames);
    for (const k of Object.keys(baseline.contracts)) next.contracts[k] = tighten(baseline.contracts[k], measured.contracts[k]);
    if (measured.tests) next.tests.failedFiles = tighten(baseline.tests.failedFiles, measured.tests.failedFiles);
    if (measured.probe && !measured.probe.error) next.probe.pass = Math.max(baseline.probe.pass, measured.probe.pass);
    next.updated = option('date', baseline.updated);
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(next, null, 2) + '\n');
    console.log('Baseline tightened and written to scripts/prd/gate-baseline.json');
  }
  process.exit(0);
}

measured = await runTaskChecks(base, baseline, files);
if (mode === 'phase') Object.assign(measured, await runPhaseChecks(baseline));
const failed = results.filter((r) => r.status === 'FAIL');
fs.mkdirSync(REPORT_DIR, { recursive: true });
const report = { mode, task: option('task'), base, files, results, measured, passed: failed.length === 0 };
fs.writeFileSync(path.join(REPORT_DIR, 'report.json'), JSON.stringify(report, null, 2));
const table = ['| Check | Result | Detail |', '| --- | --- | --- |', ...results.map((r) => `| ${r.id} ${r.name} | ${r.status} | ${String(r.detail).replace(/\|/g, '\\|')} |`)].join('\n');
fs.writeFileSync(path.join(REPORT_DIR, 'report.md'), table + '\n');
console.log(`\n${failed.length ? 'GATE FAILED' : 'GATE PASSED'} (${results.length} checks, ${failed.length} failed) — report: .prd-gate/report.md`);
process.exit(failed.length ? 1 : 0);
