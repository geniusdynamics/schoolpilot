// ABOUTME: Tests the tracked-file secret scanner (P0-G13): every supported pattern is detected, placeholders pass.
// ABOUTME: Samples are assembled at runtime so this test file never contains a scannable secret itself.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  isPlaceholder,
  listTrackedFiles,
  listWorkingTreeFiles,
  scanFiles,
  scanText,
} from '../secret-scan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SCANNER = path.join(ROOT, 'scripts', 'prd', 'secret-scan.mjs');

const tempDirs = [];
const makeTempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schoolpilot-secret-scan-'));
  tempDirs.push(dir);
  return dir;
};

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

// Built by concatenation so the literal patterns never appear in this tracked file.
const bugsinkSample = ['VITE_BUGSINK_DSN', '=https://', '0123456789abcdef0123456789abcdef', '@bugsink.internal/2'].join('');
const exampleHostDsnSample = ['VITE_BUGSINK_DSN', '=https://', '0123456789abcdef0123456789abcdef', '@bugsink.example.test/2'].join('');
const credentialUrlSample = ['DATABASE_URL', '=', 'postgres', '://schoolpilot:', 'hunter2', '@db.internal:5432/schoolpilot'].join('');
const httpCredentialUrlSample = ['WEBHOOK_URL', '=', 'https://', 'schoolpilot:', 'hunter2', '@api.internal/v1'].join('');
const passwordSample = ['DB_PASSWORD', '=', 'hunter2'].join('');
const openAiSample = ['const key = "', 'sk', '-abcdefghijklmnopqrstuvwxyz012345', '";'].join('');
const awsSample = ['AWS_ACCESS_KEY_ID=', 'AKIA', 'IOSFODNN7EXAMPLE'].join('');
const pemSample = ['-----BEGIN', 'RSA PRIVATE KEY-----'].join(' ');

describe('module', () => {
  it('starts with the ABOUTME comments and has no shebang', () => {
    const [first, second] = fs.readFileSync(SCANNER, 'utf8').split(/\r?\n/);

    expect(first).toMatch(/^\/\/ ABOUTME:/);
    expect(second).toMatch(/^\/\/ ABOUTME:/);
  });
});

describe('scanText', () => {
  it.each([
    ['bugsink-dsn', bugsinkSample],
    ['credential-url', credentialUrlSample],
    ['password-assignment', passwordSample],
    ['openai-key', openAiSample],
    ['aws-access-key', awsSample],
    ['private-key', pemSample],
  ])('detects %s', (rule, sample) => {
    const findings = scanText(sample, 'sample.env');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: 'sample.env', line: 1, rule });
  });

  it('detects credentials in a generic https url', () => {
    const findings = scanText(httpCredentialUrlSample, 'sample.env');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: 'sample.env', line: 1, rule: 'credential-url' });
  });

  it('does not flag a generic https url with a placeholder password', () => {
    const text = ['WEBHOOK_URL', '=https://', 'schoolpilot:', 'example', '@api.internal/v1'].join('');

    expect(scanText(text, 'sample.env')).toEqual([]);
  });

  it('flags a Bugsink DSN whose host merely contains a placeholder word', () => {
    const findings = scanText(exampleHostDsnSample, 'sample.env');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: 'sample.env', line: 1, rule: 'bugsink-dsn' });
  });

  it('reports the line number of the offending assignment', () => {
    const text = ['APP_MODE=production', 'SAFE_VALUE=1', passwordSample].join('\n');

    expect(scanText(text, 'sample.env')).toEqual([
      expect.objectContaining({ file: 'sample.env', line: 3, rule: 'password-assignment' }),
    ]);
  });

  it('ignores lines marked secret-scan:allow', () => {
    const text = `${passwordSample} # secret-scan:allow`;

    expect(scanText(text, 'sample.env')).toEqual([]);
  });

  it.each([
    '',
    'your_bugsink_dsn_here',
    'https://your_bugsink_dsn_here',
    '<your-key>',
    '${JWT_SECRET}',
    'password',
    'couchdb-admin-password',
  ])('treats %j as a placeholder', (value) => {
    expect(isPlaceholder(value)).toBe(true);
  });

  it('does not treat a random-looking value as a placeholder', () => {
    expect(isPlaceholder('hunter2')).toBe(false);
    expect(isPlaceholder('correcthorsebatterystaple')).toBe(false);
  });

  it.each(['example', 'placeholder', 'change-me', 'not_set'])(
    'treats the whole value %j as a placeholder',
    (value) => {
      expect(isPlaceholder(value)).toBe(true);
    }
  );

  it.each([
    'https://0123456789abcdef@bugsink.example.test/2',
    'bugsink.example.test',
    'db.example.internal',
  ])('does not treat %j as a placeholder just because it contains a marker word', (value) => {
    expect(isPlaceholder(value)).toBe(false);
  });
});

