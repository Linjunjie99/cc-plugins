import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { configPath, expandHome, loadConfig, mergeConfig, portablePath, requireConfig } from "../src/config.js";

function tempConfig(content) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dingtalk-config-"));
  const file = path.join(root, "config.toml");
  if (content !== undefined) fs.writeFileSync(file, content);
  return { root, env: { DINGTALK_CONFIG: file } };
}

test("mergeConfig replaces arrays and merges objects", () => {
  const merged = mergeConfig({ a: { x: 1, list: ["old"] } }, { a: { y: 2, list: ["new"] } });
  assert.deepEqual(merged, { a: { x: 1, y: 2, list: ["new"] } });
});

test("the shared configuration lives under ~/.config/dingtalk unless overridden", () => {
  assert.equal(configPath({}), path.join(os.homedir(), ".config", "dingtalk", "config.toml"));
  assert.equal(configPath({ DINGTALK_CONFIG: "/tmp/x.toml" }), "/tmp/x.toml");
});

test("without a configuration file there are no default paths", () => {
  const { env } = tempConfig();
  const { config, configured } = loadConfig({ env });
  assert.equal(configured, false);
  assert.equal(config.paths.documents_root, "");
  assert.equal(config.paths.reports_root, "");
  assert.throws(() => requireConfig({ env }), /dingtalk-setup/);
});

test("a file missing one root is not configured", () => {
  const { env } = tempConfig("version = 1\n[paths]\ndocuments_root = '/tmp/docs'\n");
  assert.equal(loadConfig({ env }).configured, false);
});

test("paths under the home directory are stored with ~ and expanded on load", () => {
  const docs = path.join(os.homedir(), "work", "documents");
  assert.equal(portablePath(docs), "~/work/documents");
  assert.equal(portablePath("/srv/docs"), "/srv/docs");
  assert.equal(expandHome("~/work/documents"), docs);
  const { env } = tempConfig("version = 1\n[paths]\ndocuments_root = '~/work/documents'\nreports_root = '/srv/reports'\n");
  const { config, configured } = loadConfig({ env });
  assert.equal(configured, true);
  assert.equal(config.paths.documents_root, docs);
  assert.equal(config.paths.reports_root, "/srv/reports");
});
