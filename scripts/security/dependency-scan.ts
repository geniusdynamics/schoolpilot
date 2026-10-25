// ABOUTME: Scans the dependency tree for known vulnerabilities through `pnpm audit` and fails on a
// ABOUTME: new high or critical advisory, ratcheted against a checked-in baseline of the ones we carry.
// ABOUTME: Wired into CI as a hard step and into the PRD gate in offline-tolerant mode.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const DEFAULT_BASELINE = path.join(SCRIPT_DIR, 'dependency-baseline.json');

/** The severities the scan fails on. Lower ones are reported, not enforced. */
export const ENFORCED_SEVERITIES: readonly string[] = ['high', 'critical'];

/** One advisory that affects the tree, reduced to what the ratchet compares. */
export interface DependencyFinding {
  /** Stable identity: the affected module and the GitHub advisory id. */
  readonly key: string;
  readonly module: string;
  readonly severity: string;
  readonly title: string;
}

/** The baseline: the advisories already known when the ratchet was set. */
export interface DependencyBaseline {
  readonly generatedAt: string;
  readonly source: string;
  readonly severityFloor: readonly string[];
  readonly advisories: readonly string[];
}

/** The subset of `pnpm audit --json` the scan reads. */
interface AuditAdvisory {
  readonly module_name?: unknown;
  readonly severity?: unknown;
  readonly title?: unknown;
  readonly github_advisory_id?: unknown;
  readonly npm_advisory_id?: unknown;
  readonly id?: unknown;
}

/**
 * Turns an audit report into findings, newest shape or legacy.
 *
 * `pnpm audit --json` emits the npm v6 report: an `advisories` object keyed by advisory id. A
 * report without it, or one carrying an `error`, is not a clean tree but an unreachable feed, and
 * the caller must be able to tell the two apart.
 *
 * Two advisory ids can describe the same module and the same GitHub advisory; they collapse into
 * one finding, keeping the higher severity, because the ratchet compares advisories and not the
 * several ids an advisory feed may file them under.
 */
export function findingsFromAudit(report: unknown): readonly DependencyFinding[] {
  if (report === null || typeof report !== 'object') {
    throw new Error('the audit report is not an object');
  }

  const record = report as { advisories?: unknown; error?: unknown };
  if (record.error !== undefined && record.advisories === undefined) {
    throw new Error(`the audit feed refused the request: ${JSON.stringify(record.error)}`);
  }
  if (record.advisories === null || typeof record.advisories !== 'object') {
    throw new Error('the audit report carries no advisories section');
  }

  const byKey = new Map<string, DependencyFinding>();
  for (const value of Object.values(record.advisories as Record<string, AuditAdvisory>)) {
    if (value === null || typeof value !== 'object') continue;

    const module = typeof value.module_name === 'string' ? value.module_name : 'unknown';
    const advisoryId =
      typeof value.github_advisory_id === 'string'
        ? value.github_advisory_id
        : typeof value.npm_advisory_id === 'string'
          ? value.npm_advisory_id
          : String(value.id ?? 'unknown');

    const finding: DependencyFinding = {
      key: `${module}:${advisoryId}`,
      module,
      severity: typeof value.severity === 'string' ? value.severity : 'unknown',
      title: typeof value.title === 'string' ? value.title : '',
    };

    const existing = byKey.get(finding.key);
    if (!existing || severityRank(finding.severity) > severityRank(existing.severity)) {
      byKey.set(finding.key, finding);
    }
  }

  return [...byKey.values()].sort((left, right) => left.key.localeCompare(right.key));
}

/** Orders severities so the higher one can be kept when two advisories collapse. */
function severityRank(severity: string): number {
  const order = ['info', 'low', 'moderate', 'high', 'critical'];
  const rank = order.indexOf(severity);
  return rank === -1 ? 0 : rank;
}

/** The findings at or above the enforced severities. */
export function enforcedFindings(
  findings: readonly DependencyFinding[]
): readonly DependencyFinding[] {
  return findings.filter((finding) => ENFORCED_SEVERITIES.includes(finding.severity));
}

/** What changed against the baseline. */
export interface BaselineDiff {
  /** Advisories present now that the baseline does not know: the ratchet fails on these. */
  readonly added: readonly DependencyFinding[];
  /** Advisories the baseline knows that are gone: the ratchet may be tightened. */
  readonly removed: readonly string[];
}

/** Compares today's enforced findings against a baseline of advisory keys. */
export function compareToBaseline(
  findings: readonly DependencyFinding[],
  baseline: readonly string[]
): BaselineDiff {
  const known = new Set(baseline);
  const current = new Set(findings.map((finding) => finding.key));

  return {
    added: findings.filter((finding) => !known.has(finding.key)),
    removed: baseline.filter((key) => !current.has(key)).sort(),
  };
}

/** Reads the baseline file, or an empty one when it does not exist yet. */
export function readBaseline(file: string): DependencyBaseline {
  if (!fs.existsSync(file)) {
    return { generatedAt: '', source: '', severityFloor: [...ENFORCED_SEVERITIES], advisories: [] };
  }
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as DependencyBaseline;
  return { ...parsed, advisories: [...(parsed.advisories ?? [])] };
}

/**
 * Writes the baseline the ratchet compares against.
 *
 * Only the enforced severities are recorded: the baseline is the floor, so a caller that hands in
 * every finding cannot quietly widen what the ratchet ignores.
 */
