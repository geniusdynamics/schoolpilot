#!/usr/bin/env bash
# ABOUTME: The shared installer body the Ubuntu and Raspberry Pi entry points source: preflight,
# ABOUTME: Node, the app payload, the TLS certificate, the service and the readiness check.
# ABOUTME: Each step is a function so an entry point can add platform checks without copying it.

# Every entry point sets these before calling install_hub_main:
#   PLATFORM_LABEL   e.g. "Ubuntu 22.04 (x86_64)"
#   DEFAULT_ROOT     e.g. /opt/schoolpilot
#   TEMPLATE_DIR     the directory holding run-hub.sh and schoolpilot-hub.service
# A caller may also pre-set any option variable to change a default.

DEFAULT_PORT=8443
DEFAULT_HOST=0.0.0.0
DEFAULT_MDNS_PORT=5353
REQUIRED_NODE_MAJOR=22
HEALTH_TIMEOUT_SECONDS=120

log() { printf '%s\n' "$*"; }
step() { printf '\n==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

now_ms() {
  # GNU date on both targets; the fallback keeps a stripped-down image working.
  date +%s%3N 2>/dev/null || echo "$(( $(date +%s) * 1000 ))"
}

# --------------------------------------------------------------------------- arguments

print_usage() {
  cat <<USAGE
SchoolPilot hub installer — ${PLATFORM_LABEL}

Usage: install-hub.sh [options]

  --root DIR          where the hub is installed (default ${DEFAULT_ROOT})
  --data-dir DIR      database, TLS material and backups (default <root>/data)
  --port N            the port the hub listens on (default ${DEFAULT_PORT})
  --host ADDR         the address to bind (default ${DEFAULT_HOST})
  --name LABEL        the name clients resolve as <label>.local (default this machine's)
  --source SOURCE     a checkout directory, a .tar.gz (path or URL) or a git URL
  --node-strategy S   auto | system | local | none (default auto)
  --no-service        do not register a service; start the hub in the background
  --no-tls            serve plain HTTP (a trusted loopback box only)
  --mdns-port N       the mDNS UDP port (default ${DEFAULT_MDNS_PORT})
  --dry-run           print every step and change nothing
  --help              this text

Exit codes: 0 installed, 1 refused before changing anything, 2 a step failed.
USAGE
}

parse_common_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --root) ROOT="${2:?--root needs a value}"; shift 2 ;;
      --data-dir) DATA_DIR="${2:?--data-dir needs a value}"; shift 2 ;;
      --port) PORT="${2:?--port needs a value}"; shift 2 ;;
      --host) HOST="${2:?--host needs a value}"; shift 2 ;;
      --name) NAME="${2:?--name needs a value}"; shift 2 ;;
      --source) SOURCE="${2:?--source needs a value}"; shift 2 ;;
      --node-strategy) NODE_STRATEGY="${2:?--node-strategy needs a value}"; shift 2 ;;
      --mdns-port) MDNS_PORT="${2:?--mdns-port needs a value}"; shift 2 ;;
      --no-service) INSTALL_SERVICE=0; shift ;;
      --no-tls) TLS=0; shift ;;
      --dry-run) DRY_RUN=1; shift ;;
      --help) print_usage; exit 0 ;;
      *) die "unknown option $1 (--help lists them)" ;;
    esac
  done

  case "$PORT" in
    ''|*[!0-9]*) die "--port needs a number, received '$PORT'" ;;
  esac
  [ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ] || die "--port must be between 1 and 65535"
  case "$MDNS_PORT" in
    ''|*[!0-9]*) die "--mdns-port needs a number, received '$MDNS_PORT'" ;;
  esac
  case "$NODE_STRATEGY" in
    auto|system|local|none) ;;
    *) die "--node-strategy must be auto, system, local or none" ;;
  esac

  [ -n "$DATA_DIR" ] || DATA_DIR="$ROOT/data"
  DATA_DIR="${DATA_DIR/#\~/$HOME}"
  ROOT="${ROOT/#\~/$HOME}"
}

# --------------------------------------------------------------------------- preflight

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required but is not installed"
}

is_root() { [ "$(id -u)" -eq 0 ]; }

# True when something is already listening on a TCP port.
port_in_use() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :$1" 2>/dev/null | grep -q LISTEN && return 0
    return 1
  fi
  if command -v netstat >/dev/null 2>&1; then
    netstat -ltn 2>/dev/null | awk '{print $4}' | grep -q ":$1\$" && return 0
    return 1
  fi
  return 1
}

