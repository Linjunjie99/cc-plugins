# cc-plugins

Personal Claude Code plugin marketplace for TU.

These plugins are Claude Code ports of the plugins maintained in the
[codex-plugins](../codex-plugins) marketplace. Both marketplaces are kept
installable at the same time: a plugin is ported when its capability is worth
having in both harnesses, and each port speaks its own harness's conventions
rather than emulating the other.

## Plugins

- `dev-env`: keeps tools, runtimes, package ownership, and PATH organized in
  the personal Ubuntu WSL environment.
- `engineering-governance`: establishes a durable context architecture for
  workspace navigation, project instructions, current status, active plans,
  and long-lived documentation.
- `dingtalk`: manages DingTalk contacts, online documents, and confirmed
  work-report publishing from local Markdown through one wrapped MCP server.

Not ported: `slides` remains Codex-only for now.

## Install

Register the marketplace and install the plugins:

```bash
claude plugin marketplace add /root/workspace/20_personal/projects/cc-plugins
claude plugin install dev-env@cc-plugins
claude plugin install engineering-governance@cc-plugins
claude plugin install dingtalk@cc-plugins
```

`dingtalk` additionally needs the three `DINGTALK_*_MCP_URL` environment
variables; see [plugins/dingtalk/README.md](plugins/dingtalk/README.md).

From the published GitHub repository instead:

```bash
claude plugin marketplace add git@github.com:Linjunjie99/cc-plugins.git
claude plugin install dev-env@cc-plugins
claude plugin install engineering-governance@cc-plugins
claude plugin install dingtalk@cc-plugins
```

To receive a later release:

```bash
claude plugin marketplace update cc-plugins
claude plugin update dev-env
```

Restart Claude Code after installing or updating. A running session keeps the
plugin definitions it loaded at startup.

## Running Claude Code And Codex Side By Side

The two marketplaces do not collide. They have different names, different
manifest directories (`.claude-plugin/` and `.agents/plugins/`), different
plugin manifests (`.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`),
and different install caches (`~/.claude/plugins/` and `~/.codex/plugins/`).
Registering one has no effect on the other.

What does need a decision is the context files the plugins write:

| Concern | Claude Code | Codex | Rule |
| --- | --- | --- | --- |
| Global guidance | `~/.claude/CLAUDE.md` | `~/.codex/AGENTS.md` | Each harness owns its own file. Both may carry an `engineering-governance` managed section. Neither skill writes the other's file. |
| Project context | `CLAUDE.md` | `AGENTS.md` | One canonical file per repository. The other is a bridge that imports it. |
| Active plans | `.claude/plans/` | `.codex/plans/` | Declare one directory per repository in the canonical context file. |
| DingTalk config | `~/.claude/dingtalk.toml` | `~/.codex/dingtalk.toml` | Each harness owns its own file. The first Claude Code setup imports the Codex file read-only. Gateway URL variables and the documents/reports directories are shared. |

`engineering-governance` implements this. In a repository that already has
`AGENTS.md`, its `maintain-project-context` skill keeps `AGENTS.md` canonical
and makes `CLAUDE.md` a one-line bridge (`@AGENTS.md`), so project facts have
exactly one owner and cannot drift between harnesses.

## Develop Plugins Locally

```bash
git switch -c feature/<plugin>-<change>
claude plugin validate plugins/<plugin-name>
claude plugin validate .
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for the full validation, reinstall,
restart, and release workflow. Agents working in this repository must also
follow [CLAUDE.md](CLAUDE.md).

## Repository Layout

```text
.claude-plugin/marketplace.json
CLAUDE.md
DEVELOPMENT.md
plugins/dev-env/.claude-plugin/plugin.json
plugins/dev-env/skills/dev-env/SKILL.md
plugins/dingtalk/.claude-plugin/plugin.json
plugins/dingtalk/.mcp.json
plugins/dingtalk/dist/
plugins/dingtalk/skills/dingtalk-{setup,contacts,documents,reports}/
plugins/dingtalk/src/
plugins/dingtalk/test/
plugins/engineering-governance/.claude-plugin/plugin.json
plugins/engineering-governance/skills/configure-global-guidance/
plugins/engineering-governance/skills/maintain-project-context/
plugins/engineering-governance/skills/organize-workspace/
plugins/engineering-governance/tests/
```
