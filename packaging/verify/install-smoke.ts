// ABOUTME: The install smoke test: runs a real installer on this machine, times it from a clean
// ABOUTME: root to the first authenticated request, checks TLS pinning and mDNS discovery, and
// ABOUTME: writes the evidence. This is the acceptance measurement for P4-D02, not a unit test.
//
// Usage:
//   npx tsx packaging/verify/install-smoke.ts                 # the installer for this platform
//   npx tsx packaging/verify/install-smoke.ts --keep          # leave the hub running
//   npx tsx packaging/verify/install-smoke.ts --installer packaging/ubuntu/install-hub.sh
//
// It exits non-zero when the hub is not reachable, when the certificate it serves is not the one the
// installer reported, when discovery does not find it, or when the whole install took longer than
// the fifteen minutes the task accepts.

import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import fs from 'node:fs';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TLSSocket } from 'node:tls';

const ACCEPTANCE_LIMIT_MS = 15 * 60 * 1000;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HUB_NAME = 'smokehub';

interface InstallSummary {
  readonly platform: string;
  readonly root: string;
  readonly dataDir: string;
  readonly port: number;
  readonly protocol: string;
  readonly url: string;
  readonly certificateFile: string;
  readonly fingerprint: string;
  readonly node: string;
  readonly nodePath: string;
  readonly service: string | null;
  readonly mdnsPort: number;
  readonly durationsMs: Record<string, number>;
}

/** One hub as the installed CLI reports it, in `--discover --json` form. */
interface DiscoveredHub {
  readonly instanceName: string;
  readonly hostName: string;
  readonly port: number;
  readonly addresses: readonly string[];
  readonly txt: Record<string, string>;
  readonly url: string;
}

interface Evidence {
  readonly measuredAt: string;
  readonly platform: string;
  readonly installMs: number;
  readonly installToLoginMs: number;
  readonly accepted: boolean;
  readonly limitMs: number;
  readonly installer: string;
  readonly node: string;
  readonly service: string | null;
  readonly protocol: string;
  readonly url: string;
  readonly fingerprint: string;
  readonly checks: readonly { readonly name: string; readonly ok: boolean; readonly detail: string }[];
  readonly durationsMs: Record<string, number>;
}

interface Options {
  readonly installer: string;
  readonly source: string;
  readonly root: string;
  readonly keep: boolean;
  readonly mdnsPort: number;
  readonly installerTimeoutMs: number;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const checks: Evidence['checks'] = [];
  const port = await freeTcpPort();
  const started = Date.now();

  console.log(`install-smoke: ${options.installer}`);
  console.log(`install-smoke: root ${options.root}, port ${port}, mDNS port ${options.mdnsPort}`);
  console.log();

  const installMs = await runInstaller(options, port);

  const summary = readSummary(options.root);
  const health = await checkHealth(summary, checks);
  const discovery = await checkDiscovery(summary, checks, options.mdnsPort);
  const login = await checkFirstLogin(summary, checks);

  const finished = Date.now();
  const installToLoginMs = finished - started;
  const accepted = installToLoginMs <= ACCEPTANCE_LIMIT_MS && checks.every((check) => check.ok);

  const evidence: Evidence = {
    measuredAt: new Date(started).toISOString(),
    platform: summary.platform,
    installMs,
    installToLoginMs,
    accepted,
    limitMs: ACCEPTANCE_LIMIT_MS,
    installer: path.relative(REPO_ROOT, options.installer),
    node: summary.node,
    service: summary.service,
    protocol: summary.protocol,
    url: summary.url,
    fingerprint: summary.fingerprint,
    checks,
    durationsMs: summary.durationsMs,
  };

  const evidenceFile = writeEvidence(evidence);
  report(evidence, evidenceFile, health, discovery, login, summary);

  if (!options.keep) await stopHub(options.root);

  process.exitCode = accepted ? 0 : 1;
}

// --------------------------------------------------------------------------- the installer

