import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("MCP process fails before serving when upstream environment is incomplete", () => {
  const env = { ...process.env };
  delete env.DINGTALK_CONTACTS_MCP_URL;
  delete env.DINGTALK_DOCS_MCP_URL;
  delete env.DINGTALK_LOG_MCP_URL;

  const result = spawnSync(process.execPath, [new URL("../src/server.js", import.meta.url).pathname], {
    encoding: "utf8",
    env,
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /DingTalk MCP is not configured/);
  assert.match(result.stderr, /DINGTALK_CONTACTS_MCP_URL/);
  assert.equal(result.stdout, "");
});
