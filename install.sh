#!/usr/bin/env bash
set -euo pipefail

# Keepfire installer
# - clones or uses current repo
# - npm install + build
# - initializes ~/.keepfire
# - symlinks skill into common agent skill directories

REPO_URL="${KEEPFIRE_REPO_URL:-https://github.com/ljf06853/keepfire.git}"
INSTALL_DIR="${KEEPFIRE_INSTALL_DIR:-$HOME/.keepfire-src}"
LINK_TARGETS="${KEEPFIRE_LINK:-claude,codex,gemini,agents,cursor}"

echo "🔥 Keepfire installer"
echo "   repo: $REPO_URL"
echo "   dir:  $INSTALL_DIR"

if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "→ updating existing install"
  git -C "$INSTALL_DIR" pull --ff-only || true
else
  rm -rf "$INSTALL_DIR"
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js 18+ is required."
  exit 1
fi

npm install
npm run build
npm link >/dev/null 2>&1 || npm install -g .

npx --yes keepfire init --link "$LINK_TARGETS"

echo ""
echo "✅ Keepfire ready"
echo "   CLI:     keepfire help"
echo "   Library: \$HOME/.keepfire"
echo "   Skill:   linked for: $LINK_TARGETS"
echo ""
echo "Try:"
echo "  keepfire keep --title \"PR security review\" --intent security --prompt \"Review this diff for vulns...\" --yes"
echo "  keepfire use \"review this PR for security\""