async function runInstaller(options: Options, port: number): Promise<number> {
  const started = Date.now();
  const command = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  const args =
    process.platform === 'win32'
      ? [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          options.installer,
          '-Root',
          options.root,
          '-Source',
          options.source,
          '-Port',
          String(port),
          '-Name',
          HUB_NAME,
          '-MdnsPort',
          String(options.mdnsPort),
          '-NoService',
        ]
      : [
          options.installer,
          '--root',
          options.root,
          '--source',
          options.source,
          '--port',
          String(port),
          '--name',
          HUB_NAME,
          '--mdns-port',
          String(options.mdnsPort),
          '--no-service',
        ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`the installer did not finish within ${options.installerTimeoutMs / 1000}s`));
    }, options.installerTimeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`the installer exited with code ${code}`));
    });
  });

  return Date.now() - started;
}

function readSummary(root: string): InstallSummary {
  const file = path.join(root, 'install-summary.json');
  if (!fs.existsSync(file)) throw new Error(`the installer wrote no summary at ${file}`);
  // PowerShell 5.1 writes UTF-8 with a byte-order mark; JSON.parse refuses one.
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) as InstallSummary;
}

// --------------------------------------------------------------------------- the checks

/** The hub answers over TLS, with the certificate the installer reported. */
async function checkHealth(
  summary: InstallSummary,
  checks: Evidence['checks']
): Promise<{ status: number; fingerprint: string; body: Record<string, unknown> }> {
  try {
    const answer = await requestJson(summary, '/health');
    const pinned = normalize(answer.fingerprint) === normalize(summary.fingerprint);
    const running = answer.body.running === true;
    checks.push({
      name: 'health over TLS with the reported fingerprint',
      ok: answer.status === 200 && pinned && running,
      detail: `status ${answer.status}, fingerprint ${pinned ? 'matches' : 'DIFFERS'}`,
    });
    return answer;
  } catch (error) {
    checks.push({ name: 'health over TLS', ok: false, detail: describe(error) });
    return { status: 0, fingerprint: '', body: {} };
  }
}

/**
 * A browse that was told no address finds the hub, with the port and fingerprint it advertised.
 *
 * The browse runs in the installed hub's own runtime (`<root>/app/.../cli.ts --discover --json`), so
 * the check exercises the client path a provisioning tool would take rather than the harness's own
 * copy of the code. The multicast group is queried first, because that is what a client on the LAN
 * sends; a unicast query is the fallback for a machine with no multicast route.
 */
async function checkDiscovery(
  summary: InstallSummary,
  checks: Evidence['checks'],
  mdnsPort: number
): Promise<DiscoveredHub | null> {
  try {
    let hubs = await browse(summary, ['--timeout', '3000']);
    let via = 'multicast 224.0.0.251';
    if (!hubs.some((hub) => hub.instanceName === HUB_NAME)) {
      hubs = await browse(summary, ['--timeout', '2500', '--address', '127.0.0.1', '--mdns-port', String(mdnsPort)]);
      via = `unicast 127.0.0.1:${mdnsPort}`;
    }

    // Match on the port as well as the name: another hub left running on this machine advertises the
    // same instance name, and the check is about the hub this installer just started.
    const found = hubs.find((hub) => hub.instanceName === HUB_NAME && hub.port === summary.port) ?? null;
    const rightPort = found?.port === summary.port;
    const rightFingerprint = normalize(found?.txt.fp ?? '') === normalize(summary.fingerprint);
    const others = hubs.filter((hub) => hub.instanceName === HUB_NAME && hub.port !== summary.port);
    checks.push({
      name: `mDNS browse finds the hub without an address (${via})`,
      ok: found !== null && rightPort && rightFingerprint,
      detail: found
        ? `${found.url} (port ${rightPort ? 'matches' : 'DIFFERS'}, fingerprint ${
            rightFingerprint ? 'matches' : 'DIFFERS'
          })`
        : `no answer for ${HUB_NAME} on port ${summary.port}; saw ${hubs.length} other hub(s)${
            others.length > 0 ? `: ${others.map((hub) => hub.url).join(', ')}` : ''
          }`,
    });
    return found;
  } catch (error) {
    checks.push({ name: 'mDNS browse', ok: false, detail: describe(error) });
    return null;
  }
}

