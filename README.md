<p align="center">
  <img src="assets/banner.svg" alt="Keepfire" width="100%" />
</p>

<p align="center">
  <strong>Your best coding prompts should compound — not disappear into chat history.</strong>
</p>

<p align="center">
  <a href="https://github.com/ljf06853/keepfire/stargazers"><img src="https://img.shields.io/github/stars/ljf06853/keepfire?style=for-the-badge&logo=github" alt="Stars" /></a>
  <a href="https://github.com/ljf06853/keepfire/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT" /></a>
  <a href="#install"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=for-the-badge&logo=node.js&logoColor=white" alt="Node" /></a>
  <a href="#agent-skills"><img src="https://img.shields.io/badge/Agent%20Skills-SKILL.md-ff4d00?style=for-the-badge" alt="Agent Skills" /></a>
</p>

<p align="center">
  <a href="#why-keepfire">Why</a> ·
  <a href="#demo">Demo</a> ·
  <a href="#install">Install</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#agent-skills">Skills</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#roadmap">Roadmap</a>
</p>

---

## Why Keepfire?

You know the moment:

> You rewrite a prompt three times… the model finally *gets it*… the review is sharp, the fix is minimal, the tests are right —  
> and then that perfect wording is gone forever.

**Keepfire** turns those sparks into a personal **coding recipe library**:

1. 🔥 **Keep** — when a prompt hits, capture it in one breath  
2. 🧠 **Structure** — AI (or you) turns it into a reusable skeleton + constraints  
3. 🎯 **Use** — next similar task, recall Top matches and **adapt** (not blind paste)  
4. 📈 **Compound** — rate, improve, version — your craft gets sharper over time  

> **Not a prompt stash. A compounding coding craft system.**

Works as:

- a **CLI** you can script
- an **Agent Skill** (`SKILL.md`) for Claude Code, Codex, Gemini CLI, Cursor, and friends
- a **local-first Markdown library** you own under `~/.keepfire`

---

## Demo

```text
You:  this PR review prompt was elite — keep it

Agent / CLI:
🔥 Kept #2026-07-09-pr-security-review-a1b2
   intent=security  stack=ts,node

─── next week ───

You:  use my security review style on this webhook PR

Keepfire:
## Candidates
1. PR security review  [2026-07-09-pr-security-review-a1b2]
   security · ts,node · q5 · used 3x · score 9.40

## Applying recipe…
# Keepfire recipe: PR security review
## Task
use my security review style on this webhook PR
## Recipe to follow
Review {{diff}} for authz / injection / untrusted input…
## Constraints
- minimal diffs
- no drive-by refactors
```

**The point:** same *quality bar*, new *context*. Your prompts stop being disposable.

---

## Install

### Option A — one-liner

```bash
curl -fsSL https://raw.githubusercontent.com/ljf06853/keepfire/main/install.sh | bash
```

### Option B — npm / pnpm

```bash
npm install -g keepfire
# or from source:
git clone https://github.com/ljf06853/keepfire.git
cd keepfire && npm install && npm run build && npm link
keepfire init --link claude,codex,gemini,agents,cursor
```

### Option C — skill only (no global CLI)

Copy or symlink this repo into your agent skills directory:

| Agent | Skills path |
|-------|-------------|
| Claude Code | `~/.claude/skills/keepfire` |
| Codex | `~/.codex/skills/keepfire` or `~/.agents/skills/keepfire` |
| Gemini CLI | `~/.gemini/skills/keepfire` |
| Shared standard | `~/.agents/skills/keepfire` |
| Cursor | `~/.cursor/skills/keepfire` (if supported) |

```bash
git clone https://github.com/ljf06853/keepfire.git ~/.keepfire-src
ln -s ~/.keepfire-src ~/.claude/skills/keepfire
ln -s ~/.keepfire-src ~/.agents/skills/keepfire
```

Require **Node.js 18+** for the CLI.

---

## Usage

### Capture a spark

```bash
keepfire keep \
  --title "PR security review" \
  --intent security \
  --prompt "Review this diff for vulns. Prioritize authz and injection. Output Critical/Warning/Suggestion with fixes. No style nits first." \
  --skeleton "Review {{diff}} for security issues. Prioritize authz and injection.
Output Critical/Warning/Suggestion with locations and concrete fixes.
Current task:
{{task}}" \
  --stack ts,node \
  --tags pr,security \
  --triggers "审PR|security review|auth review" \
  --constraints "minimal diffs|no drive-by refactors" \
  --output "Severity-ranked findings + fixes" \
  --why "forced prioritization|actionable fixes" \
  --avoid "style-only noise" \
  --quality 5 \
  --source claude-code \
  --yes
```

