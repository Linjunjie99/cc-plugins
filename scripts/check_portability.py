#!/usr/bin/env python3
"""Fail when tracked files hard-code one machine's paths or user.

Plugins in this repository must work for any user name, home directory,
operating system, and Homebrew prefix. This scans files tracked by Git for
absolute home paths and other machine-specific locations.

A line may opt out with the marker `portability: allow` when the absolute path
is itself the subject (for example a test fixture or a documented default).
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple

ALLOW_MARKER = "portability: allow"

# (pattern, reason). Paths are matched as text, so the patterns stay narrow.
RULES: Sequence[Tuple[re.Pattern, str]] = (
    (re.compile(r"/Users/[A-Za-z0-9._-]+"), "macOS home path; use ~ or $HOME"),
    (re.compile(r"/home/[A-Za-z0-9._-]+"), "Linux home path; use ~ or $HOME"),
    (re.compile(r"(?<![\w.~-])/root/"), "root's home path; use ~ or $HOME"),
    (re.compile(r"[A-Za-z]:\\\\Users\\\\"), "Windows home path"),
    (re.compile(r"/var/folders/"), "macOS per-user temporary path"),
)

SKIP_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".woff", ".woff2"}
SKIP_NAMES = {"package-lock.json"}
SKIP_PARTS = {"dist", "node_modules"}


def tracked_files(root: Path) -> List[Path]:
    out = subprocess.run(["git", "ls-files", "-z"], cwd=root, capture_output=True, check=True)
    return [root / name for name in out.stdout.decode().split("\0") if name]


def skipped(path: Path, root: Path) -> bool:
    rel = path.relative_to(root)
    return (
        path.suffix.lower() in SKIP_SUFFIXES
        or path.name in SKIP_NAMES
        or any(part in SKIP_PARTS for part in rel.parts)
        or rel == Path("scripts/check_portability.py")
    )


def scan_text(text: str) -> Iterable[Tuple[int, str, str]]:
    for number, line in enumerate(text.splitlines(), 1):
        if ALLOW_MARKER in line:
            continue
        for pattern, reason in RULES:
            match = pattern.search(line)
            if match:
                yield number, match.group(0), reason
                break


def scan(root: Path, files: Iterable[Path]) -> List[str]:
    findings = []
    for path in files:
        if skipped(path, root) or not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for number, found, reason in scan_text(text):
            findings.append(f"{path.relative_to(root)}:{number}: {found!r}: {reason}")
    return findings


def main(argv: Sequence[str] = ()) -> int:
    root = Path(argv[0]) if argv else Path(__file__).resolve().parents[1]
    findings = scan(root, tracked_files(root))
    for finding in findings:
        print(finding)
    print(f"portability: {len(findings)} problem(s)" if findings else "portability: ok")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
