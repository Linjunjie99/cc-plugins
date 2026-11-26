from __future__ import annotations

import importlib.util
import os
from pathlib import Path
import stat
import tempfile
import unittest


SCRIPT = (
    Path(__file__).resolve().parents[1]
    / "skills"
    / "dev-env"
    / "scripts"
    / "check_env.py"
)
SPEC = importlib.util.spec_from_file_location("check_env", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

HOME = "/Users/me"  # portability: allow (fixture home)
WSL_HOME = "/home/dev"  # portability: allow (fixture home)


class DetectPlatformTest(unittest.TestCase):
    def test_platforms(self) -> None:
        self.assertEqual(MODULE.detect_platform("Darwin"), "macos")
        self.assertEqual(
            MODULE.detect_platform("Linux", "Linux version 5.15 microsoft-standard-WSL2"), "wsl"
        )
        self.assertEqual(MODULE.detect_platform("Linux", "Linux version 6.8 generic"), "linux")


class ClassifyMacosTest(unittest.TestCase):
    def owner(self, path: str, real: str | None = None, prefix: str = "/opt/homebrew") -> str:
        return MODULE.classify(path, real or path, "macos", HOME, prefix)

    def test_homebrew(self) -> None:
        self.assertEqual(
            self.owner("/opt/homebrew/bin/node", "/opt/homebrew/Cellar/node/26.13.1/bin/node"),
            "homebrew",
        )

    def test_intel_prefix(self) -> None:
        self.assertEqual(
            self.owner("/usr/local/bin/node", "/usr/local/Cellar/node/26.13.1/bin/node", "/usr/local"),
            "homebrew",
        )
        self.assertEqual(
            self.owner("/usr/local/bin/brew", "/usr/local/Homebrew/bin/brew", "/usr/local"), "homebrew"
        )
        # On Intel, /usr/local is shared: a file outside Homebrew's trees is not Homebrew's.
        self.assertEqual(self.owner("/usr/local/bin/thing", prefix="/usr/local"), "unmanaged")

    def test_brew_itself_on_apple_silicon(self) -> None:
        self.assertEqual(self.owner("/opt/homebrew/bin/brew"), "homebrew")

    def test_npm_bundled_versus_global_packages(self) -> None:
        modules = "/opt/homebrew/lib/node_modules"
        self.assertEqual(self.owner("/opt/homebrew/bin/npm", f"{modules}/npm/bin/npm-cli.js"), "homebrew")
        self.assertEqual(
            self.owner("/opt/homebrew/bin/tsc", f"{modules}/typescript/bin/tsc"), "npm-global"
        )

    def test_without_homebrew_nothing_is_homebrew(self) -> None:
        self.assertEqual(
            self.owner("/opt/homebrew/bin/node", "/opt/homebrew/Cellar/node/1/bin/node", None),
            "unmanaged",
        )

    def test_system_and_clt(self) -> None:
        self.assertEqual(self.owner("/usr/bin/git"), "macos-system")
        self.assertEqual(
            self.owner(
                "/usr/bin/python3",
                "/Library/Developer/CommandLineTools/usr/bin/python3",
            ),
            "xcode-clt",
        )

    def test_agent_clis_by_target(self) -> None:
        self.assertEqual(
            self.owner(f"{HOME}/.local/bin/claude", f"{HOME}/.local/share/claude/versions/2.1.332"),
            "claude-native",
        )
        self.assertEqual(
            self.owner(
                f"{HOME}/.local/bin/codex",
                f"{HOME}/.codex/packages/standalone/releases/0.172.0/bin/codex",
            ),
            "codex-standalone",
        )

    def test_uv_tool_shim(self) -> None:
        self.assertEqual(
            self.owner(f"{HOME}/.local/bin/ruff", f"{HOME}/.local/share/uv/tools/ruff/bin/ruff"),
            "uv-tool",
        )

    def test_uv_python_shim(self) -> None:
        self.assertEqual(
            self.owner(
                f"{HOME}/.local/bin/python3.13",
                f"{HOME}/.local/share/uv/python/cpython-3.13.18-macos-aarch64-none/bin/python3.13",
            ),
            "uv-python",
        )

    def test_stray_binary_is_unmanaged(self) -> None:
        self.assertEqual(self.owner(f"{HOME}/.local/bin/node"), "unmanaged")
        self.assertEqual(self.owner("/usr/local/bin/thing"), "unmanaged")

    def test_prefix_match_is_on_path_boundary(self) -> None:
        self.assertEqual(self.owner("/opt/homebrew-old/bin/node"), "unmanaged")


class ClassifyWslTest(unittest.TestCase):
    def owner(self, path: str, real: str | None = None) -> str:
        return MODULE.classify(path, real or path, "wsl", WSL_HOME)

    def test_owners(self) -> None:
        self.assertEqual(self.owner("/usr/bin/node"), "apt")
        self.assertEqual(
            self.owner(
                "/usr/local/bin/codex",
                "/usr/local/lib/node_modules/@openai/codex/bin/codex.js",
            ),
            "npm-global",
        )
        self.assertEqual(
            self.owner(f"{WSL_HOME}/.local/bin/uv", f"{WSL_HOME}/.local/share/pipx/venvs/uv/bin/uv"),
            "pipx",
        )
        self.assertEqual(self.owner("/mnt/c/Windows/system32/cmd.exe"), "windows")


class PathTest(unittest.TestCase):
    def test_duplicate_entries(self) -> None:
        entries = ["/a", "/b", "/a/", "/c", "/b"]
        self.assertEqual(MODULE.duplicate_path_entries(entries), ["/a", "/b"])

    def test_empty_entries_ignored(self) -> None:
        self.assertEqual(MODULE.path_entries("/a::/b:"), ["/a", "/b"])


class InspectTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.home = Path(self._tmp.name).resolve()

    def exe(self, rel: str) -> Path:
        path = self.home / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("#!/bin/sh\n")
        path.chmod(path.stat().st_mode | stat.S_IXUSR)
        return path

    def run_inspect(self, *dirs: str) -> dict:
        path_value = os.pathsep.join(str(self.home / d) for d in dirs)
        return MODULE.inspect(["tool"], "macos", str(self.home), path_value, with_versions=False)

    def test_unmanaged_active_copy_is_a_problem(self) -> None:
        self.exe(".local/bin/tool")
        report = self.run_inspect(".local/bin")
        self.assertEqual(report["commands"][0]["matches"][0]["owner"], "unmanaged")
        self.assertTrue(any("no known owner" in p for p in report["problems"]))

    def test_managed_copy_is_clean(self) -> None:
        target = self.exe(".local/share/uv/tools/tool/bin/tool")
        link = self.home / ".local/bin/tool"
        link.parent.mkdir(parents=True)
        link.symlink_to(target)
        report = self.run_inspect(".local/bin")
        self.assertEqual(report["commands"][0]["matches"][0]["owner"], "uv-tool")
        self.assertEqual(report["problems"], [])

    def test_shadowed_copy_is_a_problem(self) -> None:
        a = self.exe(".local/share/uv/tools/tool/bin/tool")
        b = self.exe(".local/share/claude/versions/tool")
        for rel, target in (("one/tool", a), ("two/tool", b)):
            link = self.home / rel
            link.parent.mkdir(parents=True)
            link.symlink_to(target)
        report = self.run_inspect("one", "two")
        self.assertTrue(any("shadows" in p for p in report["problems"]))

    def test_missing_command(self) -> None:
        report = self.run_inspect(".local/bin")
        self.assertEqual(report["commands"][0]["matches"], [])
        self.assertEqual(report["problems"], [])

    def test_same_dir_twice_reported_once_as_path_problem(self) -> None:
        self.exe("bin/tool")
        report = MODULE.inspect(
            ["tool"], "macos", str(self.home),
            os.pathsep.join([str(self.home / "bin")] * 2), with_versions=False,
        )
        self.assertEqual(len(report["commands"][0]["matches"]), 1)
        self.assertTrue(any("more than once" in p for p in report["problems"]))


if __name__ == "__main__":
    unittest.main()
