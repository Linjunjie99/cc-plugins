from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "check_portability.py"
SPEC = importlib.util.spec_from_file_location("check_portability", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def found(text: str) -> list:
    return [hit for _, hit, _ in MODULE.scan_text(text)]


class ScanTest(unittest.TestCase):
    def test_flags_home_paths(self) -> None:
        self.assertEqual(found("cd /Users/alice/work"), ["/Users/alice"])
        self.assertEqual(found("cd /home/bob/src"), ["/home/bob"])
        self.assertEqual(found("python3 /root/.codex/x.py"), ["/root/"])
        self.assertEqual(found("tmp at /var/folders/ab/T"), ["/var/folders/"])

    def test_portable_forms_pass(self) -> None:
        self.assertEqual(found("cd ~/work && echo $HOME/.root/x"), [])
        self.assertEqual(found("~/.local/bin and <brew-prefix>/bin"), [])
        self.assertEqual(found("a path like ./root/file or proj/root/"), [])

    def test_allow_marker(self) -> None:
        self.assertEqual(found('HOME = "/Users/me"  # portability: allow'), [])

    def test_repository_is_portable(self) -> None:
        root = SCRIPT.parents[1]
        self.assertEqual(MODULE.scan(root, MODULE.tracked_files(root)), [])


if __name__ == "__main__":
    unittest.main()
