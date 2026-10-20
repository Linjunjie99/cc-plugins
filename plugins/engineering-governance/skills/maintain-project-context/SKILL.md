---
name: maintain-project-context
description: Establish, audit, or simplify a repository's persistent context and documentation architecture. Use for new project setup, AGENTS.md and CLAUDE.md design, project-status creation, documentation indexing, multi-stage plan management, project handoff, documentation cleanup, repository restructuring, making a repository usable from both Claude Code and Codex, or when Claude repeatedly has to rediscover the same project background and current state.
allowed-tools:
  - Read
  - Bash(python3 "${CLAUDE_PLUGIN_ROOT}/skills/maintain-project-context/scripts/link_plans.py" *)
---

# Maintain Project Context

Read [references/project-context-model.md](references/project-context-model.md) before designing or auditing a
project. Classify relevant repository information as stable project context,
current status, active execution state, durable knowledge, or history.

## Project Context Map

Produce a map covering:

- repository identity and component or directory ownership;
- project context entry points and active-plan location;
- current-status ownership;
- durable documentation categories and their authoritative documents;
- historical or superseded material;
- local data, credentials, environments, models, outputs, and other
  non-versioned artifacts.

Identify duplicate owners, mixed lifetimes, missing entry points, and documents
that are not discoverable from the context map.

## Resulting Structure

- Keep stable project context and exact repository paths in the project
  `AGENTS.md`, which `CLAUDE.md` imports.
- Keep the current snapshot in one project-status document when the project
  needs persistent stage tracking.
- Keep active multi-stage working context in an ignored plan under
  `.agents/plans/` or the project's declared shared work tracker.
- Keep confirmed long-term information in its matching durable document.
- Keep historical sequence in Git or the declared work tracker.

Use the templates in `assets/` as section menus. Keep only sections that match
the project's actual structure and lifecycle.

## Harness Entry Points

`AGENTS.md` owns the shared project context; `CLAUDE.md` is `@AGENTS.md` plus
optional Claude Code-only notes (`assets/claude-entry-template.md`). Write
shared content in harness-neutral terms. The reference's Harness Entry Points
section defines the split and how to convert a repository that has only
`CLAUDE.md` or both files. Confirm with the user before removing content from a
populated file.

## Plan Directory

Active plans live in `.agents/plans/`, with `.codex/plans` and `.claude/plans`
as symlinks to it. Create or repair the layout, including merging a legacy real
directory and fixing `.gitignore`, with:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/maintain-project-context/scripts/link_plans.py" [--dry-run] [<repository-root>]
```

The script refuses on a file-name conflict or a link pointing elsewhere and
changes nothing in that case.
