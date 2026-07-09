import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  deleteCard,
  improveCard,
  listCards,
  readCard,
  saveDraft,
} from "../src/store.js";
import { renderAdaptedPrompt, searchRecipes } from "../src/search.js";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "keepfire-test-"));
}

test("save, search, use adaptation, improve, delete", () => {
  const root = tempRoot();
  process.env.KEEPFIRE_HOME = root;

  const card = saveDraft(
    {
      title: "PR security review",
      intent: "security",
      raw_prompt:
        "Review this PR for security issues. Prioritize auth and injection. Output Critical/Warning/Suggestion.",
      skeleton:
        "Review {{diff}} for security issues. Prioritize auth and injection.\nCurrent task:\n{{task}}",
      constraints: ["minimal diffs", "no drive-by refactors"],
      output_contract: "Severity-ranked findings with fixes",
      good_signals: ["prioritized vulns", "actionable fixes"],
      anti_patterns: ["style nits first"],
      stack_hints: ["ts", "node"],
      trigger_phrases: ["审PR", "security review"],
      tags: ["pr", "security"],
      quality: 5,
      source: "test",
    },
    root,
  );

  assert.ok(card.id);
  assert.equal(listCards(root).length, 1);

  const hits = searchRecipes("security review PR auth", {
    root,
    limit: 3,
  });
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].recipe.id, card.id);

  const adapted = renderAdaptedPrompt(card, "Check the payment webhook PR");
  assert.match(adapted, /payment webhook PR/);
  assert.match(adapted, /Keepfire recipe/);
  assert.doesNotMatch(adapted, /\{\{\s*task\s*\}\}/);

  const zhHits = searchRecipes("安全 审查 PR", { root, limit: 3 });
  assert.ok(zhHits.length >= 1);

  const v2 = improveCard(
    card.id,
    {
      note: "Add repro steps",
      good_signals: ["prioritized vulns", "repro first"],
    },
    root,
  );
  assert.equal(v2.version, 2);
  assert.equal(v2.parent_id, card.id);
  assert.ok(readCard(v2.id, root));

  assert.equal(deleteCard(card.id, root), true);
  assert.equal(deleteCard(v2.id, root), true);
  assert.equal(listCards(root).length, 0);

  fs.rmSync(root, { recursive: true, force: true });
  delete process.env.KEEPFIRE_HOME;
});

test("listCards rebuilds when index missing entries", () => {
  const root = tempRoot();
  process.env.KEEPFIRE_HOME = root;

  const card = saveDraft(
    {
      title: "tiny",
      raw_prompt: "hello {{task}}",
      intent: "other",
    },
    root,
  );

  // Corrupt index intentionally
  fs.writeFileSync(
    path.join(root, "index.json"),
    JSON.stringify({ version: 1, updated_at: new Date().toISOString(), recipes: [] }, null, 2),
  );

  const listed = listCards(root);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, card.id);

  fs.rmSync(root, { recursive: true, force: true });
  delete process.env.KEEPFIRE_HOME;
});