check_preflight() {
  step "Preflight on ${PLATFORM_LABEL}"
  require_command tar
  require_command curl

  if [ "$DRY_RUN" -eq 1 ]; then
    log "dry run: nothing will be changed"
    return 0
  fi

  if [ -e "$ROOT" ] && [ ! -d "$ROOT" ]; then
    die "$ROOT exists and is not a directory"
  fi
  if [ -d "$ROOT" ] && [ -f "$ROOT/hub.env" ]; then
    log "an existing installation was found at $ROOT; it will be upgraded in place"
  fi

  local available_kb
  available_kb=$(df -Pk "$(dirname "$ROOT")" 2>/dev/null | awk 'NR==2 {print $4}')
  if [ -n "$available_kb" ] && [ "$available_kb" -lt 512000 ]; then
    warn "$(dirname "$ROOT") has less than 500 MB free; the payload and its dependencies need more"
  fi

  if port_in_use "$PORT"; then
    die "port $PORT is already in use; stop what holds it or pass --port"
  fi
}

# --------------------------------------------------------------------------- node

node_major() {
  if [ -n "$1" ] && [ -x "$1" ]; then
    "$1" -v 2>/dev/null | sed 's/^v//' | cut -d. -f1
  else
    echo 0
  fi
}

# Resolves NODE and NPM: the machine's Node when it is new enough, else one installed here.
ensure_node() {
  step "Node"
  local existing

  if [ "$NODE_STRATEGY" != "local" ]; then
    existing=$(command -v node || true)
    if [ "$(node_major "$existing")" -ge "$REQUIRED_NODE_MAJOR" ]; then
      NODE="$existing"
      NPM="$(command -v npm || true)"
      [ -n "$NPM" ] || die "npm is missing next to $existing"
      log "using $("$NODE" -v) at $NODE"
      export PATH="$(dirname "$NODE"):$PATH"
      return 0
    fi
    if [ -n "$existing" ]; then
      log "Node $("$existing" -v) is older than v${REQUIRED_NODE_MAJOR}; a newer one is needed"
    else
      log "Node is not installed"
    fi
  fi

  if [ "$NODE_STRATEGY" = "none" ]; then
    die "Node v${REQUIRED_NODE_MAJOR}+ is required; install it and run this installer again"
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    log "dry run: would provide Node v${REQUIRED_NODE_MAJOR} for this install"
    NODE="$ROOT/node/bin/node"
    NPM="$ROOT/node/bin/npm"
    return 0
  fi

  if [ "$NODE_STRATEGY" = "system" ]; then
    install_node_system || die "installing Node system-wide failed; retry with --node-strategy local"
  elif [ "$NODE_STRATEGY" = "auto" ] && (is_root || sudo -n true 2>/dev/null); then
    if ! install_node_system; then
      warn "installing Node system-wide failed; putting a Node inside $ROOT instead"
      install_node_local
    fi
  else
    install_node_local
  fi

  [ -x "$NODE" ] || die "Node was not installed where expected ($NODE)"
  # Every child process from here on — npm, and the compiler npm's install scripts spawn — must be
  # this Node. With another Node first on PATH, better-sqlite3 is built for the wrong ABI and the hub
  # refuses to start with "was compiled against a different Node.js version".
  export PATH="$(dirname "$NODE"):$PATH"
  log "using $("$NODE" -v) at $NODE"
}

# NodeSource, because the distribution's own Node is older than the hub needs.
install_node_system() {
  command -v apt-get >/dev/null 2>&1 || return 1
  local sudo_cmd=""
  is_root || sudo_cmd="sudo"
  log "installing Node v${REQUIRED_NODE_MAJOR} from NodeSource (this needs the network)"
  $sudo_cmd apt-get install -y ca-certificates curl gnupg >/dev/null 2>&1 || return 1
  curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh || return 1
  $sudo_cmd bash /tmp/nodesource_setup.sh >/dev/null 2>&1 || return 1
  $sudo_cmd apt-get install -y nodejs >/dev/null 2>&1 || return 1
  rm -f /tmp/nodesource_setup.sh
  NODE="$(command -v node)"
  NPM="$(command -v npm)"
  return 0
}