describe('.env.example', () => {
  it('contains placeholders and safe defaults only', () => {
    const example = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');

    expect(scanText(example, '.env.example')).toEqual([]);
  });
});

describe('working tree', () => {
  it('flags a DSN in an untracked .env', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, '.env'), bugsinkSample);

    const findings = scanFiles(dir, listWorkingTreeFiles(dir));

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: '.env', line: 1, rule: 'bugsink-dsn' });
  });

  it('does not descend into node_modules, .git, dist, or .prd-gate', () => {
    const dir = makeTempDir();
    for (const skipped of ['node_modules', '.git', 'dist', '.prd-gate']) {
      fs.mkdirSync(path.join(dir, skipped));
      fs.writeFileSync(path.join(dir, skipped, 'leak.env'), passwordSample);
    }
    fs.writeFileSync(path.join(dir, 'app.env'), 'APP_MODE=production\n');

    const files = listWorkingTreeFiles(dir);

    expect(files).toEqual(['app.env']);
  });
});

describe('CLI', () => {
  it('exits 1, prints file:line, and never echoes the value', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'app.env'), passwordSample);

    const result = spawnSync(process.execPath, [SCANNER, '--root', dir, '--all'], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('app.env:1');
    expect(result.stderr).toContain('password-assignment');
    expect(`${result.stdout}${result.stderr}`).not.toContain('hunter2');
  });

  it('default mode ignores an untracked .env while --all flags it', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, '.gitignore'), '.env\n');
    fs.writeFileSync(path.join(dir, 'app.env'), 'APP_MODE=production\n');
    expect(spawnSync('git', ['init', '--quiet', dir], { encoding: 'utf8' }).status).toBe(0);
    expect(
      spawnSync('git', ['-C', dir, 'add', '.gitignore', 'app.env'], { encoding: 'utf8' }).status
    ).toBe(0);

    fs.writeFileSync(path.join(dir, '.env'), passwordSample);

    const tracked = spawnSync(process.execPath, [SCANNER, '--root', dir], { encoding: 'utf8' });
    expect(tracked.status).toBe(0);
    expect(tracked.stdout).toContain('Secret scan clean');
    expect(`${tracked.stdout}${tracked.stderr}`).not.toContain('hunter2');

    const all = spawnSync(process.execPath, [SCANNER, '--root', dir, '--all'], { encoding: 'utf8' });
    expect(all.status).toBe(1);
    expect(all.stderr).toContain('.env:1');
    expect(all.stderr).toContain('password-assignment');
    expect(`${all.stdout}${all.stderr}`).not.toContain('hunter2');
  });

  it('exits 0 on a clean tree', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'app.env'), 'APP_MODE=production\n');

    const result = spawnSync(process.execPath, [SCANNER, '--root', dir, '--all'], { encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Secret scan clean');
  });
});

describe('this repository', () => {
  it('has no secrets in its tracked files', () => {
    const files = listTrackedFiles(ROOT);

    expect(files.length).toBeGreaterThan(0);
    expect(scanFiles(ROOT, files)).toEqual([]);
  }, 60000);

  it('ignores .env files and keeps the example tracked', () => {
    for (const file of ['.env', '.env.local', '.env.production', '.env.development']) {
      const ignored = spawnSync('git', ['-C', ROOT, 'check-ignore', '-q', file]);
      expect(ignored.status, file).toBe(0);
    }

    const env = spawnSync('git', ['-C', ROOT, 'ls-files', '--error-unmatch', '.env'], { encoding: 'utf8' });
    expect(env.status).not.toBe(0);

    const example = spawnSync('git', ['-C', ROOT, 'ls-files', '--error-unmatch', '.env.example'], { encoding: 'utf8' });
    expect(example.status).toBe(0);
  });

  it('is wired into package.json and CI', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['secret:scan']).toBe('node scripts/prd/secret-scan.mjs');

    const ci = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
    expect(ci).toMatch(/node scripts\/prd\/secret-scan\.mjs/);
  });
});
