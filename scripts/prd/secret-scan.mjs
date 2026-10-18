// ABOUTME: Scans tracked (and optionally working-tree) files for committed secrets such as DSNs, credentialed URLs and API keys.
// ABOUTME: Prints redacted file:line findings and exits 1 when anything is found; wired into CI as `pnpm secret:scan`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const ALLOW_MARKER = 'secret-scan:allow';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const EXCLUDED_DIRS = new Set([
  '.git',
  '.claude',
  'node_modules',
  'dist',
  'dist-ssr',
  'dev-dist',
  'coverage',
  '.prd-gate',
]);

// Values that are deliberately shown in templates, docs, tests and compose examples.
const EXACT_DEFAULTS = new Set([
  'secret',
  'supersecret',
  'supersecretkey',
  'secretkey',
  'mysecret',
  'password',
  'passwd',
  'pass',
  'postgres',
  'root',
  'admin',
  'guest',
  'default',
  'changeme',
  'schoolpilot',
  'akademico',
  'local',
  'dev',
  'test',
  'demo',
  'none',
  'null',
  'undefined',
]);

const GENERIC_WORDS = new Set([
  'secret',
  'password',
  'passwd',
  'pass',
  'admin',
  'couchdb',
  'couch',
  'db',
  'auth',
  'jwt',
  'key',
  'api',
  'token',
  'my',
  'super',
  'your',
  'change',
  'me',
  'example',
  'test',
  'dev',
  'local',
  'postgres',
  'user',
  'root',
  'secure',
  'do',
  'not',
  'use',
  'in',
  'prod',
  'here',
  'only',
  'for',
  'with',
  'this',
  'value',
  'fake',
  'mock',
]);

// Placeholder markers only count as whole values or whole tokens, so a host such as
// `bugsink.example.test` cannot hide a real credential behind the word "example".
const PLACEHOLDER_WORDS = new Set([
  'example',
  'placeholder',
  'changeme',
  'redacted',
  'dummy',
  'sample',
  'fake',
  'mock',
  'notset',
]);

