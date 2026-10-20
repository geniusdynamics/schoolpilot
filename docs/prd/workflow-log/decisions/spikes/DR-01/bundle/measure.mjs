// ABOUTME: Reports raw and gzip bundle sizes for the two DR-01 implementations.
// ABOUTME: Also records whether the bundle contains runtime code generation (new Function).

import fs from 'node:fs';
import zlib from 'node:zlib';

for (const name of ['zod', 'ajv']) {
  const buffer = fs.readFileSync(new URL(`./${name}.bundle.js`, import.meta.url));
  const text = buffer.toString('utf8');
  console.log(
    JSON.stringify({
      name,
      bytes: buffer.length,
      kib: Number((buffer.length / 1024).toFixed(1)),
      gzipBytes: zlib.gzipSync(buffer, { level: 9 }).length,
      gzipKib: Number((zlib.gzipSync(buffer, { level: 9 }).length / 1024).toFixed(1)),
      containsNewFunction: text.includes('new Function'),
    }),
  );
}
