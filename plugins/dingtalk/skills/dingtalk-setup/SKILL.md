---
name: dingtalk-setup
description: Initialize, diagnose, repair, or reconfigure the DingTalk Claude Code plugin with bundled scripts, including MCP environment checks, user and project dingtalk.toml files, importing an existing Codex DingTalk configuration, document/report directory markers, and confirmed recipients. Use when the user installs or upgrades the plugin, asks how to configure DingTalk / 配置钉钉, reports a failed or missing DingTalk MCP, or wants to change workspace defaults or report recipients.
allowed-tools:
  - Read
  - Bash(node "${CLAUDE_PLUGIN_ROOT}/dist/setup.cjs" *)
  - Bash(node "${CLAUDE_PLUGIN_ROOT}/dist/doctor.cjs")
---

# DingTalk Setup

Complete every safe step available. Use the bundled scripts for setup so this workflow remains available when the DingTalk MCP fails. Pause for DingTalk login, environment configuration, directory preferences, and ambiguous contact matches.

## Initialize

1. Run `node "${CLAUDE_PLUGIN_ROOT}/dist/setup.cjs" status`. It reports only whether each environment variable is configured, never its value.
2. If `user_config_exists` is false and `codex_user_config_exists` is true, tell the user that initialization will import paths and recipients from the Codex DingTalk plugin's `~/.codex/dingtalk.toml`. The import only reads that file; the two harnesses keep separate configuration files afterward.
3. Otherwise ask whether the default paths are acceptable:
   - company root: `~/workspace/10_company`
   - documents: `<company root>/documents`
   - reports: `<company root>/reporting`
4. Run `node "${CLAUDE_PLUGIN_ROOT}/dist/setup.cjs" initialize`. Add `--project-dir`, `--company-root`, `--documents-root`, or `--reports-root` only for user-selected overrides. The command creates local configuration, directories, and concise root README markers without starting MCP or storing gateway URLs. It does not copy policies or templates into business directories; those remain in the document and report skills.
5. If an MCP environment variable is missing, follow [references/manual-mcp.md](references/manual-mcp.md), finish all available local setup, and ask the user to restart Claude Code after configuring all three variables. Do not attempt recipient lookup in the current session.
6. When the `dingtalk` MCP is available and `default_recipients` is empty or the user wants to change it, ask who should receive daily, weekly, monthly, and annual reports. Accept a name, mobile number, or DingTalk identifier.
7. Search with `dingtalk_contacts_find`. When matches are ambiguous, show safe identifying details such as name and department and ask the user to choose. Never guess.
8. After the user confirms the matches, run `node "${CLAUDE_PLUGIN_ROOT}/dist/setup.cjs" set-recipients` with one `--user-id` per confirmed organization userId and one `--report-type` per applicable report type. This command only saves confirmed IDs locally.
9. Run `node "${CLAUDE_PLUGIN_ROOT}/dist/setup.cjs" status` again and report remaining missing items. `node "${CLAUDE_PLUGIN_ROOT}/dist/doctor.cjs"` gives a compact OK/MISSING checklist.

Use user configuration (`~/.claude/dingtalk.toml`, or `$CLAUDE_CONFIG_DIR/dingtalk.toml`) by default. Use `--project-dir` only when the user explicitly requests project-specific path or recipient overrides; those are written to `<project>/.claude/dingtalk.toml`.

Never edit `~/.codex/dingtalk.toml` or a project `.codex/dingtalk.toml`. They belong to the Codex plugin.

## MCP Environment

Direct the user to [DingTalk AI Hub MCP](https://aihub.dingtalk.com/#/mcp) to create or enable Contacts, Docs, and Log MCP services. The plugin registers one wrapped `dingtalk` MCP server; do not add separate `claude mcp add` registrations for the upstream gateways.

Do not read, migrate, write, retain, or ask the user to paste gateway URLs into chat. Guide the user to configure the three environment variables in the environment that launches Claude Code, then restart Claude Code. The Codex plugin reads the same three variables, so a machine already configured for Codex needs no further change.

The wrapped MCP requires all three upstream services. Missing variables or failed upstream connections make only the MCP fail; plugin skills and setup scripts remain available. Use `/mcp` inside Claude Code, or `claude mcp list` from a shell, to see whether `plugin:dingtalk:dingtalk` connected.

Initialization is complete only when all three MCP environment variables, paths, root README markers, and at least one confirmed report recipient are configured. Documents can be used without recipients; report publishing cannot.
