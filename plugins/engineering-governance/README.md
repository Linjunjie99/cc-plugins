# engineering-governance

Establish a durable context architecture for workspaces, projects,
documentation, status, and temporary plans, so Claude does not rebuild the same
project background every session.

## Skills

| Skill | Owns |
| --- | --- |
| `configure-global-guidance` | The versioned `engineering-governance` section in your global `CLAUDE.md` |
| `maintain-project-context` | A repository's `AGENTS.md`/`CLAUDE.md` entry points, status document, docs index, and active plans |
| `organize-workspace` | The layout of a workspace holding several repositories |

## Context Layers

One fact has one authoritative owner:

| Layer | Owner | End state |
| --- | --- | --- |
| Global context | `~/.claude/CLAUDE.md` | Concise and stable |
| Project context | Project `AGENTS.md` | Concise and stable |
| Current status | `docs/project-status.md` | Replaced in place |
| Active plan | `.agents/plans/<initiative>.md` | Removed after handoff |
| Durable knowledge | Requirements, design, contracts, decisions, runbooks | Versioned and indexed |
| History | Git, issues, pull requests | Retained |

## Global Guidance Safety

`configure-global-guidance` edits exactly one marked section of your global
`CLAUDE.md`:

```markdown
<!-- BEGIN engineering-governance -->
...managed content...
<!-- END engineering-governance -->
```

Everything outside those markers is preserved byte-for-byte. The skill reports
whether the section is current, missing, outdated, or malformed without printing
your unrelated global guidance, refuses to run on duplicate or incomplete
markers, and applies changes only when you explicitly ask. Writes are atomic.

Run it yourself against any target:

```bash
python3 skills/configure-global-guidance/scripts/sync_global_guidance.py \
  check --target ~/.claude/CLAUDE.md
```

## Running Alongside Codex

`engineering-governance@codex-plugins` maintains the same framework for the
Codex CLI, with the same project layout, so a repository can be worked on from
either harness without synchronizing anything:

| Concern | Claude Code | Codex | Shared |
| --- | --- | --- | --- |
| Global guidance | `~/.claude/CLAUDE.md` | `~/.codex/AGENTS.md` | Nothing. Each file carries its own managed section; this plugin never writes the Codex file. |
| Project context | `CLAUDE.md` = `@AGENTS.md` + optional Claude Code notes | `AGENTS.md` | `AGENTS.md` holds all shared facts. Codex does not expand `@` imports, so the shared content cannot live elsewhere. |
| Active plans | `.claude/plans` | `.codex/plans` | Both are symlinks to `.agents/plans/`. |

`maintain-project-context` includes `scripts/link_plans.py`, which creates the
plan directory and links, merges a legacy real `.codex/plans/` or
`.claude/plans/` directory, and fixes `.gitignore` (a directory-only pattern
cannot ignore a symlink).

## Install

```bash
claude plugin install engineering-governance@cc-plugins
```

## Development

```bash
python3 -m unittest discover -s tests -v
```
