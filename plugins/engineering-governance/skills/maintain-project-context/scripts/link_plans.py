#!/usr/bin/env python3
"""Make `.agents/plans/` the single plan directory behind every harness path."""

from __future__ import annotations

import argparse
from functools import partial
import os
from pathlib import Path
import shutil
import sys
from typing import Callable

PLAN_DIR = Path(".agents/plans")
LINKS = (Path(".codex/plans"), Path(".claude/plans"))
IGNORE = (".agents/plans/", ".codex/plans", ".claude/plans")
# A trailing-slash pattern matches directories only, so it cannot ignore a symlink.
STALE_IGNORE = {".codex/plans/", "/.codex/plans/", ".claude/plans/", "/.claude/plans/"}

Action = tuple[str, Callable[[], None]]


class PlanLinkError(RuntimeError):
    pass


def make_link(link: Path, plans: Path) -> None:
    link.parent.mkdir(parents=True, exist_ok=True)
    link.symlink_to(os.path.relpath(plans, link.parent), target_is_directory=True)


def gitignore_action(root: Path) -> Action | None:
    path = root / ".gitignore"
    if not path.exists() and not (root / ".git").exists():
        return None
    current = path.read_text(encoding="utf-8") if path.exists() else ""
    lines = [line for line in current.splitlines() if line.strip() not in STALE_IGNORE]
    present = {line.strip() for line in lines}
    lines += [entry for entry in IGNORE if entry not in present]
    updated = "\n".join(lines) + "\n"
    if updated == current:
        return None
    return "update .gitignore", partial(path.write_text, updated, encoding="utf-8")


def build_actions(root: Path) -> list[Action]:
    plans = root / PLAN_DIR
    actions: list[Action] = []
    if not plans.is_dir():
        actions.append((f"create {PLAN_DIR}/", partial(plans.mkdir, parents=True, exist_ok=True)))

    claimed: set[str] = set()
    for rel in LINKS:
        link = root / rel
        if link.is_symlink():
            if link.resolve() != plans.resolve():
                raise PlanLinkError(f"{rel} is a symlink to {os.readlink(link)}, not {PLAN_DIR}")
            continue
        if link.is_dir():
            for child in sorted(link.iterdir()):
                dest = plans / child.name
                if dest.exists() or child.name in claimed:
                    raise PlanLinkError(
                        f"cannot merge {rel}/{child.name}: {PLAN_DIR}/{child.name} already exists"
                    )
                claimed.add(child.name)
                actions.append(
                    (f"move {rel}/{child.name} -> {PLAN_DIR}/{child.name}",
                     partial(shutil.move, str(child), str(dest)))
                )
            actions.append((f"remove empty {rel}/", link.rmdir))
        elif link.exists():
            raise PlanLinkError(f"{rel} exists and is not a directory")
        actions.append(
            (f"link {rel} -> {os.path.relpath(plans, link.parent)}", partial(make_link, link, plans))
        )

    ignore = gitignore_action(root)
    if ignore:
        actions.append(ignore)
    return actions


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default=".", help="repository root (default: .)")
    parser.add_argument("--dry-run", action="store_true", help="print the actions without applying them")
    args = parser.parse_args()

    try:
        actions = build_actions(Path(args.root).resolve())
    except PlanLinkError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    if not actions:
        print("already linked")
    for description, run in actions:
        print(f"would {description}" if args.dry_run else description)
        if not args.dry_run:
            run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
