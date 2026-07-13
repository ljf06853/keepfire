---
name: card-schema
description: The recipe-card Markdown and frontmatter format is a parser contract. Read this before changing card structure, headings, frontmatter fields, or the render/parse functions in src/store.ts — a mismatch silently corrupts every card in the user's library.
---

Recipe cards are stored as one Markdown file per recipe under `$KEEPFIRE_HOME/cards/` (default `~/.keepfire/cards/`). The format is not a display detail — it is the on-disk database, and it is written and read by two hand-rolled functions that must agree exactly.

## What must move in lockstep

Change any one of these and you must change all of them in the same edit:

1. `renderCardMarkdown` in `src/store.ts` — writes the card.
2. `parseCardMarkdown` in `src/store.ts` — reads it back, by regex-matching **exact** `##` heading text.
3. `templates/card.md` — the canonical shape shown to users and agents.
4. The `RecipeCard` interface in `src/types.ts`.
5. `SKILL.md` — if the change affects what agents are told to write, since agents can write cards directly when the CLI is absent.

## Why a mismatch is dangerous, not just broken

`rebuildIndex` in `src/store.ts` wraps card parsing in a bare `catch {}` and skips anything that fails. So a renamed heading does not throw — it makes every existing card parse to empty or get silently dropped from the index. The user's library appears to lose recipes with no error. **Any change here needs a test that round-trips a card through render → parse and asserts field-by-field equality**, plus a check that existing cards on disk still parse.

## Hard constraints

- **Headings are the contract.** `parseCardMarkdown` matches exact heading strings (`## Raw prompt`, `## Skeleton`, `## Constraints`, `## Output contract`, `## Why it worked`, `## Anti-patterns`, `## Notes`). Read the current regexes before assuming the list; do not rename a heading without updating them.
- **`raw_prompt` and `skeleton` live inside ```` ```text ```` fences.** The parser expects the fence. Prompt bodies can themselves contain backticks and code fences — if you change fence handling, test with a prompt that contains a nested fence.
- **Frontmatter must stay flat and inline.** It is parsed by `parseSimpleYaml`, not a YAML library. It handles only `key: value`, inline `[a, b]` arrays, quoted strings, numbers, booleans, and `null`. **Nested maps, block arrays, and multiline scalars will not parse.** Adding a structured field means either keeping it flat or upgrading the parser (and then handling every card written by the old one).
- **Cards are user data that already exists on disk.** A format change is a migration, not a refactor. Either keep the parser backward-compatible with cards written by prior versions, or ship an explicit migration path — `keepfire reindex` re-reads cards, it does not rewrite them.

## Related invariants

- `improveCard` derives the new id as `` `${parent.id}-v${nextVersion}` ``, so ids compound across generations (`...-abcd-v2-v3`). If you change the id scheme, existing parent/child links break.
- `index.json` is derived state and can always be rebuilt from `cards/*.md` via `rebuildIndex`. The Markdown files are the source of truth — never make the index authoritative.
