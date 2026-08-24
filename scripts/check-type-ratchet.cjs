// Typecheck ratchet guard (Phase 4.1)
// Usage: node scripts/check-type-ratchet.cjs
// Fails (exit 1) when `pnpm typecheck` error count exceeds the recorded
// maximum in .type-ratchet. To re-baseline after legitimately fixing errors:
//   node scripts/check-type-ratchet.cjs --update

const { execSync } = require('child_process');
const fs = require('fs');

const RATCHET_FILE = '.type-ratchet';

function countErrors() {
  // Typecheck exits non-zero whenever errors exist — that's the signal we count.
  try {
    execSync('pnpm typecheck > .ratchet-tsc.log 2>&1', { stdio: 'ignore' });
  } catch {
    // expected when errors are present
  }
  const out = fs.readFileSync('.ratchet-tsc.log', 'utf8');
  return (out.match(/error TS\d+/g) || []).length;
}

const current = countErrors();
fs.rmSync('.ratchet-tsc.log', { force: true });

if (!fs.existsSync(RATCHET_FILE) || process.argv.includes('--update')) {
  const previous = fs.existsSync(RATCHET_FILE) ? Number(fs.readFileSync(RATCHET_FILE, 'utf8').trim()) : null;
  if (previous !== null && current > previous) {
    console.error(`RATCHET VIOLATION: ${current} errors > recorded ${previous}. Refusing to update.`);
    process.exit(1);
  }
  fs.writeFileSync(RATCHET_FILE, String(current));
  console.log(`Ratchet ${previous !== null ? 'updated' : 'initialized'}: max ${current} typecheck errors.`);
  process.exit(0);
}

const max = Number(fs.readFileSync(RATCHET_FILE, 'utf8').trim());
if (current > max) {
  console.error(`RATCHET VIOLATION: ${current} typecheck errors exceed the allowed maximum of ${max}.`);
  console.error('Fix the new errors, or (only with review) run: node scripts/check-type-ratchet.cjs --update');
  process.exit(1);
}
  console.log(`Typecheck ratchet OK: ${current} <= ${max}.`);
  fs.rmSync('.ratchet-tsc.log', { force: true });
