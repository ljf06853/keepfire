import fs from "node:fs";
import path from "node:path";
import {
  cardsDir,
  configPath,
  homeDir,
  indexPath,
} from "./paths.js";
import type {
  IndexEntry,
  KeepDraft,
  KeepfireConfig,
  RecipeCard,
  RecipeIndex,
} from "./types.js";

const CONFIG_VERSION = 1;
const INDEX_VERSION = 1;

export function defaultConfig(): KeepfireConfig {
  const now = nowIso();
  return {
    version: CONFIG_VERSION,
    capture_mode: "confirm",
    use_mode: "ask_if_low_confidence",
    auto_apply_threshold: 0.88,
    recall_top_k: 3,
    default_source: "agent",
    created_at: now,
    updated_at: now,
  };
}

export function ensureLibrary(root = homeDir()): void {
  fs.mkdirSync(cardsDir(root), { recursive: true });
  const cfg = configPath(root);
  if (!fs.existsSync(cfg)) {
    writeJson(cfg, defaultConfig());
  }
  const idx = indexPath(root);
  if (!fs.existsSync(idx)) {
    writeJson(idx, emptyIndex());
  }
}

export function readConfig(root = homeDir()): KeepfireConfig {
  ensureLibrary(root);
  const raw = readJson<Partial<KeepfireConfig>>(configPath(root));
  return { ...defaultConfig(), ...raw, version: CONFIG_VERSION };
}

export function writeConfig(
  patch: Partial<KeepfireConfig>,
  root = homeDir(),
): KeepfireConfig {
  ensureLibrary(root);
  const next: KeepfireConfig = {
    ...readConfig(root),
    ...patch,
    version: CONFIG_VERSION,
    updated_at: nowIso(),
  };
  writeJson(configPath(root), next);
  return next;
}

export function readIndex(root = homeDir()): RecipeIndex {
  ensureLibrary(root);
  const raw = readJson<Partial<RecipeIndex>>(indexPath(root));
  return {
    version: INDEX_VERSION,
    updated_at: raw.updated_at || nowIso(),
    recipes: Array.isArray(raw.recipes) ? raw.recipes : [],
  };
}

export function rebuildIndex(root = homeDir()): RecipeIndex {
  ensureLibrary(root);
  const dir = cardsDir(root);
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const recipes: IndexEntry[] = [];
  for (const file of files) {
    const full = path.join(dir, file);
    try {
      const card = parseCardMarkdown(fs.readFileSync(full, "utf8"));
      recipes.push(toIndexEntry(card, file));
    } catch {
      // skip corrupt cards
    }
  }
  const index: RecipeIndex = {
    version: INDEX_VERSION,
    updated_at: nowIso(),
    recipes,
  };
  writeJson(indexPath(root), index);
  return index;
}

export function listCards(root = homeDir()): RecipeCard[] {
  ensureLibrary(root);
  const dir = cardsDir(root);
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"));
  const index = readIndex(root);

  // Rebuild if index is empty but cards exist, or counts diverge hard.
  if (files.length !== index.recipes.length) {
    rebuildIndex(root);
  }

  const fresh = readIndex(root);
  const cards: RecipeCard[] = [];
  for (const entry of fresh.recipes) {
    const card = readCard(entry.id, root);
    if (card) cards.push(card);
  }

  // Fallback: scan files directly if index still empty
  if (!cards.length && files.length) {
    for (const file of files) {
      try {
        cards.push(
          parseCardMarkdown(fs.readFileSync(path.join(dir, file), "utf8")),
        );
      } catch {
        // skip
      }
    }
  }
  return cards;
}

export function readCard(id: string, root = homeDir()): RecipeCard | null {
  const file = cardFilePath(id, root);
  if (!fs.existsSync(file)) return null;
  return parseCardMarkdown(fs.readFileSync(file, "utf8"));
}

export function saveDraft(
  draft: KeepDraft,
  root = homeDir(),
): RecipeCard {
  ensureLibrary(root);
  const now = nowIso();
  const id = makeId(draft.title, now);
  const card: RecipeCard = {
    id,
    title: draft.title.trim() || "Untitled recipe",
    intent: draft.intent || "other",
    raw_prompt: draft.raw_prompt.trim(),
    skeleton: (draft.skeleton || draft.raw_prompt).trim(),
    constraints: cleanList(draft.constraints),
    output_contract: (draft.output_contract || "").trim(),
    good_signals: cleanList(draft.good_signals),
    anti_patterns: cleanList(draft.anti_patterns),
    stack_hints: cleanList(draft.stack_hints).map((s) => s.toLowerCase()),
    trigger_phrases: cleanList(draft.trigger_phrases),
    tags: cleanList(draft.tags).map((s) => s.toLowerCase()),
    quality: normalizeQuality(draft.quality),
    use_count: 0,
    source: draft.source?.trim() || readConfig(root).default_source,
    created_at: now,
    updated_at: now,
    version: 1,
    notes: draft.notes?.trim() || undefined,
  };

  if (!card.raw_prompt) {
    throw new Error("raw_prompt is required");
  }

  writeCard(card, root);
  upsertIndex(card, root);
  return card;
}

