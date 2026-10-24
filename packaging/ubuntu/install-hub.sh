#!/usr/bin/env bash
# ABOUTME: The Ubuntu installer: takes a fresh machine to a running SchoolPilot hub with TLS, mDNS
# ABOUTME: discovery and a systemd service, installing Node when the machine has none or an old one.
# ABOUTME: Everything platform-specific is here; the install itself is packaging/lib/install-hub.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
. "$SCRIPT_DIR/../lib/install-hub.sh"

PLATFORM_LABEL="Ubuntu ($(uname -m))"
DEFAULT_ROOT="/opt/schoolpilot"
TEMPLATE_DIR="$(cd "$SCRIPT_DIR/../linux" && pwd)"

if [ -f /etc/os-release ]; then
  # shellcheck source=/dev/null
  . /etc/os-release
  PLATFORM_LABEL="${PRETTY_NAME:-Ubuntu} ($(uname -m))"
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

# A hub that binds a privileged port needs root; say so before doing anything else.
if [ "$TLS" -eq 1 ] && [ "$PORT" -lt 1024 ] && [ "$(id -u)" -ne 0 ]; then
  die "port $PORT needs root; pass --port with a port above 1024 (8443 is the default)"
fi

install_hub_main