export function writeBaseline(
  file: string,
  findings: readonly DependencyFinding[],
  date: string
): DependencyBaseline {
  const baseline: DependencyBaseline = {
    generatedAt: date,
    source: 'pnpm audit --json',
    severityFloor: [...ENFORCED_SEVERITIES],
    advisories: [...new Set(enforcedFindings(findings).map((finding) => finding.key))].sort(),
  };
  fs.writeFileSync(file, `${JSON.stringify(baseline, null, 2)}\n`);
  return baseline;
}

/** Runs `pnpm audit --json` and parses the report. */
export function runAudit(root: string): unknown {
  let output: string;
  try {
    output = execFileSync('pnpm', ['audit', '--json'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    // `pnpm audit` exits non-zero when it has findings to report, which is the normal case here.
    // The report is on stdout either way; only a run that printed nothing is a real failure.
    const stdout = (error as { stdout?: unknown }).stdout;
    if (typeof stdout !== 'string' || stdout.trim() === '') throw error;
    output = stdout;
  }
  return JSON.parse(output) as unknown;
}

interface Options {
  readonly root: string;
  readonly baselineFile: string;
  readonly update: boolean;
  readonly allowOffline: boolean;
  readonly json: boolean;
  readonly help: boolean;
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = {
    root: DEFAULT_ROOT,
    baselineFile: DEFAULT_BASELINE,
    update: false,
    allowOffline: false,
    json: false,
    help: false,
  };
  const mutable = options as {
    root: string;
    baselineFile: string;
    update: boolean;
    allowOffline: boolean;
    json: boolean;
    help: boolean;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--root') {
      const value = argv[index + 1];
      if (!value) throw new Error('--root requires a directory');
      mutable.root = path.resolve(value);
      index += 1;
    } else if (argument === '--baseline') {
      const value = argv[index + 1];
      if (!value) throw new Error('--baseline requires a file');
      mutable.baselineFile = path.resolve(value);
      index += 1;
    } else if (argument === '--update') {
      mutable.update = true;
    } else if (argument === '--allow-offline') {
      mutable.allowOffline = true;
    } else if (argument === '--json') {
      mutable.json = true;
    } else if (argument === '--help' || argument === '-h') {
      mutable.help = true;
    } else {
      throw new Error(`unknown option: ${argument}`);
    }
  }

  return options;
}

function usage(): string {
  return [
    'Usage: tsx scripts/security/dependency-scan.ts [options]',
    '',
    '  --root <dir>       Repository to audit (default: this repository).',
    '  --baseline <file>  Baseline to ratchet against (default: scripts/security/dependency-baseline.json).',
    '  --update           Rewrite the baseline from the current report and exit 0.',
    '  --allow-offline    Treat an unreachable audit feed as a warning instead of a failure.',
    '  --json             Print the findings as JSON.',
    '',
    `Fails on advisories at or above: ${ENFORCED_SEVERITIES.join(', ')}. Exit 3 means the feed was unreachable.`,
  ].join('\n');
}

export function main(argv: readonly string[] = process.argv.slice(2)): number {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return 0;
  }

  let report: unknown;
  try {
    report = runAudit(options.root);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (options.allowOffline) {
      console.warn(`Dependency scan skipped: the audit feed is unreachable (${detail}).`);
      return 0;
    }
    console.error(`Dependency scan could not reach the audit feed: ${detail}`);
    return 3;
  }

  let findings: readonly DependencyFinding[];
  try {
    findings = findingsFromAudit(report);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (options.allowOffline) {
      console.warn(`Dependency scan skipped: ${detail}.`);
      return 0;
    }
    console.error(`Dependency scan could not read the audit report: ${detail}`);
    return 3;
  }

  const enforced = enforcedFindings(findings);
  const baseline = readBaseline(options.baselineFile);
  const diff = compareToBaseline(enforced, baseline.advisories);

  if (options.update) {
    const written = writeBaseline(
      options.baselineFile,
      enforced,
      new Date().toISOString().slice(0, 10)
    );
    console.log(
      `Dependency baseline written: ${written.advisories.length} ${ENFORCED_SEVERITIES.join('/')} ` +
        `advisories at ${options.baselineFile}`
    );
    return 0;
  }

  const summary = {
    total: findings.length,
    enforced: enforced.length,
    baseline: baseline.advisories.length,
    added: diff.added.length,
    removed: diff.removed.length,
  };

  if (options.json) {
    console.log(JSON.stringify({ summary, added: diff.added, removed: diff.removed }, null, 2));
  }

  if (diff.added.length > 0) {
    console.error(
      `Dependency scan found ${diff.added.length} new ${ENFORCED_SEVERITIES.join('/')} advisor${diff.added.length === 1 ? 'y' : 'ies'}:`
    );
    for (const finding of diff.added) {
      console.error(`  ${finding.severity.toUpperCase()} ${finding.key} — ${finding.title}`);
    }
    console.error('Fix or replace the package. A genuinely accepted risk is recorded by --update.');
    return 1;
  }

  console.log(
    `Dependency scan clean: ${summary.enforced} known ${ENFORCED_SEVERITIES.join('/')} advisories ` +
      `(baseline ${summary.baseline}), ${summary.total} total, ${summary.removed} fixed since the baseline.`
  );
  if (diff.removed.length > 0) {
    console.log(`Tighten the baseline with --update; it still lists ${diff.removed.length} fixed advisor${diff.removed.length === 1 ? 'y' : 'ies'}.`);
  }
  return 0;
}

const INVOKED_PATH = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (INVOKED_PATH === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`Dependency scan failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
