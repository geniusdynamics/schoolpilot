// ABOUTME: The Vite plugin that puts the app's content-security policy into the document, hashing
// ABOUTME: every inline script Vite and its plugins inject so the policy can stay strict.

import { createHash } from 'node:crypto';

import { contentSecurityPolicy } from '../../src/security/csp';

/**
 * The plugin as Vite consumes it.
 *
 * `Plugin` is not imported from `vite`: this tree hoists rollup 2 while vite 6 expects rollup 4,
 * so vite's `Plugin` resolves against the wrong generic and rejects a `name` property. The shape
 * below is the part of the contract this plugin uses, and `tests/e2e/csp.spec.ts` proves the
 * injected policy reaches a real document.
 */
export interface ContentSecurityPolicyPlugin {
  readonly name: string;
  readonly enforce: 'post';
  transformIndexHtml(html: string): {
    html: string;
    tags: readonly {
      tag: string;
      attrs: Record<string, string>;
      injectTo: 'head-prepend';
    }[];
  };
}

/** An inline `<script>` with no `src`, whose exact text a browser will hash. */
const INLINE_SCRIPT = /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;

/** The body of every inline script in a document, in document order. */
export function inlineScriptSources(html: string): readonly string[] {
  const sources: string[] = [];
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    sources.push(match[1] ?? '');
  }
  return sources;
}

/** The `'sha256-…'` source a browser matches an inline script against. */
export function hashInlineScript(source: string): string {
  const digest = createHash('sha256').update(source, 'utf8').digest('base64');
  return `'sha256-${digest}'`;
}

/**
 * The plugin that injects the policy.
 *
 * It runs after every other plugin has had its say (`enforce: 'post'`), because Vite injects the
 * tags earlier hooks returned into the document before a post hook is called. That is what makes
 * the hashes correct: the react plugin's development preamble is an inline script that only exists
 * once this hook sees the document.
 */
export function cspPlugin(): ContentSecurityPolicyPlugin {
  return {
    name: 'schoolpilot-csp',
    enforce: 'post',
    transformIndexHtml(html: string) {
      const hashes = inlineScriptSources(html).map(hashInlineScript);
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content: contentSecurityPolicy({ inlineScriptHashes: hashes }),
            },
            injectTo: 'head-prepend',
          },
        ],
      };
    },
  };
}

export default cspPlugin;
