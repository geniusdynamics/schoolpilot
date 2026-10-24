#!/usr/bin/env bash
# ABOUTME: The Raspberry Pi installer: the same install as Ubuntu with the checks a Pi needs — the
# ABOUTME: architecture it can build better-sqlite3 for, the memory it has, and a Node that fits the
# ABOUTME: board's architecture rather than one the distribution never packaged.
# ABOUTME: Raspberry Pi OS is Debian, so this reuses packaging/lib/install-hub.sh unchanged.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
. "$SCRIPT_DIR/../lib/install-hub.sh"

ARCH="$(uname -m)"
PLATFORM_LABEL="Raspberry Pi ($ARCH)"
DEFAULT_ROOT="/opt/schoolpilot"
TEMPLATE_DIR="$(cd "$SCRIPT_DIR/../linux" && pwd)"

if [ -f /etc/os-release ]; then
  # shellcheck source=/dev/null
  . /etc/os-release
  PLATFORM_LABEL="${PRETTY_NAME:-Raspberry Pi OS} ($ARCH)"
fi

ROOT="$DEFAULT_ROOT"
DATA_DIR=""
PORT="$DEFAULT_PORT"
HOST="$DEFAULT_HOST"
NAME="$(hostname | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')"
SOURCE="${SCHOOLPILOT_SOURCE:-}"
NODE_STRATEGY="auto"
MDNS_PORT="$DEFAULT_MDNS_PORT"
INSTALL_SERVICE=1
TLS=1
DRY_RUN=0

parse_common_args "$@"

# --- what only a Pi needs to know -------------------------------------------------------------

case "$ARCH" in
  aarch64|arm64|armv7l)
    log "architecture $ARCH: Node publishes a build for it and better-sqlite3 has a prebuilt binary"
    ;;
  armv6l)
    warn "armv6 (Pi 1 / Zero) has no Node build for v${REQUIRED_NODE_MAJOR}; the hub needs a Pi 3 or newer"
    die "use a Raspberry Pi 3, 4 or 5 (or a Zero 2 W), which are armv7l or arm64"
    ;;
  *)
    warn "this does not look like a Raspberry Pi ($ARCH); the installer will continue"
    ;;
esac

if [ -r /proc/meminfo ]; then
  mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
  if [ -n "$mem_kb" ] && [ "$mem_kb" -lt 900000 ]; then
    warn "this board has less than 900 MB of RAM; add swap if installing dependencies fails"
  fi
fi

# Raspberry Pi OS is not a distribution NodeSource publishes for, so the board gets the official
# Node build for its architecture unless it already runs a new enough Node.
if [ "$NODE_STRATEGY" = "auto" ] && [ "$(node_major "$(command -v node || true)")" -lt "$REQUIRED_NODE_MAJOR" ]; then
  log "using the official Node build for $ARCH rather than a distribution package"
  NODE_STRATEGY="local"
fi

# The card the OS runs from is the slowest place to keep a database and its backups.
warn "if this Pi boots from an SD card, move the data directory to a USB disk or SSD: --data-dir /mnt/data/schoolpilot"

install_hub_main
