---
description: Investigate and fix a GitHub issue by number
argument-hint: <issue-number>
---

Fix GitHub issue #$ARGUMENTS.

1. Read it with `gh issue view $ARGUMENTS`.
2. Find the relevant code; reproduce or explain the root cause before editing.
3. Make the smallest fix that follows the rules in CLAUDE.md and `.claude/rules/`.
4. Run `npm run check` (and `npm run db:verify` if data code changed).
5. Summarise the cause, the fix, and verification output. Don't commit unless asked.
