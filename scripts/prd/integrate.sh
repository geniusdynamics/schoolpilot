#!/bin/bash
# ABOUTME: Squash-integrates reviewed PRD task branches onto the checked-out wave branch, one gated commit per task.
# ABOUTME: Usage: scripts/prd/integrate.sh <TASK-ID>=<branch> [...]  (run from the repo root, on e.g. prd/P0-W1, clean tree)

set -u
DATE=${PRD_DATE:-$(date +%F)}
TRAILERS=${PRD_TRAILERS:-"Co-Authored-By: Claude <noreply@anthropic.com>"}
BASE=$(git rev-parse --abbrev-ref HEAD)

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Working tree has tracked changes; commit or discard them first." >&2
  exit 1
fi

for pair in "$@"; do
  id=${pair%%=*}
  br=${pair#*=}
  if git log --format=%s | grep -q "\[$id\]"; then echo "$id already integrated"; continue; fi

  # Apply only the task's own commits (those on the task branch but not on this branch)
  from=$(git merge-base HEAD "$br")
  if ! git cherry-pick -n "$from..$br" >/dev/null 2>&1; then
    git cherry-pick --abort 2>/dev/null; git reset -q --hard HEAD
    echo "$id CONFLICT (rebase $br onto $BASE first: git rebase --onto $BASE <old-base> $br)"
    continue
  fi

  log=".prd-gate/integrate-$id.txt"; mkdir -p .prd-gate
  if node scripts/prd/gate.mjs task --task "$id" --base HEAD > "$log" 2>&1; then
    node scripts/prd/status.mjs --set "$id" done --date "$DATE" >/dev/null
    title=$(node -e 'const t=require("./docs/prd/tasks.json").tasks.find(x=>x.id===process.argv[1]);console.log(t.title)' "$id")
    meta=$(node -e 'const t=require("./docs/prd/tasks.json").tasks.find(x=>x.id===process.argv[1]);console.log("Findings: "+((t.findings||[]).join(", ")||"none")+"\nRequirements: "+((t.reqs||[]).join(", ")||"none"))' "$id")
    gate=$(grep -E "^(PASS|FAIL|SKIP|WARN)" "$log" | awk '{print $1" "$2}' | paste -sd, -)
    git add -A
    git commit -q -m "fix(p0): $title [$id]" -m "Squash of reviewed branch $br." -m "$meta
Gate: task PASS — $gate" -m "$TRAILERS"
    sha=$(git rev-parse --short HEAD)
    node scripts/prd/status.mjs --set "$id" done --commit "$sha" --date "$DATE" >/dev/null
    echo "$id INTEGRATED $sha (ledger commit sha recorded in working tree; included in the next commit)"
  else
    git reset -q --hard HEAD
    echo "$id GATE FAILED: $(grep -E '^FAIL' "$log" | cut -c1-200 | paste -sd'|' -)  (full output: $log)"
  fi
done
