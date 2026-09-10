from __future__ import annotations

import importlib.util
import os
from pathlib import Path
import unittest
import unittest.mock


SCRIPT = (
    Path(__file__).resolve().parents[1]
    / "skills"
    / "configure-global-guidance"
    / "scripts"
    / "sync_global_guidance.py"
)
SPEC = importlib.util.spec_from_file_location("sync_global_guidance", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class RenderGuidanceTest(unittest.TestCase):
    def test_appends_managed_block_without_changing_existing_guidance(self) -> None:
        current = "# Global Guidance\n\nKeep this rule.\n"
        block = f"{MODULE.START}\nmanaged\n{MODULE.END}"

        rendered = MODULE.render(current, block)

        self.assertTrue(rendered.startswith(current.rstrip()))
        self.assertIn("Keep this rule.", rendered)
        self.assertEqual(rendered.count(MODULE.START), 1)
        self.assertEqual(rendered.count(MODULE.END), 1)

    def test_replaces_only_existing_managed_block(self) -> None:
        current = (
            "before\n\n"
            f"{MODULE.START}\nold\n{MODULE.END}\n\n"
            "after\n"
        )
        block = f"{MODULE.START}\nnew\n{MODULE.END}"

        rendered = MODULE.render(current, block)

        self.assertEqual(
            rendered,
            f"before\n\n{block}\n\nafter\n",
        )

    def test_rejects_incomplete_or_duplicate_markers(self) -> None:
        block = f"{MODULE.START}\nnew\n{MODULE.END}"
        invalid = (
            MODULE.START,
            f"{MODULE.START}\na\n{MODULE.END}\n{MODULE.START}\nb\n{MODULE.END}",
        )

        for current in invalid:
            with self.subTest(current=current):
                with self.assertRaises(MODULE.GuidanceError):
                    MODULE.render(current, block)


class DefaultTargetTest(unittest.TestCase):
    def test_uses_claude_config_dir_when_set(self) -> None:
        with unittest.mock.patch.dict(
            "os.environ", {"CLAUDE_CONFIG_DIR": "/tmp/cc-home"}, clear=False
        ):
            self.assertEqual(
                MODULE.default_target(), Path("/tmp/cc-home") / "CLAUDE.md"
            )

    def test_falls_back_to_claude_home(self) -> None:
        env = {k: v for k, v in os.environ.items()}
        env.pop("CLAUDE_CONFIG_DIR", None)
        with unittest.mock.patch.dict("os.environ", env, clear=True):
            self.assertEqual(
                MODULE.default_target(), Path.home() / ".claude" / "CLAUDE.md"
            )


class CanonicalAssetTest(unittest.TestCase):
    def test_asset_exists_and_has_no_markers(self) -> None:
        body = MODULE.DEFAULT_ASSET.read_text(encoding="utf-8")

        self.assertNotIn(MODULE.START, body)
        self.assertNotIn(MODULE.END, body)
        self.assertIn("Engineering Context Framework", body)


if __name__ == "__main__":
    unittest.main()
