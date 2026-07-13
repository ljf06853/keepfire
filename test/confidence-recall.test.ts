import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  appendJournal,
  readJournal,
  resolveCardId,
  saveDraft,
} from "../src/store.js";
import { scoreToConfidence, searchRecipes } from "../src/search.js";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "keepfire-test-"));
}

test("scoreToConfidence maps scores into a usable 0..1 range", () => {
  assert.equal(scoreToConfidence(0), 0);
  assert.equal(scoreToConfidence(-3), 0);

  // Monotonic
  assert.ok(scoreToConfidence(2) < scoreToConfidence(4));
  assert.ok(scoreToConfidence(4) < scoreToConfidence(8));

  // A loose single-signal match stays below the default threshold (0.75)...
  assert.ok(scoreToConfidence(3.5) < 0.75);
  // ...while a strong multi-signal match (trigger + intent + stack) clears it.
  assert.ok(scoreToConfidence(8) >= 0.75);

  // Clamped
  assert.ok(scoreToConfidence(1000) <= 1);
});

test("a strong search hit clears the default auto-apply threshold", () => {
  const root = tempRoot();
  process.env.KEEPFIRE_HOME = root;

  saveDraft(
    {
      title: "PR security review",
      intent: "security",
      raw_prompt: "Review this PR for security issues.",
      skeleton: "Review {{diff}} for security issues.\n{{task}}",
      stack_hints: ["ts", "node"],
      trigger_phrases: ["security review", "审PR"],
      tags: ["pr", "security"],
      quality: 5,
      source: "test",
    },
    root,
  );

  const hits = searchRecipes("security review this ts node PR", { root });
  assert.ok(hits.length >= 1);
  assert.ok(
    scoreToConfidence(hits[0].score) >= 0.75,
    `expected strong match to clear threshold, got score=${hits[0].score}`,
  );

  fs.rmSync(root, { recursive: true, force: true });
  delete process.env.KEEPFIRE_HOME;
});

test("resolveCardId matches exact ids and unique fragments", () => {
  const root = tempRoot();
  process.env.KEEPFIRE_HOME = root;

  const a = saveDraft(
    { title: "alpha recipe", raw_prompt: "prompt a", intent: "other" },
    root,
  );
  const b = saveDraft(
    { title: "beta recipe", raw_prompt: "prompt b", intent: "other" },
    root,
  );

  assert.equal(resolveCardId(a.id, root), a.id);
  assert.equal(resolveCardId("alpha", root), a.id);
  assert.equal(resolveCardId(b.id.slice(-4), root), b.id);

  // "recipe" appears in both slugs → ambiguous
  assert.throws(() => resolveCardId("recipe", root), /Ambiguous/);
  assert.throws(() => resolveCardId("no-such-card", root), /not found/);

  fs.rmSync(root, { recursive: true, force: true });
  delete process.env.KEEPFIRE_HOME;
});

test("journal appends, survives corrupt lines, and reads back in order", () => {
  const root = tempRoot();
  process.env.KEEPFIRE_HOME = root;

  appendJournal({ ts: "2026-07-13T10:00:00.000Z", cwd: "/proj", text: "first spark" }, root);
  appendJournal({ ts: "2026-07-13T11:00:00.000Z", text: "second spark" }, root);

  // Corrupt line in the middle must be skipped, not fatal
  fs.appendFileSync(path.join(root, "journal.jsonl"), "{not json}\n", "utf8");
  appendJournal({ ts: "2026-07-13T12:00:00.000Z", text: "third spark" }, root);

  const entries = readJournal(root);
  assert.equal(entries.length, 3);
  assert.equal(entries[0].text, "first spark");
  assert.equal(entries[0].cwd, "/proj");
  assert.equal(entries[2].text, "third spark");

  fs.rmSync(root, { recursive: true, force: true });
  delete process.env.KEEPFIRE_HOME;
});
