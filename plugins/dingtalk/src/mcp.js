import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConfirmationStore } from "./tokens.js";
import { DingTalkWorkflow } from "./workflow.js";

function valueOrUnset(value) {
  return value || "未指定";
}

function prepareText(value) {
  const summary = value.summary || {};
  if (!value.ready) {
    const document = summary.kind === "document";
    return [
      document ? "## 钉钉文档尚不能同步" : "## 钉钉日志尚不能发布",
      "",
      `- 草稿：${summary.file || "未知"}`,
      ...value.blockers.map((blocker) => `- 阻塞原因：${blocker}`),
      document ? "- 当前状态：未同步" : "- 当前状态：未发布",
    ].join("\n");
  }
  if (summary.kind === "report") {
    const recipients = summary.recipients
      .map(({ name, user_id }) => `${name || "姓名不可用"}（${user_id}）`)
      .join("；");
    return [
      "## 钉钉日志发布确认",
      "",
      `- 草稿：${summary.file}`,
      `- 类型：${summary.report_label}`,
      `- 模板：${summary.template}`,
      `- 创建者：${summary.creator}`,
      `- 接收人：${recipients}`,
      `- 发送到群：${summary.to_chat ? "是" : "否"}`,
      `- 正文：${summary.characters} 字`,
      `- 发布后操作：${summary.manual_rename_instruction}`,
      "- 当前状态：尚未发布",
      "",
      "是否确认发布？",
    ].join("\n");
  }
  return [
    "## 钉钉文档同步确认",
    "",
    `- 草稿：${summary.file}`,
    `- 操作：${summary.operation === "create" ? "创建" : "更新"}`,
    `- 标题：${summary.title}`,
    `- Workspace：${valueOrUnset(summary.target?.workspace_id)}`,
    `- Folder：${valueOrUnset(summary.target?.folder_id)}`,
    `- 远端文档：${summary.node_id || "尚未创建"}`,
    `- 同步远端标题：${summary.rename_remote ? "是" : "否"}`,
    `- 正文：${summary.characters} 字`,
    "- 当前状态：尚未同步",
    "",
    "是否确认同步？",
  ].join("\n");
}

function result(value, render) {
  const text = render ? render(value) : JSON.stringify(value, null, 2);
  return { content: [{ type: "text", text }], structuredContent: value };
}

export function createDingTalkServer({ upstream, confirmations = new ConfirmationStore() }) {
  const workflow = new DingTalkWorkflow({ upstream, confirmations });
  const server = new McpServer({ name: "dingtalk", version: "0.1.0" });

  function tool(name, description, inputSchema, handler, { readOnly = false, destructive = false, render } = {}) {
    server.registerTool(name, {
      description,
      inputSchema,
      annotations: { readOnlyHint: readOnly, destructiveHint: destructive, openWorldHint: true },
    }, async (args) => result(await handler(args), render));
  }

  const cwd = z.string().optional().describe("Working directory used to discover .claude/dingtalk.toml");
  const filePath = z.string().describe("Absolute or current-directory-relative local Markdown path");

  tool("dingtalk_docs_pull", "Pull a DingTalk online document into a new local Markdown file. Pulled files are reference-only unless binding=managed is explicitly chosen.", {
    source: z.string().describe("DingTalk document nodeId or URL"),
    output_path: z.string().optional(),
    binding: z.enum(["reference", "managed"]).default("reference"), cwd,
  }, (args) => workflow.pullDocument(args));

  tool("dingtalk_docs_prepare_push", "Review a completed local Markdown draft after creation or revision. Resolve and validate its DingTalk create/update target, then return the complete user-facing sync summary and a short-lived confirmation token. This never writes to DingTalk.", {
    file_path: filePath, workspace_id: z.string().optional(), folder_id: z.string().optional(),
    rename_remote: z.boolean().default(false),
    confirmed_fingerprint: z.string().optional().describe("Fingerprint of a summary the user already confirmed; used only to refresh an expired token"),
    cwd,
  }, (args) => workflow.prepareDocumentPush(args), { readOnly: true, render: prepareText });

  tool("dingtalk_docs_push", "Create or update the prepared DingTalk document and atomically record its binding in local front matter.", {
    file_path: filePath, confirmation_token: z.string(),
  }, (args) => workflow.pushDocument(args));

  tool("dingtalk_docs_adopt", "Convert a pulled reference document into a managed binding that may overwrite the same remote nodeId.", {
    file_path: filePath, confirmed: z.boolean(),
  }, (args) => workflow.adoptDocument(args));

  tool("dingtalk_docs_status", "Read the local DingTalk binding and content hash for a Markdown document.", {
    file_path: filePath,
  }, (args) => workflow.documentStatus(args), { readOnly: true });

  tool("dingtalk_reports_pull", "Pull a DingTalk report into a local read-only archive file for reference and summarization.", {
    report_id: z.string(), output_path: z.string().optional(), cwd,
  }, (args) => workflow.pullReport(args));

  tool("dingtalk_reports_prepare_publish", "Review a completed local report after creation or revision. Resolve and verify its effective recipients and DingTalk blank-log template, then return the complete user-facing publication summary and a short-lived confirmation token. This never sends a report.", {
    file_path: filePath, recipients: z.array(z.string()).optional(),
    confirmed_fingerprint: z.string().optional().describe("Fingerprint of a summary the user already confirmed; used only to refresh an expired token"),
    cwd,
  }, (args) => workflow.prepareReportPublish(args), { readOnly: true, render: prepareText });

  tool("dingtalk_reports_publish", "Publish one prepared report with DingTalk's blank-log template and remind the user to rename it manually. Reports cannot be updated or unsent through the available MCP.", {
    file_path: filePath, confirmation_token: z.string(),
  }, (args) => workflow.publishReport(args));

  tool("dingtalk_reports_status", "Read local report publication state and detect edits made after publication.", {
    file_path: filePath,
  }, (args) => workflow.reportStatus(args), { readOnly: true });

  tool("dingtalk_reports_mark_remote_deleted", "After the user manually deletes a published report in DingTalk, preserve its history and unlock the local file for a new publication.", {
    file_path: filePath, report_id: z.string(), user_confirmation: z.boolean(),
  }, (args) => workflow.markReportRemoteDeleted(args), { destructive: true });

  tool("dingtalk_contacts_find", "Search DingTalk contacts and fetch organization details for candidate userIds.", {
    query: z.string().optional(), mobile: z.string().optional(),
  }, (args) => workflow.findContact(args), { readOnly: true });

  return server;
}
