---
name: organize-workspace
description: Define or repair the context architecture of a development workspace containing one or more repositories. Use when creating a workspace, separating company and personal ownership, locating projects and experiments, cleaning a multi-project directory, documenting workspace structure, or deciding where source and machine-local artifacts belong.
---

# Organize Workspace

Read [references/workspace-context-model.md](references/workspace-context-model.md), then produce:

- a map of ownership or access scopes, repositories, experiments, archives,
  shared tools, and machine-local artifacts;
- the responsibility and lifecycle of each observed area;
- a target map for ambiguous or mixed areas;
- an explicit old-path to new-path mapping when filesystem changes are part of
  the request.

Use the semantic layers from the reference without requiring its example names
or pre-creating unused categories.

A workspace-level `CLAUDE.md`, when present, owns the workspace map and shared
context entry points. Each repository owns its project structure and rules.

When the workspace is also used with another agent CLI, keep one canonical
workspace context file and have the other harness's entry point import it. See
the `maintain-project-context` skill for the bridging rule.
