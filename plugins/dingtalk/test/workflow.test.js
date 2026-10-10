import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readMarkdown } from "../src/markdown.js";
import { ConfirmationStore } from "../src/tokens.js";
import { BLANK_LOG_TEMPLATE, DingTalkWorkflow } from "../src/workflow.js";

class FakeUpstream {
  constructor() { this.calls = []; this.remoteBody = "# Existing\n\nRemote\n"; this.recipientDetails = null; }
  async call(kind, name, args) {
    this.calls.push({ kind, name, args });
    if (name === "get_document_info") return { nodeId: args.nodeId, name: "Existing", revision: "r1", docUrl: `https://alidocs.dingtalk.com/i/nodes/${args.nodeId}` };
    if (name === "get_document_content") return { markdown: this.remoteBody };
    if (name === "create_document") { this.remoteBody = args.markdown || ""; return { nodeId: "created-node", docUrl: "https://example/doc", revision: "r1" }; }
    if (name === "update_document") { this.remoteBody = args.markdown || `${this.remoteBody}${args.markdown || ""}`; return { revision: "r2" }; }
    if (name === "rename_document") return { ok: true };
    if (name === "get_template_details_by_name") return { templateId: BLANK_LOG_TEMPLATE.templateId };
    if (name === "get_user_info_by_user_ids") {
      return this.recipientDetails ?? args.user_id_list.map((userId) => ({ userId, name: "Leader" }));
    }
    if (name === "create_report") return { reportId: "report-1", url: "https://example/report" };
    if (name === "get_send_report_list") return { list: [{ reportId: "report-1" }] };
    if (name === "get_report_entry_details") return { reportId: args.report_id, title: "Weekly report", content: "Archived body" };
    throw new Error(`Unexpected call: ${kind}.${name}`);
  }
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dingtalk-workflow-"));
  fs.mkdirSync(path.join(root, ".git"));
  fs.mkdirSync(path.join(root, ".claude"));
  fs.writeFileSync(path.join(root, ".claude", "dingtalk.toml"), `version = 1\n[paths]\ndocuments_root = '${root}/documents'\nreports_root = '${root}/reports'\n[reports.recipients]\nweekly = ['10001']\n`);
  const upstream = new FakeUpstream();
  const workflow = new DingTalkWorkflow({ upstream, confirmations: new ConfirmationStore() });
  return { root, upstream, workflow };
}

test("new document is prepared, created, and bound as managed", async () => {
  const { root, workflow } = fixture();
  const file = path.join(root, "proposal.md");
  fs.writeFileSync(file, "# Proposal\n\nContent\n");
  const prepared = await workflow.prepareDocumentPush({ file_path: file, cwd: root });
  assert.equal(prepared.ready, true);
  assert.equal(prepared.summary.kind, "document");
  assert.equal(prepared.summary.operation, "create");
  assert.equal(prepared.confirmation_required, true);
  const refreshed = await workflow.prepareDocumentPush({
    file_path: file, cwd: root, confirmed_fingerprint: prepared.fingerprint,
  });
  assert.equal(refreshed.fingerprint, prepared.fingerprint);
  assert.equal(refreshed.confirmation_required, false);
  const pushed = await workflow.pushDocument({ file_path: file, confirmation_token: prepared.token });
  assert.equal(pushed.node_id, "created-node");
  assert.equal(readMarkdown(file).data.dingtalk.binding, "managed");
});

test("pulled references cannot push until explicitly adopted", async () => {
  const { root, workflow } = fixture();
  const file = path.join(root, "reference.md");
  await workflow.pullDocument({ source: "remote-node", output_path: file, cwd: root });
  const blocked = await workflow.prepareDocumentPush({ file_path: file, cwd: root });
  assert.equal(blocked.ready, false);
  assert.match(blocked.blockers[0], /reference/);
  assert.equal(Object.hasOwn(blocked, "token"), false);
  workflow.adoptDocument({ file_path: file, confirmed: true });
  const prepared = await workflow.prepareDocumentPush({ file_path: file, cwd: root });
  assert.equal(prepared.summary.operation, "update");
});

test("remote document drift blocks managed pushes", async () => {
  const { root, upstream, workflow } = fixture();
  const file = path.join(root, "reference.md");
  await workflow.pullDocument({ source: "remote-node", output_path: file, binding: "managed", cwd: root });
  upstream.remoteBody = "Changed elsewhere";
  const blocked = await workflow.prepareDocumentPush({ file_path: file, cwd: root });
  assert.equal(blocked.ready, false);
  assert.match(blocked.blockers[0], /远端文档/);
});

test("report publication is locked until manual deletion is recorded", async () => {
  const { root, workflow } = fixture();
  const dir = path.join(root, "weekly", "2026");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "2026-W28.md");
  fs.writeFileSync(file, "# 周报：2026-W28\n\n## 工作事项\n\n完成插件设计。\n");
  const prepared = await workflow.prepareReportPublish({ file_path: file, cwd: root });
  assert.equal(prepared.ready, true);
  assert.deepEqual(prepared.summary.recipients, [{ user_id: "10001", name: "Leader" }]);
  assert.equal(prepared.summary.file, file);
  assert.equal(prepared.summary.template, "空白日志");
  assert.equal(prepared.summary.creator, "MCP 绑定账号本人");
  assert.equal(Object.hasOwn(prepared.summary, "content_sha256"), false);
  assert.equal(prepared.summary.manual_rename_required, true);
  assert.match(prepared.summary.manual_rename_instruction, /创建人本人，不是任何接收人/);
  assert.match(prepared.summary.manual_rename_instruction, /创建人姓名的周报/);
  const published = await workflow.publishReport({ file_path: file, confirmation_token: prepared.token });
  assert.equal(published.report_id, "report-1");
  assert.equal(published.manual_rename_required, true);
  assert.match(published.manual_rename_instruction, /创建人本人，不是任何接收人/);
  assert.match(published.manual_rename_instruction, /创建人姓名的周报/);
  const blocked = await workflow.prepareReportPublish({ file_path: file, cwd: root });
  assert.equal(blocked.ready, false);
  assert.match(blocked.blockers[0], /published/);
  workflow.markReportRemoteDeleted({ file_path: file, report_id: "report-1", user_confirmation: true });
  const again = await workflow.prepareReportPublish({ file_path: file, cwd: root });
  assert.equal(again.summary.report_type, "weekly");
  assert.equal(readMarkdown(file).data.dingtalk.publication_history.length, 1);
});