# The official Node build for this architecture, unpacked inside the install root.
# This is the path that works on a Raspberry Pi and where the operator has no sudo.
install_node_local() {
  local arch slug tarball base checksums expected actual
  arch=$(uname -m)
  case "$arch" in
    x86_64) slug="linux-x64" ;;
    aarch64|arm64) slug="linux-arm64" ;;
    armv7l|armv6l) slug="linux-armv7l" ;;
    *) die "no Node build is published for $arch; install Node v${REQUIRED_NODE_MAJOR}+ yourself" ;;
  esac

  base="https://nodejs.org/dist/latest-v22.x"
  checksums=$(curl -fsSL "$base/SHASUMS256.txt") || die "could not reach nodejs.org for a Node build"
  tarball=$(printf '%s\n' "$checksums" | awk -v slug="$slug" '$2 ~ "node-.*-"slug"\\.tar\\.xz$" {print $2; exit}')
  [ -n "$tarball" ] || die "no Node build was published for $slug"

  log "downloading $tarball (about 30 MB)"
  curl -fsSL "$base/$tarball" -o "/tmp/$tarball" || die "downloading Node failed"

  expected=$(printf '%s\n' "$checksums" | awk -v name="$tarball" '$2 == name {print $1}')
  actual=$(sha256sum "/tmp/$tarball" | awk '{print $1}')
  if [ -n "$expected" ] && [ "$expected" != "$actual" ]; then
    rm -f "/tmp/$tarball"
    die "the Node download did not match its published checksum; nothing was installed"
  fi

  mkdir -p "$ROOT/node"
  tar -xJf "/tmp/$tarball" -C "$ROOT/node" --strip-components=1
  rm -f "/tmp/$tarball"
  NODE="$ROOT/node/bin/node"
  NPM="$ROOT/node/bin/npm"
}

# --------------------------------------------------------------------------- payload

# The app payload: the hub's sources plus the runtime manifest, and nothing of the browser's tree.
resolve_source() {
  if [ -z "$SOURCE" ]; then
    local beside="${SCRIPT_DIR}/../.."
    if [ -f "${beside}/src/server/cli.ts" ]; then
      SOURCE="$beside"
      log "installing from the checkout this script sits in: $(cd "$SOURCE" && pwd)"
    else
      die "no source given and no checkout found; pass --source <dir|tar.gz|url>"
    fi
  fi

  case "$SOURCE" in
    *.tar.gz|*.tgz)
      if [ -f "$SOURCE" ]; then
        SOURCE_KIND=archive
        SOURCE_ARCHIVE="$SOURCE"
      else
        SOURCE_KIND=download
        SOURCE_URL="$SOURCE"
      fi
      ;;
    http://*|https://*)
      SOURCE_KIND=download
      SOURCE_URL="$SOURCE"
      ;;
    git@*|*.git)
      SOURCE_KIND=git
      SOURCE_URL="$SOURCE"
      ;;
    *)
      SOURCE_KIND=directory
      [ -f "${SOURCE}/src/server/cli.ts" ] || die "$SOURCE is not a SchoolPilot checkout (no src/server/cli.ts)"
      ;;
  esac
}

# A checkout is copied by the four paths a hub needs, so a working tree with uncommitted work
# installs as it stands and nothing else — node_modules, build output, data — can leak in. tar does
# the copy in one pass: the same copy with `cp -R` measured more than twice as long on a checkout
# behind a network or Windows filesystem, where per-file metadata calls dominate.
stage_from_directory() {
  local from="$1" to="$2" tar_file
  mkdir -p "$to"
  tar_file="$(cd "$to" && pwd)/payload.tar"
  (cd "$from" && tar -cf "$tar_file" src server tsconfig.json packaging)
  tar -xf "$tar_file" -C "$to"
  rm -f "$tar_file"
}

