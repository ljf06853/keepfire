<p align="center">
  <img src="assets/banner.svg" alt="Keepfire" width="100%" />
</p>

<p align="center">
  <strong>Keep the prompt that worked. Reuse it on the next similar task — adapted, not pasted.</strong>
</p>

<p align="center">
  <a href="docs/README.zh-CN.md"><strong>中文文档</strong></a>
  ·
  <a href="README.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/ljf06853/keepfire/stargazers"><img src="https://img.shields.io/github/stars/ljf06853/keepfire?style=for-the-badge&logo=github" alt="Stars" /></a>
  <a href="https://github.com/ljf06853/keepfire/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT" /></a>
  <a href="#install-5-minutes"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=for-the-badge&logo=node.js&logoColor=white" alt="Node" /></a>
  <a href="#easiest-way-just-talk-to-your-agent"><img src="https://img.shields.io/badge/Agent%20Skills-SKILL.md-ff4d00?style=for-the-badge" alt="Agent Skills" /></a>
</p>

---

## What is Keepfire?

When a coding prompt finally *clicks* — the review is sharp, the fix is minimal — that wording usually dies in chat history. Keepfire saves it as a structured **recipe** (template + constraints + why it worked). Next time you face a similar task, it finds the recipe and **rewrites it for the new context** instead of pasting the old text.

Everything is local Markdown under `~/.keepfire/`. No account. No cloud. Works as a CLI **and** as an Agent Skill for Claude Code, Codex, Gemini CLI, and friends.

```text
You:   this PR review prompt was elite — keep it
       🔥 Kept #2026-07-09-pr-security-review-a1b2

─── next week ───

You:   keepfire use "review this webhook PR for security"
       → prints your proven review recipe, adapted to the webhook task
```

---

## Install (5 minutes)

### Claude Code — 2 commands, nothing to build

```text
/plugin marketplace add ljf06853/keepfire
/plugin install keepfire@keepfire
```

Done. You get four skills that trigger automatically — **capturing-sparks** (save a winning prompt), **recalling-recipes** (reuse it on the next similar task), **harvesting-sparks** (mine prompts you forgot to keep), **tending-the-garden** (manage the library) — plus the prompt journal hook. Skip to [“Just talk to your agent”](#easiest-way-just-talk-to-your-agent).

The CLI below is optional for Claude Code (skills fall back to reading/writing `~/.keepfire` directly), but recommended — search and save get faster and more consistent.

### CLI + other AI tools (Codex, Gemini CLI, …)

You need **Node.js 18+** and **git**. The npm package is not published yet, so install from source.

**Step 1 — get the code and build it:**

```bash
git clone https://github.com/ljf06853/keepfire.git
cd keepfire
npm install
npm run build
npm link          # makes the `keepfire` command available everywhere
```

**Step 2 — create your library and connect your AI tools:**

```bash
keepfire init --link codex,gemini,agents,cursor
```

This creates `~/.keepfire/` and installs the single-file skill into every tool you listed. Extra targets are harmless. (Claude Code users: use the plugin above instead of `--link claude` — don't install both, or the skills will trigger twice.)

**Step 3 — check it works:**

```bash
keepfire version   # → 0.1.1
keepfire path      # → where your library lives
```

> **Windows:** run the commands above in Git Bash or PowerShell. If symlinks are blocked, Step 2 silently **copies** the skill instead of linking it — so after every update (`git pull && npm run build`), re-run Step 2 to refresh.

> **macOS / Linux shortcut:** `curl -fsSL https://raw.githubusercontent.com/ljf06853/keepfire/main/install.sh | bash` does Steps 1–2 for you.

---

## First run (2 minutes)

**1. Load the sample recipes** (run inside the `keepfire` folder):

```bash
keepfire import examples/sample-recipes.json
keepfire list
```

**2. Recall one with a real task:**

```bash
keepfire use "review this webhook PR for security"
```

You'll see a numbered candidate list. Apply the one you want:

```bash
keepfire use --pick 1 "review this webhook PR for security"
```

The output is a ready-to-use prompt — paste it into your AI tool. (If the top match is strong, `use` applies it automatically without asking.)

**3. Keep your first own recipe:**

```bash
keepfire keep --title "Minimal-fix debugging" \
  --intent debug \
  --prompt "Reproduce first, then isolate, then make the smallest possible fix. No drive-by refactors." \
  --triggers "minimal fix|debug loop" \
  --yes
```

You'll see `🔥 Kept #...`. For long prompts use `--prompt-file ./spark.txt` or pipe via stdin. `keepfire help` lists every flag.

---

## Easiest way: just talk to your agent

If you linked the skill in Step 2, you never need to type commands. In Claude Code / Codex, say:

| You say | What happens |
|---------|--------------|
| "keep this prompt" / `/keep` | The agent extracts a recipe from the conversation and saves it (asks you first) |
| "use my usual PR review style on this" / `/use` | The agent recalls the recipe, adapts it to the task, and executes |
| "list my recipes" / `/garden` | Browse, search, delete, improve |
| "harvest my recent prompts" / `/harvest` | Mine your prompt journal for sparks you forgot to keep |

The agent may also **suggest** keeping a prompt it noticed worked well (`🔥 keep this one?`). It never saves without your yes. Turn suggestions off with `keepfire mode suggest off`.

---

## The daily loop (3 habits)

1. **A prompt worked great?** Say "keep this" — or accept the agent's 🔥 suggestion.
2. **Similar task again?** Say "use my … style" — the recipe is adapted to the new task, never pasted blindly.
3. **Once a week:** run `keepfire harvest` to recover good prompts you forgot to keep (needs the journal below).

---

## Optional: automatic prompt journal

Let your agent log every prompt locally, so `harvest` can mine them later.

> **Claude Code plugin users: this is already active** — the plugin ships the hook. Skip this section.

For CLI-only setups:

**Step 1:** note where you cloned keepfire (e.g. `/home/you/keepfire`).

**Step 2:** add this to `~/.claude/settings.json` (Claude Code):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [ { "type": "command", "command": "node /path/to/keepfire/dist/cli.js journal --from-hook", "timeout": 10 } ] }
    ]
  }
}
```

**Step 3:** from your next message on, prompts land in `~/.keepfire/journal.jsonl` (slash commands and very short messages are skipped; nothing leaves your machine). Then:

```bash
keepfire harvest            # candidates marked NEW or covered-by:<id>
keepfire journal --list     # peek at the raw journal
```

Harvest is **curation, not import** — keep only the entries that encode a reusable process.

---

## Command cheat sheet

| Command | What it does |
|---------|--------------|
| `keepfire keep --title T --prompt P --yes` | Save a recipe (`--prompt-file F` or stdin for long prompts) |
| `keepfire use "task"` | Show matching recipes; auto-applies a strong match |
| `keepfire use --pick N "task"` | Apply the Nth listed candidate |
| `keepfire use --id <fragment> "task"` | Apply by id — any unique fragment works (e.g. `--id 4zri`) |
| `keepfire search "keywords"` | Search without applying |
| `keepfire list` / `show <id>` / `delete <id> --yes` | Manage the library |
| `keepfire improve <id> --note "..."` | Save an improved version (v2, v3, …) |
| `keepfire journal --list` / `keepfire harvest` | Prompt journal / mine it |
| `keepfire mode` | View or change modes (below) |
| `keepfire export [file]` / `import <file>` | Backup / restore as JSON |
| `keepfire stats` / `path` / `reindex` | Info and maintenance |

---

## Modes

```bash
keepfire mode capture confirm     # saving: ask first (default) — or `auto`
keepfire mode use ask_if_low_confidence   # or always_ask | auto
keepfire mode suggest on          # agents may propose keeps (default on) — or off
keepfire mode threshold 0.75      # min confidence (0..1) for auto-apply
```

| Mode | Behavior |
|------|----------|
| `capture confirm` | Show a draft before saving (agents); CLI saves with `--yes` |
| `capture auto` | Save immediately once you say "keep" |
| `use ask_if_low_confidence` | Auto-apply only strong matches, otherwise ask |
| `use always_ask` / `use auto` | Always ask / always apply best match |
| `suggest on` | Agents may *propose* keeping a spark; saving still needs your yes |

---

## Your data

```text
~/.keepfire/
  config.json          # modes and thresholds
  index.json           # fast catalog (rebuildable)
  journal.jsonl        # local prompt journal (for harvest)
  cards/
    2026-07-09-....md  # one recipe per file — plain Markdown, git-friendly