test("report preparation recognizes DingTalk organization employee details", async () => {
  const { root, upstream, workflow } = fixture();
  const dir = path.join(root, "weekly", "2026");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "2026-W29.md");
  fs.writeFileSync(file, "# 周报：2026-W29\n\n## 工作事项\n\n完成插件测试。\n");
  upstream.recipientDetails = {
    result: [{
      isAdmin: false,
      orgEmployeeModel: { orgUserId: "10001", orgUserName: "刘洋" },
    }],
    success: true,
  };

  const prepared = await workflow.prepareReportPublish({ file_path: file, cwd: root });

  assert.equal(prepared.ready, true);
  assert.deepEqual(prepared.summary.recipients, [{ user_id: "10001", name: "刘洋" }]);
});

test("published report edits are detected", async () => {
  const { root, workflow } = fixture();
  const dir = path.join(root, "weekly");
  fs.mkdirSync(dir);
  const file = path.join(dir, "x.md");
  fs.writeFileSync(file, "# 周报\n\nBody\n");
  const prepared = await workflow.prepareReportPublish({ file_path: file, cwd: root });
  await workflow.publishReport({ file_path: file, confirmation_token: prepared.token });
  fs.appendFileSync(file, "\nChanged\n");
  assert.equal(workflow.reportStatus({ file_path: file }).status, "modified_after_publish");
});

test("all report types publish their Markdown body through the blank-log template", async () => {
  const cases = [
    ["daily", "日报"],
    ["weekly", "周报"],
    ["monthly", "月报"],
    ["annual", "年报"],
  ];

  for (const [type, label] of cases) {
    const { root, upstream, workflow } = fixture();
    const dir = path.join(root, type, "2026");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${type}.md`);
    fs.writeFileSync(file, `# ${label}：2026\n\n## 工作进展\n\n保留 **Markdown**。\n`);

    const prepared = await workflow.prepareReportPublish({
      file_path: file,
      recipients: ["10001"],
      cwd: root,
    });
    assert.equal(prepared.summary.report_type, type);
    assert.equal(prepared.summary.report_label, label);
    assert.equal(prepared.summary.template, BLANK_LOG_TEMPLATE.templateName);
    assert.equal(prepared.summary.template_id, BLANK_LOG_TEMPLATE.templateId);
    assert.equal(prepared.summary.file, file);
    assert.equal(prepared.summary.creator, "MCP 绑定账号本人");
    assert.deepEqual(prepared.summary.recipients, [{ user_id: "10001", name: "Leader" }]);
    assert.equal(Object.hasOwn(prepared.summary, "content_sha256"), false);
    assert.match(prepared.summary.manual_rename_instruction, /创建人本人，不是任何接收人/);
    assert.match(prepared.summary.manual_rename_instruction, new RegExp(`创建人姓名的${label}`));

    const published = await workflow.publishReport({ file_path: file, confirmation_token: prepared.token });
    const create = upstream.calls.find((call) => call.name === "create_report");
    assert.equal(create.args.templateId, BLANK_LOG_TEMPLATE.templateId);
    assert.deepEqual(create.args.contents, [{
      key: "内容",
      sort: "0",
      type: "1",
      contentType: "markdown",
      content: "## 工作进展\n\n保留 **Markdown**。",
    }]);
    assert.match(published.manual_rename_instruction, /创建人本人，不是任何接收人/);
    assert.match(published.manual_rename_instruction, new RegExp(`创建人姓名的${label}`));
    const metadata = readMarkdown(file).data.dingtalk;
    assert.equal(metadata.remote_template, "空白日志");
    assert.equal(metadata.manual_rename_required, true);
  }
});

test("report preparation returns a blocker when no recipients are configured", async () => {
  const { root, workflow } = fixture();
  const dir = path.join(root, "daily", "2026", "07");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "2026-07-16.md");
  fs.writeFileSync(file, "# 日报：2026-07-16\n\n完成测试。\n");

  const prepared = await workflow.prepareReportPublish({ file_path: file, recipients: [], cwd: root });

  assert.equal(prepared.ready, false);
  assert.match(prepared.blockers[0], /没有可用的已配置接收人/);
  assert.equal(Object.hasOwn(prepared, "token"), false);
});

test("a changed draft invalidates its prepared confirmation", async () => {
  const { root, workflow } = fixture();
  const dir = path.join(root, "weekly");
  fs.mkdirSync(dir);
  const file = path.join(dir, "changed.md");
  fs.writeFileSync(file, "# 周报\n\nOriginal\n");
  const prepared = await workflow.prepareReportPublish({ file_path: file, cwd: root });
  fs.appendFileSync(file, "\nChanged\n");

  await assert.rejects(
    () => workflow.publishReport({ file_path: file, confirmation_token: prepared.token }),
    /changed after preparation/,
  );
});
