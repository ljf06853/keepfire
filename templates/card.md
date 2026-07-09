---
id: "YYYY-MM-DD-slug-xxxx"
title: "Short actionable title"
intent: "review"
stack_hints: ["ts", "node"]
tags: ["pr", "security"]
trigger_phrases: ["审PR", "security review"]
quality: null
use_count: 0
source: "claude-code"
created_at: "2026-07-09T00:00:00.000Z"
updated_at: "2026-07-09T00:00:00.000Z"
version: 1
parent_id: null
---

# Short actionable title

## Raw prompt

```text
Paste the final effective prompt that worked.
```

## Skeleton

```text
Review {{diff_or_files}} with security-first priority.
Focus on authz, injection, and untrusted input boundaries.
Output Critical / Warning / Suggestion with locations and fixes.
Avoid drive-by refactors.

Current task:
{{task}}
```

## Constraints

- Prefer minimal diffs
- Do not invent files that do not exist

## Output contract

Severity-ranked findings with file/line and concrete fix.

## Why it worked

- Forced prioritization instead of generic nits
- Required actionable fixes, not vague advice

## Anti-patterns

- Style-only comments when security issues exist

## Notes

Optional freeform notes.
