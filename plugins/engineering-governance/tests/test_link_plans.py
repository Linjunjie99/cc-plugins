from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest


SCRIPT = (
    Path(__file__).resolve().parents[1]
    / "skills"
    / "maintain-project-context"
    / "scripts"
    / "link_plans.py"
)
SPEC = importlib.util.spec_from_file_location("link_plans", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def apply(root: Path) -> list[str]:
    actions = MODULE.build_actions(root)
    for _, run in actions:
        run()
    return [description for description, _ in actions]


class LinkPlansTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)
        (self.root / ".git").mkdir()

    def assert_linked(self) -> None:
        plans = self.root / ".agents" / "plans"
        self.assertTrue(plans.is_dir() and not plans.is_symlink())
        for rel in (".codex/plans", ".claude/plans"):
            link = self.root / rel
            self.assertTrue(link.is_symlink(), rel)
            self.assertEqual(link.resolve(), plans.resolve(), rel)

    def test_fresh_repository_gets_directory_links_and_ignores(self) -> None:
        apply(self.root)

        self.assert_linked()
        entries = (self.root / ".gitignore").read_text(encoding="utf-8").splitlines()
        self.assertEqual(entries, [".agents/plans/", ".codex/plans", ".claude/plans"])

    def test_second_run_changes_nothing(self) -> None:
        apply(self.root)

        self.assertEqual(MODULE.build_actions(self.root), [])

    def test_files_written_through_either_link_land_in_one_directory(self) -> None:
        apply(self.root)

        (self.root / ".codex" / "plans" / "a.md").write_text("a", encoding="utf-8")
        (self.root / ".claude" / "plans" / "b.md").write_text("b", encoding="utf-8")

        names = sorted(p.name for p in (self.root / ".agents" / "plans").iterdir())
        self.assertEqual(names, ["a.md", "b.md"])

    def test_existing_directory_is_merged_and_replaced_by_link(self) -> None:
        legacy = self.root / ".codex" / "plans"
        legacy.mkdir(parents=True)
        (legacy / "initiative.md").write_text("keep", encoding="utf-8")
        (self.root / ".gitignore").write_text("dist/\n.codex/plans/\n", encoding="utf-8")

        apply(self.root)

        self.assert_linked()
        moved = self.root / ".agents" / "plans" / "initiative.md"
        self.assertEqual(moved.read_text(encoding="utf-8"), "keep")
        entries = (self.root / ".gitignore").read_text(encoding="utf-8").splitlines()
        self.assertEqual(entries, ["dist/", ".agents/plans/", ".codex/plans", ".claude/plans"])

    def test_name_conflict_aborts_before_changing_anything(self) -> None:
        for rel in (".codex/plans", ".claude/plans"):
            directory = self.root / rel
            directory.mkdir(parents=True)
            (directory / "same.md").write_text(rel, encoding="utf-8")

        with self.assertRaises(MODULE.PlanLinkError):
            MODULE.build_actions(self.root)

        self.assertFalse((self.root / ".agents").exists())
        self.assertFalse((self.root / ".codex" / "plans").is_symlink())

    def test_symlink_to_another_location_is_rejected(self) -> None:
        elsewhere = self.root / "elsewhere"
        elsewhere.mkdir()
        (self.root / ".codex").mkdir()
        (self.root / ".codex" / "plans").symlink_to(elsewhere, target_is_directory=True)

        with self.assertRaises(MODULE.PlanLinkError):
            MODULE.build_actions(self.root)

    def test_directory_without_git_gets_no_gitignore(self) -> None:
        (self.root / ".git").rmdir()

        apply(self.root)

        self.assertFalse((self.root / ".gitignore").exists())


if __name__ == "__main__":
    unittest.main()
