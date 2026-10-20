# ABOUTME: Install git hooks for translation validation (Windows)
# ABOUTME: Copies hook templates from .githooks/ to .git/hooks/

$ErrorActionPreference = "Stop"
$GIT_ROOT = git rev-parse --show-toplevel
$HOOKS_DIR = Join-Path $GIT_ROOT ".githooks"
$GIT_HOOKS_DIR = Join-Path $GIT_ROOT ".git/hooks"

if (-not (Test-Path -LiteralPath $HOOKS_DIR)) {
  Write-Error "ERROR: $HOOKS_DIR does not exist"
  exit 1
}

$INSTALLED = 0
foreach ($hook in @("pre-commit", "pre-rebase", "pre-merge-commit")) {
  $src = Join-Path $HOOKS_DIR $hook
  $dst = Join-Path $GIT_HOOKS_DIR $hook
  if (Test-Path -LiteralPath $src) {
    Copy-Item -LiteralPath $src -Destination $dst -Force
    Write-Output "Installed: $hook"
    $INSTALLED++
  }
}

Write-Output ""
Write-Output "Done. $INSTALLED hook(s) installed to $GIT_HOOKS_DIR"
Write-Output "Run 'npm run check-translations' to validate i18n files."