stage_payload() {
  step "Payload"
  local staging="$ROOT/.staging"
  rm -rf "$staging"
  mkdir -p "$staging"

  case "$SOURCE_KIND" in
    directory) stage_from_directory "$SOURCE" "$staging" ;;
    archive) tar -xzf "$SOURCE_ARCHIVE" -C "$staging" ;;
    download)
      log "downloading $SOURCE_URL"
      curl -fsSL "$SOURCE_URL" -o "$staging/payload.tar.gz" || die "downloading the payload failed"
      tar -xzf "$staging/payload.tar.gz" -C "$staging"
      rm -f "$staging/payload.tar.gz"
      ;;
    git)
      require_command git
      log "cloning $SOURCE_URL"
      git clone --depth 1 "$SOURCE_URL" "$staging/checkout" >/dev/null 2>&1 || die "cloning the payload failed"
      mv "$staging/checkout"/* "$staging/" 2>/dev/null || true
      rmdir "$staging/checkout" 2>/dev/null || true
      ;;
  esac

  # An archive of a checkout keeps everything under a single top directory.
  if [ ! -f "$staging/src/server/cli.ts" ]; then
    local nested top
    nested=$(find "$staging" -maxdepth 3 -name cli.ts -path '*/src/server/*' | head -n 1)
    if [ -n "$nested" ]; then
      top="${nested%/src/server/cli.ts}"
      mv "$top"/* "$staging/" 2>/dev/null || true
      rm -rf "$top"
    fi
  fi
  [ -f "$staging/src/server/cli.ts" ] || die "the payload has no src/server/cli.ts; it is not a SchoolPilot hub"
  [ -f "$staging/packaging/hub/package.json" ] ||
    die "the payload has no packaging/hub/package.json; it is not a SchoolPilot hub"

  mkdir -p "$ROOT/app"
  rm -rf "$ROOT/app/src" "$ROOT/app/server"
  cp -R "$staging/src" "$ROOT/app/src"
  cp -R "$staging/server" "$ROOT/app/server"
  cp "$staging/tsconfig.json" "$ROOT/app/tsconfig.json"

  # The runtime manifest replaces the frontend's: a hub does not install the browser's tree.
  cp "$staging/packaging/hub/package.json" "$ROOT/app/package.json"
  [ -f "$staging/packaging/hub/package-lock.json" ] &&
    cp "$staging/packaging/hub/package-lock.json" "$ROOT/app/package-lock.json"

  # The launcher and the unit, so the install is self-describing after the payload is gone.
  cp "$TEMPLATE_DIR/run-hub.sh" "$ROOT/run-hub.sh"
  cp "$TEMPLATE_DIR/schoolpilot-hub.service" "$ROOT/schoolpilot-hub.service"
  chmod +x "$ROOT/run-hub.sh"

  rm -rf "$staging"
  log "payload staged at $ROOT/app"
}

install_dependencies() {
  step "Dependencies"
  (
    cd "$ROOT/app"
    export npm_config_audit=false npm_config_fund=false npm_config_update_notifier=false
    if [ -f package-lock.json ]; then
      "$NODE" "$NPM" ci --omit=dev --no-audit --no-fund --loglevel=error
    else
      "$NODE" "$NPM" install --omit=dev --no-audit --no-fund --loglevel=error
    fi
  ) || die "installing the hub's dependencies failed; check the network and run again"
  log "installed $(ls "$ROOT/app/node_modules" | wc -l) packages"
  verify_native_module
}

# The hub cannot open its database without better-sqlite3 built for the Node that will run it.
# A machine whose PATH holds a different Node produces a binary for that one instead, so this is
# checked here and rebuilt once rather than discovered as a refusal to start.
verify_native_module() {
  step "Native module"
  local probe="const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.exec('create table t(a)'); db.close();"

  if (cd "$ROOT/app" && "$NODE" -e "$probe" >/dev/null 2>&1); then
    log "better-sqlite3 loads under $("$NODE" -v)"
    return 0
  fi

  warn "better-sqlite3 does not load under $("$NODE" -v); rebuilding it"
  (cd "$ROOT/app" && "$NODE" "$NPM" rebuild better-sqlite3 --no-audit --no-fund >/dev/null 2>&1) || true

  if (cd "$ROOT/app" && "$NODE" -e "$probe" >/dev/null 2>&1); then
    log "better-sqlite3 loads after a rebuild"
    return 0
  fi

  (cd "$ROOT/app" && "$NODE" -e "$probe" 2>&1 | tail -n 5) >&2
  die "better-sqlite3 was built for a different Node; install build tools (build-essential, python3) and run this installer again"
}

# --------------------------------------------------------------------------- certificate

issue_certificate() {
  CERT_FILE=""
  FINGERPRINT=""
  [ "$TLS" -eq 1 ] || return 0

  step "TLS certificate"
  local printed
  printed=$("$NODE" "$ROOT/app/node_modules/tsx/dist/cli.mjs" "$ROOT/app/src/server/cli.ts" \
    --data-dir "$DATA_DIR" --name "$NAME" --print-fingerprint) ||
    die "issuing the hub's certificate failed"

  CERT_FILE=$(printf '%s' "$printed" | sed -n 's/.*"certFile": *"\([^"]*\)".*/\1/p')
  FINGERPRINT=$(printf '%s' "$printed" | sed -n 's/.*"sha256": *"\([^"]*\)".*/\1/p')
  [ -n "$CERT_FILE" ] && [ -n "$FINGERPRINT" ] || die "the hub did not report its certificate"
  log "certificate: $CERT_FILE"
  log "fingerprint: $FINGERPRINT"
}

