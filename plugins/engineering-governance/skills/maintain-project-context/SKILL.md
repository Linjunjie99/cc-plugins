---
name: maintain-project-context
description: Establish, audit, or simplify a repository's persistent context and documentation architecture. Use for new project setup, CLAUDE.md design, project-status creation, documentation indexing, multi-stage plan management, project handoff, documentation cleanup, repository restructuring, bridging a repository that is also used with another agent CLI such as AGENTS.md, or when Claude repeatedly has to rediscover the same project background and current state.
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
  `CLAUDE.md`.
- Keep the current snapshot in one project-status document when the project
  needs persistent stage tracking.
- Keep active multi-stage working context in an ignored local plan or the
  project's declared shared work tracker.
- Keep confirmed long-term information in its matching durable document.
- Keep historical sequence in Git or the declared work tracker.

Use the templates in `assets/` as section menus. Keep only sections that match
the project's actual structure and lifecycle.

## Multi-Harness Repositories

A repository may be worked on with more than one agent CLI. Claude Code reads
`CLAUDE.md`; another CLI may read `AGENTS.md`. Duplicating project context
across both files creates two owners for one fact and they drift apart.

Keep one canonical project context file and import it from the other entry
point:

- When the repository already maintains `AGENTS.md`, leave it canonical and
  make `CLAUDE.md` a bridge using `assets/claude-bridge-template.md`.
- When the repository has no other harness's file, `CLAUDE.md` is canonical and
  no bridge is needed.
- Never copy shared project facts into both files. Convert an existing
  duplicate into a bridge and delete the copied content.
- Keep genuinely harness-specific instructions below the import in the file
  that owns them.
- Declare one active-plan directory for the repository and name it in the
  canonical file, so either harness resumes from the same working memory.

Confirm with the user before converting an existing populated `CLAUDE.md` into
a bridge, and show what content will be removed as a duplicate.
