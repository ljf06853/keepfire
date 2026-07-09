---
name: keepfire
description: >
  Capture, organize, and reuse high-quality coding prompts as versioned recipes.
  Use when the user says keep/save this prompt, /keep, /use, /garden, "收藏这个问法",
  "用我以前那种方式", "keep this spark", or wants to reuse a past successful coding
  prompt pattern for implement/debug/review/refactor/test/design/security tasks.
  Do not use for general project memory unrelated to prompt reuse.
---

# Keepfire — Compound Your Coding Sparks

You are running the **keepfire** skill: a personal coding-prompt recipe system.

Sparks (great prompts) should not die in chat history.
Turn them into **recipes**, then **recall + adapt** them on the next similar task.

## Mental model

- **Spark**: a prompt (or prompt pattern) that clearly worked well for coding.
- **Recipe**: structured card with skeleton, constraints, output contract, and why it worked.
- **Compounding**: each reuse can improve the recipe (v1 → v2).

Storage is local Markdown under `~/.keepfire/` (override with `KEEPFIRE_HOME`).
Prefer the `keepfire` CLI when available; otherwise read/write the same files directly.

## Modes

Read `~/.keepfire/config.json` if present:

- `capture_mode`: `confirm` (default) | `auto`
- `use_mode`: `always_ask` | `ask_if_low_confidence` (default) | `auto`
- `auto_apply_threshold`: number 0..1 (default `0.88`)

If config is missing, assume defaults above.

## Commands the user may say

| User intent | What you do |
|-------------|-------------|
| "收藏/keep/save this prompt" | Capture flow (`/keep`) |
| "用我以前那种方式 /use ..." | Recall + adapt flow (`/use`) |
| "列出/搜索配方 /garden /list" | Browse library |
| "改成 auto/confirm" | Update capture/use mode |
| "这次更好，升级配方" | Improve version |

## /keep — capture a spark

### When to capture
Only when the user explicitly wants to keep something, unless they set capture_mode to auto **and** they still issued a keep intent.

### What to extract
From the conversation, identify:

1. **Final effective user prompt** (not the first rough draft if later refined)
2. **Intent**: one of  
   `implement | debug | review | refactor | test | explain | design | git-pr | perf | security | other`
3. **Skeleton**: same prompt with project-specific names removed and placeholders like `{{task}}`, `{{diff}}`, `{{files}}`, `{{error}}`, `{{stack}}`
4. **Constraints**: hard rules that made it good
5. **Output contract**: checklist / diff / steps / severity format...
6. **Why it worked** (`good_signals`): 1–3 bullets
7. **Anti-patterns**: what to avoid
8. **Stack hints**: e.g. `ts`, `react`, `go`, `postgres`
9. **Trigger phrases**: short phrases that should recall this later

### Confirm mode (default)
Show a short draft card:

```text
🔥 Keepfire draft
Title: ...
Intent: ...
Skeleton:
  ...
Constraints:
  - ...
Why it worked:
  - ...
[save] [edit] [cancel]
```

On save approval, persist via CLI:

```bash
npx --yes keepfire keep \
  --title "..." \
  --intent review \
  --prompt "RAW_PROMPT" \
  --skeleton "SKELETON" \
  --stack ts,node \
  --tags pr,security \
  --triggers "审PR|security review" \
  --constraints "c1|c2" \
  --output "severity with Critical/Warning/Suggestion" \
  --why "signal1|signal2" \
  --avoid "drive-by refactors" \
  --source claude-code \
  --yes
```

If CLI is unavailable, write a Markdown card under `~/.keepfire/cards/` using the template in `templates/card.md` and update `~/.keepfire/index.json` consistently (or tell the user to run `keepfire reindex`).

### Auto mode
Save immediately after extraction, then report:

```text
🔥 Kept #id — Title
```

Still allow undo via `keepfire delete <id> --yes`.

## /use — recall and adapt

1. Parse the user's new task.
2. Search the library:

```bash
npx --yes keepfire search "user task keywords" --top 5
```

3. Present top 1–3 candidates with id, intent, score reasons.
4. Selection policy:
   - `always_ask`: always let user pick
   - `ask_if_low_confidence`: auto-apply only if confidence is high
   - `auto`: apply best match
5. **Never paste an old prompt blindly.** Always adapt:
   - fill placeholders from current task/repo context
   - drop stale file names / dead constraints
   - keep the recipe's structure, constraints, and quality signals
6. Apply with:

```bash
npx --yes keepfire use --id <id> --apply "current task text"
```

Or use the CLI output as the working instruction and execute the coding task accordingly.

7. After a successful run, if the user says the result was better, offer `/keep improve`.

## /garden — manage

Support natural language for:

- list recipes
- search
- show one card
- delete
- export/import
- switch modes

CLI:

```bash
npx --yes keepfire list
npx --yes keepfire show <id>
npx --yes keepfire delete <id> --yes
npx --yes keepfire mode capture auto
npx --yes keepfire mode use ask_if_low_confidence
npx --yes keepfire stats
npx --yes keepfire export
```

## /keep improve — evolve a recipe

When a reuse improves the pattern:

```bash
npx --yes keepfire improve <id> \
  --note "Added reproduce-first step" \
  --skeleton "NEW_SKELETON" \
  --why "repro first|minimal fix"
```

Creates `vN+1` linked via `parent_id`.

## Quality bar for coding recipes

Prefer recipes that encode **process**, not one-off content:

- good: "reproduce → smallest failing test → minimal fix → verify"
- bad: a prompt that only works for one private file path and one bug string

When skeletonizing, replace secrets, absolute paths, proprietary names, and temporary values with `{{placeholders}}`.

## Privacy

- Local-first: do not upload the library anywhere.
- Do not capture secrets, tokens, private keys, or credentials into recipes.
- Redact if the user accidentally includes them.

## If tools fail

Fall back to:

1. Read/write `~/.keepfire/cards/*.md`
2. Keep frontmatter fields compatible with the CLI parser
3. Ask the user to run `keepfire reindex`

## Response style

Be concise, concrete, and developer-toned.
Use the 🔥 marker when a spark is kept successfully.
