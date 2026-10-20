## Engineering Context Framework

### Context Layers

- Global `CLAUDE.md`: stable context shared across projects on this machine.
- Project `AGENTS.md`: stable repository identity, structure map,
  project-specific boundaries, and context entry points. The project
  `CLAUDE.md` imports it with `@AGENTS.md`.
- `README.md` and `docs/INDEX.md`: project and documentation maps.
- `docs/project-status.md`: current phase, verified capabilities, known gaps,
  active initiative, and next milestone.
- `.agents/plans/`: local working context for active multi-stage initiatives;
  `.claude/plans/` links here.
- Durable project documents: confirmed requirements, designs, contracts,
  decisions, analyses, and runbooks.
- Git, issues, and pull requests: historical record.
