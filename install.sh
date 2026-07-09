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

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required."
  exit 1
fi

npm install
npm run build

# Prefer local binary; npm link may need privileges
if npm link >/dev/null 2>&1; then
  echo "→ linked global command: keepfire"
else
  echo "→ npm link skipped (permissions). Use: node $INSTALL_DIR/dist/cli.js"
fi

CLI="node $INSTALL_DIR/dist/cli.js"
if command -v keepfire >/dev/null 2>&1; then
  CLI="keepfire"
fi

$CLI init --link "$LINK_TARGETS"

echo ""
echo "✅ Keepfire ready"
echo "   CLI:     $CLI help"
echo "   Library: \$HOME/.keepfire"
echo "   Skill:   linked for: $LINK_TARGETS"
echo "   Docs:    $INSTALL_DIR/README.md"
echo "   中文文档: $INSTALL_DIR/docs/README.zh-CN.md"
echo ""
echo "Try:"
echo "  $CLI import $INSTALL_DIR/examples/sample-recipes.json"
echo "  $CLI use --apply \"review this PR for security\""
