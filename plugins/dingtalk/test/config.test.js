import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { findProjectConfig, loadConfig, mergeConfig } from "../src/config.js";

test("mergeConfig replaces arrays and merges objects", () => {
  const merged = mergeConfig({ a: { x: 1, list: ["old"] } }, { a: { y: 2, list: ["new"] } });
  assert.deepEqual(merged, { a: { x: 1, y: 2, list: ["new"] } });
});

test("nearest project config is discovered up to the git root", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dingtalk-config-"));
  fs.mkdirSync(path.join(root, ".git"));
  fs.mkdirSync(path.join(root, ".claude"));
  fs.mkdirSync(path.join(root, "a", "b"), { recursive: true });
  fs.writeFileSync(path.join(root, ".claude", "dingtalk.toml"), "version = 1\n[paths]\ndocuments_root = '/tmp/docs'\n");
  assert.equal(findProjectConfig(path.join(root, "a", "b")), path.join(root, ".claude", "dingtalk.toml"));
  assert.equal(loadConfig({ cwd: path.join(root, "a", "b") }).config.paths.documents_root, "/tmp/docs");
});
