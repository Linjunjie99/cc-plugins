# macOS Reference

Personal macOS with zsh, run by a regular admin account. `sudo` prompts for a
password, so an agent cannot run it non-interactively. Ask the user to run any
`sudo` step themselves, for example by typing `! <command>` in the Claude Code
prompt.

Nothing here assumes a user name, home path, or CPU. `~` is the current user's
home. `<brew-prefix>` is the output of `brew --prefix`: `/opt/homebrew` on
Apple Silicon and `/usr/local` on Intel. Resolve it on the machine instead of
assuming either.

## Ownership Matrix

| Software | Owner | Canonical location |
| --- | --- | --- |
| Base OS tools, `/usr/bin/python3`, `git`, `jq` | macOS / Xcode Command Line Tools | `/usr/bin`, `/Library/Developer/CommandLineTools` |
| CLI tools and libraries | Homebrew formulae | `<brew-prefix>` |
| Node.js, npm, npx, corepack | Homebrew `node` formula | `<brew-prefix>/bin`, `<brew-prefix>/lib/node_modules` |
| Selected global Node CLIs | npm, Homebrew prefix | `<brew-prefix>/bin`, `<brew-prefix>/lib/node_modules` |
| Project Node dependencies | Project package manager | `<project>/node_modules` |
| uv | Homebrew `uv` formula | `<brew-prefix>/bin/uv` |
| Python interpreters | uv | `~/.local/share/uv/python`, `~/.local/bin/python3.x` shims |
| Project Python and dependencies | uv | `<project>/.venv`, `<project>/uv.lock` |
| Global Python CLIs | `uv tool` | `~/.local/bin`, `~/.local/share/uv/tools` |
| Claude Code | Native installer, self-updating | `~/.local/bin/claude` -> `~/.local/share/claude/versions/` |
| Codex CLI | Codex standalone installer, self-updating | `~/.local/bin/codex` -> `~/.codex/packages/standalone/` |
| Containers (on demand) | Homebrew `colima`, `docker`, `docker-compose` | `<brew-prefix>`, `~/.colima` |
| GUI applications | The user | `/Applications` |

`~/.local/bin` holds only the agent CLIs (`claude`, `codex`,
`codex-code-mode-host`), `uv tool` shims, and `python3.x` shims from
`uv python install`. Any other file there is a stray copy without an owner.

## Lightweight, CLI-First, On Demand

The environment mainly serves agent-driven development.

- Install a Homebrew formula only when a task needs it. Do not install a
  "starter set" of tools.
- Prefer a formula to a cask, and a cask only when the user asks for a GUI
  app. Do not install Docker Desktop, OrbStack, IDEs, or other GUI apps
  without an explicit request.
- Do not use `pipx`; `uv tool` covers global Python CLIs. Do not install
  `python@3.x` formulae for project use; let uv provide interpreters. A
  `python@3.x` formula that Homebrew pulls in as a dependency of another
  formula is fine and must not be removed or used for projects.
- Do not install `nvm`, `fnm`, `volta`, `mise`, `asdf`, `pyenv`, or Conda.
  If a project needs an older Node major alongside the default, prefer the
  keg-only `node@<major>` formula on that project's PATH. Introduce a version
  manager only if that stops being enough, and explain the trade-off first.

## Homebrew

Homebrew owns `<brew-prefix>`. Its installer needs `sudo` once to create the
prefix, so the user runs it interactively. Where the upstream is slow, use the
domestic mirror's copy of the installer, which matches the upstream script:

```bash
export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.ustc.edu.cn/brew.git"
export HOMEBREW_API_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles/api"
export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles"
/bin/bash -c "$(curl -fsSL https://mirrors.ustc.edu.cn/misc/brew-install.sh)"
```

Day-to-day commands never need `sudo`:

```bash
brew install <formula>
brew upgrade <formula>
brew uninstall <formula>
brew autoremove
brew cleanup
brew leaves          # formulae installed on request
brew doctor
```

Never run `brew` with `sudo`. Do not hand-edit files under `<brew-prefix>`.

## Mirrors And Proxy

When the upstream is slow from the user's network, use a stable domestic
mirror where one exists, otherwise go through the user's local proxy. Mirrors
are persistent configuration; proxy settings are not. Measure before choosing:
the same mirror can be fast on one network and pointless on another.

| Traffic | Source | Configured in |
| --- | --- | --- |
| Homebrew API, bottles, `brew update` | USTC | `HOMEBREW_*` in `~/.zprofile` |
| npm registry | npmmirror | `registry=` in `~/.npmrc` |
| PyPI for uv | USTC | `[[index]]` in `~/.config/uv/uv.toml` |
| uv Python downloads | npmmirror python-build-standalone | `python-install-mirror` in `~/.config/uv/uv.toml` |
| GitHub, other upstreams | Proxy when needed | Per shell |

