import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parse } from "smol-toml";
import { loadMcpUrls } from "../src/environment.js";
import { initialize, setRecipients } from "../src/setup.js";

test("project initialization creates directory markers without local templates", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dingtalk-setup-"));
  const company = path.join(root, "company");
  const result = initialize({ project_dir: root, company_root: company });
  assert.equal(result.config_file, path.join(root, ".claude", "dingtalk.toml"));
  assert.deepEqual(result.default_recipients, []);
  assert.ok(fs.existsSync(path.join(company, "documents")));
  assert.match(fs.readFileSync(path.join(company, "documents", "README.md"), "utf8"), /\/dingtalk:dingtalk-documents/);
  assert.match(fs.readFileSync(path.join(company, "reporting", "README.md"), "utf8"), /\/dingtalk:dingtalk-reports/);
  assert.equal(fs.existsSync(path.join(company, "reporting", "templates")), false);
  const config = parse(fs.readFileSync(result.config_file, "utf8"));
  assert.deepEqual(config.reports.recipients.common, []);
  assert.deepEqual(config.reports.recipients.annual, []);
});

test("first user setup imports the Codex configuration without writing it", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dingtalk-import-"));
  const env = { CLAUDE_CONFIG_DIR: path.join(root, "claude"), CODEX_HOME: path.join(root, "codex") };
  const codexFile = path.join(env.CODEX_HOME, "dingtalk.toml");
  const codexToml = `version = 1\n[paths]\ncompany_root = '${root}/company'\ndocuments_root = '${root}/company/docs'\nreports_root = '${root}/company/reports'\n[reports.recipients]\nweekly = ['10001']\n`;
  fs.mkdirSync(env.CODEX_HOME);
  fs.writeFileSync(codexFile, codexToml);

  const result = initialize({ env });
  assert.equal(result.config_file, path.join(env.CLAUDE_CONFIG_DIR, "dingtalk.toml"));
  assert.equal(result.imported_from, codexFile);
  assert.equal(result.documents_root, path.join(root, "company", "docs"));
  assert.deepEqual(result.default_recipients, ["10001"]);
  assert.equal(fs.readFileSync(codexFile, "utf8"), codexToml);

  setRecipients({ env, user_ids: ["10002"], report_types: ["weekly"] });
  const again = initialize({ env });
  assert.equal(again.imported_from, null);
  assert.deepEqual(again.default_recipients, ["10002"]);
  assert.equal(fs.readFileSync(codexFile, "utf8"), codexToml);
});

test("MCP URLs come only from environment variables", () => {
  const urls = loadMcpUrls({ DINGTALK_DOCS_MCP_URL: "https://env.test/docs" });
  assert.equal(urls.docs, "https://env.test/docs");
  assert.equal(urls.contacts, "");
  assert.equal(urls.log, "");
});

test("verified recipient IDs can be assigned by report type", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dingtalk-set-recipients-"));
  initialize({ project_dir: root, company_root: path.join(root, "company") });
  setRecipients({ project_dir: root, user_ids: ["10001"], report_types: ["weekly", "monthly", "annual"] });
  const config = parse(fs.readFileSync(path.join(root, ".claude", "dingtalk.toml"), "utf8"));
  assert.deepEqual(config.reports.recipients.daily, []);
  assert.deepEqual(config.reports.recipients.weekly, ["10001"]);
  assert.deepEqual(config.reports.recipients.monthly, ["10001"]);
  assert.deepEqual(config.reports.recipients.annual, ["10001"]);
});

test("setup CLI works without any DingTalk MCP environment", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dingtalk-setup-cli-"));
  const script = new URL("../scripts/setup.js", import.meta.url).pathname;
  const env = { ...process.env, HOME: path.join(root, "home") };
  delete env.CLAUDE_CONFIG_DIR;
  delete env.CODEX_HOME;
  delete env.DINGTALK_CONTACTS_MCP_URL;
  delete env.DINGTALK_DOCS_MCP_URL;
  delete env.DINGTALK_LOG_MCP_URL;

  const initialized = spawnSync(process.execPath, [
    script, "initialize", "--project-dir", root, "--company-root", path.join(root, "company"),
  ], { encoding: "utf8", env });
  assert.equal(initialized.status, 0, initialized.stderr);

  const recipients = spawnSync(process.execPath, [
    script, "set-recipients", "--project-dir", root,
    "--user-id", "10001", "--report-type", "weekly",
  ], { encoding: "utf8", env });
  assert.equal(recipients.status, 0, recipients.stderr);

  const status = spawnSync(process.execPath, [script, "status"], {
    cwd: root,
    encoding: "utf8",
    env,
  });
  assert.equal(status.status, 0, status.stderr);
  const result = JSON.parse(status.stdout);
  assert.equal(result.mcp.contacts.configured, false);
  assert.equal(result.paths.documents_root_exists, true);
  assert.equal(result.root_readmes.documents, true);
  assert.equal(result.root_readmes.reports, true);
  assert.equal(result.default_report_recipient_count, 1);
});
