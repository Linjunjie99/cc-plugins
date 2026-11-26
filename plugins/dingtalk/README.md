# dingtalk

Keep local Markdown as the source of truth while connecting Claude Code to
DingTalk contacts, online documents, and work reports.

## What It Does

| Skill | Use it for |
| --- | --- |
| `dingtalk-setup` | Configure directories and recipients on a new machine, diagnose the MCP |
| `dingtalk-contacts` | Resolve a colleague's name or mobile number to a verified organization userId |
| `dingtalk-documents` | Pull DingTalk documents as local context; create or update managed documents |
| `dingtalk-reports` | Draft 日报、周报、月报、年报 locally and publish confirmed reports |

The plugin also registers one wrapped MCP server, `dingtalk`, which connects to
the official DingTalk Contacts, Docs, and Log MCP gateways and exposes eleven
workflow tools (`dingtalk_docs_*`, `dingtalk_reports_*`,
`dingtalk_contacts_find`). Claude Code lists it as `plugin:dingtalk:dingtalk`.

## Install

```bash
claude plugin install dingtalk@cc-plugins
```

## Setup

Expose the three DingTalk MCP gateway URLs in the environment that launches
Claude Code, for example in `~/.zprofile` (macOS) or `~/.bashrc` (WSL):

```bash
export DINGTALK_CONTACTS_MCP_URL='https://mcp-gw.dingtalk.com/...'
export DINGTALK_DOCS_MCP_URL='https://mcp-gw.dingtalk.com/...'
export DINGTALK_LOG_MCP_URL='https://mcp-gw.dingtalk.com/...'
```

Each URL includes a credential. Do not commit them or put them in
`settings.json`, `.mcp.json`, or the DingTalk configuration file. Rotate any URL that has been
copied into logs or source files. Obtain them from
<https://aihub.dingtalk.com/#/mcp>.

Install the plugin, restart Claude Code, then run `/dingtalk:dingtalk-setup`.
Setup uses bundled scripts and remains available even when the MCP cannot
start. The equivalent shell commands, run from the plugin directory, are:

```bash
node dist/setup.cjs status
node dist/setup.cjs initialize --documents-root ~/workspace/<company>/documents --reports-root ~/workspace/<company>/reporting
node dist/setup.cjs set-recipients --user-id <verified-id> --report-type weekly
node dist/doctor.cjs
```

## Configuration

| What | Where | In Git |
| --- | --- | --- |
| Directories, recipients, default document target | `~/.config/dingtalk/config.toml`, one per machine | No; it lives outside every repository |
| MCP gateway URLs (credentials) | `DINGTALK_*_MCP_URL` environment variables | No |
| Document and report content | The configured directories | Decided by the repository that owns them |

The Claude Code and Codex DingTalk plugins read the same file; neither imports
from the other. There are no built-in directories: until setup writes
`documents_root` and `reports_root`, the document and report tools ask for
setup instead of guessing. Paths under the home directory are stored as
`~/...`, so one file reads the same on macOS and WSL.

Developing the plugin and running the installed copy use the same file, so
reinstalling or switching branches never touches it. Tests point
`DINGTALK_CONFIG` at a temporary file and never read the real one.

Older versions used `~/.claude/dingtalk.toml`, `~/.codex/dingtalk.toml`, and
project `.claude/` or `.codex/` overrides. They are no longer read;
`doctor.cjs` lists any that remain so they can be deleted.

The wrapped `dingtalk` MCP connects all three upstream services before exposing
tools and fails to start if any is missing or unreachable; skills and setup
scripts still load independently. Check it with `/mcp` or `claude mcp list`.

## Safety Model

Document writes use a prepare/confirm/push workflow. After Claude completes a
new local draft or revision, the document skill prepares it and shows a fixed
synchronization summary before asking for confirmation. A first push creates a
DingTalk document; later pushes overwrite the same managed `node_id` after
checking remote state. Pulled documents default to reference-only.

Report publication uses a separate prepare/confirm/publish workflow. The report
skill prepares a completed draft, resolves and verifies the effective
recipients, and shows the complete publication summary before asking for
confirmation. All report types use DingTalk's blank-log template so the local
Markdown body stays in one content field. The official Log MCP cannot set the
report name, so rename the default blank-log title manually in DingTalk after
publishing. Published reports cannot be updated through the available MCP;
edit one manually in DingTalk, or manually delete it and mark that deletion
locally before preparing a replacement.

The workflow MCP never scans or automatically synchronizes directories, and the
plugin installs no hooks.

## Codex Counterpart

`dingtalk@codex-plugins` is the same capability for the Codex CLI. Both can be
installed at once:

| Concern | Rule |
| --- | --- |
| MCP gateway URLs | Shared `DINGTALK_*_MCP_URL` variables. One export serves both. |
| Configuration | Shared `~/.config/dingtalk/config.toml`. Setup from either harness updates it for both. |
| Documents and reports | Shared directories. Both write the same `dingtalk` front matter schema, so a document pushed from one harness can be updated from the other. |
| Directory README markers | Harness-neutral text, written only if missing. |
| Confirmation tokens | In memory per MCP process. Prepare and push in the same harness. |

## Development

```bash
npm ci
npm test
npm run build
npm run check
```

`dist/` is committed because the plugin runs from it; `node_modules/` is not.
