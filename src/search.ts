import { listCards } from "./store.js";
import type { Intent, RecipeCard, SearchHit } from "./types.js";

const INTENT_ALIASES: Record<string, Intent[]> = {
  implement: ["implement"],
  impl: ["implement"],
  feature: ["implement"],
  build: ["implement"],
  add: ["implement"],
  debug: ["debug"],
  fix: ["debug"],
  bug: ["debug"],
  error: ["debug"],
  crash: ["debug"],
  review: ["review"],
  pr: ["review", "git-pr"],
  audit: ["review", "security"],
  refactor: ["refactor"],
  clean: ["refactor"],
  test: ["test"],
  unit: ["test"],
  coverage: ["test"],
  explain: ["explain"],
  understand: ["explain"],
  design: ["design"],
  architecture: ["design"],
  api: ["design", "implement"],
  commit: ["git-pr"],
  git: ["git-pr"],
  perf: ["perf"],
  performance: ["perf"],
  slow: ["perf"],
  security: ["security"],
  vuln: ["security"],
  xss: ["security"],
  injection: ["security"],
};

export function searchRecipes(
  query: string,
  opts: {
    intent?: Intent;
    stack?: string[];
    limit?: number;
    root?: string;
  } = {},
): SearchHit[] {
  const q = query.trim().toLowerCase();
  const tokens = tokenize(q);
  const cards = listCards(opts.root);
  const intentHint = opts.intent || guessIntent(tokens);
  const stack = (opts.stack || []).map((s) => s.toLowerCase());

  const hits: SearchHit[] = cards.map((recipe) => {
    const reasons: string[] = [];
    let score = 0;

    if (intentHint && recipe.intent === intentHint) {
      score += 4;
      reasons.push(`intent:${recipe.intent}`);
    } else if (intentHint) {
      score -= 0.5;
    }

    for (const t of tokens) {
      if (recipe.title.toLowerCase().includes(t)) {
        score += 3;
        reasons.push(`title:${t}`);
      }
      if (recipe.tags.some((tag) => tag.includes(t) || t.includes(tag))) {
        score += 2;
        reasons.push(`tag:${t}`);
      }
      if (recipe.stack_hints.some((s) => s.includes(t) || t.includes(s))) {
        score += 2;
        reasons.push(`stack:${t}`);
      }
      if (recipe.trigger_phrases.some((p) => p.toLowerCase().includes(t))) {
        score += 3;
        reasons.push(`trigger:${t}`);
      }
      if (recipe.skeleton.toLowerCase().includes(t)) {
        score += 1;
        reasons.push(`skeleton:${t}`);
      }
      if (recipe.raw_prompt.toLowerCase().includes(t)) {
        score += 0.5;
      }
      if (recipe.good_signals.some((g) => g.toLowerCase().includes(t))) {
        score += 1;
      }
    }

    for (const s of stack) {
      if (recipe.stack_hints.includes(s)) {
        score += 2.5;
        reasons.push(`stack-filter:${s}`);
      }
    }

    if (recipe.quality) score += recipe.quality * 0.35;
    score += Math.min(recipe.use_count, 20) * 0.08;

    // light phrase overlap boost
    score += jaccard(
      tokens,
      tokenize(
        [
          recipe.title,
          recipe.tags.join(" "),
          recipe.trigger_phrases.join(" "),
          recipe.stack_hints.join(" "),
        ].join(" "),
      ),
    ) * 3;

    return { recipe, score, reasons: uniq(reasons).slice(0, 6) };
  });

  return hits
    .filter((h) => (q ? h.score > 0 : true))
    .sort((a, b) => b.score - a.score || b.recipe.use_count - a.recipe.use_count)
    .slice(0, opts.limit ?? 10);
}

export function formatSearchHits(hits: SearchHit[]): string {
  if (!hits.length) return "No matching recipes.";
  return hits
    .map((h, i) => {
      const r = h.recipe;
      const meta = [
        r.intent,
        r.stack_hints.slice(0, 3).join(",") || "any-stack",
        r.quality ? `q${r.quality}` : "unrated",
        `used ${r.use_count}x`,
        `score ${h.score.toFixed(2)}`,
      ].join(" · ");
      return `${i + 1}. ${r.title}  [${r.id}]\n   ${meta}\n   why: ${h.reasons.join(", ") || "general match"}`;
    })
    .join("\n");
}

export function renderAdaptedPrompt(
  recipe: RecipeCard,
  task: string,
): string {
  const vars = extractVars(recipe.skeleton);
  const filled = applyNaiveFill(recipe.skeleton, task, vars);

  const parts = [
    `# Keepfire recipe: ${recipe.title}`,
    `Intent: ${recipe.intent}`,
    recipe.stack_hints.length
      ? `Stack hints: ${recipe.stack_hints.join(", ")}`
      : null,
    "",
    "## Task",
    task.trim(),
    "",
    "## Recipe to follow",
    filled,
    "",
  ];

  if (recipe.constraints.length) {
    parts.push("## Constraints", ...recipe.constraints.map((c) => `- ${c}`), "");
  }
  if (recipe.output_contract) {
    parts.push("## Output contract", recipe.output_contract, "");
  }
  if (recipe.good_signals.length) {
    parts.push(
      "## Preserve these qualities",
      ...recipe.good_signals.map((c) => `- ${c}`),
      "",
    );
  }
  if (recipe.anti_patterns.length) {
    parts.push(
      "## Avoid",
      ...recipe.anti_patterns.map((c) => `- ${c}`),
      "",
    );
  }

  parts.push(
    "## Instructions for the agent",
    "Adapt the recipe to the current task and repository context.",
    "Do not copy outdated file names or project-specific details blindly.",
    "Prefer a minimal, correct change. State assumptions before large edits.",
    "",
  );

  return parts.filter((p) => p !== null).join("\n");
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9_\u4e00-\u9fff+#.]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

function guessIntent(tokens: string[]): Intent | undefined {
  for (const t of tokens) {
    const hit = INTENT_ALIASES[t];
    if (hit?.[0]) return hit[0];
  }
  return undefined;
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

function extractVars(skeleton: string): string[] {
  const out = new Set<string>();
  const re = /\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(skeleton))) out.add(m[1]);
  return [...out];
}

function applyNaiveFill(
  skeleton: string,
  task: string,
  vars: string[],
): string {
  let out = skeleton;
  const preferred =
    vars.find((v) => /^task$/i.test(v)) ||
    vars.find((v) => /^(request|goal|input|context)$/i.test(v)) ||
    vars.find((v) => /task|request|goal|context|input/i.test(v)) ||
    vars[0];
  if (preferred) {
    out = out.replace(
      new RegExp(`\\{\\{\\s*${escapeReg(preferred)}\\s*\\}\\}`, "g"),
      task.trim(),
    );
  }
  // leave other vars as-is for the agent to fill from context
  if (!/\{\{\s*task\s*\}\}/i.test(skeleton) && !out.includes(task.trim())) {
    out = `${out.trim()}\n\nCurrent task:\n${task.trim()}`;
  }
  return out;
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr)];
}
