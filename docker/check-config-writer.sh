#!/bin/sh
# ABOUTME: Exercises the container's config writer with awkward values and parses the result with node.
# ABOUTME: Copies the file to a repo-relative path first: Git Bash's /tmp is not node's /tmp on Windows.
set -eu
cd "$(dirname "$0")/.."
OUT=docker/.config-check.js
trap 'rm -f "$OUT"' EXIT

SCHOOLPILOT_DEPLOYMENT_MODE=demo \
SCHOOLPILOT_ALLOW_TEMPORARY_DB=true \
SCHOOLPILOT_BUGSINK_DSN='https://key@example.test/1' \
SCHOOLPILOT_APP_VERSION='2.0.0 "quoted" \back' \
  sh docker/web-entrypoint.sh
cp /tmp/schoolpilot/config.js "$OUT"
cat "$OUT"
node -e '
const fs = require("fs");
const vm = require("vm");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(process.argv[1], "utf8"), sandbox);
console.log("parsed:", JSON.stringify(sandbox.window.__SCHOOLPILOT_CONFIG__));
' "$OUT"

echo "--- a bad mode falls back to both, a bad flag to false"
SCHOOLPILOT_DEPLOYMENT_MODE=kiosk SCHOOLPILOT_ALLOW_TEMPORARY_DB=yes sh docker/web-entrypoint.sh
cp /tmp/schoolpilot/config.js "$OUT"
node -e '
const fs = require("fs");
const vm = require("vm");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(process.argv[1], "utf8"), sandbox);
console.log("parsed:", JSON.stringify(sandbox.window.__SCHOOLPILOT_CONFIG__));
' "$OUT"