export function updateCard(
  id: string,
  patch: Partial<RecipeCard>,
  root = homeDir(),
): RecipeCard {
  const existing = readCard(id, root);
  if (!existing) throw new Error(`Recipe not found: ${id}`);
  const next: RecipeCard = {
    ...existing,
    ...patch,
    id: existing.id,
    created_at: existing.created_at,
    updated_at: nowIso(),
  };
  writeCard(next, root);
  upsertIndex(next, root);
  return next;
}

export function bumpUse(id: string, root = homeDir()): RecipeCard {
  const card = readCard(id, root);
  if (!card) throw new Error(`Recipe not found: ${id}`);
  return updateCard(
    id,
    {
      use_count: card.use_count + 1,
    },
    root,
  );
}

export function deleteCard(id: string, root = homeDir()): boolean {
  const file = cardFilePath(id, root);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  const index = readIndex(root);
  index.recipes = index.recipes.filter((r) => r.id !== id);
  index.updated_at = nowIso();
  writeJson(indexPath(root), index);
  return true;
}

export function improveCard(
  id: string,
  draft: Partial<KeepDraft> & { note?: string },
  root = homeDir(),
): RecipeCard {
  const parent = readCard(id, root);
  if (!parent) throw new Error(`Recipe not found: ${id}`);
  const now = nowIso();
  const nextVersion = parent.version + 1;
  const newId = `${parent.id}-v${nextVersion}`;
  const child: RecipeCard = {
    ...parent,
    id: newId,
    title: draft.title?.trim() || parent.title,
    intent: draft.intent || parent.intent,
    raw_prompt: draft.raw_prompt?.trim() || parent.raw_prompt,
    skeleton: draft.skeleton?.trim() || parent.skeleton,
    constraints: draft.constraints
      ? cleanList(draft.constraints)
      : parent.constraints,
    output_contract:
      draft.output_contract?.trim() || parent.output_contract,
    good_signals: draft.good_signals
      ? cleanList(draft.good_signals)
      : parent.good_signals,
    anti_patterns: draft.anti_patterns
      ? cleanList(draft.anti_patterns)
      : parent.anti_patterns,
    stack_hints: draft.stack_hints
      ? cleanList(draft.stack_hints).map((s) => s.toLowerCase())
      : parent.stack_hints,
    trigger_phrases: draft.trigger_phrases
      ? cleanList(draft.trigger_phrases)
      : parent.trigger_phrases,
    tags: draft.tags
      ? cleanList(draft.tags).map((s) => s.toLowerCase())
      : parent.tags,
    quality:
      draft.quality === undefined
        ? parent.quality
        : normalizeQuality(draft.quality),
    use_count: 0,
    source: draft.source?.trim() || parent.source,
    created_at: now,
    updated_at: now,
    version: nextVersion,
    parent_id: parent.id,
    notes: draft.notes?.trim() || draft.note?.trim() || parent.notes,
  };
  writeCard(child, root);
  upsertIndex(child, root);
  return child;
}

export function renderCardMarkdown(card: RecipeCard): string {
  const fm = {
    id: card.id,
    title: card.title,
    intent: card.intent,
    stack_hints: card.stack_hints,
    tags: card.tags,
    trigger_phrases: card.trigger_phrases,
    quality: card.quality,
    use_count: card.use_count,
    source: card.source,
    created_at: card.created_at,
    updated_at: card.updated_at,
    version: card.version,
    parent_id: card.parent_id || null,
  };

  const lines = [
    "---",
    ...Object.entries(fm).map(([k, v]) => `${k}: ${toYamlValue(v)}`),
    "---",
    "",
    `# ${card.title}`,
    "",
    "## Raw prompt",
    "",
    "```text",
    card.raw_prompt,
    "```",
    "",
    "## Skeleton",
    "",
    "```text",
    card.skeleton,
    "```",
    "",
    "## Constraints",
    "",
    ...(card.constraints.length
      ? card.constraints.map((c) => `- ${c}`)
      : ["- (none)"]),
    "",
    "## Output contract",
    "",
    card.output_contract || "(not specified)",
    "",
    "## Why it worked",
    "",
    ...(card.good_signals.length
      ? card.good_signals.map((c) => `- ${c}`)
      : ["- (not specified)"]),
    "",
    "## Anti-patterns",
    "",
    ...(card.anti_patterns.length
      ? card.anti_patterns.map((c) => `- ${c}`)
      : ["- (none)"]),
    "",
  ];

  if (card.notes) {
    lines.push("## Notes", "", card.notes, "");
  }

  return lines.join("\n");
}