```

- Override the location with `export KEEPFIRE_HOME=/path/to/library`.
- Everything stays on your machine. Back it up with git or `keepfire export`.
- Don't put tokens, keys, or credentials in prompts — the skill tells agents to redact, but the responsibility is yours.

---

## Troubleshooting

**`keepfire: command not found`** — run `npm link` inside the keepfire folder again, then restart your terminal. Or call it directly: `node dist/cli.js help`.

**The agent ignores "keep this prompt"** — check the skill is installed: `ls ~/.claude/skills/keepfire` (or your tool's skills dir). If missing, re-run `keepfire init --link claude` and start a new agent session.

**I updated keepfire but the agent behaves like the old version (Windows)** — symlinks were blocked, so the skill was copied. Re-run `keepfire init --link ...` after `git pull && npm run build`.

**Recall misses my recipe** — add `--triggers` / `--tags` / `--stack` when keeping, or apply directly with `keepfire use --id <fragment>`.

**Can my team share a library?** — it's personal-first. Put `~/.keepfire` in a git repo, or pass around `keepfire export` files.

---

## Development

```bash
npm run build     # compile to dist/
npm test          # node:test suite
npm run dev -- <args>   # run the CLI from source
```

Repo layout: `src/` (TypeScript CLI) · `skills/` + `.claude-plugin/` + `hooks/` (Claude Code plugin) · `SKILL.md` (single-file skill for other agents) · `templates/card.md` (recipe shape) · `examples/` (sample recipes).

## Roadmap

- [ ] Publish CLI to npm registry
- [ ] Richer semantic retrieval (optional local embeddings)
- [ ] Recipe packs you can publish (team / OSS)
- [ ] Browser companion for non-CLI chats

PRs welcome.

## License

[MIT](./LICENSE) © 2026 ljf06853

---

<p align="center">
  <sub>If Keepfire saves even one elite prompt from oblivion, drop a ⭐ — sparks love oxygen.</sub>
</p>

<p align="center">
  <a href="docs/README.zh-CN.md">中文文档 / Chinese docs</a>
</p>
