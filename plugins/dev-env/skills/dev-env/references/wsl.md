# Ubuntu WSL Reference

Ubuntu on WSL. `~` is the current Linux user's home (`/root` when working as
root). System-level commands below need root: run them directly when the
session is root, otherwise prefix them with `sudo`, which prompts for a
password. An agent cannot answer that prompt, so ask the user to run the
`sudo` step.

## Ownership Matrix

| Software | Owner | Canonical location |
| --- | --- | --- |
| OS tools and libraries | apt | `/usr`, `/lib` |
| Node.js, npm, npx, corepack | apt/NodeSource `nodejs` | `/usr/bin`, `/usr/lib/node_modules` |
| Selected global Node CLIs | npm | `/usr/local/bin`, `/usr/local/lib/node_modules` |
| Project Node dependencies | Project package manager | `<project>/node_modules` |
| Project Python runtime and dependencies | uv | `<project>/.venv`, `<project>/uv.lock` |
| Global Python CLIs, including uv | pipx | `~/.local/bin`, `~/.local/share/pipx` |
| Isolated services | Docker | Docker-managed storage |

Do not manage the same executable through multiple owners. Do not remove a
system path until its owner has been identified.

## System Layer

Use apt for OS tools, stable command-line utilities, Docker Engine and
Compose, and foundational build tools.

```bash
sudo apt-get update            # omit sudo when running as root
sudo apt-get install -y <packages>
```

Do not replace apt-managed components with ad hoc binaries. Do not remove
compilers or build packages merely because the current project does not
invoke them directly.

## Python Layer

Keep `/usr/bin/python3` and `/usr/bin/pip3` under apt ownership. Keep `uv` as
a global isolated CLI under pipx ownership. Use pipx for other global Python
CLIs. Install required native libraries with apt when they are OS
dependencies; use Docker for complex services and reproducible CUDA or
system-library stacks.

## Node Layer

Keep Node.js, npm, npx, and corepack in the NodeSource apt `nodejs` package.
Upgrade the runtime with apt. Do not install npm separately, create another
Node tree, or manually remove system npm files.

Keep global npm CLIs under the single `/usr/local` prefix:

```bash
npm prefix -g
sudo npm --prefix /usr/local install --global <package>@<version>   # omit sudo as root
```

Agent CLIs are global npm packages under `/usr/local`: Claude Code is
`@anthropic-ai/claude-code` and the Codex CLI is `@openai/codex`. After
upgrading Node.js, confirm that npm still uses that prefix before installing
or upgrading global CLIs. If a Node version manager is ever introduced,
review the absolute npm prefix in `~/.npmrc`, because version managers
normally maintain separate global package trees.

## Service Layer

Docker Engine runs directly inside WSL with systemd enabled. A non-root user
needs membership in the `docker` group to use it without `sudo`.

## PATH

Keep `~/.local/bin` for pipx and rely on the system PATH for
`/usr/local/bin` and `/usr/bin`.

WSL normally appends Windows PATH entries for interoperability. Entries under
`/mnt/c/...` come from Windows-side configuration and should be investigated
there.

## Resolve Conflicts

For files under `/usr`, check `dpkg -S <path>` before removal. Never uninstall
a path owned by apt. For npm conflicts, inspect both global prefixes:

```bash
npm --prefix /usr/local list --global --depth=0
npm --prefix /usr list --global --depth=0
```

## Verification

```bash
type -a node npm npx claude codex happy python3 pipx uv
npm prefix -g
npm --prefix /usr/local list --global --depth=0
npm --prefix /usr list --global --depth=0
readlink -f "$(command -v claude)"
readlink -f "$(command -v codex)"
pipx list
uv --version
```

The environment is organized when system Node tools resolve from `/usr`,
selected npm CLIs from `/usr/local`, pipx applications from `~/.local/bin`,
and project Python commands resolve through uv to the checkout's `.venv`.
