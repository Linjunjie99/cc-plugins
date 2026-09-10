---
name: dev-env
description: Configure, maintain, and diagnose the personal root-only Ubuntu WSL development environment under /root. Use for installing or upgrading tools, choosing package and runtime owners, managing apt, NodeSource, npm, uv, pipx, Docker, project dependencies, PATH configuration, duplicate executables, or environment health checks.
---

# Dev Environment

Manage this personal Ubuntu WSL environment with one owner and one canonical location for each class of software. Assume the active Linux user is `root` and the home directory is `/root`.

## Management Framework

1. Read the task and project conventions before changing the environment.
2. Inspect the active executable, version, PATH, and current package owner.
3. Choose the canonical owner and location from the ownership matrix.
4. Install only what the task needs. Do not introduce large stacks or another runtime manager speculatively.
5. Keep system, global CLI, project, and service dependencies in their own layers.
6. Verify the selected executable, version, owner, and PATH after a change.
7. Explain which manager owns every newly installed or migrated tool.

Prefer correcting ownership and PATH over blindly reinstalling. Keep foundational build dependencies that installed tools or native package builds naturally require.

## Ownership Matrix

| Software | Owner | Canonical location |
| --- | --- | --- |
| OS tools and libraries | apt | `/usr`, `/lib` |
| Node.js, npm, npx, corepack | apt/NodeSource `nodejs` | `/usr/bin`, `/usr/lib/node_modules` |
| Selected global Node CLIs | npm | `/usr/local/bin`, `/usr/local/lib/node_modules` |
| Project Node dependencies | Project package manager | `<project>/node_modules` |
| Project Python runtime and dependencies | uv | `<project>/.venv`, `<project>/uv.lock` |
| Global Python CLIs | pipx | `/root/.local/bin`, `/root/.local/share/pipx` |
| Isolated services | Docker | Docker-managed storage |

Do not manage the same executable through multiple owners. Do not remove a system path until its owner has been identified.

## System Layer

Use apt for OS tools, stable command-line utilities, Docker Engine and Compose, and foundational build tools.

```bash
apt-get update
apt-get install -y <packages>
```

Do not replace apt-managed components with ad hoc binaries. Do not remove compilers or build packages merely because they are not directly invoked by the current project.

## Python Layer

Keep `/usr/bin/python3` and `/usr/bin/pip3` under apt ownership. Do not install project dependencies with system `pip3`. Keep `uv` as a global isolated CLI under pipx ownership, and use it to manage project Python versions, virtual environments, dependency resolution, and lock files.

For a Python project, read `pyproject.toml`, `uv.lock`, `.python-version`, and the repository guidance before changing the environment. Use one project-local `.venv`; do not create a second environment for the same checkout. Prefer the repository's locked workflow:

```bash
uv python install <required-version>
uv sync
uv run python --version
uv run <project-command>
```

Run `uv lock` after changing project dependencies and include `uv.lock` in the same source change. Use `uv sync --all-packages` for a uv workspace when the project defines one. Activating `.venv` is optional; prefer `uv run` in documentation and automation so commands consistently select the project environment.

For a legacy project without `pyproject.toml`, create `.venv` with `uv venv` and install its reviewed requirements with `uv pip`. Do not introduce Conda or another Python environment manager. Install required native libraries with apt when they are OS dependencies; use Docker for complex services and reproducible CUDA or system-library stacks. Use pipx for global Python CLIs and `uvx` for one-off isolated Python tools.

## Node Layer

Keep Node.js, npm, npx, and corepack in the NodeSource apt `nodejs` package. Upgrade the runtime with apt. Do not install npm separately, run `npm install -g npm`, create another Node tree, or manually remove system npm files.

Keep Linux-side global npm CLIs under the single `/usr/local` prefix. Use project-local dependencies for applications and frontends.

```bash
npm prefix -g
npm --prefix /usr/local install --global <package>@<version>
```

Agent CLIs are global npm packages under `/usr/local`: Claude Code is `@anthropic-ai/claude-code` and the Codex CLI is `@openai/codex`. Both are installed side by side and neither owns the other's configuration. After upgrading Node.js, confirm that npm still uses that prefix before installing or upgrading global CLIs.

Introduce a Node version manager only when a project genuinely needs multiple Node versions. If introducing one, review the absolute npm prefix in `/root/.npmrc` because version managers normally maintain separate global package trees.

## Service Layer

Use Docker for databases, queues, application dependencies, and complex or reproducible services. Keep service dependencies out of system and project runtimes. Docker runs directly in this root-only WSL environment with systemd enabled.

## Resolve Conflicts

When a command behaves unexpectedly, inspect resolution before changing installations:

```bash
type -a <command>
<command> --version
echo "$PATH"
uv python find
uv run python -c 'import sys; print(sys.executable); print(sys.prefix)'
```

Use the relevant package manager to establish ownership. For files under `/usr`, check `dpkg -S <path>` before removal. For npm conflicts, inspect both global prefixes:

```bash
npm --prefix /usr/local list --global --depth=0
npm --prefix /usr list --global --depth=0
```

Migrate a user-installed duplicate to its canonical location before uninstalling the old copy. Never uninstall a path owned by apt.

Persistent shell configuration must add each directory at most once. Keep `/root/.local/bin` for pipx and rely on the system PATH for `/usr/local/bin` and `/usr/bin`. Do not persist temporary agent-CLI vendor or wrapper paths.

WSL normally appends Windows PATH entries for interoperability. When tracing an unexpected command or path, remember that entries under `/mnt/c/...` may come from Windows-side configuration and should be investigated there.

## Scope Boundaries

- Do not proactively install CUDA, ML frameworks, mobile SDKs, databases, large toolchains, or app-specific stacks.
- Do not introduce another Python runtime manager when uv can satisfy the project.
- Keep edits scoped to the current task and project conventions.
- Use bash in WSL, `rg` for text search, and `fd` or `fdfind` for file search.

## Environment Check

Run the relevant parts of this check after changing Node.js, npm, uv, a project Python environment, or persistent PATH configuration:

```bash
type -a node npm npx claude codex happy python3 pipx uv
node --version
npm --version
npm prefix -g
npm --prefix /usr/local list --global --depth=0
npm --prefix /usr list --global --depth=0
readlink -f "$(command -v claude)"
readlink -f "$(command -v codex)"
pipx list
uv --version
uv python find
uv run python -c 'import sys; print(sys.executable); print(sys.prefix)'
```

The environment is organized when system Node tools resolve from `/usr`, selected npm CLIs from `/usr/local`, pipx applications from `/root/.local/bin`, and project Python commands resolve through uv to the checkout's `.venv`. Report missing optional commands separately from ownership conflicts.