const SENSITIVE_KEY = /^(?:[A-Za-z_][A-Za-z0-9_]*)(?:_PASSWORD|_PASSWD|_SECRET|_TOKEN|_API_KEY|_DSN)$/;
const ASSIGNMENT = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;
const CREDENTIAL_URL = /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|amqp):\/\/([^\s'"`]+)@/gi;
const HTTP_CREDENTIAL_URL = /\bhttps?:\/\/([^\s/'"`@]+)@/gi;

export function stripAssignmentValue(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed || trimmed.startsWith('#')) return '';
  const quote = trimmed[0];
  if (quote === '"' || quote === "'" || quote === '`') {
    const end = trimmed.indexOf(quote, 1);
    return end === -1 ? trimmed.slice(1) : trimmed.slice(1, end);
  }
  return trimmed.split(/\s+#/)[0].replace(/[;,]$/, '').trim();
}

export function isPlaceholder(value) {
  const v = String(value ?? '').trim().replace(/^["'`]|["'`]$/g, '').trim();
  if (v === '') return true;
  if (/<[^>]*>/.test(v)) return true;
  if (/(?:^|[^A-Za-z0-9])your[_-]/i.test(v)) return true;
  if (/^\$\{[^}]*\}$/.test(v) || /^%[^%]*%$/.test(v) || /^[.\u2026]+$/.test(v) || /^\[.*\]$/.test(v)) return true;

  const lower = v.toLowerCase();
  if (EXACT_DEFAULTS.has(lower)) return true;
  if (PLACEHOLDER_WORDS.has(lower) || lower === 'not_set' || lower === 'not-set' || /^x{3,}$/.test(lower)) {
    return true;
  }

  const words = lower.split(/[^a-z0-9]+/).filter(Boolean);
  if (words.length < 2) return false;
  return words.every(
    (word) =>
      GENERIC_WORDS.has(word) ||
      PLACEHOLDER_WORDS.has(word) ||
      /^x{3,}$/.test(word) ||
      /^\d+bit$/.test(word) ||
      /^\d+$/.test(word)
  );
}

function decodeSafely(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function authorityHasPassword(authority) {
  const colon = authority.indexOf(':');
  if (colon <= 0) return false;
  const password = authority.slice(colon + 1);
  return Boolean(password) && !isPlaceholder(decodeSafely(password));
}

function matchesCredentialedUrl(pattern, line) {
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(line)) !== null) {
    if (authorityHasPassword(match[1])) return true;
  }
  return false;
}

function hasCredentialedUrl(line) {
  return matchesCredentialedUrl(CREDENTIAL_URL, line) || matchesCredentialedUrl(HTTP_CREDENTIAL_URL, line);
}

function hasSensitiveAssignment(line) {
  const match = line.match(ASSIGNMENT);
  if (!match) return false;
  const [, key, rawValue] = match;
  if (!SENSITIVE_KEY.test(key)) return false;
  if (key === 'VITE_BUGSINK_DSN') return false;
  return !isPlaceholder(stripAssignmentValue(rawValue));
}

function hasBugsinkDsn(line) {
  const match = line.match(/(?:^|[^A-Za-z0-9_])VITE_BUGSINK_DSN\s*=\s*(.*)$/);
  if (!match) return false;
  return !isPlaceholder(stripAssignmentValue(match[1]));
}

const RULES = [
  {
    id: 'bugsink-dsn',
    message: 'VITE_BUGSINK_DSN is set to a non-placeholder value',
    test: hasBugsinkDsn,
  },
  {
    id: 'credential-url',
    message: 'connection URL contains embedded credentials',
    test: hasCredentialedUrl,
  },
  {
    id: 'openai-key',
    message: 'value looks like an OpenAI-style secret key',
    test: (line) => /(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}/.test(line),
  },
  {
    id: 'aws-access-key',
    message: 'value looks like an AWS access key id',
    test: (line) => /\bAKIA[0-9A-Z]{16}\b/.test(line),
  },
  {
    id: 'private-key',
    message: 'PEM private key block',
    test: (line) => /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/.test(line),
  },
  {
    id: 'password-assignment',
    message: 'sensitive key is assigned a non-placeholder value',
    test: hasSensitiveAssignment,
  },
];

export function scanText(text, file = '<text>') {
  const findings = [];
  const lines = String(text).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes(ALLOW_MARKER)) return;
    for (const rule of RULES) {
      if (rule.test(line)) {
        findings.push({ file, line: index + 1, rule: rule.id, message: rule.message });
      }
    }
  });
  return findings;
}

export function scanFiles(root, relativePaths) {
  const findings = [];
  for (const relativePath of relativePaths) {
    if (relativePath.startsWith('.prd-gate/')) continue;
    const absolutePath = path.join(root, relativePath);
    let stats;
    try {
      stats = fs.statSync(absolutePath);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if (!stats.isFile()) continue;
    if (stats.size > MAX_FILE_BYTES) {
      console.error(`Skipped large file (limit 10 MiB): ${relativePath}`);
      continue;
    }
    const buffer = fs.readFileSync(absolutePath);
    if (buffer.includes(0)) continue;
    findings.push(...scanText(buffer.toString('utf8'), relativePath));
  }
  return findings;
}

export function listTrackedFiles(root) {
  const output = execFileSync('git', ['-C', root, 'ls-files', '-z'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return output.split('\0').filter(Boolean);
}

function walk(root) {
  const files = [];
  const visit = (directory, prefix) => {
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        visit(path.join(directory, entry.name), relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  };
  visit(root, '');
  return files;
}

export function listWorkingTreeFiles(root) {
  return walk(root);
}

function usage() {
  return [
    'Usage: node scripts/prd/secret-scan.mjs [--root <dir>] [--all]',
    '',
    '  --root <dir>  Repository or directory to scan (default: this repository).',
    '  --all         Scan the working tree, including untracked files (e.g. .env).',
    '                 Default scans tracked files only, which is the CI gate.',
    '',
    `Mark a documentation or fixture line with "${ALLOW_MARKER}" to skip it.`,
  ].join('\n');
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, all: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--root') {
      const value = argv[index + 1];
      if (!value) throw new Error('--root requires a directory');
      options.root = path.resolve(value);
      index += 1;
    } else if (argument === '--all') {
      options.all = true;
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else {
      throw new Error(`unknown option: ${argument}`);
    }
  }
  return options;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return 0;
  }
  if (!fs.existsSync(options.root) || !fs.statSync(options.root).isDirectory()) {
    throw new Error(`not a directory: ${options.root}`);
  }

  const files = options.all ? listWorkingTreeFiles(options.root) : listTrackedFiles(options.root);
  const findings = scanFiles(options.root, files);

  if (findings.length === 0) {
    console.log(`Secret scan clean: ${files.length} file(s) scanned.`);
    return 0;
  }

  console.error(`Secret scan found ${findings.length} finding(s):`);
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line}: ${finding.rule} - ${finding.message}`);
  }
  console.error('Remove the value, rotate the credential, and use a placeholder in examples.');
  return 1;
}

const INVOKED_PATH = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (INVOKED_PATH === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`Secret scan failed: ${error.message}`);
    process.exitCode = 2;
  }
}
