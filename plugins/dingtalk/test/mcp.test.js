import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import test from "node:test";
import { createDingTalkServer } from "../src/mcp.js";

test("wrapped MCP exposes business tools but no setup tools", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createDingTalkServer({ upstream: { async call() {} } });
  const client = new Client({ name: "test-client", version: "1.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const { tools } = await client.listTools();
  const names = tools.map(({ name }) => name);

  assert.equal(names.length, 11);
  assert.ok(names.includes("dingtalk_contacts_find"));
  assert.ok(names.includes("dingtalk_docs_pull"));
  assert.ok(names.includes("dingtalk_reports_publish"));
  assert.ok(names.every((name) => !name.startsWith("dingtalk_setup_")));
  await client.close();
});

test("report preparation returns a readable confirmation and structured private state", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dingtalk-mcp-"));
  const dir = path.join(root, "weekly");
  fs.mkdirSync(dir);
  const file = path.join(dir, "2026-W29.md");
  fs.writeFileSync(file, "# 周报：2026-W29\n\n完成确认流程。\n");
  const upstream = {
    async call(_kind, name, args) {
      if (name === "get_user_info_by_user_ids") {
        return args.user_id_list.map((userId) => ({ userId, name: "负责人" }));
      }
      if (name === "get_template_details_by_name") return { templateId: "1740a78635888d35e3972cf40979e214" };
      throw new Error(`Unexpected call: ${name}`);
    },
  };
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createDingTalkServer({ upstream });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const prepared = await client.callTool({
    name: "dingtalk_reports_prepare_publish",
    arguments: { file_path: file, recipients: ["10001"], cwd: root },
  });
  const text = prepared.content.find(({ type }) => type === "text")?.text || "";

  assert.equal(prepared.structuredContent.ready, true);
  assert.deepEqual(prepared.structuredContent.summary.recipients, [{ user_id: "10001", name: "负责人" }]);
  assert.match(text, /钉钉日志发布确认/);
  assert.match(text, /负责人（10001）/);
  assert.match(text, /是否确认发布/);
  assert.doesNotMatch(text, new RegExp(prepared.structuredContent.token));
  assert.doesNotMatch(text, new RegExp(prepared.structuredContent.fingerprint));
  await client.close();
});

test("document preparation returns the fixed synchronization confirmation", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dingtalk-mcp-doc-"));
  const file = path.join(root, "proposal.md");
  fs.writeFileSync(file, "# 项目方案\n\n正文。\n");
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createDingTalkServer({ upstream: { async call() {} } });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const prepared = await client.callTool({
    name: "dingtalk_docs_prepare_push",
    arguments: { file_path: file, workspace_id: "workspace-1", folder_id: "folder-1", cwd: root },
  });
  const text = prepared.content.find(({ type }) => type === "text")?.text || "";

  assert.equal(prepared.structuredContent.ready, true);
  assert.equal(prepared.structuredContent.summary.operation, "create");
  assert.match(text, /钉钉文档同步确认/);
  assert.match(text, /Workspace：workspace-1/);
  assert.match(text, /Folder：folder-1/);
  assert.match(text, /是否确认同步/);
  assert.doesNotMatch(text, new RegExp(prepared.structuredContent.token));
  await client.close();
});
