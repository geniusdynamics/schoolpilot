// ABOUTME: The app's content-security policy, built as a string so the Vite plugin can hash the
// ABOUTME: document's inline scripts and the tests can assert the policy without a browser.

/**
 * What the policy allows and why.
 *
 * - `script-src` is the control that matters: only same-origin scripts and the exact inline
 *   scripts the document carries (by hash) may run. There is no `'unsafe-eval'`; the one exception
 *   is `'wasm-unsafe-eval'`, which permits WebAssembly compilation without permitting `eval`, and
 *   the SQLite-WASM store needs it.
 * - `style-src` carries `'unsafe-inline'`. The document ships an inline `<style>` and inline
 *   `style` attributes, and React and emotion write inline styles at runtime. Inline style is a
 *   far weaker vector than inline script, so the strictness is spent where it buys something.
 * - `connect-src` stays open to any origin because a school points the app at its own hub, its own
 *   payment provider and its own integrations, and those addresses are configuration, not
 *   something a build-time list can know.
 * - `frame-ancestors` is deliberately absent: a browser ignores it in a `<meta>` policy, and a
 *   directive that does nothing is worse than none. The document cannot set it at all; the host
 *   serving the app must send it as a header, and the hub does so for its own responses.
 */
export interface CspOptions {
  /** The `'sha256-…'` hashes of the document's inline scripts. */
  readonly inlineScriptHashes?: readonly string[];
  /** Overrides for `connect-src`; the defaults cover a self-hosted hub and external providers. */
  readonly connectSources?: readonly string[];
}

const DEFAULT_CONNECT_SOURCES = ["'self'", 'https:', 'http:', 'ws:', 'wss:'] as const;

/** The policy the app's document carries. */
export function contentSecurityPolicy(options: CspOptions = {}): string {
  const directives: Readonly<Record<string, readonly string[]>> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'wasm-unsafe-eval'", ...(options.inlineScriptHashes ?? [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': options.connectSources ?? [...DEFAULT_CONNECT_SOURCES],
    'worker-src': ["'self'", 'blob:'],
    'child-src': ["'self'", 'blob:'],
    'frame-src': ["'self'", 'blob:'],
    'media-src': ["'self'", 'blob:', 'data:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}
