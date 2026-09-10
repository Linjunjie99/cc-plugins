# dev-env

Keep a personal Ubuntu WSL development environment organized by clear tool
ownership and canonical paths.

## What It Does

Applies one ownership model to system tools, project runtimes, global CLIs,
services, and PATH configuration, so every executable has exactly one manager
and one canonical location.

| Software | Owner | Canonical location |
| --- | --- | --- |
| OS tools and libraries | apt | `/usr`, `/lib` |
| Node.js, npm, npx, corepack | apt/NodeSource `nodejs` | `/usr/bin` |
| Selected global Node CLIs | npm | `/usr/local` |
| Project Node dependencies | project package manager | `<project>/node_modules` |
| Project Python | uv | `<project>/.venv` |
| Global Python CLIs | pipx | `/root/.local/bin` |
| Isolated services | Docker | Docker-managed storage |

## When It Activates

Claude invokes the `dev-env` skill when you install or upgrade a tool, choose a
package or runtime owner, hit a duplicate executable or PATH conflict, or ask
for an environment health check.

## Assumptions

Targets a root-only Ubuntu WSL environment with `/root` as the home directory.
It assumes Claude Code and the Codex CLI are both installed as global npm
packages under `/usr/local` and treats neither as the owner of the other.

## Install

```bash
claude plugin install dev-env@cc-plugins
```

## Codex Counterpart

`dev-env@codex-plugins` is the same capability for the Codex CLI. Installing
both is safe: neither writes persistent configuration, so there is nothing for
them to contend over.
