const fs = require('fs');
const raw = fs.readFileSync(process.argv[2] || 'phase2-baseline-failures.log', 'utf8');
const clean = raw.replace(/\x1b\[[0-9;]*m/g, '');
const failedFiles = new Map();
for (const l of clean.split('\n')) {
  const m = l.match(/(\S+\.(?:test|spec)\.(?:tsx|ts|js))\s*\((\d+)\s*tests?\s*\|\s*(\d+)\s*failed\)/);
  if (m && Number(m[3]) > 0) failedFiles.set(m[1], Number(m[3]));
}
let total = 0;
[...failedFiles.entries()].sort((a,b)=>b[1]-a[1]).forEach(([f,n]) => { total += n; console.log(`${n}\t${f}`); });
console.log(`FILES: ${failedFiles.size}  APPROX-TESTS: ${total}`);
