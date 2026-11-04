// ABOUTME: Measures initial JS of a built app: the entry script plus every modulepreload in index.html,
// ABOUTME: raw and gzip level 9, and lists which module-* chunks are preloaded.
// Usage: node initialjs.mjs <builtOutDir>   e.g. after: npx vite build --outDir <tempDir>

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dir = process.argv[2];
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const refs = new Set();
for (const m of html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g)) refs.add(m[1]);
for (const m of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)) refs.add(m[1]);
let raw = 0;
let gz = 0;
const rows = [];
for (const ref of refs) {
  const buf = fs.readFileSync(path.join(dir, ref.replace(/^\//, '')));
  const zipped = zlib.gzipSync(buf, { level: 9 }).length;
  raw += buf.length;
  gz += zipped;
  rows.push([path.basename(ref), Math.round(buf.length / 1024), Math.round(zipped / 1024)]);
}
rows.sort((a, b) => b[2] - a[2]);
for (const r of rows) console.log(r.join('\t'));
console.log(`files ${refs.size} raw KB ${Math.round(raw / 1024)} gzip KB ${Math.round(gz / 1024)}`);
console.log('module chunks preloaded:', rows.filter((r) => r[0].startsWith('module-')).map((r) => r[0]).join(', '));