# --------------------------------------------------------------------------- configuration and service

write_environment() {
  step "Configuration"
  mkdir -p "$ROOT/logs" "$DATA_DIR"
  cat >"$ROOT/hub.env" <<ENV
# The hub's configuration, read by run-hub.sh and by the systemd unit.
SCHOOLPILOT_ROOT=$ROOT
SCHOOLPILOT_APP=$ROOT/app
SCHOOLPILOT_DATA_DIR=$DATA_DIR
SCHOOLPILOT_PORT=$PORT
SCHOOLPILOT_HOST=$HOST
SCHOOLPILOT_NAME=$NAME
SCHOOLPILOT_MDNS_PORT=$MDNS_PORT
SCHOOLPILOT_TLS_ARGS=$([ "$TLS" -eq 1 ] && echo "--tls" || echo "--no-tls")
SCHOOLPILOT_NODE=$NODE
ENV
  chmod 0644 "$ROOT/hub.env"
  log "wrote $ROOT/hub.env"
}

install_service() {
  if [ "$INSTALL_SERVICE" -eq 0 ]; then
    step "Service"
    log "skipped (--no-service); the hub will be started in the background"
    return 0
  fi

  step "Service"
  if ! command -v systemctl >/dev/null 2>&1 || [ ! -d /run/systemd/system ]; then
    warn "systemd is not running here; starting the hub in the background instead"
    INSTALL_SERVICE=0
    return 0
  fi

  local sudo_cmd=""
  is_root || sudo_cmd="sudo"
  if is_root || sudo -n true 2>/dev/null; then
    sed "s|@ROOT@|$ROOT|g" "$ROOT/schoolpilot-hub.service" >/tmp/schoolpilot-hub.service
    $sudo_cmd cp /tmp/schoolpilot-hub.service /etc/systemd/system/schoolpilot-hub.service
    rm -f /tmp/schoolpilot-hub.service
    $sudo_cmd systemctl daemon-reload
    $sudo_cmd systemctl enable --now schoolpilot-hub
    log "registered schoolpilot-hub.service and started it"
    return 0
  fi

  warn "no sudo, so no system service; trying a systemd user service"
  mkdir -p "$HOME/.config/systemd/user"
  sed "s|@ROOT@|$ROOT|g" "$ROOT/schoolpilot-hub.service" >"$HOME/.config/systemd/user/schoolpilot-hub.service"
  if systemctl --user daemon-reload >/dev/null 2>&1 && systemctl --user enable --now schoolpilot-hub >/dev/null 2>&1; then
    log "registered a systemd user service and started it"
    return 0
  fi

  warn "systemd user services are unavailable; starting the hub in the background instead"
  INSTALL_SERVICE=0
}

open_firewall() {
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    local sudo_cmd=""
    is_root || sudo_cmd="sudo"
    $sudo_cmd ufw allow "$PORT/tcp" >/dev/null 2>&1 && log "ufw: allowed $PORT/tcp"
    $sudo_cmd ufw allow "$MDNS_PORT/udp" >/dev/null 2>&1 && log "ufw: allowed $MDNS_PORT/udp for discovery"
  fi
}

# Clients on this machine resolve <name>.local only when nss-mdns is present; elsewhere the
# operating system already has an mDNS resolver.
install_mdns_resolver() {
  if [ -f /etc/nsswitch.conf ] && ! grep -q "mdns" /etc/nsswitch.conf; then
    if command -v apt-get >/dev/null 2>&1 && (is_root || sudo -n true 2>/dev/null); then
      local sudo_cmd=""
      is_root || sudo_cmd="sudo"
      $sudo_cmd apt-get install -y libnss-mdns >/dev/null 2>&1 &&
        log "installed libnss-mdns so this machine resolves .local names" ||
        warn "could not install libnss-mdns; clients still resolve the hub by address"
    fi
  fi
}

start_hub() {
  step "Start"
  if [ "$INSTALL_SERVICE" -eq 1 ]; then
    log "started by systemd"
    return 0
  fi
  mkdir -p "$ROOT/logs"
  nohup "$ROOT/run-hub.sh" >"$ROOT/logs/hub.log" 2>&1 &
  echo $! >"$ROOT/hub.pid"
  log "started in the background (pid $(cat "$ROOT/hub.pid"), log $ROOT/logs/hub.log)"
}

