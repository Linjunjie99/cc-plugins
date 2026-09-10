# engineering-governance

Establish a durable context architecture for workspaces, projects,
documentation, status, and temporary plans, so Claude does not rebuild the same
project background every session.

## Skills

| Skill | Owns |
| --- | --- |
| `configure-global-guidance` | The versioned `engineering-governance` section in your global `CLAUDE.md` |
| `maintain-project-context` | A repository's `CLAUDE.md`, status document, docs index, and active plans |
| `organize-workspace` | The layout of a workspace holding several repositories |

## Context Layers

One fact has one authoritative owner:

| Layer | Owner | End state |
| --- | --- | --- |
| Global context | `~/.claude/CLAUDE.md` | Concise and stable |
| Project context | Project `CLAUDE.md` | Concise and stable |
| Current status | `docs/project-status.md` | Replaced in place |
| Active plan | `.claude/plans/<initiative>.md` | Removed after handoff |
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
Codex CLI. The two are designed to coexist:

- **Global guidance** is per-harness. `~/.claude/CLAUDE.md` and
  `~/.codex/AGENTS.md` are peers and may each carry their own managed section.
  This plugin never writes the Codex file.
- **Project context** has one canonical owner per repository. When a repository
  already has `AGENTS.md`, `maintain-project-context` keeps it canonical and
  makes `CLAUDE.md` a one-line bridge:

  ```markdown
  @AGENTS.md
  ```

  Project facts therefore live in one file and cannot drift between harnesses.
  Harness-specific instructions go below the import in the file that owns them.
- **Active plans** use one declared directory per repository, named in the
  canonical context file, so either harness resumes from the same working
  memory.

The skill confirms with you before converting an existing populated `CLAUDE.md`
into a bridge, and shows what it considers duplicated content first.

## Install

```bash
claude plugin install engineering-governance@cc-plugins
```

## Development

```bash
python3 -m unittest discover -s tests -v
```
