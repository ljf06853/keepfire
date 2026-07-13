# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build                  # tsc -> dist/
npm test                       # tsx --test test/*.test.ts
npm run dev -- <args>          # run the CLI from source, e.g. npm run dev -- search "pr review"
```

Run a single test by name:

```bash
npx tsx --test --test-name-pattern "listCards rebuilds" test/store-search.test.ts
```

`dist/` is gitignored but is the `bin` target (`keepfire` -> `./dist/cli.js`). Run `npm run build` before `npm link` or before anything invokes the `keepfire` binary.

## Style

- **Relative imports must carry a `.js` extension**, even in `.ts` sources: `import { saveDraft } from "./store.js";`. This is a NodeNext ESM requirement — omitting it breaks the build.
- No ESLint, Prettier, or any formatter — this is deliberate. Do not add one. Match the existing style by hand: 2-space indent, double quotes, semicolons, trailing commas in multiline literals.
- Explicit return types on every function, including private ones. No classes; plain functions plus exported interfaces/type aliases.
- `console.log` is the intended output channel — this is a CLI. (Global TypeScript rules ban `console.log` in production code; that rule does not apply here.) Likewise, the global rules' Zod and Playwright guidance does not apply: this repo currently has zero runtime dependencies and no browser surface.
- Throw plain `Error`; `main()` in `src/cli.ts` catches centrally, prints `Error: <msg>`, and sets `process.exitCode = 1`.

## Testing

New store/search behavior ships with a test. Tests use Node's built-in runner (`node:test` + `node:assert/strict`) via `tsx`, and sandbox the library by setting `process.env.KEEPFIRE_HOME` to a `fs.mkdtempSync` dir.

`tsconfig.json` excludes `test/`, so `npm run build` never typechecks test files — type errors there only surface when `npm test` runs.

## Gotchas

- **The version lives in four places.** `package.json`, `VERSION` in `src/cli.ts`, `.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json` must be bumped together; nothing syncs them. Use `/release`.
- **Card Markdown headings are a parser contract.** `renderCardMarkdown` and `parseCardMarkdown` (`src/store.ts`) and `templates/card.md` must move in lockstep, and card frontmatter must stay flat and inline — it is parsed by a hand-rolled `parseSimpleYaml`, not a YAML library. `rebuildIndex` swallows parse failures with a bare `catch {}`, so a mismatch silently corrupts every card instead of erroring. See the `card-schema` skill before changing any of this.
- **CJK support in `src/search.ts` is a feature, not accidental complexity.** `tokenize()` expands CJK runs into unigrams/bigrams/trigrams and `INTENT_ALIASES` maps Chinese keywords to intents. Do not "simplify" the tokenizer — it breaks bilingual recall, which is under test.
- **Search scoring silently drives auto-apply.** `normalizeConfidence` in `src/cli.ts` is `score / 12`, compared against `auto_apply_threshold` (default `0.88`). Changing scoring weights in `src/search.ts` shifts auto-apply behavior.
- **`SKILL.md` at the repo root is a load-bearing product surface**, not documentation. `keepfire init --link` symlinks (or, when symlinks are blocked — typical on Windows — *copies*) the whole package root into `~/.claude/skills/keepfire`, `~/.codex/skills/`, etc. Adding root-level files changes what agents receive.

## Env vars

- `KEEPFIRE_HOME` — overrides the library root (default `~/.keepfire`). Most `store`/`search` functions also take an explicit `root` param that wins over it.
- `KEEPFIRE_STRICT=1` — the only thing that makes `capture_mode=confirm` actually require `--yes` on `keepfire keep`. Without it, `confirm` mode does not block saves at the CLI layer, despite what the README's mode table implies.

## Docs

User-facing changes to `README.md` must be mirrored in `docs/README.zh-CN.md` in the same change.
