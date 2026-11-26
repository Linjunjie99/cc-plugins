import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parse } from "smol-toml";
import { loadMcpUrls } from "../src/environment.js";
import { initialize, setRecipients, setupStatus } from "../src/setup.js";

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dingtalk-setup-"));
  const env = { DINGTALK_CONFIG: path.join(root, "config", "config.toml") };
  return { root, env, docs: path.join(root, "company", "documents"), reports: path.join(root, "company", "reporting") };
}

test("first setup requires both directories instead of guessing", () => {
  const { env } = sandbox();
  assert.throws(() => initialize({ env }), /documents_root and reports_root are required/);
  assert.throws(() => initialize({ env, documents_root: "/tmp/only-docs" }), /required/);
  assert.equal(fs.existsSync(env.DINGTALK_CONFIG), false);
});

test("initialization writes the shared file and directory markers", () => {
  const { env, docs, reports } = sandbox();
  const result = initialize({ env, documents_root: docs, reports_root: reports });
  assert.equal(result.config_file, env.DINGTALK_CONFIG);
  assert.equal(fs.statSync(env.DINGTALK_CONFIG).mode & 0o777, 0o600);
  assert.deepEqual(result.default_recipients, []);
  assert.match(fs.readFileSync(path.join(docs, "README.md"), "utf8"), /dingtalk-documents/);
  assert.match(fs.readFileSync(path.join(reports, "README.md"), "utf8"), /dingtalk-reports/);
  for (const dir of ["daily", "weekly", "monthly", "annual", "imported"]) {
    assert.ok(fs.existsSync(path.join(reports, dir)), dir);
  }
  const config = parse(fs.readFileSync(env.DINGTALK_CONFIG, "utf8"));
  assert.equal(config.paths.documents_root, docs);
  assert.equal(Object.hasOwn(config.paths, "company_root"), false);
});

test("re-running setup keeps configured paths and recipients", () => {
  const { env, docs, reports } = sandbox();
  initialize({ env, documents_root: docs, reports_root: reports });
  setRecipients({ env, user_ids: ["10001"], report_types: ["weekly"] });
  const again = initialize({ env });
  assert.equal(again.documents_root, docs);
  assert.equal(again.reports_root, reports);
  assert.deepEqual(again.default_recipients, ["10001"]);
});

test("one path can be changed without touching the other", () => {
  const { root, env, docs, reports } = sandbox();
  initialize({ env, documents_root: docs, reports_root: reports });
  const moved = path.join(root, "elsewhere", "reports");
  const result = initialize({ env, reports_root: moved });
  assert.equal(result.documents_root, docs);
  assert.equal(result.reports_root, moved);
});

test("recipients cannot be saved before initialization", () => {
  const { env } = sandbox();
  assert.throws(() => setRecipients({ env, user_ids: ["10001"] }), /Run initialize first/);
});

test("verified recipient IDs can be assigned by report type", () => {
  const { env, docs, reports } = sandbox();
  initialize({ env, documents_root: docs, reports_root: reports });
  setRecipients({ env, user_ids: ["10001"], report_types: ["weekly", "monthly", "annual"] });
  const config = parse(fs.readFileSync(env.DINGTALK_CONFIG, "utf8"));
  assert.deepEqual(config.reports.recipients.daily, []);
  assert.deepEqual(config.reports.recipients.weekly, ["10001"]);
  assert.deepEqual(config.reports.recipients.annual, ["10001"]);
});

test("status reports an unconfigured machine without failing", () => {
  const { env } = sandbox();
  const status = setupStatus({ env });
  assert.equal(status.config_exists, false);
  assert.equal(status.configured, false);
  assert.equal(status.paths.documents_root, null);
  assert.equal(status.paths.documents_root_exists, false);
});

test("MCP URLs come only from environment variables", () => {
  const urls = loadMcpUrls({ DINGTALK_DOCS_MCP_URL: "https://env.test/docs" });
  assert.equal(urls.docs, "https://env.test/docs");
  assert.equal(urls.contacts, "");
  assert.equal(urls.log, "");
});

test("setup CLI works without any DingTalk MCP environment", () => {
  const { root, docs, reports } = sandbox();
  const script = new URL("../scripts/setup.js", import.meta.url).pathname;
  const env = { ...process.env, HOME: path.join(root, "home"), DINGTALK_CONFIG: path.join(root, "cli.toml") };
  delete env.DINGTALK_CONTACTS_MCP_URL;
  delete env.DINGTALK_DOCS_MCP_URL;
  delete env.DINGTALK_LOG_MCP_URL;
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env });

  const missing = run("initialize");
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /required/);

  assert.equal(run("initialize", "--documents-root", docs, "--reports-root", reports).status, 0);
  assert.equal(run("set-recipients", "--user-id", "10001", "--report-type", "weekly").status, 0);

  const status = run("status");
  assert.equal(status.status, 0, status.stderr);
  const result = JSON.parse(status.stdout);
  assert.equal(result.configured, true);
  assert.equal(result.mcp.contacts.configured, false);
  assert.equal(result.paths.documents_root_exists, true);
  assert.equal(result.root_readmes.reports, true);
  assert.equal(result.default_report_recipient_count, 1);
});
