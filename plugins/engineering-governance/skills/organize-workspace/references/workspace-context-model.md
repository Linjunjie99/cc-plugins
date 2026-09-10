# Workspace Context Model

## Semantic Layers

```text
workspace/
  <ownership-or-access-scope>/
    projects/       versioned, maintained repositories
    experiments/    optional exploratory work without project status
    archives/       optional retained but inactive material
  shared-tools/     optional cross-scope tooling with explicit ownership
  local/            optional machine-local data, caches, or runtime state
```

This is a semantic model. Existing names such as `10_company`, `20_personal`,
`repos`, or `scratch` are valid when their meanings are already clear.

## Responsibilities

| Layer | Owns | Does not own |
| --- | --- | --- |
| Workspace | Navigation across ownership scopes and repositories | Project commands or project status |
| Ownership scope | Access, backup, and retention boundary | Technology-specific grouping |
| Project repository | One versioned product, service, monorepo, library, or durable analysis | Shared mutable environments or unrelated outputs |
| Experiment | Disposable or exploratory work with a named relationship to a project or topic | Undocumented production dependencies |
| Archive | Inactive material retained for reference | Current source of truth |
| Local artifacts | Credentials, datasets, environments, caches, models, outputs | Versioned source |

## Workspace Context Document

Create a workspace-level `CLAUDE.md` only when several repositories share
stable navigation or ownership context. It may name the scopes, project roots,
shared tooling, and storage boundaries. It does not restate rules or status
owned by individual repositories.

When the workspace is also used with another agent CLI, one workspace context
file stays canonical and the other harness's entry point imports it. Do not
maintain two workspace maps.

## Evaluation Questions

- Can a maintainer tell which ownership boundary a path belongs to?
- Can each repository be cloned and understood without another repository's
  mutable environment?
- Are experiments and archives visibly different from active projects?
- Are private or generated artifacts visibly different from versioned source?
- Does each shared tool have an explicit owner and reason to be shared?
