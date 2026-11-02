#!/bin/sh
# ABOUTME: Starts the LAN hub from its environment: the flags the CLI takes are built here, so the
# ABOUTME: image is configured with variables instead of a command line. Runs as the node user.

set -eu

data_dir="${SCHOOLPILOT_DATA_DIR:-/data}"
port="${SCHOOLPILOT_PORT:-8443}"
host="${SCHOOLPILOT_HOST:-0.0.0.0}"
name="${SCHOOLPILOT_NAME:-SchoolPilot Hub}"

mkdir -p "$data_dir"

set -- \
  --data-dir "$data_dir" \
  --port "$port" \
  --host "$host" \
  --name "$name"

# TLS is the CLI's default (a self-signed certificate for the container's hostname and LAN IPs). A
# deployment behind a TLS-terminating proxy turns it off; one with its own certificate passes it in.
if [ -n "${SCHOOLPILOT_TLS_CERT:-}" ] && [ -n "${SCHOOLPILOT_TLS_KEY:-}" ]; then
  set -- "$@" --tls --tls-cert "$SCHOOLPILOT_TLS_CERT" --tls-key "$SCHOOLPILOT_TLS_KEY"
elif [ "${SCHOOLPILOT_TLS:-on}" = "off" ]; then
  set -- "$@" --no-tls
else
  set -- "$@" --tls
fi

# mDNS is a LAN convenience that a container cannot advertise; opt in only when the network allows it.
[ "${SCHOOLPILOT_MDNS:-false}" = "true" ] || set -- "$@" --no-mdns

[ -n "${SCHOOLPILOT_DATABASE_FILE:-}" ] && set -- "$@" --database-file "$SCHOOLPILOT_DATABASE_FILE"
[ -n "${SCHOOLPILOT_RESTRICTED_KEY_FILE:-}" ] && set -- "$@" --restricted-key-file "$SCHOOLPILOT_RESTRICTED_KEY_FILE"
[ -n "${SCHOOLPILOT_BACKUP_DIR:-}" ] && set -- "$@" --backup-dir "$SCHOOLPILOT_BACKUP_DIR"
[ -n "${SCHOOLPILOT_BACKUP_KEY_FILE:-}" ] && set -- "$@" --backup-key-file "$SCHOOLPILOT_BACKUP_KEY_FILE"
[ -n "${SCHOOLPILOT_DAILY_AT:-}" ] && set -- "$@" --daily-at "$SCHOOLPILOT_DAILY_AT"
[ "${SCHOOLPILOT_BACKUPS:-on}" = "off" ] && set -- "$@" --no-backups

echo "[hub] starting: tsx src/server/cli.ts $*"
exec node node_modules/tsx/dist/cli.mjs src/server/cli.ts "$@"