# Waits until the hub answers, which is the moment an operator can log in.
wait_for_hub() {
  step "Waiting for the hub"
  local url attempt=0
  if [ "$TLS" -eq 1 ]; then
    url="https://127.0.0.1:$PORT/health"
  else
    url="http://127.0.0.1:$PORT/health"
  fi

  while [ "$attempt" -lt "$HEALTH_TIMEOUT_SECONDS" ]; do
    if curl -fsS --max-time 3 --cacert "$CERT_FILE" "$url" >/dev/null 2>&1; then
      READY_MS=$(now_ms)
      log "the hub answered on $url"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  [ -f "$ROOT/logs/hub.log" ] && tail -n 20 "$ROOT/logs/hub.log" >&2
  die "the hub did not answer within ${HEALTH_TIMEOUT_SECONDS}s"
}

# --------------------------------------------------------------------------- summary

write_summary() {
  local finished scheme service
  finished=$(now_ms)
  scheme=http
  [ "$TLS" -eq 1 ] && scheme=https
  service="null"
  [ "$INSTALL_SERVICE" -eq 1 ] && service='"schoolpilot-hub.service"'

  cat >"$ROOT/install-summary.json" <<SUMMARY
{
  "platform": "$PLATFORM_LABEL",
  "root": "$ROOT",
  "dataDir": "$DATA_DIR",
  "port": $PORT,
  "protocol": "$scheme",
  "url": "$scheme://$NAME.local:$PORT",
  "addressUrl": "$scheme://127.0.0.1:$PORT",
  "certificateFile": "$CERT_FILE",
  "fingerprint": "$FINGERPRINT",
  "node": "$("$NODE" -v)",
  "nodePath": "$NODE",
  "service": $service,
  "mdnsPort": $MDNS_PORT,
  "durationsMs": {
    "preflight": $((PREFLIGHT_MS - T0_MS)),
    "node": $((NODE_MS - PREFLIGHT_MS)),
    "payload": $((PAYLOAD_MS - NODE_MS)),
    "dependencies": $((DEPS_MS - PAYLOAD_MS)),
    "certificate": $((CERT_MS - DEPS_MS)),
    "ready": $((READY_MS - CERT_MS)),
    "total": $((finished - T0_MS))
  }
}
SUMMARY
  log "wrote $ROOT/install-summary.json"
}

print_result() {
  local scheme=http service
  [ "$TLS" -eq 1 ] && scheme=https
  service="background process $ROOT/hub.pid"
  [ "$INSTALL_SERVICE" -eq 1 ] && service="schoolpilot-hub.service"

  cat <<RESULT

SchoolPilot hub is running.

  Open        $scheme://$NAME.local:$PORT
  On this box $scheme://127.0.0.1:$PORT
  Data        $DATA_DIR
  TLS         $([ "$TLS" -eq 1 ] && echo "on, fingerprint $FINGERPRINT" || echo "off (--no-tls)")
  Service     $service
  Log         $ROOT/logs/hub.log
  Stop        $([ "$INSTALL_SERVICE" -eq 1 ] && echo "sudo systemctl stop schoolpilot-hub" || echo "$ROOT/run-hub.sh --stop")
  Discovery   every machine on this LAN finds the hub as $NAME.local
  Clients     $([ "$TLS" -eq 1 ] && echo "trust $CERT_FILE or pin the fingerprint above" || echo "nothing to trust over plain HTTP")
RESULT
}

# --------------------------------------------------------------------------- the install

install_hub_main() {
  T0_MS=$(now_ms)
  PREFLIGHT_MS=$T0_MS
  NODE_MS=$T0_MS
  PAYLOAD_MS=$T0_MS
  DEPS_MS=$T0_MS
  CERT_MS=$T0_MS
  READY_MS=$T0_MS

  check_preflight
  PREFLIGHT_MS=$(now_ms)

  if [ "$DRY_RUN" -eq 1 ]; then
    log "dry run: would install to $ROOT from ${SOURCE:-<the checkout beside this script>}"
    log "dry run: would listen on $HOST:$PORT as $NAME.local and register a service"
    exit 0
  fi

  resolve_source
  ensure_node
  NODE_MS=$(now_ms)
  stage_payload
  PAYLOAD_MS=$(now_ms)
  install_dependencies
  DEPS_MS=$(now_ms)
  issue_certificate
  CERT_MS=$(now_ms)
  write_environment
  install_mdns_resolver
  open_firewall
  install_service
  start_hub
  wait_for_hub
  write_summary
  print_result
}
