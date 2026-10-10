import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("plugin exposes only the wrapped DingTalk MCP", () => {
  const pluginManifest = JSON.parse(fs.readFileSync(new URL("../.claude-plugin/plugin.json", import.meta.url), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(new URL("../.mcp.json", import.meta.url), "utf8"));

  assert.equal(Object.hasOwn(pluginManifest, "hooks"), false);
  assert.equal(fs.existsSync(new URL("../hooks/", import.meta.url)), false);
  assert.deepEqual(Object.keys(manifest.mcpServers), ["dingtalk"]);
  assert.deepEqual(manifest.mcpServers.dingtalk, {
    command: "node",
    args: ["${CLAUDE_PLUGIN_ROOT}/dist/server.cjs"],
    env: {
      DINGTALK_CONTACTS_MCP_URL: "${DINGTALK_CONTACTS_MCP_URL:-}",
      DINGTALK_DOCS_MCP_URL: "${DINGTALK_DOCS_MCP_URL:-}",
      DINGTALK_LOG_MCP_URL: "${DINGTALK_LOG_MCP_URL:-}",
    },
  });
});

test("no Codex-only artifacts are carried into the Claude Code port", () => {
  assert.equal(fs.existsSync(new URL("../.codex-plugin/", import.meta.url)), false);
  for (const skill of fs.readdirSync(new URL("../skills/", import.meta.url))) {
    assert.equal(fs.existsSync(new URL(`../skills/${skill}/agents/`, import.meta.url)), false, skill);
  }
});

test("setup skill uses scripts and never depends on setup MCP tools", () => {
  const skill = fs.readFileSync(new URL("../skills/dingtalk-setup/SKILL.md", import.meta.url), "utf8");
  assert.match(skill, /"\$\{CLAUDE_PLUGIN_ROOT\}\/dist\/setup\.cjs" status/);
  assert.doesNotMatch(skill, /dingtalk_setup_/);
});

test("document and report standards and templates live in their skills", () => {
  const documentSkill = fs.readFileSync(new URL("../skills/dingtalk-documents/SKILL.md", import.meta.url), "utf8");
  const reportSkill = fs.readFileSync(new URL("../skills/dingtalk-reports/SKILL.md", import.meta.url), "utf8");
  assert.match(documentSkill, /references\/document-policy\.md/);
  assert.match(documentSkill, /assets\/document\.md/);
  assert.match(reportSkill, /references\/reporting-policy\.md/);
  assert.match(documentSkill, /After completing a new draft or revision/);
  assert.match(documentSkill, /钉钉文档同步确认/);
  assert.match(documentSkill, /confirmation_required=false/);
  assert.match(reportSkill, /After completing a new draft or revision/);
  assert.match(reportSkill, /钉钉日志发布确认/);
  assert.match(reportSkill, /confirmation_required=false/);
  for (const type of ["daily", "weekly", "monthly", "annual"]) {
    assert.match(reportSkill, new RegExp(`assets/${type}\\.md`));
    assert.ok(fs.existsSync(new URL(`../skills/dingtalk-reports/assets/${type}.md`, import.meta.url)));
  }
});
