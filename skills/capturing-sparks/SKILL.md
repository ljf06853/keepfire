---
name: capturing-sparks
description: Use when the user wants to save a prompt — "keep this prompt", "save this", "收藏这个问法", /keep — OR when you notice a spark yourself; the user praises a result ("perfect", "完美", "就是这样"), or a prompt refined 2+ times finally produced the desired outcome. Captures the winning prompt as a structured, reusable recipe.
---

# Capturing Sparks

A **spark** is a prompt (or prompt pattern) that clearly worked well for a coding task.
Sparks die in chat history unless captured as **recipes** — structured cards the user can
recall and adapt on the next similar task.

<HARD-GATE>
NEVER save a recipe without the user's explicit yes. Proactive detection automates
*recognition*, not *persistence*. If the user declines, drop it silently and do not
re-suggest the same prompt.
</HARD-GATE>

## When you noticed the spark yourself

Check `~/.keepfire/config.json` first: if `auto_suggest` is `false`, stay silent.
Otherwise suggest with ONE short line at a natural pause — never mid-task:

```text
🔥 这条 prompt 很出彩，要 keep 吗？ / That prompt was elite — keep it?
```

At most one suggestion per session unless the user engages.

## Checklist

Create a task per item and complete in order:

1. **Identify the final effective prompt** — the version that worked, not the first rough draft.
2. **Extract the recipe fields:**
   - `title` — short, recognizable
   - `intent` — one of `implement | debug | review | refactor | test | explain | design | git-pr | perf | security | other`
   - `skeleton` — the prompt with project-specific names replaced by `{{task}}`, `{{diff}}`, `{{files}}`, `{{error}}`, `{{stack}}` placeholders
   - `constraints` — the hard rules that made it good
   - `output_contract` — expected output shape (checklist / diff / severity levels …)
   - `good_signals` — 1–3 bullets on why it worked
   - `anti_patterns` — what to avoid
   - `stack_hints`, `trigger_phrases` — for recall later
3. **Redact secrets** — tokens, keys, absolute private paths, credentials never go into a recipe.
4. **Show a draft card** and ask: `[save] [edit] [cancel]`. (Skip the confirmation only if `capture_mode` is `auto` in config — the keep intent itself is still required.)
5. **Save on approval** (see below), then report: `🔥 Kept #<id> — <title>`.

## How to save

**Preferred — the `keepfire` CLI** (if installed; check with `keepfire version`):

```bash
keepfire keep \
  --title "..." --intent review \
  --prompt "RAW_PROMPT" --skeleton "SKELETON" \
  --stack ts,node --tags pr,security \
  --triggers "审PR|security review" \
  --constraints "c1|c2" --output "..." \
  --why "signal1|signal2" --avoid "anti1" \
  --source claude-code --yes
```

For long prompts write them to a temp file and pass `--prompt-file <path>`.

**Fallback — no CLI:** write a Markdown card to `~/.keepfire/cards/<id>.md` following
the exact heading/frontmatter format in this plugin's `templates/card.md`
(flat inline frontmatter only — the CLI parser does not handle nested YAML), with
id `YYYY-MM-DD-<slug>-<4 random chars>`. Then tell the user to run `keepfire reindex`
when they install the CLI, or update `~/.keepfire/index.json` consistently yourself.

## Quality bar

Prefer recipes that encode **process**, not one-off content:

- good: "reproduce → smallest failing test → minimal fix → verify"
- bad: a prompt bound to one private file path and one bug string

If the prompt is too task-specific to generalize, say so instead of saving noise.