export function parseCardMarkdown(md: string): RecipeCard {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error("Invalid recipe card: missing frontmatter");
  const fm = parseSimpleYaml(match[1]);
  const body = match[2];

  const raw_prompt = sectionCode(body, "Raw prompt") || String(fm.raw_prompt || "");
  const skeleton =
    sectionCode(body, "Skeleton") || raw_prompt || String(fm.skeleton || "");
  const constraints = sectionBullets(body, "Constraints");
  const output_contract = sectionText(body, "Output contract");
  const good_signals = sectionBullets(body, "Why it worked");
  const anti_patterns = sectionBullets(body, "Anti-patterns");
  const notes = sectionText(body, "Notes") || undefined;

  if (!fm.id || !fm.title) {
    throw new Error("Invalid recipe card: id and title required");
  }

  return {
    id: String(fm.id),
    title: String(fm.title),
    intent: (String(fm.intent || "other") as RecipeCard["intent"]) || "other",
    raw_prompt,
    skeleton,
    constraints: constraints.filter((c) => c !== "(none)"),
    output_contract: output_contract === "(not specified)" ? "" : output_contract,
    good_signals: good_signals.filter((c) => c !== "(not specified)"),
    anti_patterns: anti_patterns.filter((c) => c !== "(none)"),
    stack_hints: asStringArray(fm.stack_hints),
    trigger_phrases: asStringArray(fm.trigger_phrases),
    tags: asStringArray(fm.tags),
    quality:
      fm.quality === null || fm.quality === "null"
        ? null
        : normalizeQuality(Number(fm.quality)),
    use_count: Number(fm.use_count || 0),
    source: String(fm.source || "agent"),
    created_at: String(fm.created_at || nowIso()),
    updated_at: String(fm.updated_at || nowIso()),
    version: Number(fm.version || 1),
    parent_id: fm.parent_id && fm.parent_id !== "null" ? String(fm.parent_id) : undefined,
    notes,
  };
}

function writeCard(card: RecipeCard, root: string): void {
  const file = cardFilePath(card.id, root);
  fs.writeFileSync(file, renderCardMarkdown(card), "utf8");
}

function upsertIndex(card: RecipeCard, root: string): void {
  const index = readIndex(root);
  const entry = toIndexEntry(card, `${card.id}.md`);
  const i = index.recipes.findIndex((r) => r.id === card.id);
  if (i >= 0) index.recipes[i] = entry;
  else index.recipes.push(entry);
  index.recipes.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  index.updated_at = nowIso();
  writeJson(indexPath(root), index);
}

function toIndexEntry(card: RecipeCard, fileName: string): IndexEntry {
  return {
    id: card.id,
    title: card.title,
    intent: card.intent,
    stack_hints: card.stack_hints,
    tags: card.tags,
    trigger_phrases: card.trigger_phrases,
    quality: card.quality,
    use_count: card.use_count,
    updated_at: card.updated_at,
    path: fileName,
  };
}

function cardFilePath(id: string, root: string): string {
  return path.join(cardsDir(root), `${id}.md`);
}

function emptyIndex(): RecipeIndex {
  return { version: INDEX_VERSION, updated_at: nowIso(), recipes: [] };
}

function makeId(title: string, iso: string): string {
  const day = iso.slice(0, 10);
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "recipe";
  const rand = Math.random().toString(36).slice(2, 6);
  return `${day}-${slug}-${rand}`;
}

function cleanList(v?: string[]): string[] {
  if (!v) return [];
  return [...new Set(v.map((x) => x.trim()).filter(Boolean))];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeQuality(q: number | null | undefined): number | null {
  if (q === undefined || q === null) return null;
  const n = Number(q);
  if (!Number.isFinite(n)) return null;
  return clamp(n, 1, 5);
}

function nowIso(): string {
  return new Date().toISOString();
}

function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function toYamlValue(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    return `[${v.map((x) => JSON.stringify(String(x))).join(", ")}]`;
  }
  return JSON.stringify(String(v));
}

function parseSimpleYaml(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let raw = line.slice(i + 1).trim();
    if (raw === "null") {
      out[key] = null;
      continue;
    }
    if (raw === "[]") {
      out[key] = [];
      continue;
    }
    if (raw.startsWith("[") && raw.endsWith("]")) {
      const inner = raw.slice(1, -1).trim();
      if (!inner) {
        out[key] = [];
        continue;
      }
      out[key] = inner.split(",").map((p) => stripQuotes(p.trim()));
      continue;
    }
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      out[key] = raw.slice(1, -1);
      continue;
    }
    if (/^-?\d+(\.\d+)?$/.test(raw)) {
      out[key] = Number(raw);
      continue;
    }
    if (raw === "true" || raw === "false") {
      out[key] = raw === "true";
      continue;
    }
    out[key] = raw;
  }
  return out;
}

function stripQuotes(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

function asStringArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}

function sectionCode(body: string, heading: string): string {
  const re = new RegExp(
    `##\\s+${escapeReg(heading)}\\s*\\n+\\\`\\\`\\\`(?:text)?\\n([\\s\\S]*?)\\n\\\`\\\`\\\``,
    "i",
  );
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

function sectionBullets(body: string, heading: string): string[] {
  const text = sectionBlock(body, heading);
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*-\s+/, "").trim())
    .filter(Boolean);
}

function sectionText(body: string, heading: string): string {
  return sectionBlock(body, heading).trim();
}

function sectionBlock(body: string, heading: string): string {
  const re = new RegExp(
    `##\\s+${escapeReg(heading)}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`,
    "i",
  );
  const m = body.match(re);
  return m ? m[1] : "";
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
