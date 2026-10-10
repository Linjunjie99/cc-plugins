# MCP Environment Configuration

Obtain the three gateway URLs from <https://aihub.dingtalk.com/#/mcp>. Use the DingTalk account that should own document and report operations.

Configure these variables in the environment that launches Claude Code:

```bash
export DINGTALK_CONTACTS_MCP_URL='contacts gateway URL'
export DINGTALK_DOCS_MCP_URL='docs gateway URL'
export DINGTALK_LOG_MCP_URL='log gateway URL'
```

The plugin's `.mcp.json` expands these variables when Claude Code starts the `dingtalk` MCP server. A terminal-launched Claude Code inherits them from the shell profile (for example `~/.bashrc`). An IDE or desktop launcher must receive them through its own environment configuration. The Codex DingTalk plugin reads the same variables, so one export serves both harnesses.

Do not put the URLs into Claude Code `settings.json`, `.mcp.json`, or `dingtalk.toml`, do not paste them into chat, and do not commit them. Restart Claude Code after setting the variables. Separate `claude mcp add` registrations are unnecessary because the plugin provides one wrapped `dingtalk` MCP. That MCP intentionally fails to start until all three variables are configured and their upstream services are reachable; setup remains available through the plugin skill and bundled scripts.
