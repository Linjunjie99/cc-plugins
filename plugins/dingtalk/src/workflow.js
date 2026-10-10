import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import {
  findLocalOnlyReferences,
  firstHeading,
  readMarkdown,
  sha256,
  slugify,
  writeMarkdownAtomic,
} from "./markdown.js";
import { findValue } from "./upstream.js";

const BLANK_LOG_TEMPLATE = Object.freeze({
  templateName: "空白日志",
  templateId: "1740a78635888d35e3972cf40979e214",
  key: "内容",
  sort: "0",
  type: "1",
});

const REPORTS = {
  daily: { label: "日报", ...BLANK_LOG_TEMPLATE },
  weekly: { label: "周报", ...BLANK_LOG_TEMPLATE },
  monthly: { label: "月报", ...BLANK_LOG_TEMPLATE },
  annual: { label: "年报", ...BLANK_LOG_TEMPLATE },
};

function isoNow() { return new Date().toISOString(); }
function unique(values) { return [...new Set((values || []).filter(Boolean).map(String))]; }
function asObject(value) { return value && typeof value === "object" ? value : {}; }
function directValue(value, keys) {
  if (!value || typeof value !== "object") return undefined;
  for (const key of keys) if (value[key] !== undefined && value[key] !== null) return value[key];
  return undefined;
}

function findRecipient(value, userId) {
  if (!value || typeof value !== "object") return null;
  if (value[userId] && typeof value[userId] === "object") return value[userId];
  if (String(directValue(value, ["userId", "user_id", "userid", "orgUserId", "org_user_id", "id"]) || "") === userId) return value;
  for (const child of Object.values(value)) {
    const found = findRecipient(child, userId);
    if (found) return found;
  }
  return null;
}

function normalizedRecipients(value, userIds) {
  return userIds.map((userId) => {
    const detail = findRecipient(value, userId);
    const name = directValue(detail, ["name", "displayName", "display_name", "userName", "user_name", "orgUserName", "org_user_name", "nick", "nickName", "nickname"]);
    return { user_id: userId, name: name ? String(name) : null, verified: Boolean(detail) };
  });
}

function blocked(summary, blockers) {
  return { ready: false, blockers, confirmation_required: false, summary };
}

function fingerprint(value) {
  return sha256(JSON.stringify(value));
}

function remoteDocument(value) {
  return {
    nodeId: String(findValue(value, ["nodeId", "node_id", "dentryUuid", "dentry_uuid"]) || ""),
    url: String(findValue(value, ["docUrl", "url", "documentUrl", "document_url"]) || ""),
    revision: String(findValue(value, ["revision", "revisionId", "version"]) || ""),
    title: String(findValue(value, ["name", "title"]) || ""),
  };
}

function remoteMarkdown(value) {
  if (typeof value === "string") return value;
  return String(findValue(value, ["markdown", "content", "text"]) || "");
}

function monthPath(root, date = new Date()) {
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Shanghai" }).format(date);
  const month = new Intl.DateTimeFormat("en", { month: "2-digit", timeZone: "Asia/Shanghai" }).format(date);
  return path.join(root, "imported", year, month);
}

function documentMeta(data) { return asObject(asObject(data).dingtalk); }

