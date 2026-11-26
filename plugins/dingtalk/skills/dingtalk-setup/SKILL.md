---
name: dingtalk-setup
description: Initialize, diagnose, repair, or reconfigure the DingTalk Claude Code plugin with bundled scripts, including MCP environment checks, the shared ~/.config/dingtalk/config.toml, document/report directories and markers, and confirmed recipients. Use when the user installs the plugin on a new machine or upgrades it, asks how to configure DingTalk / 配置钉钉, reports a failed or missing DingTalk MCP, sees a "DingTalk is not configured" error, or wants to change directories or report recipients.
allowed-tools:
  - Read
  - Bash(node "${CLAUDE_PLUGIN_ROOT}/dist/setup.cjs" *)
  - Bash(node "${CLAUDE_PLUGIN_ROOT}/dist/doctor.cjs")
---

# DingTalk Setup

Complete every safe step available. Use the bundled scripts for setup so this workflow remains available when the DingTalk MCP fails. Pause for DingTalk login, environment configuration, directory preferences, and ambiguous contact matches.

## Configuration Model

Each machine has exactly one DingTalk configuration file, `~/.config/dingtalk/config.toml`, shared
by the Claude Code and Codex DingTalk plugins. It holds the documents and reports directories,
report recipients, and the default document target. It lives outside every repository, so it is
never committed and survives plugin reinstalls. Gateway URLs are never stored in it; they are
environment variables.

There are no built-in directories. Until setup has written both `documents_root` and
`reports_root`, the document and report skills stop and point here.

## Initialize

1. Run `node "${CLAUDE_PLUGIN_ROOT}/dist/setup.cjs" status`. It reports only whether each
   environment variable is configured, never its value.
2. If `configured` is true, show the current directories and recipient count and ask what should
   change. Re-running `initialize` without arguments keeps the saved directories.
3. If `configured` is false, ask the user where DingTalk documents and reports should live. When the
   workspace guidance defines a company or work ownership directory, suggest
   `<that directory>/documents` and `<that directory>/reporting`; otherwise ask without proposing a
   path. Never pick a directory on the user's behalf.
4. Run `node "${CLAUDE_PLUGIN_ROOT}/dist/setup.cjs" initialize --documents-root <dir> --reports-root <dir>`.
   Pass only the option being changed when updating one directory. Paths under the home directory
   are saved as `~/...`, so the same file works on macOS and WSL. The command also creates the
   directories and concise README markers. It does not copy policies or templates; those stay in
   the document and report skills.
5. If `legacy_files` is non-empty, tell the user those per-harness files from older plugin versions
   are no longer read and can be deleted once the new configuration is confirmed. Read them only if
   the user wants their old values reused, and never edit them.
6. If an MCP environment variable is missing, follow [references/manual-mcp.md](references/manual-mcp.md),
   finish all available local setup, and ask the user to restart Claude Code after configuring all
   three variables. Do not attempt recipient lookup in the current session.
7. When the `dingtalk` MCP is available and `default_report_recipient_count` is 0 or the user wants
   to change recipients, ask who should receive daily, weekly, monthly, and annual reports. Accept a
   name, mobile number, or DingTalk identifier.
8. Search with `dingtalk_contacts_find`. When matches are ambiguous, show safe identifying details
   such as name and department and ask the user to choose. Never guess.
9. After the user confirms the matches, run `node "${CLAUDE_PLUGIN_ROOT}/dist/setup.cjs" set-recipients`
   with one `--user-id` per confirmed organization userId and one `--report-type` per applicable
   report type.
10. Run `node "${CLAUDE_PLUGIN_ROOT}/dist/doctor.cjs"` for a compact OK/MISSING checklist and report
    what remains.

Change the configuration only through these scripts, never by hand-editing it from a skill.

## MCP Environment

Direct the user to [DingTalk AI Hub MCP](https://aihub.dingtalk.com/#/mcp) to create or enable Contacts, Docs, and Log MCP services. The plugin registers one wrapped `dingtalk` MCP server; do not add separate `claude mcp add` registrations for the upstream gateways.

Do not read, migrate, write, retain, or ask the user to paste gateway URLs into chat. Guide the user to configure the three environment variables in the environment that launches Claude Code, then restart Claude Code. The Codex plugin reads the same three variables and the same configuration file, so a machine already set up from Codex needs no further change.

The wrapped MCP requires all three upstream services. Missing variables or failed upstream connections make only the MCP fail; plugin skills and setup scripts remain available. Use `/mcp` inside Claude Code, or `claude mcp list` from a shell, to see whether `plugin:dingtalk:dingtalk` connected.

Initialization is complete only when all three MCP environment variables, paths, root README markers, and at least one confirmed report recipient are configured. Documents can be used without recipients; report publishing cannot.
