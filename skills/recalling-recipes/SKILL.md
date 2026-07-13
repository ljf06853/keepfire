---
name: recalling-recipes
description: Use when the user wants to reuse a past prompt pattern — "use my usual PR review style", "用我以前那种方式", /use — AND before starting any substantial implement/debug/review/refactor/test task: check whether the user's recipe library already holds a proven approach before inventing your own.
---

# Recalling Recipes

The user maintains a library of proven prompt recipes under `~/.keepfire/cards/`.
Reusing a proven recipe beats inventing an approach from scratch — but only if it is
**adapted** to the current task.

<HARD-GATE>
NEVER paste an old prompt blindly. Always adapt: fill placeholders from the current
task and repository, drop stale file names and dead constraints, keep the recipe's
structure, constraints, and quality signals.
</HARD-GATE>

## Two entry modes

**Explicit** (user asked to reuse a style): run the full checklist below.

**Ambient** (you are about to start a substantial coding task): do a quick search first.
If a strong match exists, offer it in one line — `🔥 你有一条相关配方「<title>」，要用吗？` —
and continue only on yes. If nothing matches well, proceed silently; never nag.

## Checklist

1. **Search the library:**

```bash
keepfire search "task keywords" --top 5
```

No CLI? Grep `~/.keepfire/cards/*.md` titles, `trigger_phrases`, and `tags` yourself.
Empty library → tell the user how to start: say "keep this prompt" after a good one.

2. **Present the top 1–3 candidates** with id, intent, and why they matched.

3. **Select** per `use_mode` in `~/.keepfire/config.json`:
   - `always_ask` — let the user pick
   - `ask_if_low_confidence` (default) — auto-apply only a strong match, otherwise ask
   - `auto` — apply the best match

4. **Render the adapted prompt:**

```bash
keepfire use --id <id> "current task text"     # any unique id fragment works
keepfire use --pick 2 "current task text"      # or pick the Nth candidate
```

The output is the working instruction — follow it to execute the coding task.
No CLI? Read the card and adapt it yourself: current task + filled skeleton +
constraints + output contract + "preserve these qualities" + "avoid".

5. **Close the loop.** After the task succeeds, if the user says the result was better
   than before, offer to save an improved version:

```bash
keepfire improve <id> --note "what changed" --why "signal1|signal2"
```

## Judgment calls

- The recipe's *structure* is the value; its old context is disposable.
- If two recipes half-match, prefer the one whose **intent** matches, then whose stack matches.
- A recipe used successfully bumps its ranking automatically (`use_count`) — no action needed.
