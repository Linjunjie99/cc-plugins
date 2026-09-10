## Engineering Context Framework

### Context Layers

- Global `CLAUDE.md`: stable context shared across projects on this machine.
- Project `CLAUDE.md`: stable repository identity, structure map,
  project-specific boundaries, and context entry points.
- `README.md` and `docs/INDEX.md`: project and documentation maps.
- `docs/project-status.md`: current phase, verified capabilities, known gaps,
  active initiative, and next milestone.
- `.claude/plans/`: local working context for active multi-stage initiatives.
- Durable project documents: confirmed requirements, designs, contracts,
  decisions, analyses, and runbooks.
- Git, issues, and pull requests: historical record.

### Multi-Harness Repositories

- A repository worked on with more than one agent CLI keeps one canonical
  project context file. Every other entry point imports it rather than
  restating it.
- When the repository already maintains `AGENTS.md`, that file stays
  canonical and `CLAUDE.md` imports it with `@AGENTS.md`.
- Keep one active-plan directory per repository and name it in the canonical
  project context file, so both harnesses resume from the same working memory.
- Harness-specific instructions stay in that harness's own entry point. Shared
  project facts never live in two files at once.
