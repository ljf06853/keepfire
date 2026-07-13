---
name: release
description: Cut a keepfire release — bump the version in both places it lives, build, test, commit, and tag. Use when the user asks to release, cut a version, or bump the version.
disable-model-invocation: true
---

Release keepfire at version `$ARGUMENTS` (e.g. `0.1.2`). If no version was given, ask for one; do not guess.

The version lives in **four** places and nothing syncs them. All must change, or `keepfire --version` and the plugin manifest will lie about what shipped.

1. `package.json` → `"version"`
2. `src/cli.ts` → `const VERSION = "...";` (near the top of the file)
3. `.claude-plugin/plugin.json` → `"version"`
4. `.claude-plugin/marketplace.json` → `plugins[0].version`

Steps:

1. Confirm the working tree is clean (`git status`). If not, stop and report — do not release on top of uncommitted work.
2. Grep for the current version to be sure you catch every occurrence: search the repo for the old version string and check whether it also appears in `README.md`, `docs/README.zh-CN.md`, or `agents/openai.yaml`. Update any that are genuinely version claims (not changelog history or example output).
3. Edit `package.json` and `src/cli.ts` to the new version.
4. Run `npm run build && npm test`. Both must pass. If either fails, stop and report — do not tag a broken build.
5. Smoke-check that the binary reports the new version: `npm run dev -- version`.
6. Commit as `chore: release v<version>` and tag `v<version>`.
7. Do **not** push or `npm publish` unless the user explicitly asks. Report what you did and what's left (push, tag push, publish).

Note: the npm package name is reserved but not yet published, so `npm publish` is not part of the routine flow.
