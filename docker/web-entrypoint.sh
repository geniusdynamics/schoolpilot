#!/bin/sh
# ABOUTME: Writes the deployment's runtime settings to /config.js before nginx starts, from the
# ABOUTME: environment the container was given. Runs as the unprivileged nginx user: /tmp is writable.

set -eu

TARGET_DIR=/tmp/schoolpilot
TARGET="$TARGET_DIR/config.js"
mkdir -p "$TARGET_DIR"

# Only the settings that differ between installs. A value that never differs belongs in the build.
mode="${SCHOOLPILOT_DEPLOYMENT_MODE:-both}"
allow_memory="${SCHOOLPILOT_ALLOW_TEMPORARY_DB:-false}"
dsn="${SCHOOLPILOT_BUGSINK_DSN:-}"
version="${SCHOOLPILOT_APP_VERSION:-}"

case "$mode" in
  demo|production|both) ;;
  *)
    echo "[config] SCHOOLPILOT_DEPLOYMENT_MODE='$mode' is not demo, production or both; using both" >&2
    mode=both
    ;;
esac

case "$allow_memory" in
  true|false) ;;
  *)
    echo "[config] SCHOOLPILOT_ALLOW_TEMPORARY_DB='$allow_memory' is not true or false; using false" >&2
    allow_memory=false
    ;;
esac

# JSON-escape by hand: the values are few, and node is not in the nginx image. A backslash, a quote and
# a control character are the whole of what can break the object.
escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr -d '\000-\037'
}

{
  echo "// Generated at container start from the environment; do not edit inside the image."
  echo "window.__SCHOOLPILOT_CONFIG__ = {"
  echo "  deploymentMode: \"$(escape "$mode")\","
  echo "  allowTemporaryDatabase: $allow_memory,"
  if [ -n "$dsn" ]; then
    echo "  bugsinkDsn: \"$(escape "$dsn")\","
  fi
  if [ -n "$version" ]; then
    echo "  appVersion: \"$(escape "$version")\""
  fi
  echo "};"
} > "$TARGET"

echo "[config] /config.js written (mode=$mode, temporary database=$allow_memory, error reporting=$([ -n "$dsn" ] && echo on || echo off))"
