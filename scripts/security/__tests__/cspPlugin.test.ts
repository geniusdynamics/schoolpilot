// ABOUTME: The CSP Vite plugin: which inline scripts it hashes, that the hash is the one a browser
// ABOUTME: computes, and that the injected policy carries it.

import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { cspPlugin, hashInlineScript, inlineScriptSources } from '../cspVitePlugin';

const sha256 = (source: string) =>
  `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`;

describe('the CSP Vite plugin', () => {
  it('finds every inline script and ignores the ones with a src', () => {
    const html = [
      '<head>',
      '<script>window.__dev = 1</script>',
      '<script type="module" src="/src/index.tsx"></script>',
      '<script type="module">import "/src/preamble.js"</script>',
      '</head>',
    ].join('');

    expect(inlineScriptSources(html)).toEqual(['window.__dev = 1', 'import "/src/preamble.js"']);
  });

  it('hashes a script the way a browser does', () => {
    expect(hashInlineScript('')).toBe(sha256(''));
    expect(hashInlineScript('let a = 1;')).toBe(sha256('let a = 1;'));
  });

  it('injects a policy that carries the hash of every inline script in the document', async () => {
    const html =
      '<html><head><script>window.__dev = 1</script></head><body><div id="root"></div></body></html>';
    const plugin = cspPlugin();
    const hook = plugin.transformIndexHtml as unknown as (
      document: string,
      context: unknown
    ) => Promise<unknown>;

    const result = (await hook(html, {})) as {
      tags: Array<{ tag: string; attrs: Record<string, string>; injectTo: string }>;
    };

    expect(result.tags).toHaveLength(1);
    expect(result.tags[0]?.tag).toBe('meta');
    expect(result.tags[0]?.attrs['http-equiv']).toBe('Content-Security-Policy');
    expect(result.tags[0]?.injectTo).toBe('head-prepend');

    const injected = result.tags[0]?.attrs.content ?? '';
    expect(injected).toContain(sha256('window.__dev = 1'));
    expect(injected).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(injected).not.toContain("'unsafe-eval'");
  });
});