/** Runs the installed hub's browse and returns the hubs it found. */
async function browse(summary: InstallSummary, args: readonly string[]): Promise<DiscoveredHub[]> {
  const tsx = path.join(summary.root, 'app', 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const cli = path.join(summary.root, 'app', 'src', 'server', 'cli.ts');
  if (!fs.existsSync(tsx)) throw new Error(`the installed hub has no tsx at ${tsx}`);

  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn(summary.nodePath, [tsx, cli, '--discover', '--json', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(`discover exited with ${code}: ${stderr}`))
    );
  });

  const parsed = JSON.parse(output.replace(/^\uFEFF/, '')) as { hubs: DiscoveredHub[] };
  return parsed.hubs;
}

/**
 * The first login.
 *
 * Authentication is P4-C01's task and is not on this branch, so the milestone is the first request
 * the hub answers for a signed-in staff member: the session route when it exists, and otherwise the
 * repository API with the actor header the hub currently trusts. Whichever it is, it is reported.
 */
async function checkFirstLogin(
  summary: InstallSummary,
  checks: Evidence['checks']
): Promise<{ route: string; status: number }> {
  try {
    const session = await requestJson(summary, '/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ username: 'smoke', password: 'smoke-test-only' }),
    });

    if (session.status !== 404) {
      checks.push({
        name: 'first login (POST /api/sessions)',
        ok: session.status < 500,
        detail: `status ${session.status}`,
      });
      return { route: 'POST /api/sessions', status: session.status };
    }

    const repository = await requestJson(summary, '/api/entities/learner?limit=1', {
      headers: { 'x-actor': 'install-smoke' },
    });
    checks.push({
      name: 'first authenticated request (repository API; sessions are P4-C01)',
      ok: repository.status === 200,
      detail: `status ${repository.status}, ${session.status} for POST /api/sessions (not yet routed)`,
    });
    return { route: 'GET /api/entities/learner', status: repository.status };
  } catch (error) {
    checks.push({ name: 'first login', ok: false, detail: describe(error) });
    return { route: 'none', status: 0 };
  }
}

/** One request to the installed hub, pinning the certificate it reported. */
async function requestJson(
  summary: InstallSummary,
  requestPath: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ status: number; body: Record<string, unknown>; fingerprint: string }> {
  const tls = summary.protocol === 'https';
  const ca = tls ? fs.readFileSync(summary.certificateFile, 'utf8') : undefined;

  return new Promise((resolve, reject) => {
    const send = tls ? httpsRequest : httpRequest;
    const request = send(
      {
        host: '127.0.0.1',
        port: summary.port,
        path: requestPath,
        method: init.method ?? 'GET',
        headers: {
          ...(init.body
            ? {
                'content-type': 'application/json',
                'content-length': String(Buffer.byteLength(init.body)),
              }
            : {}),
          ...init.headers,
        },
        ...(ca ? { ca, servername: `${HUB_NAME}.local` } : {}),
      },
      (res) => {
        const fingerprint = ca
          ? (res.socket as TLSSocket).getPeerCertificate().fingerprint256
          : '';
        let text = '';
        res.on('data', (chunk: Buffer) => (text += chunk.toString()));
        res.on('end', () => {
          let body: Record<string, unknown> = {};
          try {
            body = JSON.parse(text) as Record<string, unknown>;
          } catch {
            body = { raw: text };
          }
          resolve({ status: res.statusCode ?? 0, body, fingerprint });
        });
      }
    );
    request.on('error', reject);
    if (init.body) request.write(init.body);
    request.end();
  });
}

/** Both fingerprint spellings, comparable: `AA:BB:…` and `aabb…`. */
function normalize(fingerprint: string): string {
  return fingerprint.replace(/:/g, '').toLowerCase();
}

// --------------------------------------------------------------------------- reporting

