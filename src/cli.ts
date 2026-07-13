#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  appendJournal,
  bumpUse,
  deleteCard,
  ensureLibrary,
  improveCard,
  listCards,
  readCard,
  readConfig,
  readJournal,
  rebuildIndex,
  resolveCardId,
  saveDraft,
  writeConfig,
} from "./store.js";
import {
  formatSearchHits,
  renderAdaptedPrompt,
  scoreToConfidence,
  searchRecipes,
} from "./search.js";
import { homeDir, packageRoot, skillSourceDir } from "./paths.js";
import type { CaptureMode, Intent, KeepDraft, UseMode } from "./types.js";

const VERSION = "0.1.1";

function main(): void {
  const argv = process.argv.slice(2);
  const cmd = argv[0] || "help";

  try {
    switch (cmd) {
      case "help":
      case "--help":
      case "-h":
        printHelp();
        break;
      case "version":
      case "--version":
      case "-v":
        console.log(VERSION);
        break;
      case "init":
        cmdInit(parseFlags(argv.slice(1)));
        break;
      case "keep":
        cmdKeep(parseFlags(argv.slice(1)));
        break;
      case "use":
        cmdUse(parseFlags(argv.slice(1)));
        break;
      case "search":
        cmdSearch(parseFlags(argv.slice(1)));
        break;
      case "list":
        cmdList(parseFlags(argv.slice(1)));
        break;
      case "show":
        cmdShow(parseFlags(argv.slice(1)));
        break;
      case "delete":
        cmdDelete(parseFlags(argv.slice(1)));
        break;
      case "improve":
        cmdImprove(parseFlags(argv.slice(1)));
        break;
      case "journal":
        cmdJournal(parseFlags(argv.slice(1)));
        break;
      case "harvest":
        cmdHarvest(parseFlags(argv.slice(1)));
        break;
      case "mode":
        cmdMode(parseFlags(argv.slice(1)));
        break;
      case "config":
        cmdConfig();
        break;
      case "export":
        cmdExport(parseFlags(argv.slice(1)));
        break;
      case "import":
        cmdImport(parseFlags(argv.slice(1)));
        break;
      case "reindex":
        ensureLibrary();
        rebuildIndex();
        console.log("Index rebuilt.");
        break;
      case "stats":
        cmdStats();
        break;
      case "path":
        console.log(homeDir());
        break;
      default:
        console.error(`Unknown command: ${cmd}`);
        printHelp();
        process.exitCode = 1;
    }
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

function printHelp(): void {
  console.log(`keepfire v${VERSION}
Capture coding prompt sparks. Compound them into reusable recipes.

Usage:
  keepfire <command> [options]

Commands:
  init [--link claude,codex,gemini,cursor,agents]
      Create ~/.keepfire and optionally symlink this skill into agent dirs

  keep --title T --prompt P [options]
      Save a recipe (spark → card)
      Options:
        --skeleton S          Variable template ({{task}}, {{diff}}...)
        --intent implement|debug|review|refactor|test|explain|design|git-pr|perf|security|other
        --stack ts,react      Stack hints
        --tags a,b
        --triggers "phrase1|phrase2"
        --constraints "c1|c2"
        --output "expected output shape"
        --why "signal1|signal2"
        --avoid "anti1|anti2"
        --quality 1-5
        --source claude-code
        --notes "..."
        --prompt-file F       Read the raw prompt from a file (or pipe via stdin)
        --json                Print full JSON card
        --yes                 Skip confirm-mode guard (force save)

  use <query...> [--id ID] [--pick N] [--top K] [--stack ts] [--intent review] [--json]
      Recall recipes and print an adapted prompt for the agent
      --id accepts any unique id fragment (e.g. --id 4zri)
      --pick N applies the Nth candidate from the listed results

  search <query...> [--top K] [--intent I] [--stack S]
  list [--intent I] [--stack S]
  show <id-or-fragment>
  delete <id-or-fragment> [--yes]
  improve <id-or-fragment> --note "..." [--prompt P] [--skeleton S] ...
  journal --from-hook | --text "..." | --list [--limit N]
      Append prompts to the local journal (~/.keepfire/journal.jsonl)
  harvest [--limit N] [--days D] [--json]
      Mine the journal for prompts worth keeping as recipes
  mode capture confirm|auto
  mode use always_ask|ask_if_low_confidence|auto
  mode suggest on|off
  mode threshold 0.75
  config
  export [file]
  import <file>
  reindex
  stats
  path
  help
  version

Library location:
  ${homeDir()}
  Override with KEEPFIRE_HOME

Agent skill:
  Point Claude Code / Codex / Gemini at this repo's SKILL.md
  or run: keepfire init --link claude,codex,gemini,agents
`);
}

type Flags = {
  _: string[];
  [key: string]: string | boolean | string[];
};

const BOOL_FLAGS = new Set([
  "yes",
  "force",
  "json",
  "apply",
  "help",
  "from-hook",
  "list",
]);

function parseFlags(argv: string[]): Flags {
  const out: Flags = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 2) {
        const key = a.slice(2, eq);
        out[key] = a.slice(eq + 1);
        continue;
      }
      const key = a.slice(2);
      const next = argv[i + 1];
      if (BOOL_FLAGS.has(key) || !next || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function str(flags: Flags, key: string): string | undefined {
  const v = flags[key];
  if (typeof v === "string") return v;
  return undefined;
}

function bool(flags: Flags, key: string): boolean {
  return flags[key] === true || flags[key] === "true";
}

function splitList(v?: string, sep: RegExp | string = /[|,]/): string[] {
  if (!v) return [];
  return v
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

function cmdInit(flags: Flags): void {
  ensureLibrary();
  const cfg = readConfig();
  console.log(`Library ready: ${homeDir()}`);
  console.log(`capture_mode=${cfg.capture_mode}  use_mode=${cfg.use_mode}`);

  const link = str(flags, "link");
  if (!link) {
    console.log("Tip: keepfire init --link claude,codex,gemini,agents,cursor");
    return;
  }
  const targets = splitList(link, /[|,]/);
  for (const t of targets) linkSkill(t.trim().toLowerCase());
}

function linkSkill(target: string): void {
  const src = skillSourceDir();
  const skillName = "keepfire";
  const map: Record<string, string[]> = {
    claude: [path.join(os.homedir(), ".claude", "skills", skillName)],
    codex: [
      path.join(os.homedir(), ".codex", "skills", skillName),
      path.join(os.homedir(), ".agents", "skills", skillName),
    ],
    agents: [path.join(os.homedir(), ".agents", "skills", skillName)],
    gemini: [path.join(os.homedir(), ".gemini", "skills", skillName)],
    cursor: [path.join(os.homedir(), ".cursor", "skills", skillName)],
  };

  const dirs = map[target];
  if (!dirs) {
    console.error(`Unknown link target: ${target}`);
    return;
  }

  for (const dest of dirs) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
      if (fs.existsSync(dest) || fs.lstatSync(dest).isSymbolicLink()) {
        fs.rmSync(dest, { recursive: true, force: true });
      }
    } catch {
      // dest may not exist
    }
    try {
      fs.symlinkSync(src, dest, "dir");
      console.log(`Linked ${target}: ${dest} -> ${src}`);
    } catch {
      // fallback copy for systems that block symlink
      copyDir(src, dest);
      console.log(`Copied ${target}: ${dest}`);
    }
  }
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".git"
    ) {
      continue;
    }
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function cmdKeep(flags: Flags): void {
  ensureLibrary();
  const cfg = readConfig();
  const titleRaw = str(flags, "title");
  const promptRaw =
    str(flags, "prompt") ||
    str(flags, "raw") ||
    readFileFlag(flags, "prompt-file") ||
    readStdinIfPiped();
  if (!titleRaw || !promptRaw) {
    throw new Error(
      "keep requires --title and --prompt (or --prompt-file, or stdin prompt)",
    );
  }
  const title: string = titleRaw;
  const prompt: string = promptRaw;

  if (cfg.capture_mode === "confirm" && !bool(flags, "yes") && !bool(flags, "force")) {
    // CLI path is explicit enough; still honor confirm by requiring --yes only when KEEPFIRE_STRICT=1
    if (process.env.KEEPFIRE_STRICT === "1") {
      throw new Error(
        "capture_mode=confirm. Re-run with --yes after reviewing the draft, or set mode capture auto.",
      );
    }
  }

  const draft: KeepDraft = {
    title,
    raw_prompt: prompt,
    skeleton: str(flags, "skeleton") || undefined,
    intent: (str(flags, "intent") as Intent) || "other",
    stack_hints: splitList(str(flags, "stack")),
    tags: splitList(str(flags, "tags")),
    trigger_phrases: splitList(str(flags, "triggers"), /\|/),
    constraints: splitList(str(flags, "constraints"), /\|/),
    output_contract: str(flags, "output") || "",
    good_signals: splitList(str(flags, "why"), /\|/),
    anti_patterns: splitList(str(flags, "avoid"), /\|/),
    quality: str(flags, "quality") ? Number(str(flags, "quality")) : null,
    source: str(flags, "source"),
    notes: str(flags, "notes"),
  };

  // auto-skeleton if missing: light variable hint
  if (!draft.skeleton) {
    draft.skeleton = suggestSkeleton(prompt);
  }

  const card = saveDraft(draft);
  if (bool(flags, "json")) {
    console.log(JSON.stringify(card, null, 2));
    return;
  }
  console.log(`🔥 Kept #${card.id}`);
  console.log(`   ${card.title}`);
  console.log(`   intent=${card.intent}  stack=${card.stack_hints.join(",") || "-"}`);
  console.log(`   file=${path.join(homeDir(), "cards", card.id + ".md")}`);
}

function suggestSkeleton(prompt: string): string {
  // Keep human wording; only append a task placeholder if none exists
  if (/\{\{[^}]+\}\}/.test(prompt)) return prompt;
  return `${prompt.trim()}\n\nCurrent context/task:\n{{task}}`;
}

function cmdUse(flags: Flags): void {
  ensureLibrary();
  const cfg = readConfig();
  const id = str(flags, "id");
  const top = Number(str(flags, "top") || cfg.recall_top_k);
  const intent = str(flags, "intent") as Intent | undefined;
  const stack = splitList(str(flags, "stack"));
  const query = flags._.join(" ").trim() || str(flags, "query") || "";

  if (id) {
    const resolved = resolveCardId(id);
    const card = readCard(resolved);
    if (!card) throw new Error(`Recipe not found: ${id}`);
    const task = query || card.title;
    bumpUse(resolved);
    const adapted = renderAdaptedPrompt(card, task);
    if (bool(flags, "json")) {
      console.log(JSON.stringify({ selected: card, adapted }, null, 2));
      return;
    }
    console.log(adapted);
    return;
  }

  if (!query) throw new Error("use requires a query or --id");

  const hits = searchRecipes(query, { intent, stack, limit: top });
  if (!hits.length) {
    console.log("No recipes matched. Save one with: keepfire keep --title ... --prompt ...");
    process.exitCode = 2;
    return;
  }

  const pickRaw = str(flags, "pick");
  if (pickRaw) {
    const n = Number(pickRaw);
    if (!Number.isInteger(n) || n < 1 || n > hits.length) {
      throw new Error(`--pick must be an integer 1..${hits.length}`);
    }
    const chosen = hits[n - 1];
    bumpUse(chosen.recipe.id);
    const adapted = renderAdaptedPrompt(chosen.recipe, query);
    if (bool(flags, "json")) {
      console.log(JSON.stringify({ selected: chosen.recipe, adapted }, null, 2));
      return;
    }
    console.log(`## Applying: ${chosen.recipe.title} [${chosen.recipe.id}]`);
    console.log("");
    console.log(adapted);
    return;
  }

  const best = hits[0];
  const confidence = scoreToConfidence(best.score);

  if (bool(flags, "json")) {
    console.log(
      JSON.stringify(
        {
          query,
          confidence,
          candidates: hits.map((h) => ({
            id: h.recipe.id,
            title: h.recipe.title,
            score: h.score,
            reasons: h.reasons,
          })),
          adapted: renderAdaptedPrompt(best.recipe, query),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log("## Candidates");
  console.log(formatSearchHits(hits));
  console.log("");

  const auto =
    cfg.use_mode === "auto" ||
    (cfg.use_mode === "ask_if_low_confidence" &&
      confidence >= cfg.auto_apply_threshold) ||
    bool(flags, "apply");

  if (!auto && !bool(flags, "apply")) {
    console.log(
      `Top match confidence=${confidence.toFixed(2)} (threshold=${cfg.auto_apply_threshold}).`,
    );
    console.log(
      `Pick one with: keepfire use --pick 1 ${JSON.stringify(query)}`,
    );
    console.log("Or force the top match: keepfire use --apply " + JSON.stringify(query));
    return;
  }

  bumpUse(best.recipe.id);
  console.log(`## Applying: ${best.recipe.title} [${best.recipe.id}]`);
  console.log("");
  console.log(renderAdaptedPrompt(best.recipe, query));
}

function cmdSearch(flags: Flags): void {
  ensureLibrary();
  const query = flags._.join(" ").trim();
  if (!query) throw new Error("search requires a query");
  const hits = searchRecipes(query, {
    intent: str(flags, "intent") as Intent | undefined,
    stack: splitList(str(flags, "stack")),
    limit: Number(str(flags, "top") || 10),
  });
  console.log(formatSearchHits(hits));
}

function cmdList(flags: Flags): void {
  ensureLibrary();
  let cards = listCards();
  const intent = str(flags, "intent");
  const stack = str(flags, "stack");
  if (intent) cards = cards.filter((c) => c.intent === intent);
  if (stack) {
    const s = stack.toLowerCase();
    cards = cards.filter((c) => c.stack_hints.some((x) => x.includes(s)));
  }
  if (!cards.length) {
    console.log("Library empty. Keep your first spark with `keepfire keep`.");
    return;
  }
  for (const c of cards) {
    console.log(
      `- ${c.id}  ${c.title}  [${c.intent}]  used=${c.use_count}  q=${c.quality ?? "-"}`,
    );
  }
}

function cmdShow(flags: Flags): void {
  const idInput = flags._[0] || str(flags, "id");
  if (!idInput) throw new Error("show requires an id");
  const id = resolveCardId(idInput);
  const card = readCard(id);
  if (!card) throw new Error(`Recipe not found: ${id}`);
  if (bool(flags, "json")) {
    console.log(JSON.stringify(card, null, 2));
    return;
  }
  console.log(fs.readFileSync(path.join(homeDir(), "cards", id + ".md"), "utf8"));
}

function cmdDelete(flags: Flags): void {
  const idInput = flags._[0] || str(flags, "id");
  if (!idInput) throw new Error("delete requires an id");
  if (!bool(flags, "yes")) {
    throw new Error("Refusing to delete without --yes");
  }
  const id = resolveCardId(idInput);
  const ok = deleteCard(id);
  console.log(ok ? `Deleted ${id}` : `Not found: ${id}`);
}

function cmdImprove(flags: Flags): void {
  const idInput = flags._[0] || str(flags, "id");
  if (!idInput) throw new Error("improve requires an id");
  const id = resolveCardId(idInput);
  const child = improveCard(id, {
    title: str(flags, "title"),
    raw_prompt: str(flags, "prompt"),
    skeleton: str(flags, "skeleton"),
    intent: str(flags, "intent") as Intent | undefined,
    stack_hints: str(flags, "stack") ? splitList(str(flags, "stack")) : undefined,
    tags: str(flags, "tags") ? splitList(str(flags, "tags")) : undefined,
    trigger_phrases: str(flags, "triggers")
      ? splitList(str(flags, "triggers"), /\|/)
      : undefined,
    constraints: str(flags, "constraints")
      ? splitList(str(flags, "constraints"), /\|/)
      : undefined,
    output_contract: str(flags, "output"),
    good_signals: str(flags, "why")
      ? splitList(str(flags, "why"), /\|/)
      : undefined,
    anti_patterns: str(flags, "avoid")
      ? splitList(str(flags, "avoid"), /\|/)
      : undefined,
    notes: str(flags, "notes") || str(flags, "note"),
    quality: str(flags, "quality") ? Number(str(flags, "quality")) : undefined,
  });
  console.log(`🔥 Improved → #${child.id} (v${child.version}) from ${id}`);
}

function cmdMode(flags: Flags): void {
  const which = flags._[0];
  const value = flags._[1];
  if (!which || !value) {
    const cfg = readConfig();
    console.log(`capture_mode=${cfg.capture_mode}`);
    console.log(`use_mode=${cfg.use_mode}`);
    console.log(`auto_suggest=${cfg.auto_suggest}`);
    console.log(`auto_apply_threshold=${cfg.auto_apply_threshold}`);
    return;
  }
  if (which === "capture") {
    if (value !== "confirm" && value !== "auto") {
      throw new Error("capture mode must be confirm|auto");
    }
    writeConfig({ capture_mode: value as CaptureMode });
    console.log(`capture_mode=${value}`);
    return;
  }
  if (which === "use") {
    if (
      value !== "always_ask" &&
      value !== "ask_if_low_confidence" &&
      value !== "auto"
    ) {
      throw new Error("use mode must be always_ask|ask_if_low_confidence|auto");
    }
    writeConfig({ use_mode: value as UseMode });
    console.log(`use_mode=${value}`);
    return;
  }
  if (which === "suggest") {
    if (value !== "on" && value !== "off") {
      throw new Error("suggest mode must be on|off");
    }
    writeConfig({ auto_suggest: value === "on" });
    console.log(`auto_suggest=${value === "on"}`);
    return;
  }
  if (which === "threshold") {
    const n = Number(value);
    if (!(n >= 0 && n <= 1)) throw new Error("threshold must be 0..1");
    writeConfig({ auto_apply_threshold: n });
    console.log(`auto_apply_threshold=${n}`);
    return;
  }
  throw new Error(
    "Usage: keepfire mode capture confirm|auto | mode use ... | mode suggest on|off | mode threshold 0.75",
  );
}

function cmdConfig(): void {
  ensureLibrary();
  console.log(JSON.stringify(readConfig(), null, 2));
  console.log(`\npackage: ${packageRoot()}`);
  console.log(`library: ${homeDir()}`);
}

function cmdExport(flags: Flags): void {
  ensureLibrary();
  const file =
    flags._[0] ||
    str(flags, "out") ||
    path.join(process.cwd(), `keepfire-export-${Date.now()}.json`);
  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    config: readConfig(),
    recipes: listCards(),
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`Exported ${payload.recipes.length} recipes → ${file}`);
}

function cmdImport(flags: Flags): void {
  const file = flags._[0] || str(flags, "file");
  if (!file) throw new Error("import requires a file");
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
    recipes?: KeepDraft[];
  };
  if (!Array.isArray(raw.recipes)) throw new Error("Invalid export file");
  let n = 0;
  for (const r of raw.recipes) {
    saveDraft({
      title: r.title,
      intent: r.intent,
      raw_prompt: r.raw_prompt,
      skeleton: r.skeleton,
      constraints: r.constraints,
      output_contract: r.output_contract,
      good_signals: r.good_signals,
      anti_patterns: r.anti_patterns,
      stack_hints: r.stack_hints,
      trigger_phrases: r.trigger_phrases,
      tags: r.tags,
      quality: r.quality,
      source: r.source,
      notes: r.notes,
    });
    n++;
  }
  console.log(`Imported ${n} recipes.`);
}

const JOURNAL_MIN_LENGTH = 12;
const JOURNAL_MAX_TEXT = 4000;
const JOURNAL_LIST_DEFAULT_LIMIT = 20;

function cmdJournal(flags: Flags): void {
  if (bool(flags, "from-hook")) {
    // Fed by an agent hook (e.g. Claude Code UserPromptSubmit). Must never
    // fail loudly or block the host agent's prompt flow.
    try {
      const raw = readStdinIfPiped();
      if (!raw) return;
      const payload = JSON.parse(raw) as { prompt?: string; cwd?: string };
      const text = (payload.prompt || "").trim();
      if (!isJournalWorthy(text)) return;
      appendJournal({
        ts: new Date().toISOString(),
        cwd: payload.cwd,
        text: text.slice(0, JOURNAL_MAX_TEXT),
      });
    } catch {
      // swallow everything: a broken journal entry is never worth a broken prompt
    }
    return;
  }

  const text = str(flags, "text");
  if (text) {
    if (!isJournalWorthy(text.trim())) {
      throw new Error(
        `journal --text needs a non-command prompt of at least ${JOURNAL_MIN_LENGTH} chars`,
      );
    }
    appendJournal({
      ts: new Date().toISOString(),
      cwd: process.cwd(),
      text: text.trim().slice(0, JOURNAL_MAX_TEXT),
    });
    console.log("Journaled.");
    return;
  }

  if (bool(flags, "list")) {
    const limit = Number(str(flags, "limit") || JOURNAL_LIST_DEFAULT_LIMIT);
    const entries = readJournal().slice(-limit).reverse();
    if (!entries.length) {
      console.log("Journal is empty.");
      return;
    }
    for (const e of entries) {
      console.log(`[${e.ts.slice(0, 16)}] ${singleLine(e.text, 100)}`);
    }
    return;
  }

  throw new Error("journal requires --from-hook, --text \"...\", or --list");
}

const HARVEST_MIN_LENGTH = 40;
const HARVEST_DEFAULT_LIMIT = 20;
const HARVEST_DEFAULT_DAYS = 14;
const HARVEST_COVERED_CONFIDENCE = 0.75;

function cmdHarvest(flags: Flags): void {
  ensureLibrary();
  const limit = Number(str(flags, "limit") || HARVEST_DEFAULT_LIMIT);
  const days = Number(str(flags, "days") || HARVEST_DEFAULT_DAYS);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const seen = new Set<string>();
  const candidates = readJournal()
    .filter((e) => new Date(e.ts).getTime() >= cutoff)
    .filter((e) => e.text.length >= HARVEST_MIN_LENGTH)
    .filter((e) => {
      if (seen.has(e.text)) return false;
      seen.add(e.text);
      return true;
    })
    .reverse()
    .slice(0, limit);

  if (!candidates.length) {
    console.log(
      `No harvest candidates in the last ${days}d (min ${HARVEST_MIN_LENGTH} chars).`,
    );
    console.log(
      "Prompts land in the journal via `keepfire journal --from-hook` (agent hook) or --text.",
    );
    return;
  }

  const rows = candidates.map((e, i) => {
    const top = searchRecipes(e.text, { limit: 1 })[0];
    const covered =
      top && scoreToConfidence(top.score) >= HARVEST_COVERED_CONFIDENCE;
    return {
      n: i + 1,
      ts: e.ts.slice(0, 10),
      status: covered ? `covered-by:${top.recipe.id}` : "NEW",
      cwd: e.cwd,
      text: e.text,
    };
  });

  if (bool(flags, "json")) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  console.log(`## Harvest candidates (last ${days}d)`);
  for (const r of rows) {
    console.log(`${r.n}. [${r.ts}] ${r.status}`);
    console.log(`   ${singleLine(r.text, 120)}`);
  }
  console.log("");
  console.log(
    'Keep one with: keepfire keep --title "..." --prompt-file <file>  (or /keep in your agent)',
  );
}

function isJournalWorthy(text: string): boolean {
  if (!text || text.length < JOURNAL_MIN_LENGTH) return false;
  if (text.startsWith("/")) return false; // slash commands are never sparks
  return true;
}

function singleLine(s: string, max: number): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function readFileFlag(flags: Flags, key: string): string | undefined {
  const file = str(flags, key);
  if (!file) return undefined;
  if (!fs.existsSync(file)) {
    throw new Error(`--${key}: file not found: ${file}`);
  }
  return fs.readFileSync(file, "utf8").trim() || undefined;
}

function cmdStats(): void {
  ensureLibrary();
  const cards = listCards();
  const byIntent = new Map<string, number>();
  let uses = 0;
  for (const c of cards) {
    byIntent.set(c.intent, (byIntent.get(c.intent) || 0) + 1);
    uses += c.use_count;
  }
  console.log(`recipes: ${cards.length}`);
  console.log(`total uses: ${uses}`);
  console.log("by intent:");
  for (const [k, v] of [...byIntent.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
}

function readStdinIfPiped(): string | undefined {
  if (process.stdin.isTTY) return undefined;
  try {
    return fs.readFileSync(0, "utf8").trim() || undefined;
  } catch {
    return undefined;
  }
}

// Ensure shebang path works when executed via node dist/cli.js
const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect || process.argv[1]?.endsWith(`${path.sep}cli.ts`) || process.argv[1]?.endsWith(`${path.sep}cli.js`)) {
  main();
}

export { main };