### Recall + adapt

```bash
keepfire search "security review webhook"
keepfire use "review this payment webhook PR for security" --apply
keepfire use --id 2026-07-09-pr-security-review-a1b2 "focus on signature verification"
```

### Garden (manage)

```bash
keepfire list
keepfire show <id>
keepfire improve <id> --note "Add reproduce-first" --why "repro first|minimal fix"
keepfire delete <id> --yes
keepfire export ./my-recipes.json
keepfire stats
keepfire path
```

### Modes (confirm vs auto)

```bash
# capture: confirm (default) | auto
keepfire mode capture confirm
keepfire mode capture auto

# use: always_ask | ask_if_low_confidence (default) | auto
keepfire mode use ask_if_low_confidence
keepfire mode threshold 0.88
```

| Mode | Behavior |
|------|----------|
| `capture confirm` | Human-friendly default; explicit keep still saves via CLI (`--yes` under strict) |
| `capture auto` | Lowest friction after you say “keep” |
| `use ask_if_low_confidence` | Auto-apply only when match is strong |
| `use always_ask` | Always show candidates |
| `use auto` | Always apply best match |

---

## Agent Skills

Keepfire ships a portable [`SKILL.md`](./SKILL.md) (Agent Skills open standard).

In **Claude Code / Codex / compatible agents**, say things like:

- `keep this prompt` / `收藏这个问法` / `/keep`
- `use my previous PR review style` / `用我以前那种方式`
- `list my recipes` / `/garden`

The skill instructs the agent to:

1. extract a **recipe** (not dump raw chat)
2. skeletonize with `{{placeholders}}`
3. search your local library
4. **adapt** the recipe to the new task before coding

> One library. Many agents. Your craft travels with you.

---

## How it works

```text
~/.keepfire/
  config.json          # capture/use modes
  index.json           # fast catalog
  cards/
    2026-07-09-....md  # one recipe per file (git-friendly)
```

Each recipe is a Markdown card:

- **raw_prompt** — what actually worked  
- **skeleton** — reusable pattern with `{{task}}` / `{{diff}}` / …  
- **constraints** — hard rules  
- **output_contract** — expected shape  
- **good_signals** — why it was good  
- **anti_patterns** — what to avoid  
- **intent / stack / triggers** — for recall  

Search is local (keywords + intent/stack signals + light ranking).  
No account. No cloud. Override home with `KEEPFIRE_HOME`.

---

## Example recipe intents

| Intent | When |
|--------|------|
| `implement` | build a feature the right way |
| `debug` | reproduce → isolate → minimal fix |
| `review` / `security` | PR / threat-focused review |
| `refactor` | safe structural change |
| `test` | coverage / repro tests |
| `design` | API / architecture choices |
| `git-pr` | commits, PR descriptions |
| `perf` | latency / allocations |

---

## Project structure

```text
keepfire/
├─ SKILL.md              # portable agent skill
├─ agents/openai.yaml    # Codex-oriented metadata
├─ src/                  # TypeScript CLI
├─ templates/card.md     # recipe template
├─ install.sh            # one-line installer
└─ assets/banner.svg
```

```bash
npm run build
npm test
npx keepfire help
```

---

## GitHub blurb (copy-paste)

**Short (repo subtitle):**

> Capture coding prompt sparks. Compound them into reusable recipes. Recall & adapt on the next task.

**One-liner:**

> Keepfire is a local-first skill + CLI that turns your best coding prompts into a compounding recipe library for Claude Code, Codex, and other agents.

**Longer:**

> Stop losing elite prompts in chat history. Keepfire lets you keep a spark, structure it into a versioned coding recipe, and reuse it later with automatic adaptation — so your AI coding craft compounds instead of resetting every session.

---

## Roadmap

- [x] Local Markdown recipe library  
- [x] CLI: keep / use / search / improve / export  
- [x] Portable `SKILL.md` for multi-agent install  
- [x] confirm / auto modes  
- [ ] Richer semantic retrieval (optional local embeddings)  
- [ ] Session transcript helpers (“keep the last winning user prompt”)  
- [ ] Recipe packs you can publish (team / OSS)  
- [ ] Browser companion for non-CLI chats  

PRs welcome. Open an issue if your agent needs another install path.

---

## Privacy

- **Local-first** by design  
- Recipes live on your machine  
- Don’t keep secrets, tokens, or credentials in prompts — redaction is on you and the skill instructions  

---

## License

[MIT](./LICENSE) © 2026 ljf06853

---

<p align="center">
  <sub>If Keepfire saves even one elite prompt from oblivion, drop a ⭐ — sparks love oxygen.</sub>
</p>
