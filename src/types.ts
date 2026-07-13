export type Intent =
  | "implement"
  | "debug"
  | "review"
  | "refactor"
  | "test"
  | "explain"
  | "design"
  | "git-pr"
  | "perf"
  | "security"
  | "other";

export type CaptureMode = "confirm" | "auto";
export type UseMode = "always_ask" | "ask_if_low_confidence" | "auto";

export interface KeepfireConfig {
  version: number;
  capture_mode: CaptureMode;
  use_mode: UseMode;
  auto_suggest: boolean;
  auto_apply_threshold: number;
  recall_top_k: number;
  default_source: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  ts: string;
  cwd?: string;
  text: string;
}

export interface RecipeCard {
  id: string;
  title: string;
  intent: Intent;
  raw_prompt: string;
  skeleton: string;
  constraints: string[];
  output_contract: string;
  good_signals: string[];
  anti_patterns: string[];
  stack_hints: string[];
  trigger_phrases: string[];
  tags: string[];
  quality: number | null;
  use_count: number;
  source: string;
  created_at: string;
  updated_at: string;
  version: number;
  parent_id?: string;
  notes?: string;
}

export interface IndexEntry {
  id: string;
  title: string;
  intent: Intent;
  stack_hints: string[];
  tags: string[];
  trigger_phrases: string[];
  quality: number | null;
  use_count: number;
  updated_at: string;
  path: string;
}

export interface RecipeIndex {
  version: number;
  updated_at: string;
  recipes: IndexEntry[];
}

export interface KeepDraft {
  title: string;
  intent?: Intent;
  raw_prompt: string;
  skeleton?: string;
  constraints?: string[];
  output_contract?: string;
  good_signals?: string[];
  anti_patterns?: string[];
  stack_hints?: string[];
  trigger_phrases?: string[];
  tags?: string[];
  quality?: number | null;
  source?: string;
  notes?: string;
}

export interface SearchHit {
  recipe: RecipeCard;
  score: number;
  reasons: string[];
}
