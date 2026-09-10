# Plugin Development And Release

This repository is a Claude Code marketplace named `cc-plugins`. It has two
mutually exclusive source modes, exactly like its Codex counterpart.

| Machine role | Marketplace source | Purpose |
| --- | --- | --- |
| Development machine | Local repository root | Test uncommitted branch changes |
| Consumer machine | Private GitHub repository | Install published changes only |

Do not configure both sources as separate marketplaces on the same Claude Code
installation. They carry the same marketplace name and plugin identities, and
parallel registrations make it easy to install or test the wrong copy.

## Mental Model

There are four distinct states:

1. **Working tree**: files currently being edited on a feature or fix branch.
2. **Marketplace source**: the local directory or Git snapshot used to discover
   available plugins.
3. **Installed plugin cache**: the copy installed by `claude plugin install`,
   stored under `~/.claude/plugins/`.
4. **Session-loaded definitions**: the skills, commands, and MCP tools loaded
   when a Claude Code session started.

These states do not update each other automatically:

```text
working tree
  -> claude plugin marketplace update
  -> claude plugin install / update
  -> installed plugin cache
  -> restart Claude Code
  -> updated skills are available
```

## Development Machine Setup

```bash
git clone git@github.com:Linjunjie99/cc-plugins.git
cd cc-plugins
git switch -c feature/<plugin>-<change>
```

If `cc-plugins` is currently registered from GitHub, switch it to the local
checkout. Run these commands from WSL so the stored path is a WSL path:

```bash
claude plugin marketplace remove cc-plugins
claude plugin marketplace add /root/workspace/20_personal/projects/cc-plugins
claude plugin install <plugin-name>@cc-plugins
```

The `name` in `.claude-plugin/marketplace.json` stays `cc-plugins` in both
modes; switching source does not require a manifest change.

## Local Development Loop

Make changes on the feature branch, then validate:

```bash
claude plugin validate .
claude plugin validate plugins/<plugin-name>
```

For `plugins/engineering-governance`, also run its tests. They read the working
tree directly and do not require reinstalling the plugin:

```bash
cd plugins/engineering-governance
python3 -m unittest discover -s tests -v
cd ../..
```

Inspect what a plugin actually contributes and what it costs in context:

```bash
claude plugin details <plugin-name>
```

### Refresh The Installed Plugin

Reinstall only when testing the plugin through Claude Code itself:

```bash
claude plugin marketplace update cc-plugins
claude plugin update <plugin-name>
```

`claude plugin install` and `claude plugin update` copy the selected version
into the plugin cache. They do not hot-link the installed plugin to the working
tree.

### Restart Before Integration Testing

A session retains the skill and MCP definitions loaded at startup. Reinstalling
changes the cache on disk but does not replace definitions already loaded into
the running session. Therefore:

- Use the current session for edits, validation, and unit tests.
- Start a new session to verify skill discovery, prompts, and tool behavior from
  the newly installed plugin.

## Skill Authoring Rules

- Every skill is `skills/<name>/SKILL.md` with `name` and `description`
  frontmatter. The `description` decides when Claude invokes the skill, so it
  must name concrete trigger phrases and topics.
- Reference bundled files that Claude reads with relative links, for example
  `[references/model.md](references/model.md)`.
- Reference bundled files that Claude executes with `${CLAUDE_PLUGIN_ROOT}`,
  for example
  `python3 "${CLAUDE_PLUGIN_ROOT}/skills/<skill>/scripts/<script>.py"`.
  A bare relative path is resolved against the user's working directory, not
  the plugin, and will not find the script.
- Use `allowed-tools` frontmatter to pre-approve the plugin's own scripts and
  cut permission prompts.
- Do not carry Codex-only artifacts into this repository. `agents/openai.yaml`
  and the `interface` block in `.codex-plugin/plugin.json` have no Claude Code
  equivalent and are dropped during a port.

## Porting A Plugin From codex-plugins

1. Copy the plugin directory, then rename `.codex-plugin/` to
   `.claude-plugin/`.
2. Strip the `interface` block and `skills` path field from `plugin.json`, and
   delete every `agents/openai.yaml`.
3. Rewrite harness-specific references in skill bodies:

   | Codex | Claude Code |
   | --- | --- |
   | `AGENTS.md` | `CLAUDE.md` |
   | `~/.codex/AGENTS.md` | `~/.claude/CLAUDE.md` |
   | `$CODEX_HOME` | `$CLAUDE_CONFIG_DIR` |
   | `.codex/plans/` | `.claude/plans/` |
   | `codex plugin ...` | `claude plugin ...` |

4. Convert `.mcp.json` from Codex's `env_vars` array to Claude Code's `env`
   object.
5. Where the skill writes shared, on-disk state that the Codex plugin also
   writes, add explicit coexistence rules rather than letting both harnesses
   own the same file. See the multi-harness sections in
   `plugins/engineering-governance`.
6. Add the plugin to `.claude-plugin/marketplace.json`, validate, and test.

## Release Workflow

Treat `main` as the published channel. Feature and fix branches are not
consumed by other machines.

1. Set the intended release version in `.claude-plugin/plugin.json`.
2. Run all tests and validation.
3. Review tracked files and staged content for credentials and local config.
4. Merge the reviewed branch into `main` and push.
5. Optionally tag the release with `claude plugin tag plugins/<plugin-name>`,
   which validates that `plugin.json` and the marketplace entry agree.

The marketplace manifest normally does not change for a code release. Update
`.claude-plugin/marketplace.json` only for catalog membership, plugin path,
category, or description changes.

Release checks:

```bash
claude plugin validate .
claude plugin validate plugins/<plugin-name>
cd plugins/engineering-governance && python3 -m unittest discover -s tests && cd ../..
git diff --check
git status --short
git diff --cached
```

## Consumer Machine Setup And Updates

```bash
claude plugin marketplace add git@github.com:Linjunjie99/cc-plugins.git
claude plugin install <plugin-name>@cc-plugins
```

To consume a later release:

```bash
claude plugin marketplace update cc-plugins
claude plugin update <plugin-name>
```

Restart Claude Code after both commands.

## Relationship To codex-plugins

`cc-plugins` and `codex-plugins` are independent marketplaces that may be
installed on the same machine at the same time. They do not share a name, a
manifest location, or an install cache.

A ported plugin is a peer, not a mirror. Do not diff the two copies word for
word or try to keep their prose identical — each speaks its own harness's
conventions. Do keep their behavior aligned: when a capability changes in one,
decide explicitly whether the other needs the same change.

The one place the two genuinely interact is the context files that
`engineering-governance` maintains. Those rules are documented in the
[README](README.md) and enforced inside the skills themselves.

## Windows And WSL Boundary

Register local marketplaces from the environment that can resolve their paths.
A Windows local path is not a WSL local path. Use a Git marketplace when the
same published source must work across environments.
