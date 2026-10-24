// ABOUTME: The app's content-security policy: strict on scripts, honest about the two things a
// ABOUTME: meta policy cannot do, and configurable where a school's own endpoints are involved.

import { describe, expect, it } from 'vitest';

import { contentSecurityPolicy } from '../csp';

/** The policy as a map of directive to its sources. */
function directivesOf(policy: string): Map<string, readonly string[]> {
  const directives = new Map<string, readonly string[]>();
  for (const directive of policy.split('; ')) {
    const [name, ...sources] = directive.split(' ');
    if (name) directives.set(name, sources);
  }
  return directives;
}

describe('the app content-security policy', () => {
  const policy = contentSecurityPolicy({ inlineScriptHashes: ["'sha256-AAAA'"] });
  const directives = directivesOf(policy);

  it('allows scripts from this origin and only the hashed inline scripts', () => {
    expect(directives.get('script-src')).toEqual([
      "'self'",
      "'wasm-unsafe-eval'",
      "'sha256-AAAA'",
    ]);
    expect(directives.get('script-src')).not.toContain("'unsafe-inline'");
    expect(directives.get('script-src')).not.toContain("'unsafe-eval'");
  });

  it('never allows eval anywhere in the policy', () => {
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it('closes the directives a document can still enforce', () => {
    expect(directives.get('default-src')).toEqual(["'self'"]);
    expect(directives.get('object-src')).toEqual(["'none'"]);
    expect(directives.get('base-uri')).toEqual(["'self'"]);
    expect(directives.get('form-action')).toEqual(["'self'"]);
  });

  it('leaves frame-ancestors out, because a browser ignores it in a meta policy', () => {
    expect(directives.has('frame-ancestors')).toBe(false);
    expect(directives.has('sandbox')).toBe(false);
    expect(directives.has('report-uri')).toBe(false);
  });

  it('allows the inline styles the document and React actually write', () => {
    expect(directives.get('style-src')).toContain("'unsafe-inline'");
  });

  it('keeps the connection sources open to a school’s own endpoints, and configurable', () => {
    expect(directives.get('connect-src')).toEqual(["'self'", 'https:', 'http:', 'ws:', 'wss:']);
    const narrowed = directivesOf(contentSecurityPolicy({ connectSources: ["'self'"] }));
    expect(narrowed.get('connect-src')).toEqual(["'self'"]);
  });

  it('gives every directive at least one source', () => {
    for (const [name, sources] of directives) {
      expect(sources.length, name).toBeGreaterThan(0);
    }
  });
});
