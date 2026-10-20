#!/usr/bin/env node
// ABOUTME: Cross-platform Node.js installer for git hooks
// ABOUTME: Copies hook templates from .githooks/ to .git/hooks/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  const hooksDir = path.join(gitRoot, '.githooks');
  const gitHooksDir = path.join(gitRoot, '.git', 'hooks');

  if (!fs.existsSync(hooksDir)) {
    console.error('ERROR: .githooks directory not found at', hooksDir);
    process.exit(1);
  }

  const hooks = ['pre-commit', 'pre-rebase', 'pre-merge-commit'];
  let installed = 0;

  for (const hook of hooks) {
    const src = path.join(hooksDir, hook);
    const dst = path.join(gitHooksDir, hook);

    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      try {
        fs.chmodSync(dst, 0o755);
      } catch (e) {
        // chmod may fail on Windows - that's OK
      }
      console.log('Installed: ' + hook);
      installed++;
    }
  }

  console.log('');
  console.log('Done. ' + installed + ' hook(s) installed to ' + gitHooksDir);
  console.log("Run 'npm run check-translations' to validate i18n files.");
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
