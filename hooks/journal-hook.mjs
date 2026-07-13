#!/usr/bin/env node
// UserPromptSubmit hook: append the user's prompt to the local keepfire journal.
//
// Self-contained on purpose — node builtins only, no build step, no CLI needed —
// so it works the moment the plugin is installed, before `npm run build` ever runs.
// Same filtering semantics as `keepfire journal --from-hook`.
//
// Must never fail loudly: a broken journal entry is never worth a broken prompt.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MIN_LENGTH = 12;
const MAX_TEXT = 4000;

try {
  const raw = fs.readFileSync(0, "utf8").trim();
  if (raw) {
    const payload = JSON.parse(raw);
    const text = (payload.prompt || "").trim();
    if (text.length >= MIN_LENGTH && !text.startsWith("/")) {
      const root =
        process.env.KEEPFIRE_HOME?.trim() || path.join(os.homedir(), ".keepfire");
      fs.mkdirSync(root, { recursive: true });
      fs.appendFileSync(
        path.join(root, "journal.jsonl"),
        JSON.stringify({
          ts: new Date().toISOString(),
          cwd: payload.cwd,
          text: text.slice(0, MAX_TEXT),
        }) + "\n",
        "utf8",
      );
    }
  }
} catch {
  // swallow everything
}
