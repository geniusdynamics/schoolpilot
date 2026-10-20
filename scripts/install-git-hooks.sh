#!/usr/bin/env bash
# ABOUTME: Install git hooks for translation validation
# ABOUTME: Copies hook templates from .githooks/ to .git/hooks/

set -e
GIT_ROOT=$(git rev-parse --show-toplevel)
HOOKS_DIR="$GIT_ROOT/.githooks"
GIT_HOOKS_DIR="$GIT_ROOT/.git/hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "ERROR: $HOOKS_DIR does not exist"
  exit 1
fi

INSTALLED=0
for hook in pre-commit pre-rebase pre-merge-commit; do
  if [ -f "$HOOKS_DIR/$hook" ]; then
    cp "$HOOKS_DIR/$hook" "$GIT_HOOKS_DIR/$hook"
    chmod +x "$GIT_HOOKS_DIR/$hook"
    echo "Installed: $hook"
    INSTALLED=$((INSTALLED + 1))
  fi
done

echo ""
echo "Done. $INSTALLED hook(s) installed to $GIT_HOOKS_DIR"
echo "Run 'npm run check-translations' to validate i18n files."
