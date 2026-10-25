// ABOUTME: The diagnostic bundle's redactor: it drops denylisted fields, rewrites secrets, sealed
// ABOUTME: values, bearer tokens and email addresses out of free text, and names what it withheld.

import os from 'node:os';

import type { DiagnosticBundle, HubHealthReport } from './types';
/**
 * The field names a bundle never carries.
 *
 * It is matched against a key, not a value, so a field that merely mentions one of these words in
 * its value is untouched. `keyId` is deliberately not caught: it names a backup key, it is not one.
 */
const SENSITIVE_KEY = /(pass(word|phrase)?|secret|token|credential|cookie|authorization|api[-_]?key|private[-_]?key|totp|otp|mfa)/i;

/** The value patterns that are secrets wherever they appear, in a key's value or in free text. */
const SECRET_PATTERNS: readonly { readonly name: string; readonly pattern: RegExp; readonly replace: string }[] = [
  { name: 'bearer token', pattern: /sp1_[A-Za-z0-9_-]+/g, replace: '[redacted:bearer-token]' },
  { name: 'bearer header', pattern: /\bBearer\s+\S+/gi, replace: 'Bearer [redacted]' },
  { name: 'password hash', pattern: /pbkdf2-sha256\$[^\s"']+/g, replace: '[redacted:password-hash]' },
  { name: 'sealed value', pattern: /enc:v1:[A-Za-z0-9+/=:]+/g, replace: '[redacted:sealed-value]' },
  { name: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, replace: '[redacted:jwt]' },
  { name: 'email address', pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replace: '[redacted:email]' },
];

/** The home directory of the account running the hub, replaced with `~` in every path. */
function homePatterns(): readonly { readonly pattern: RegExp; readonly replace: string }[] {
  const home = os.homedir();
  if (!home) return [];
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Windows paths are written with backslashes and with forward slashes; both name the same home.
  return [
    { pattern: new RegExp(escape(home), 'gi'), replace: '~' },
    { pattern: new RegExp(escape(home.replace(/\\/g, '/')), 'gi'), replace: '~' },
  ];
}

/**
 * Rewrites the secrets out of one string.
 *
 * Exported because a caller that has a single field to sanitise should not have to build a bundle
 * to do it, and because it is the unit the redaction property is tested against.
 */
export function redactDiagnosticValue(value: string): string;
export function redactDiagnosticValue(value: unknown): unknown;
export function redactDiagnosticValue(value: unknown): unknown {
  return redact(value, []);
}

/** The recursive walk: strings are rewritten, denylisted keys are dropped and noted. */
function redact(value: unknown, notes: string[]): unknown {
  if (typeof value === 'string') return redactString(value, notes);
  if (Array.isArray(value)) return value.map((entry) => redact(entry, notes));
  if (value === null || typeof value !== 'object') return value;

  const source = value as Record<string, unknown>;
  const target: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (SENSITIVE_KEY.test(key)) {
      notes.push(`field "${key}" withheld: a credential field is never exported`);
      continue;
    }
    target[key] = redact(entry, notes);
  }
  return target;
}

/** Rewrites every secret pattern and the home directory out of one string. */
function redactString(value: string, notes: string[]): string {
  let text = value;
  for (const { name, pattern, replace } of SECRET_PATTERNS) {
    if (!pattern.test(text)) continue;
    pattern.lastIndex = 0;
    notes.push(`${name} removed from a diagnostic string`);
    text = text.replace(pattern, replace);
  }
  for (const { pattern, replace } of homePatterns()) {
    if (!pattern.test(text)) continue;
    pattern.lastIndex = 0;
    notes.push('the account home directory was replaced with ~');
    text = text.replace(pattern, replace);
  }
  return text;
}

/**
 * Builds the bundle an operator hands over.
 *
 * The report is redacted like anything else, so a diagnostic string that happens to carry a token,
 * a sealed value or a personal address cannot leak through a field nobody thought about.
 */
export function buildDiagnosticBundle<D>(
  report: HubHealthReport,
  diagnostics: D,
  now: Date = new Date()
): DiagnosticBundle<D> {
  const notes: string[] = [];
  const cleanReport = redact(report, notes) as HubHealthReport;
  const cleanDiagnostics = redact(diagnostics, notes) as D;

  return {
    format: 'schoolpilot-diagnostic-bundle',
    version: 1,
    application: 'schoolpilot',
    generatedAt: now.toISOString(),
    report: cleanReport,
    diagnostics: cleanDiagnostics,
    redactions: [...new Set(notes)].sort(),
  };
}
