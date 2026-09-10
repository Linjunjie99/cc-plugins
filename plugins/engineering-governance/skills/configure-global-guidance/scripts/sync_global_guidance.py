#!/usr/bin/env python3
"""Synchronize one managed section without exposing unrelated guidance."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import tempfile


START = "<!-- BEGIN engineering-governance -->"
END = "<!-- END engineering-governance -->"
DEFAULT_ASSET = Path(__file__).resolve().parent.parent / "assets" / "global-claude-section.md"


class GuidanceError(RuntimeError):
    pass


def managed_block(asset: Path) -> str:
    body = asset.read_text(encoding="utf-8").strip()
    if START in body or END in body:
        raise GuidanceError("canonical guidance must not contain management markers")
    return f"{START}\n{body}\n{END}"


def render(current: str, block: str) -> str:
    starts = current.count(START)
    ends = current.count(END)
    if starts != ends or starts > 1:
        raise GuidanceError("global guidance contains malformed or duplicate managed markers")

    if starts == 0:
        base = current.rstrip()
        if not base:
            base = "# Global Claude Code Guidance"
        return f"{base}\n\n{block}\n"

    start = current.index(START)
    end = current.index(END, start) + len(END)
    return f"{current[:start]}{block}{current[end:]}".rstrip() + "\n"


def write_atomic(target: Path, content: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    mode = target.stat().st_mode if target.exists() else 0o100644
    temp_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=target.parent,
            prefix=f".{target.name}.",
            delete=False,
        ) as handle:
            handle.write(content)
            temp_name = handle.name
        os.chmod(temp_name, mode & 0o777)
        os.replace(temp_name, target)
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)


def default_target() -> Path:
    config_dir = os.environ.get("CLAUDE_CONFIG_DIR")
    if config_dir:
        return Path(config_dir).expanduser() / "CLAUDE.md"
    return Path.home() / ".claude" / "CLAUDE.md"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("check", "apply"))
    parser.add_argument("--target", type=Path, default=default_target())
    parser.add_argument("--asset", type=Path, default=DEFAULT_ASSET)
    args = parser.parse_args()

    try:
        current = args.target.read_text(encoding="utf-8") if args.target.exists() else ""
        expected = render(current, managed_block(args.asset))
    except (OSError, GuidanceError) as exc:
        print(f"Global guidance error: {exc}")
        return 2

    if args.action == "check":
        if current == expected:
            print("Global guidance is current.")
            return 0
        print("Global guidance is missing or outdated.")
        return 1

    try:
        write_atomic(args.target, expected)
    except OSError as exc:
        print(f"Global guidance error: {exc}")
        return 2
    print("Global guidance managed section synchronized.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