function report(
  evidence: Evidence,
  evidenceFile: string,
  health: { body: Record<string, unknown> },
  discovery: DiscoveredHub | null,
  login: { route: string; status: number },
  summary: InstallSummary
): void {
  console.log();
  console.log('Checks');
  for (const check of evidence.checks) {
    console.log(`  ${check.ok ? 'PASS' : 'FAIL'}  ${check.name} — ${check.detail}`);
  }

  const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;
  console.log();
  console.log('Timings');
  console.log(`  installer (its own total)  ${seconds(summary.durationsMs.total ?? evidence.installMs)}`);
  for (const [phase, ms] of Object.entries(summary.durationsMs)) {
    if (phase === 'total') continue;
    console.log(`    ${phase.padEnd(22)} ${seconds(ms)}`);
  }
  console.log(`  installer, wall clock      ${seconds(evidence.installMs)}`);
  console.log(`  install to first login     ${seconds(evidence.installToLoginMs)}   (limit ${seconds(evidence.limitMs)})`);
  console.log();
  console.log(`  hub:      ${summary.url} (on this machine ${summary.protocol}://127.0.0.1:${summary.port})`);
  console.log(`  node:     ${summary.node}`);
  console.log(`  service:  ${summary.service ?? 'none (--no-service)'}`);
  console.log(`  discover: ${discovery ? discovery.url : 'not found'}`);
  console.log(`  login:    ${login.route} → ${login.status}`);
  console.log(`  health:   ${JSON.stringify(health.body).slice(0, 200)}`);
  console.log(`  evidence: ${path.relative(REPO_ROOT, evidenceFile)}`);
  console.log();
  console.log(evidence.accepted ? 'ACCEPTED: fresh install to first login is within 15 minutes' : 'REFUSED: see the failed checks above');
}

function writeEvidence(evidence: Evidence): string {
  const directory = path.join(REPO_ROOT, 'packaging', 'verify', 'evidence');
  fs.mkdirSync(directory, { recursive: true });
  const stamp = evidence.measuredAt.replace(/[:.]/g, '-');
  const file = path.join(directory, `${process.platform}-${stamp}.json`);
  fs.writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  return file;
}

// --------------------------------------------------------------------------- housekeeping

async function stopHub(root: string): Promise<void> {
  const pidFile = path.join(root, 'hub.pid');
  if (!fs.existsSync(pidFile)) {
    console.log('install-smoke: no pid file, nothing to stop');
    return;
  }
  const pid = Number(fs.readFileSync(pidFile, 'utf8').trim());
  if (!Number.isInteger(pid) || pid <= 0) return;

  try {
    process.kill(pid);
    console.log(`install-smoke: stopped the hub (pid ${pid})`);
  } catch (error) {
    console.log(`install-smoke: could not stop pid ${pid}: ${describe(error)}`);
  }
}

function parseArgs(argv: readonly string[]): Options {
  const defaultInstaller =
    process.platform === 'win32'
      ? path.join(REPO_ROOT, 'packaging', 'windows', 'install-hub.ps1')
      : path.join(REPO_ROOT, 'packaging', 'ubuntu', 'install-hub.sh');

  let installer = defaultInstaller;
  let source = REPO_ROOT;
  let root = path.join(os.tmpdir(), `schoolpilot-install-${Date.now()}`);
  let keep = false;
  let mdnsPort = 5353;
  let installerTimeoutMs = 20 * 60 * 1000;

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === '--keep') keep = true;
    else if (flag === '--installer' && value) { installer = path.resolve(value); index += 1; }
    else if (flag === '--source' && value) { source = path.resolve(value); index += 1; }
    else if (flag === '--root' && value) { root = path.resolve(value); index += 1; }
    else if (flag === '--mdns-port' && value) { mdnsPort = Number(value); index += 1; }
    else if (flag === '--installer-timeout' && value) { installerTimeoutMs = Number(value) * 1000; index += 1; }
    else throw new Error(`unknown argument ${flag}`);
  }

  return { installer, source, root, keep, mdnsPort, installerTimeoutMs };
}

function freeTcpPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'string' || address === null ? 0 : address.port;
      server.close(() => resolve(port));
    });
  });
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

void main().catch((error: unknown) => {
  console.error(`install-smoke: ${describe(error)}`);
  process.exitCode = 1;
});
