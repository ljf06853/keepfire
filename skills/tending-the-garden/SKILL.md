---
name: tending-the-garden
description: Use when the user wants to manage their recipe library — list, search, show, delete, improve, export/import recipes, view stats, or change keepfire modes (capture/use/suggest/threshold). Trigger phrases; /garden, "list my recipes", "列出我的配方", "删掉那条配方", "改成 auto 模式".
---

# Tending the Garden

The user's recipe library lives under `~/.keepfire/` (override: `KEEPFIRE_HOME`).
Cards are plain Markdown — one file per recipe under `cards/`, indexed by `index.json`
(derived, always rebuildable; the Markdown files are the source of truth).

## Operations

```bash
keepfire list [--intent security] [--stack ts]
keepfire search "keywords" --top 10
keepfire show <id-or-fragment>
keepfire delete <id-or-fragment> --yes      # confirm with the user first
keepfire improve <id> --note "..." --why "signal1|signal2"
keepfire export [file] / keepfire import <file>
keepfire stats
keepfire reindex                            # heal the index after manual edits
```

Ids accept any unique fragment (`show 4zri`). No CLI? Read/write the files directly,
keeping frontmatter flat and inline, then have the user `keepfire reindex` later.

## Modes

Config lives in `~/.keepfire/config.json`:

```bash
keepfire mode                              # view all
keepfire mode capture confirm|auto         # ask before saving (default: confirm)
keepfire mode use always_ask|ask_if_low_confidence|auto
keepfire mode suggest on|off               # proactive spark suggestions (default: on)
keepfire mode threshold 0.75               # min confidence for auto-apply (0..1)
```

| User says | Do |
|-----------|----|
| "改成 auto" / "don't ask when saving" | `mode capture auto` |
| "别自动应用，每次问我" | `mode use always_ask` |
| "别再主动提议收藏了" | `mode suggest off` |
| "自动应用太激进/太保守" | raise / lower `mode threshold` |

## Cautions

- **Delete is permanent** (no trash). Show the card (`show <id>`) and confirm before deleting.
- `improve` creates a new versioned card linked via `parent_id` — it never mutates the original. Prefer it over delete-and-recreate.
- Recipes are user data. Never edit or remove cards the user didn't ask about.