The persistent block in `~/.zprofile` is fenced with
`# >>> dev-env >>>` / `# <<< dev-env <<<`. Edit only inside that block, and
leave other installers' blocks (for example `# >>> Codex installer >>>`)
untouched.

A local proxy client either runs in a transparent (TUN) mode, which needs no
variables, or exposes a local HTTP/SOCKS port. Ask the user for the port, or
read it from the proxy client's settings; never guess it. Use it per command
or per shell, never persistently:

```bash
https_proxy=http://127.0.0.1:<port> http_proxy=http://127.0.0.1:<port> <command>
```

For convenience, the `dev-env` block in `~/.zshrc` may define
`proxy-on [port]` and `proxy-off` functions that export or unset the proxy
variables in the current shell, with `no_proxy` covering the mirror hosts so
mirror traffic stays direct. Git over SSH ignores these variables; if port 22
is blocked, route GitHub through `ssh.github.com` port 443 in
`~/.ssh/config`.

Mirrors can leak into committed lockfiles; see "Lockfiles And Mirrors" in the
skill.

## Shell Profile Layout

| File | Contents |
| --- | --- |
| `~/.zprofile` | `typeset -U path`, `brew shellenv`, Homebrew mirror variables, the Codex installer PATH block |
| `~/.zshrc` | Interactive aliases and the `proxy-on` / `proxy-off` functions |
| `~/.npmrc` | npm registry mirror |
| `~/.config/uv/uv.toml` | uv index and Python download mirrors |

Claude Code and Codex both run commands through login zsh, so environment
needed by agents belongs in `~/.zprofile`, not only in `~/.zshrc`.

`typeset -U path` keeps PATH free of duplicates when login shells nest. The
resulting order is `~/.local/bin`, `<brew-prefix>/bin`, `<brew-prefix>/sbin`,
then the system paths. Load Homebrew with
`eval "$(<brew-prefix>/bin/brew shellenv zsh)"`, guarded by a test that the
file exists, so the profile works on both prefixes. Because `~/.local/bin` comes first, a stray executable
there shadows the Homebrew copy; keep it limited to agent CLIs and uv shims.

Back up a profile file to `~/.local/state/dev-env/backup/` before editing it.

## Node Layer

```bash
brew install node
npm config get prefix      # expect the output of brew --prefix
npm install --global <package>@<version>
```

Homebrew's `node` formula tracks the current release line. Keep global npm
packages to CLIs with no better owner. Claude Code and the Codex CLI are not
npm packages here; do not install `@anthropic-ai/claude-code` or
`@openai/codex` globally, because that creates a second, shadowed copy.

## Python Layer

```bash
brew install uv
uv python install <version>        # on demand; uv also installs on first use
uv tool install <package>          # global Python CLI into ~/.local/bin
uv tool upgrade --all
uvx <package>                      # one-off tool run
```

`/usr/bin/python3` is Apple's Command Line Tools Python (3.9 at the time of
writing). Leave it alone;
plugin scripts that target it must stay standard-library only. Never run
`pip3 install` against it.

## Agent CLIs

Claude Code and the Codex CLI update themselves. Do not reinstall, move, or
relink them through another manager. Check them with:

```bash
claude --version
codex --version
readlink "$(command -v claude)"
readlink "$(command -v codex)"
```

## Container Layer

Install only when a task needs containers:

```bash
brew install colima docker docker-compose
colima start --cpu 4 --memory 6 --disk 60
docker context use colima
```

Colima is a CLI-only Lima VM, managed entirely by Homebrew. To make
`docker compose` find the plugin, add `"cliPluginsExtraDirs":
["<brew-prefix>/lib/docker/cli-plugins"]` to `~/.docker/config.json`. Stop the
VM with `colima stop` when idle. Keep databases, queues, and service
dependencies in containers rather than in Homebrew services, unless the user
asks for a native service.

## Resolve Conflicts

```bash
type -a <command>
brew which-formula <command> 2>/dev/null || brew list --formula | rg <name>
ls -l ~/.local/bin
npm ls --global --depth=0
uv tool list
```

For a file in `<brew-prefix>`, `brew list <formula>` confirms ownership. For
a stray file without an owner, move it to
`~/.local/state/dev-env/quarantine/` instead of deleting it, and report the
move.

## Verification

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/dev-env/scripts/check_env.py"
brew doctor
brew config | rg -i 'HOMEBREW_(API|BOTTLE)|origin'
npm config get registry
uv python find
```

The environment is organized when Homebrew tools resolve from `<brew-prefix>`,
`claude` and `codex` from `~/.local/bin` into their installers' directories,
nothing else lives in `~/.local/bin` except uv shims, the mirrors are
set, and the check script reports no problems.
