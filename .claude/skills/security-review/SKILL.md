---
name: security-review
description: Security review of pending changes in Yojo Holidays (Next.js 16 + Supabase Postgres + Zod). Use when asked to security-review, audit, or check changes before deploy.
---

# Security review

1. Collect the diff: `git diff main...HEAD` plus `git diff` for uncommitted work.
2. Walk every changed file against [checklist.md](checklist.md).
3. For each finding, give: file:line, the concrete exploit scenario, severity (high/medium/low), and a fix.
4. Only report issues you can tie to a real code path. No generic advice.
5. If nothing is found, say so plainly and list what was checked.
