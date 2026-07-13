---
name: harvesting-sparks
description: Use when the user says /harvest, asks to review recent prompts for keepers, or wonders what good prompts they forgot to save — mines the local prompt journal (~/.keepfire/journal.jsonl) that this plugin's hook records automatically.
---

# Harvesting Sparks

This plugin journals the user's prompts locally (a `UserPromptSubmit` hook appends to
`~/.keepfire/journal.jsonl` — slash commands and very short messages are skipped, and
nothing leaves the machine). Harvesting mines that journal for sparks the user forgot
to keep in the moment.

<HARD-GATE>
Harvest is curation, NOT import. Never bulk-save journal entries. Propose only the
few that meet the recipe quality bar, and save only on the user's explicit yes.
</HARD-GATE>

## Checklist

1. **List candidates:**

```bash
keepfire harvest --limit 20        # add --days 30 to look further back
```

No CLI? Read `~/.keepfire/journal.jsonl` directly: one JSON object per line with
`ts`, `cwd`, `text`. Skip entries under 40 chars and exact duplicates.

2. **Read the output:** entries marked `NEW` have no similar recipe yet;
   `covered-by:<id>` means one already exists — skip those unless the journal
   version is clearly better (then it's an `improve`, not a new keep).

3. **Filter by the quality bar:** keep only prompts that encode a reusable
   **process** (reproduce → isolate → minimal fix; review by severity; etc.).
   One-off questions and context-bound requests are not sparks.

4. **Propose the top 1–3** as short draft summaries: title + intent + why it's worth keeping.

5. **On approval, capture each** via the capturing-sparks skill (full extraction:
   skeleton, constraints, output contract, triggers).

## Rhythm

If the user has never harvested, suggest a weekly cadence — the journal only pays off
when it's mined. If the journal is empty, check that the plugin's hook is active
(`/hooks` shows `UserPromptSubmit`) and that prompts since installation exist.
