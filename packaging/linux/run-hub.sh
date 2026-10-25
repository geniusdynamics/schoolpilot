#!/usr/bin/env bash
# ABOUTME: Starts the installed hub from hub.env: the one place the port, data directory, name and
# ABOUTME: TLS switch live, so systemd, a manual start and the installer all launch it the same way.
# ABOUTME: `--stop` stops a hub this script started in the background.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=/dev/null
. "$ROOT/hub.env"

if [ "${1:-}" = "--stop" ]; then
  if [ -f "$ROOT/hub.pid" ]; then
    pid="$(cat "$ROOT/hub.pid")"
    kill "$pid" 2>/dev/null && echo "stopped the hub (pid $pid)" || echo "the hub is not running"
    rm -f "$ROOT/hub.pid"
  else
    echo "no pid file at $ROOT/hub.pid; if systemd started the hub use: sudo systemctl stop schoolpilot-hub"
  fi
  exit 0
fi

NODE="${SCHOOLPILOT_NODE:-node}"
TSX="$SCHOOLPILOT_APP/node_modules/tsx/dist/cli.mjs"

[ -x "$NODE" ] || NODE="$(command -v node || true)"
[ -n "$NODE" ] || { echo "run-hub.sh: no node found; reinstall or set SCHOOLPILOT_NODE" >&2; exit 1; }
[ -f "$TSX" ] || { echo "run-hub.sh: $TSX is missing; reinstall the hub" >&2; exit 1; }

# The hub runs from its own directory: the `@/*` paths in the app's tsconfig.json resolve against the
# working directory, and a hub started from somewhere else would load another checkout's sources.
cd "$SCHOOLPILOT_APP"

exec "$NODE" "$TSX" "$SCHOOLPILOT_APP/src/server/cli.ts" \
  --data-dir "$SCHOOLPILOT_DATA_DIR" \
  --port "$SCHOOLPILOT_PORT" \
  --host "$SCHOOLPILOT_HOST" \
  --name "$SCHOOLPILOT_NAME" \
  --mdns-port "$SCHOOLPILOT_MDNS_PORT" \
  $SCHOOLPILOT_TLS_ARGS
