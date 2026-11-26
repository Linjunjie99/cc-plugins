# dev-env

Keep a personal development environment organized by clear tool ownership,
canonical paths, and on-demand installs. Supports macOS on Apple Silicon and
root-only Ubuntu WSL.

## What It Does

Applies one ownership model to system tools, runtimes, global CLIs, services,
mirrors, and PATH configuration, so every executable has exactly one manager
and one canonical location. The environment mainly serves agent-driven
development, so it stays CLI-first and lightweight, and installs tools only
when a task needs them.

The skill detects the platform and loads one reference:

| Layer | macOS | Ubuntu WSL |
| --- | --- | --- |
| System and CLI tools | Homebrew (`/opt/homebrew`) | apt |
| Node.js, npm | Homebrew `node` | apt/NodeSource `nodejs` |
| Global Node CLIs | npm, Homebrew prefix | npm, `/usr/local` |
| uv | Homebrew | pipx |
| Python interpreters and projects | uv | uv |
| Global Python CLIs | `uv tool` | pipx |
| Claude Code, Codex CLI | Their native installers | Global npm |
| Containers, on demand | Colima + Docker CLI | Docker Engine |
| Package mirrors | USTC / npmmirror, proxy only when needed | Not configured |

See [references/macos.md](skills/dev-env/references/macos.md) and
[references/wsl.md](skills/dev-env/references/wsl.md) for the full rules.

## Environment Check

`skills/dev-env/scripts/check_env.py` is a read-only report: every PATH match
for each tool with its inferred owner and version, plus executables with no
owner, shadowed copies, and repeated PATH entries. It uses only the Python
standard library, so it runs on the stock macOS `/usr/bin/python3`.

```bash
python3 skills/dev-env/scripts/check_env.py
python3 skills/dev-env/scripts/check_env.py --json node uv
```

## When It Activates

Claude invokes the `dev-env` skill when you install or upgrade a tool, choose
a package or runtime owner, configure mirrors or a proxy, hit a duplicate
executable or PATH conflict, or ask for an environment health check.

## Install

```bash
claude plugin install dev-env@cc-plugins
```

## Test

```bash
python3 -m unittest discover -s tests -v
```

## Codex Counterpart

`dev-env@codex-plugins` is the WSL capability for the Codex CLI. This plugin
writes no persistent configuration of its own; when it edits shell profiles
on request, it touches only its fenced `# >>> dev-env >>>` block and leaves
other installers' blocks alone, so the two do not contend.
