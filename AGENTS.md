# Claude Code Plugin Repository Guidance

This repository is a private Claude Code plugin marketplace named `cc-plugins`.
Treat the GitHub `main` branch as the published catalog and a local checkout as
the development source.

Its plugins are ports of those in the sibling `codex-plugins` marketplace. Both
marketplaces are meant to be installed on the same machine at once.

## Source And Branch Rules

- Never develop a plugin directly on `main`. Create or reuse a focused branch
  such as `feature/<plugin>-<change>` or `fix/<plugin>-<issue>`.
- Do not commit, merge, tag, or push unless the user asks for that Git action.
- On the development machine, `cc-plugins` must be registered as a local
  marketplace pointing at this repository root.
- On consumer machines, `cc-plugins` must be registered from the private GitHub
  repository.
- Do not register both the local checkout and the GitHub repository as separate
  copies of this marketplace on the same Claude Code installation. The
  marketplace name is `cc-plugins` in both modes; switch the configured source
  instead.
- Use `claude plugin marketplace add/remove/update` to manage marketplace
  configuration. Do not hand-edit `~/.claude/plugins/known_marketplaces.json`.

## Marketplace Manifest Rules

- `.claude-plugin/marketplace.json` is the published catalog.
- Change it only when adding, removing, renaming, relocating, or changing the
  category or description of a plugin. Ordinary plugin code and version updates
  do not require a marketplace entry change.
- Plugin source paths stay local and relative to the marketplace root:
  `./plugins/<plugin-name>`.
- A plugin directory name must match the `name` in its
  `.claude-plugin/plugin.json`.

## Plugin Structure Rules

- Each plugin uses `.claude-plugin/plugin.json`, never `.codex-plugin/`.
- Skills live at `skills/<name>/SKILL.md` and are auto-discovered. Do not add a
  `skills` path field to `plugin.json`.
- Never add `agents/openai.yaml` or a Codex `interface` block. They are Codex
  artifacts with no Claude Code meaning and are dropped when porting.
- Scripts a skill executes must be referenced through `${CLAUDE_PLUGIN_ROOT}`.
  A bare relative path resolves against the user's working directory and will
  fail at runtime.
- Files a skill only reads may use relative links from the skill directory.

## Multi-Harness Rules

This machine runs both Claude Code and Codex, and a repository may be worked on
from either. When a skill writes files outside its own repository, it must not
fight the Codex plugin over the same file.

- Global guidance is per-harness: a Claude Code skill writes only
  `~/.claude/CLAUDE.md`, never `~/.codex/AGENTS.md`. Both may carry an
  `engineering-governance` managed section.
- Project context has exactly one owner per repository: `AGENTS.md`, shared by
  every harness. `CLAUDE.md` contains only `@AGENTS.md` and optional Claude
  Code-only notes. Write shared content in harness-neutral terms.
- Active plans live in `.agents/plans/`; `.codex/plans` and `.claude/plans` are
  local symlinks to it. Create them with
  `plugins/engineering-governance/skills/maintain-project-context/scripts/link_plans.py`.

## Required Development Loop

Before editing, confirm the current branch is not `main` and that the
configured `cc-plugins` marketplace source is this repository root.

Validate from the repository root:

```bash
claude plugin validate .
claude plugin validate plugins/<plugin-name>
```

Run plugin tests where they exist:

```bash
cd plugins/engineering-governance
python3 -m unittest discover -s tests -v
cd ../..
```

For `plugins/dingtalk`, which runs from a bundled `dist/`:

```bash
cd plugins/dingtalk
npm ci
npm test
npm run build
npm run check
cd ../..
```

Commit the rebuilt `dist/` with any `src/` or `scripts/` change. Never commit
`node_modules/`.

When the installed plugin must be refreshed for integration testing:

```bash
claude plugin marketplace update cc-plugins
claude plugin update <plugin-name>
```

Installing copies the plugin into `~/.claude/plugins/`. Editing the working
tree does not update that installed copy.

After reinstalling, tell the user to restart Claude Code. The current session
keeps the skills loaded when it started, so it cannot prove that a newly
installed definition was picked up. The current session may still run
filesystem validation and unit tests.

## Release Rules

Before release:

- Set the intended semantic version in `.claude-plugin/plugin.json`.
- Run plugin validation, marketplace validation, and plugin tests.
- Run `git diff --check` and review the staged diff.
- Verify no tokens, credential-bearing URLs, `.env` files, or local user
  configuration are included.

Merge or push to `main` only after those checks pass.

See `DEVELOPMENT.md` for the complete setup, porting, testing, and release
workflow.
