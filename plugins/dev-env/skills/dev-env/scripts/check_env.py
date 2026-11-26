#!/usr/bin/env python3
"""Read-only development environment check for macOS and Ubuntu WSL.

Reports, for each inspected command, every PATH match, the owner inferred from
its canonical location, and its version. Flags executables without a known
owner, commands shadowed by a second copy, and repeated PATH entries.

The script never changes the environment. It runs on the stock macOS
/usr/bin/python3 (3.9), so it uses only the standard library.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import platform as _platform
import subprocess
import sys
from typing import Dict, List, Optional, Sequence

MACOS_COMMANDS = [
    "brew", "git", "node", "npm", "npx", "uv", "uvx", "python3",
    "claude", "codex", "gh", "rg", "fd", "jq", "docker", "colima",
]
WSL_COMMANDS = [
    "node", "npm", "npx", "claude", "codex", "happy",
    "python3", "pipx", "uv", "docker", "rg", "fd", "fdfind",
]

# Commands whose version is cheap and safe to query.
VERSION_ARGS = {"git": ["--version"], "brew": ["--version"], "docker": ["--version"]}

# Second copies that are expected and not a conflict: the macOS stub, or an
# Xcode Command Line Tools shim, sitting behind the managed copy.
BENIGN_SHADOWS = {"macos-system", "xcode-clt"}


def detect_platform(system: Optional[str] = None, proc_version: Optional[str] = None) -> str:
    system = system or _platform.system()
    if system == "Darwin":
        return "macos"
    if system == "Linux":
        if proc_version is None:
            try:
                proc_version = Path("/proc/version").read_text()
            except OSError:
                proc_version = ""
        return "wsl" if "microsoft" in proc_version.lower() else "linux"
    return system.lower()


def classify(path: str, real: str, plat: str, home: str) -> str:
    """Infer the owning manager from where an executable lives."""
    home = home.rstrip("/")

    def under(p: str, *prefixes: str) -> bool:
        return any(p == x.rstrip("/") or p.startswith(x if x.endswith("/") else x + "/") for x in prefixes)

    # Ownership by resolved target first: a symlink in a shared bin
    # directory belongs to whoever owns its target.
    if under(real, home + "/.local/share/claude"):
        return "claude-native"
    if under(real, home + "/.codex/packages"):
        return "codex-standalone"
    if under(real, home + "/.local/share/uv/tools"):
        return "uv-tool"
    if under(real, home + "/.local/share/uv/python"):
        return "uv-python"
    if under(real, home + "/.local/share/pipx", home + "/.local/pipx"):
        return "pipx"
    if "/.venv/" in real:
        return "project-venv"

    if plat == "macos":
        if under(real, "/opt/homebrew") or under(path, "/opt/homebrew"):
            return "homebrew"
        if under(real, "/Library/Developer/CommandLineTools", "/Applications/Xcode.app"):
            return "xcode-clt"
        if under(path, "/usr/bin", "/bin", "/usr/sbin", "/sbin", "/System"):
            return "macos-system"
        return "unmanaged"

    if plat in ("wsl", "linux"):
        if under(path, "/mnt"):
            return "windows"
        if under(real, "/usr/local/lib/node_modules"):
            return "npm-global"
        if under(path, "/usr/bin", "/bin", "/usr/sbin", "/sbin", "/usr/lib", "/lib"):
            return "apt"
        if under(path, "/snap"):
            return "snap"
        return "unmanaged"

    return "unknown"


def path_entries(path_value: str) -> List[str]:
    return [p for p in path_value.split(os.pathsep) if p]


def duplicate_path_entries(entries: Sequence[str]) -> List[str]:
    seen, dups = set(), []
    for entry in entries:
        key = os.path.normpath(entry)
        if key in seen and key not in dups:
            dups.append(key)
        seen.add(key)
    return dups


def find_all(command: str, entries: Sequence[str]) -> List[str]:
    found, seen = [], set()
    for entry in entries:
        candidate = os.path.join(entry, command)
        key = os.path.normpath(candidate)
        if key in seen:
            continue
        seen.add(key)
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            found.append(candidate)
    return found


def version_of(path: str, command: str) -> str:
    args = VERSION_ARGS.get(command, ["--version"])
    try:
        out = subprocess.run(
            [path, *args], capture_output=True, text=True, timeout=10,
            stdin=subprocess.DEVNULL,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return f"error: {exc.__class__.__name__}"
    text = (out.stdout or out.stderr).strip().splitlines()
    return text[0] if text else f"exit {out.returncode}"


def inspect(commands: Sequence[str], plat: str, home: str, path_value: str,
            with_versions: bool = True) -> Dict[str, object]:
    entries = path_entries(path_value)
    results, problems = [], []
    for command in commands:
        matches = []
        for path in find_all(command, entries):
            real = os.path.realpath(path)
            matches.append({"path": path, "real": real, "owner": classify(path, real, plat, home)})
        item: Dict[str, object] = {"command": command, "matches": matches}
        if matches:
            active = matches[0]
            if with_versions:
                item["version"] = version_of(active["path"], command)
            if active["owner"] in ("unmanaged", "unknown"):
                problems.append(f"{command}: active copy {active['path']} has no known owner")
            distinct = {m["real"] for m in matches}
            shadowed = [m for m in matches[1:]
                        if m["real"] != active["real"] and m["owner"] not in BENIGN_SHADOWS]
            if len(distinct) > 1 and shadowed:
                where = ", ".join(f"{m['path']} ({m['owner']})" for m in shadowed)
                problems.append(f"{command}: {active['path']} shadows {where}")
        results.append(item)

    for dup in duplicate_path_entries(entries):
        problems.append(f"PATH lists {dup} more than once")

    report: Dict[str, object] = {
        "platform": plat,
        "home": home,
        "path": entries,
        "commands": results,
        "problems": problems,
    }
    if plat == "macos":
        report["mirrors"] = {k: os.environ.get(k, "") for k in (
            "HOMEBREW_API_DOMAIN", "HOMEBREW_BOTTLE_DOMAIN", "HOMEBREW_BREW_GIT_REMOTE",
        )}
    return report


def render(report: Dict[str, object]) -> str:
    lines = [f"platform: {report['platform']}", "", "commands:"]
    for item in report["commands"]:  # type: ignore[union-attr]
        matches = item["matches"]
        if not matches:
            lines.append(f"  {item['command']:<8} missing")
            continue
        first = matches[0]
        version = item.get("version", "")
        lines.append(f"  {item['command']:<8} {first['owner']:<17} {first['path']}  {version}")
        if first["real"] != first["path"]:
            lines.append(f"  {'':<8} {'':<17} -> {first['real']}")
        for extra in matches[1:]:
            lines.append(f"  {'':<8} {'(also) ' + extra['owner']:<17} {extra['path']}")
    if "mirrors" in report:
        lines += ["", "homebrew mirrors:"]
        for key, value in report["mirrors"].items():  # type: ignore[union-attr]
            lines.append(f"  {key}={value or '(unset)'}")
    lines += ["", "PATH:"] + [f"  {p}" for p in report["path"]]  # type: ignore[operator]
    problems = report["problems"]
    lines += ["", f"problems: {len(problems) if problems else 'none'}"]  # type: ignore[arg-type]
    lines += [f"  - {p}" for p in problems]  # type: ignore[union-attr]
    return "\n".join(lines)


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("commands", nargs="*", help="commands to inspect (default: platform set)")
    parser.add_argument("--json", action="store_true", help="emit JSON")
    parser.add_argument("--no-versions", action="store_true", help="skip running --version")
    args = parser.parse_args(argv)

    plat = detect_platform()
    commands = args.commands or (MACOS_COMMANDS if plat == "macos" else WSL_COMMANDS)
    report = inspect(commands, plat, str(Path.home()), os.environ.get("PATH", ""),
                     with_versions=not args.no_versions)
    print(json.dumps(report, indent=2) if args.json else render(report))
    return 1 if report["problems"] else 0


if __name__ == "__main__":
    sys.exit(main())