function inferReportType(file, data, body) {
  const configured = documentMeta(data).report_type;
  if (REPORTS[configured]) return configured;
  const normalized = file.replaceAll("\\", "/");
  if (/\/daily\//.test(normalized) || /^#\s*日报/m.test(body)) return "daily";
  if (/\/weekly\//.test(normalized) || /^#\s*周报/m.test(body)) return "weekly";
  if (/\/monthly\//.test(normalized) || /^#\s*月报/m.test(body)) return "monthly";
  if (/\/annual\//.test(normalized) || /^#\s*年度/m.test(body)) return "annual";
  throw new Error("无法判断报告类型；请在 front matter 中设置 dingtalk.report_type");
}

function reportBody(body) {
  return body
    .replace(/^#\s+.*(?:\n+|$)/, "")
    .replace(/^\n+/, "")
    .trimEnd();
}

function reportStatus(data) {
  return documentMeta(data).status || "draft";
}

function manualRenameInstruction(mapping) {
  return `日志由当前 MCP 绑定账号创建；名称中的姓名是创建人本人，不是任何接收人。发布后请在钉钉中将“创建人姓名的空白日志”手动改为“创建人姓名的${mapping.label}”；钉钉官方日志 MCP 不支持设置日志名称。`;
}

function effectiveRecipients(config, type, explicit) {
  if (explicit) return unique(explicit);
  const configured = config.reports?.recipients || {};
  return unique([...(configured.common || []), ...(configured[type] || [])]);
}

export class DingTalkWorkflow {
  constructor({ upstream, confirmations }) {
    this.upstream = upstream;
    this.confirmations = confirmations;
  }

  config(cwd) { return loadConfig({ cwd }); }

  async pullDocument({ source, output_path, binding = "reference", cwd = process.cwd() }) {
    if (!['reference', 'managed'].includes(binding)) throw new Error("binding must be reference or managed");
    const { config } = this.config(cwd);
    const infoValue = await this.upstream.call("docs", "get_document_info", { nodeId: source });
    const info = remoteDocument(infoValue);
    const contentValue = await this.upstream.call("docs", "get_document_content", { nodeId: source, format: "markdown" });
    const body = remoteMarkdown(contentValue);
    const title = info.title || firstHeading(body);
    const file = path.resolve(output_path || path.join(monthPath(config.paths.documents_root), `${slugify(title)}.md`));
    if (fs.existsSync(file)) throw new Error(`Refusing to overwrite existing local file: ${file}`);
    const nodeId = info.nodeId || source;
    const data = { dingtalk: {
      kind: "document", binding, node_id: nodeId, url: info.url || (String(source).startsWith("http") ? source : ""),
      remote_revision: info.revision, synced_at: isoNow(), synced_content_sha256: sha256(body),
    } };
    writeMarkdownAtomic(file, data, body);
    return { file, binding, node_id: nodeId, revision: info.revision, sha256: sha256(body) };
  }

  async prepareDocumentPush({
    file_path, workspace_id, folder_id, rename_remote = false, confirmed_fingerprint, cwd = process.cwd(),
  }) {
    const file = path.resolve(file_path);
    const { config } = this.config(cwd);
    const doc = readMarkdown(file);
    const meta = documentMeta(doc.data);
    const summary = {
      kind: "document", operation: meta.node_id ? "update" : "create", file,
      title: firstHeading(doc.body, path.basename(file, path.extname(file))),
      node_id: meta.node_id || null,
      target: {
        workspace_id: (workspace_id ?? config.documents.target.workspace_id) || null,
        folder_id: (folder_id ?? config.documents.target.folder_id) || null,
      },
      rename_remote: Boolean(rename_remote), characters: doc.body.length,
    };
    if (meta.node_id && meta.binding !== "managed") {
      return blocked(summary, ["该文档是只读 reference；同步前需要先确认并 adopt 为 managed"]);
    }
    let remote = null;
    if (meta.node_id) {
      const info = await this.upstream.call("docs", "get_document_info", { nodeId: meta.node_id });
      const content = await this.upstream.call("docs", "get_document_content", { nodeId: meta.node_id, format: "markdown" });
      remote = { ...remoteDocument(info), sha256: sha256(remoteMarkdown(content)) };
      if (meta.synced_content_sha256 && remote.sha256 !== meta.synced_content_sha256) {
        return blocked(summary, ["远端文档在上次同步后发生了变化；请先拉取或解决冲突"]);
      }
    }
    const payload = {
      operation: meta.node_id ? "update" : "create", file, fileSha: sha256(doc.raw), body: doc.body,
      title: summary.title, nodeId: meta.node_id || "",
      revision: remote?.revision || meta.remote_revision || "", renameRemote: Boolean(rename_remote),
      workspaceId: summary.target.workspace_id || "", folderId: summary.target.folder_id || "",
    };
    const preparedFingerprint = fingerprint({
      operation: payload.operation, file: payload.file, file_sha256: payload.fileSha,
      title: payload.title, node_id: payload.nodeId, revision: payload.revision,
      rename_remote: payload.renameRemote, workspace_id: payload.workspaceId, folder_id: payload.folderId,
    });
    const confirmation = this.confirmations.create(payload);
    return {
      ready: true, blockers: [], ...confirmation, fingerprint: preparedFingerprint,
      confirmation_required: confirmed_fingerprint !== preparedFingerprint, summary,
    };
  }

  async pushDocument({ file_path, confirmation_token }) {
    const payload = this.confirmations.consume(confirmation_token);
    const file = path.resolve(file_path);
    if (payload.file !== file || payload.fileSha !== sha256(fs.readFileSync(file, "utf8"))) {
      throw new Error("The file changed after preparation; prepare the push again");
    }
    const doc = readMarkdown(file);
    let result;
    if (payload.operation === "create") {
      const args = { name: payload.title };
      if (payload.folderId) args.folderId = payload.folderId;
      else if (payload.workspaceId) args.workspaceId = payload.workspaceId;
      const chunks = payload.body.match(/[\s\S]{1,10000}/g) || [""];
      if (chunks[0]) args.markdown = chunks.shift();
      result = await this.upstream.call("docs", "create_document", args);
      const created = remoteDocument(result);
      if (!created.nodeId) throw new Error(`Document was created but no nodeId was returned: ${JSON.stringify(result)}`);
      for (const chunk of chunks) {
        await this.upstream.call("docs", "update_document", { nodeId: created.nodeId, mode: "append", format: "markdown", markdown: chunk });
      }
      payload.nodeId = created.nodeId;
    } else {
      result = await this.upstream.call("docs", "update_document", {
        nodeId: payload.nodeId, mode: "overwrite", format: "markdown", markdown: payload.body,
        ...(payload.revision ? { revision: payload.revision } : {}),
      });
      if (payload.renameRemote) await this.upstream.call("docs", "rename_document", { nodeId: payload.nodeId, newName: payload.title });
    }
    const info = remoteDocument(await this.upstream.call("docs", "get_document_info", { nodeId: payload.nodeId }));
    doc.data.dingtalk = {
      ...documentMeta(doc.data), kind: "document", binding: "managed", node_id: payload.nodeId,
      url: info.url || documentMeta(doc.data).url || "", remote_revision: info.revision,
      synced_at: isoNow(), synced_content_sha256: sha256(payload.body),
    };
    writeMarkdownAtomic(file, doc.data, doc.body);
    return { status: "synced", file, node_id: payload.nodeId, url: doc.data.dingtalk.url, revision: info.revision };
  }

  adoptDocument({ file_path, confirmed }) {
    if (confirmed !== true) throw new Error("confirmed=true is required to adopt a reference document");
    const file = path.resolve(file_path);
    const doc = readMarkdown(file);
    const meta = documentMeta(doc.data);
    if (!meta.node_id) throw new Error("The file has no DingTalk document binding");
    doc.data.dingtalk = { ...meta, kind: "document", binding: "managed" };
    writeMarkdownAtomic(file, doc.data, doc.body);
    return { file, binding: "managed", node_id: meta.node_id };
  }

  documentStatus({ file_path }) {
    const doc = readMarkdown(path.resolve(file_path));
    return { file: path.resolve(file_path), metadata: documentMeta(doc.data), local_content_sha256: sha256(doc.body) };
  }

  async prepareReportPublish({ file_path, recipients, confirmed_fingerprint, cwd = process.cwd() }) {
    const file = path.resolve(file_path);
    const { config } = this.config(cwd);
    const doc = readMarkdown(file);
    const type = inferReportType(file, doc.data, doc.body);
    const mapping = REPORTS[type];
    const status = reportStatus(doc.data);
    const body = reportBody(doc.body);
    const summary = {
      kind: "report", file, report_type: type, report_label: mapping.label,
      template: mapping.templateName, template_id: mapping.templateId,
      creator: "MCP 绑定账号本人", recipients: [], to_chat: false,
      characters: body.length, manual_rename_required: true,
      manual_rename_instruction: manualRenameInstruction(mapping),
    };
    if (["published", "modified_after_publish", "repair_required"].includes(status)) {
      return blocked(summary, [`报告状态为 ${status}；请在钉钉中修改，或在手动删除远端报告后记录删除状态`]);
    }
    const toUserIds = effectiveRecipients(config, type, recipients);
    if (!toUserIds.length) return blocked(summary, [`${mapping.label}没有可用的已配置接收人`]);
    const recipientDetails = await this.upstream.call("contacts", "get_user_info_by_user_ids", { user_id_list: toUserIds });
    const resolvedRecipients = normalizedRecipients(recipientDetails, toUserIds);
    summary.recipients = resolvedRecipients.map(({ user_id, name }) => ({ user_id, name }));
    const missingRecipients = resolvedRecipients.filter(({ verified }) => !verified).map(({ user_id }) => user_id);
    if (missingRecipients.length) {
      return blocked(summary, [`以下接收人 userId 无法在组织内核验：${missingRecipients.join(", ")}`]);
    }
    const localRefs = findLocalOnlyReferences(body);
    if (localRefs.length) return blocked(summary, [`报告包含接收人无法访问的本地引用：${JSON.stringify(localRefs)}`]);
    const template = await this.upstream.call("log", "get_template_details_by_name", { report_template_name: mapping.templateName });
    const actualId = String(findValue(template, ["templateId", "template_id"]) || "");
    if (actualId && actualId !== mapping.templateId) {
      return blocked(summary, [`钉钉“${mapping.templateName}”模板已变更（${actualId}）；发布前需要更新插件映射`]);
    }
    const payload = {
      operation: "publish-report", file, fileSha: sha256(doc.raw), body, type, mapping, toUserIds,
      toChat: false, previous: documentMeta(doc.data),
    };
    const preparedFingerprint = fingerprint({
      operation: payload.operation, file: payload.file, file_sha256: payload.fileSha,
      report_type: payload.type, template_id: payload.mapping.templateId,
      recipients: payload.toUserIds, to_chat: payload.toChat,
    });
    const confirmation = this.confirmations.create(payload);
    return {
      ready: true, blockers: [], ...confirmation, fingerprint: preparedFingerprint,
      confirmation_required: confirmed_fingerprint !== preparedFingerprint, summary,
    };
  }

  async publishReport({ file_path, confirmation_token }) {
    const payload = this.confirmations.consume(confirmation_token);
    const file = path.resolve(file_path);
    if (payload.operation !== "publish-report" || payload.file !== file || payload.fileSha !== sha256(fs.readFileSync(file, "utf8"))) {
      throw new Error("The report changed after preparation; prepare publication again");
    }
    const doc = readMarkdown(file);
    let created;
    try {
      created = await this.upstream.call("log", "create_report", {
        templateId: payload.mapping.templateId, ddFrom: "claude-code-dingtalk", toChat: false,
        toUserIds: payload.toUserIds,
        contents: [{ key: payload.mapping.key, sort: payload.mapping.sort, type: payload.mapping.type, contentType: "markdown", content: payload.body }],
      });
    } catch (error) {
      throw error;
    }
    const reportId = String(findValue(created, ["reportId", "report_id", "id"]) || "");
    const url = String(findValue(created, ["url", "reportUrl", "report_url"]) || "");
    if (!reportId) throw new Error(`Report may have been created but no reportId was returned; do not retry automatically: ${JSON.stringify(created)}`);
    try {
      const now = Date.now();
      await this.upstream.call("log", "get_send_report_list", {
        cursor: 0, size: 20, startTime: now - 24 * 60 * 60 * 1000, endTime: now + 60 * 1000,
      });
      await this.upstream.call("log", "get_report_entry_details", { report_id: reportId });
    } catch (error) {
      doc.data.dingtalk = {
        ...payload.previous, kind: "report", report_type: payload.type, status: "repair_required",
        report_id: reportId, url, recipients: payload.toUserIds, published_at: isoNow(),
        remote_template: payload.mapping.templateName, manual_rename_required: true,
        published_content_sha256: sha256(payload.body),
        publication_history: Array.isArray(payload.previous.publication_history) ? payload.previous.publication_history : [],
        repair_reason: String(error.message || error),
      };
      writeMarkdownAtomic(file, doc.data, doc.body);
      throw new Error(`Report ${reportId} was created, but verification failed. Do not publish again; repair local state. ${error.message}`);
    }
    const history = Array.isArray(payload.previous.publication_history) ? payload.previous.publication_history : [];
    doc.data.dingtalk = {
      ...payload.previous, kind: "report", report_type: payload.type, status: "published",
      report_id: reportId, url, recipients: payload.toUserIds, published_at: isoNow(),
      remote_template: payload.mapping.templateName, manual_rename_required: true,
      published_content_sha256: sha256(payload.body), publication_history: history,
    };
    writeMarkdownAtomic(file, doc.data, doc.body);
    return {
      status: "published", file, report_id: reportId, url, recipients: payload.toUserIds,
      template: payload.mapping.templateName, manual_rename_required: true,
      manual_rename_instruction: manualRenameInstruction(payload.mapping),
    };
  }

  async pullReport({ report_id, output_path, cwd = process.cwd() }) {
    const { config } = this.config(cwd);
    const value = await this.upstream.call("log", "get_report_entry_details", { report_id });
    const body = remoteMarkdown(value);
    const title = String(findValue(value, ["title", "reportName", "report_name"]) || `DingTalk report ${report_id}`);
    const file = path.resolve(output_path || path.join(monthPath(config.paths.reports_root), `${slugify(title)}.md`));
    if (fs.existsSync(file)) throw new Error(`Refusing to overwrite existing local file: ${file}`);
    const data = { dingtalk: {
      kind: "report_archive", binding: "reference", status: "archived", report_id: String(report_id),
      url: String(findValue(value, ["url", "reportUrl", "report_url"]) || ""), pulled_at: isoNow(),
      sender: findValue(value, ["sender", "creatorName", "creator_name"]) || null,
    } };
    writeMarkdownAtomic(file, data, body || JSON.stringify(value, null, 2));
    return { status: "archived", file, report_id: String(report_id) };
  }

  reportStatus({ file_path }) {
    const file = path.resolve(file_path);
    const doc = readMarkdown(file);
    const meta = documentMeta(doc.data);
    let status = reportStatus(doc.data);
    if (status === "published" && meta.published_content_sha256 && sha256(reportBody(doc.body)) !== meta.published_content_sha256) {
      status = "modified_after_publish";
    }
    return { file, status, metadata: meta, local_content_sha256: sha256(reportBody(doc.body)) };
  }

  markReportRemoteDeleted({ file_path, report_id, user_confirmation }) {
    if (user_confirmation !== true) throw new Error("user_confirmation=true is required after manually deleting the report in DingTalk");
    const file = path.resolve(file_path);
    const doc = readMarkdown(file);
    const meta = documentMeta(doc.data);
    if (!meta.report_id || String(meta.report_id) !== String(report_id)) throw new Error("report_id does not match the locally recorded published report");
    const history = Array.isArray(meta.publication_history) ? [...meta.publication_history] : [];
    history.push({ report_id: meta.report_id, url: meta.url || "", recipients: meta.recipients || [], published_at: meta.published_at || null, marked_deleted_at: isoNow() });
    doc.data.dingtalk = {
      ...meta, status: "remote_deleted", report_id: null, url: null, recipients: [], published_at: null,
      published_content_sha256: null, publication_history: history,
    };
    writeMarkdownAtomic(file, doc.data, doc.body);
    return { file, status: "remote_deleted", previous_report_id: String(report_id) };
  }

  async findContact({ query, mobile }) {
    let found;
    if (mobile) found = await this.upstream.call("contacts", "search_user_by_mobile", { mobile });
    else if (query) found = await this.upstream.call("contacts", "search_user_by_key_word", { keyWord: query });
    else throw new Error("query or mobile is required");
    const ids = unique((JSON.stringify(found).match(/\b\d{8,}\b/g) || []));
    const details = ids.length ? await this.upstream.call("contacts", "get_user_info_by_user_ids", { user_id_list: ids.slice(0, 20) }) : null;
    return { search_result: found, verified_details: details, candidate_user_ids: ids };
  }
}

export { BLANK_LOG_TEMPLATE, REPORTS, effectiveRecipients, reportBody };
