---
name: dingtalk-reports
description: Draft, revise, pull, inspect, and publish company work reports through DingTalk, including 日报、周报、月报、年度总结 and 钉钉日志. Use whenever the user asks to 写日志、写日报、整理周报、生成月报或年报、查看或修改已有日志、拉取钉钉日志, or publish a confirmed report to configured recipients.
allowed-tools:
  - Read
  - Bash(node "${CLAUDE_PLUGIN_ROOT}/dist/setup.cjs" status)
---

# DingTalk Reports

Use the configured `reports_root` as the local source of truth. Before drafting, revising, pulling,
inspecting, or publishing, read [references/reporting-policy.md](references/reporting-policy.md)
completely. The configured `reports_root` README is a directory marker, not the policy or template
source.

Call the workflow tools with absolute `file_path` and `output_path` values, and pass the
current working directory as `cwd` so a project `.claude/dingtalk.toml` is discovered. The MCP
server's own working directory is not guaranteed to match the session's.

Read the matching bundled asset before creating a report:

- [assets/daily.md](assets/daily.md)
- [assets/weekly.md](assets/weekly.md)
- [assets/monthly.md](assets/monthly.md)
- [assets/annual.md](assets/annual.md)

Respect all workspace and project instructions that apply to the source materials and destination.
Apply this skill's rules in addition to those instructions; never use reporting placement to bypass
ownership, confidentiality, or repository rules.

## Draft

1. Resolve `reports_root` from the effective DingTalk configuration: run
   `node "${CLAUDE_PLUGIN_ROOT}/dist/setup.cjs" status` and read `paths.reports_root`.
2. Read the matching bundled asset, existing canonical report, and relevant work materials.
3. Create or update the canonical period file under `reports_root`; do not create a local template
   copy or duplicate draft.
4. Replace placeholders, remove empty sections, and never invent work, results, risks, or plans.
5. After completing a new draft or revision, call `dingtalk_reports_prepare_publish` so the user can
   review the effective publication details together with the content.

## Publish

1. When preparation succeeds, present its summary in exactly this structure, filling values from
   the tool result and omitting no field:

   ```text
   钉钉日志发布确认

   - 草稿：<file>
   - 类型：<report_label>
   - 模板：<template>
   - 创建者：<creator>
   - 接收人：<name（user_id）; ...>
   - 发送到群：<是/否>
   - 正文：<characters> 字
   - 发布后操作：<manual_rename_instruction>
   - 当前状态：尚未发布

   是否确认发布？
   ```

2. When preparation is blocked, show the draft path, every blocker, and `当前状态：未发布`.
   Resolve the blockers before preparing again.
3. Wait for the user to explicitly confirm the latest displayed summary, then call
   `dingtalk_reports_publish` with that preparation's confirmation token.
4. If the draft changes, prepare it again and present a new complete summary before publishing.
5. If a confirmed token expires, prepare with the confirmed fingerprint. Publish without another
   confirmation only when the refreshed result says `confirmation_required=false`; otherwise show
   the new summary and wait for confirmation.
6. After a successful publication, tell the user to open DingTalk and rename the default log from
   "创建人姓名的空白日志" to "创建人姓名的日报", "创建人姓名的周报", "创建人姓名的月报",
   or "创建人姓名的年报" according to the local report type. "创建人姓名" means the MCP-bound
   account owner, not a recipient. The official DingTalk Log MCP cannot set this metadata.

DingTalk reports cannot be updated through the available MCP. Never publish an already published report again. If a correction is needed, tell the user to edit it manually in DingTalk. If the user manually deletes it and explicitly confirms that fact, call `dingtalk_reports_mark_remote_deleted`; only then prepare a new publication.

Use `dingtalk_reports_pull` for sent or received reports needed as context. Pulled reports are read-only archives, not drafts for republishing.
