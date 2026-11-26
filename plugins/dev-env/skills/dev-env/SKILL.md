---
name: dev-env
description: Configure, maintain, and diagnose the personal development environment on macOS (Homebrew) or Ubuntu WSL. Use for installing or upgrading tools, choosing package and runtime owners, managing Homebrew, apt, Node.js, npm, uv, pipx, Docker or Colima, domestic mirrors and proxy use, project dependencies, PATH and shell profile configuration, duplicate executables, or environment health checks.
allowed-tools:
  - Read
  - Bash(python3 "${CLAUDE_PLUGIN_ROOT}/skills/dev-env/scripts/check_env.py" *)
  - Bash(python3 "${CLAUDE_PLUGIN_ROOT}/skills/dev-env/scripts/check_env.py")
---

# Dev Environment

Keep the personal development environment organized with one owner and one
canonical location for each class of software. The environment mainly serves
agent-driven development, so it stays CLI-first, lightweight, and installed on
demand.

## Identify The Platform First

Run `uname -s`, or the check script below, and then read exactly one platform
reference before acting:

| Platform | Signal | Reference |
| --- | --- | --- |
| macOS | `Darwin` | [references/macos.md](references/macos.md) |
| Ubuntu WSL | `Linux` with `microsoft` in `/proc/version` | [references/wsl.md](references/wsl.md) |

The platform reference holds the ownership matrix, install commands, mirror
and PATH rules, and verification for that machine. Never apply one platform's
commands on the other: no `apt` on macOS, no Homebrew in WSL.

## Management Framework

1. Read the task and the project's conventions before changing the environment.
2. Inspect the active executable, its version, PATH, and current owner.
3. Choose the canonical owner and location from the platform ownership matrix.
4. Install only what the task needs. Do not install large stacks, GUI apps, or
   another runtime manager speculatively.
5. Keep the system, global CLI, project, and service layers separate.
6. Verify the selected executable, version, owner, and PATH after a change.
7. State which manager owns every newly installed or migrated tool.

Prefer correcting ownership and PATH over blindly reinstalling. Keep
foundational build dependencies that installed tools or native package builds
naturally require.

## Layering Principles

These hold on every platform. The platform reference names the concrete owner.

- **System layer**: one system package manager owns OS-level CLI tools and
  libraries. Prefer a CLI package over a GUI app when both exist.
- **Node layer**: one package manager owns Node.js, npm, npx, and corepack.
  Global npm installs are reserved for a few CLIs with no better owner; project
  dependencies stay in `<project>/node_modules`. Do not `npm install -g npm`.
  Introduce a Node version manager only when a project needs multiple Node
  majors at once.
- **Python layer**: leave the system `python3` alone and never install project
  dependencies with system `pip`. uv owns project Python versions, `.venv`,
  dependency resolution, and `uv.lock`. Do not introduce Conda, pyenv, or
  another environment manager.
- **Service layer**: databases, queues, and complex or reproducible stacks run
  in containers, never in the system or project runtimes. Install the
  container runtime only when a task needs one.
- **Agent CLIs**: Claude Code and the Codex CLI each keep the installer that
  installed them. Neither manages the other, and neither is reinstalled through
  a second owner.

## Python Projects

For a Python project, read `pyproject.toml`, `uv.lock`, `.python-version`, and
the repository guidance before changing anything. Use one project-local
`.venv`; do not create a second environment for the same checkout.

```bash
uv python install <required-version>
uv sync
uv run python --version
uv run <project-command>
```

Run `uv lock` after changing project dependencies and commit `uv.lock` in the
same change. Use `uv sync --all-packages` for a uv workspace. Prefer `uv run`
over activating `.venv` in documentation and automation. For a legacy project
without `pyproject.toml`, create `.venv` with `uv venv` and install its reviewed
requirements with `uv pip`. Use `uvx` for one-off Python tools.

## Lockfiles And Mirrors

A package mirror can leak into committed lockfiles. After `npm install` or
`uv lock` in a repository whose lockfile is shared or published, check the
diff for mirror hosts (`npmmirror`, `mirrors.ustc.edu.cn`, `tuna`) replacing
the canonical registry. If the project must keep canonical URLs, put a
project-level `.npmrc` or `[[tool.uv.index]]` override in that repository
rather than editing the global configuration.

## Resolve Conflicts

When a command behaves unexpectedly, inspect resolution before changing
installations:

```bash
type -a <command>
<command> --version
echo "$PATH" | tr ':' '\n'
uv python find
uv run python -c 'import sys; print(sys.executable); print(sys.prefix)'
```

Identify the owner through its package manager before removing anything.
Migrate a duplicate to its canonical owner before uninstalling the old copy.
When a stray executable has no owner, move it to a backup location rather than
deleting it, and tell the user where it went.

Persistent shell configuration adds each directory at most once. Do not
persist temporary agent-CLI vendor or wrapper paths.

## Scope Boundaries

- Do not proactively install CUDA, ML frameworks, mobile SDKs, databases,
  container runtimes, large toolchains, or app-specific stacks.
- Do not edit persistent shell profiles, registry, or mirror configuration
  unless the task is about the environment itself.
- Do not persist proxy variables. Use a proxy per command or per shell.
- Keep edits scoped to the current task and project conventions.
- Use `rg` for text search and `fd` (`fdfind` on Ubuntu) for file search.

## Environment Check

Run the bundled read-only check after changing a runtime, a package manager,
mirror configuration, or PATH, and when diagnosing a conflict:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/dev-env/scripts/check_env.py"
python3 "${CLAUDE_PLUGIN_ROOT}/skills/dev-env/scripts/check_env.py" node npm uv
python3 "${CLAUDE_PLUGIN_ROOT}/skills/dev-env/scripts/check_env.py" --json
```

It lists every PATH match for each command with its inferred owner and
version, and flags executables with no known owner, a command shadowed by a
second managed copy, and repeated PATH entries. It exits non-zero when it
finds a problem. Report missing optional commands separately from ownership
conflicts. Then run the platform-specific checks in the platform reference.
