#!/usr/bin/env bash
# Local pre-commit secret guard — blocks a commit that would leak a secret or a tracked .env file.
# Belt-and-suspenders to the CI gitleaks job. Opt in once with:
#   git config core.hooksPath .githooks
set -u

staged=$(git diff --cached --name-only --diff-filter=ACM)
[ -z "$staged" ] && exit 0

fail=0

# 1) Never commit a real env file (the template is fine).
while IFS= read -r f; do
  case "$f" in
    .env.example|*/.env.example) ;;
    .env|.env.*|*/.env|*/.env.*)
      echo "BLOCKED: attempting to commit an env file: $f"
      fail=1 ;;
  esac
done <<< "$staged"

# 2) Scan staged content for secret-shaped strings (skip lockfiles/binaries/this script).
patterns='-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|xox[baprs]-[0-9A-Za-z-]{10,}|sk-[A-Za-z0-9]{20,}|gh[pousr]_[0-9A-Za-z]{30,}|AIza[0-9A-Za-z_-]{30,}|(secret|token|password|api[_-]?key)["'"'"']?\s*[:=]\s*["'"'"'][A-Za-z0-9/+_-]{24,}'
while IFS= read -r f; do
  case "$f" in
    package-lock.json|*.lock|*.png|*.jpg|*.jpeg|*.gif|*.webp|*.ico|*.pdf|*.zip|scripts/security/pre-commit-secrets.sh|SECURITY*.md) continue ;;
  esac
  [ -f "$f" ] || continue
  if git show ":$f" 2>/dev/null | grep -nEi "$patterns" >/dev/null 2>&1; then
    echo "BLOCKED: possible secret in $f"
    git show ":$f" | grep -nEi "$patterns" | head -3 | sed 's/^/    /'
    fail=1
  fi
done <<< "$staged"

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Commit blocked by pre-commit secret guard. If this is a false positive, review and re-commit with --no-verify."
  exit 1
fi
exit 0
