#!/usr/bin/env bash
# PostToolUse hook: typecheck after Claude edits a TypeScript file.
#
# Reads the Claude Code hook payload on stdin, pulls out the edited file path,
# and runs `tsc --noEmit` when that file is TypeScript. On failure it exits 2,
# which feeds the diagnostics back to Claude so it can fix them immediately.
#
# There is no formatter in this repo by design; tsc is the only automated check.
# Catches the easy-to-miss NodeNext requirement that relative imports end in .js.

set -uo pipefail
cd "$(dirname "$0")/../.." || exit 0

file=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.file_path)||(j.tool_response&&j.tool_response.filePath)||"")}catch(e){}})' 2>/dev/null)

case "$file" in
  *.ts | *.tsx) ;;
  *) exit 0 ;;
esac

# tsconfig.json excludes test/, so this only covers src/. That is intentional:
# test files are typechecked when `npm test` runs them through tsx.
if ! out=$(npx --no-install tsc --noEmit 2>&1); then
  printf 'TypeScript errors (tsc --noEmit):\n%s\n' "$out" >&2
  exit 2
fi

exit 0
