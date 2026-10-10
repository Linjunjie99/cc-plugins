---
name: dingtalk-documents
description: Pull, create, inspect, adopt, and safely synchronize DingTalk online documents (钉钉文档) with local Markdown. Use when the user mentions DingTalk documents or alidocs links, wants a DingTalk document as local context (拉取钉钉文档), wants to publish a local Markdown file to DingTalk (同步/发布到钉钉), or wants to update a previously managed DingTalk document.
allowed-tools:
  - Read
  - Bash(node "${CLAUDE_PLUGIN_ROOT}/dist/setup.cjs" status)
---

# DingTalk Documents

Treat local Markdown as the source of truth. Use the `dingtalk_docs_*` workflow tools of the
plugin's `dingtalk` MCP server instead of putting document bodies into raw DingTalk MCP calls.

Call the workflow tools with absolute `file_path` and `output_path` values, and pass the
current working directory as `cwd` so a project `.claude/dingtalk.toml` is discovered. The MCP
server's own working directory is not guaranteed to match the session's.

Before creating, editing, pulling, adopting, or pushing a document, read
[references/document-policy.md](references/document-policy.md) completely. For a new document,
read and use [assets/document.md](assets/document.md) as the starting structure. The configured
`documents_root` README is a directory marker, not the policy or template source.

Respect all workspace and project instructions that apply to the destination. Apply this skill's
rules in addition to those instructions; never use DingTalk placement to bypass ownership,
confidentiality, or repository rules.

## Draft

1. Resolve `documents_root` from the effective DingTalk configuration: run
   `node "${CLAUDE_PLUGIN_ROOT}/dist/setup.cjs" status` and read `paths.documents_root`.
2. Start from `assets/document.md` unless the user supplied an existing document or a more specific
   structure.
3. Replace placeholders, adapt sections to the content, and remove empty sections.
4. After completing a new draft or revision, call `dingtalk_docs_prepare_push` so the user can
   review the effective synchronization details together with the content. Preparation keeps the
   draft local and does not write to DingTalk.

## Pull

1. Call `dingtalk_docs_pull` with a node ID or URL.
2. Default to `binding="reference"`; use an explicit output path when the user supplied one.
3. Report the saved path and binding. Do not edit the remote document.

A reference file cannot be pushed. Call `dingtalk_docs_adopt` only after the user explicitly asks to take ownership of future remote updates.

## Push

1. When preparation succeeds, present its summary in exactly this structure, filling values from
   the tool result and omitting no field:

   ```text
   钉钉文档同步确认

   - 草稿：<file>
   - 操作：<创建/更新>
   - 标题：<title>
   - Workspace：<workspace_id 或未指定>
   - Folder：<folder_id 或未指定>
   - 远端文档：<node_id 或尚未创建>
   - 同步远端标题：<是/否>
   - 正文：<characters> 字
   - 当前状态：尚未同步

   是否确认同步？
   ```

2. When preparation is blocked, show the draft path, every blocker, and `当前状态：未同步`.
   Resolve the blockers before preparing again.
3. Wait for the user to explicitly confirm the latest displayed summary, then call
   `dingtalk_docs_push` with that preparation's confirmation token.
4. If the draft changes, prepare it again and present a new complete summary before pushing.
5. If a confirmed token expires, prepare with the confirmed fingerprint. Push without another
   confirmation only when the refreshed result says `confirmation_required=false`; otherwise show
   the new summary and wait for confirmation.

The first push creates a document. Later pushes update the recorded `node_id`; they do not create duplicates. If preparation reports a remote conflict, stop and let the user choose whether to pull, reconcile, or explicitly replace the remote content.

Use `rename_remote=true` only when the user also wants the DingTalk title changed. Read
[references/state.md](references/state.md) only when diagnosing bindings or conflicts.
