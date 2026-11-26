import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { stringify } from "smol-toml";
import { configPath, DEFAULTS, expandHome, loadConfig, mergeConfig, portablePath, readConfigFile } from "./config.js";
import { loadMcpUrls } from "./environment.js";

const REPORT_TYPES = ["daily", "weekly", "monthly", "annual"];

// Per-harness files from plugin versions before the shared configuration. They are never read;
// status lists them so the user can delete them after setup.
const LEGACY_FILES = [
  path.join(".claude", "dingtalk.toml"),
  path.join(".codex", "dingtalk.toml"),
];

function writeConfig(file, config) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stringify(config), { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

const DOCUMENTS_README = `# DingTalk Documents

This directory is the configured local workspace for DingTalk documents. It inherits all rules
from the surrounding workspace.

Before creating, editing, pulling, adopting, or publishing files here, load the installed
\`dingtalk-documents\` skill (\`/dingtalk:dingtalk-documents\` in Claude Code,
\`$dingtalk-documents\` in Codex) and follow its policy and bundled asset template. The plugin
skill is the source of truth; this directory intentionally does not contain a separate policy or
template copy.
`;

const REPORTS_README = `# DingTalk Reports

This directory is the configured local workspace for DingTalk reports and logs. It inherits all
rules from the surrounding workspace.

Before drafting, revising, pulling, or publishing a report here, load the installed
\`dingtalk-reports\` skill (\`/dingtalk:dingtalk-reports\` in Claude Code, \`$dingtalk-reports\` in
Codex) and follow its policy and matching bundled asset template. The plugin skill is the source of
truth; this directory intentionally does not contain a separate policy or template copy.
`;

function writeReadmeIfMissing(root, content) {
  const file = path.join(root, "README.md");
  if (!fs.existsSync(file)) fs.writeFileSync(file, content, { mode: 0o600 });
}

function recipientIds(config) {
  return [...new Set(Object.values(config.reports?.recipients || {}).flat().filter(Boolean).map(String))];
}

// Creates or updates the shared configuration. Paths given here win; otherwise the values already
// in the file are kept. There are no built-in paths: a first setup must name both directories.
export function initialize({ documents_root, reports_root, env = process.env } = {}) {
  const file = configPath(env);
  const existing = readConfigFile(file) || {};
  const docsValue = documents_root || existing.paths?.documents_root;
  const reportsValue = reports_root || existing.paths?.reports_root;
  if (!docsValue || !reportsValue) {
    throw new Error("documents_root and reports_root are required: ask the user where DingTalk documents and reports should live, then pass --documents-root and --reports-root.");
  }
  const paths = { documents_root: portablePath(docsValue), reports_root: portablePath(reportsValue) };
  const config = mergeConfig(mergeConfig(DEFAULTS, existing), { version: 1, paths });
  writeConfig(file, config);

  const docs = expandHome(paths.documents_root);
  const reports = expandHome(paths.reports_root);
  fs.mkdirSync(docs, { recursive: true });
  for (const dir of [...REPORT_TYPES, "imported"]) fs.mkdirSync(path.join(reports, dir), { recursive: true });
  writeReadmeIfMissing(docs, DOCUMENTS_README);
  writeReadmeIfMissing(reports, REPORTS_README);
  return {
    config_file: file,
    documents_root: docs,
    reports_root: reports,
    root_readmes: { documents: path.join(docs, "README.md"), reports: path.join(reports, "README.md") },
    default_recipients: recipientIds(config),
  };
}

export function setRecipients({ user_ids, report_types = REPORT_TYPES, env = process.env } = {}) {
  if (!user_ids?.length) throw new Error("At least one verified organization userId is required");
  if (!report_types.length || report_types.some((type) => !REPORT_TYPES.includes(type))) {
    throw new Error("report_types must contain daily, weekly, monthly, or annual");
  }
  const file = configPath(env);
  const existing = readConfigFile(file);
  if (!existing) throw new Error(`${file} does not exist. Run initialize first.`);
  const config = mergeConfig(DEFAULTS, existing);
  const ids = [...new Set(user_ids.map(String))];
  for (const type of report_types) config.reports.recipients[type] = ids;
  writeConfig(file, config);
  return { config_file: file, report_types, recipient_user_ids: ids };
}

export function setupStatus({ env = process.env } = {}) {
  const urls = loadMcpUrls(env);
  const { config, file, configured } = loadConfig({ env });
  const { documents_root: docs, reports_root: reports } = config.paths;
  const exists = (p) => Boolean(p) && fs.existsSync(p);
  return {
    config_file: file,
    config_exists: fs.existsSync(file),
    configured,
    mcp: Object.fromEntries(Object.entries(urls).map(([kind, url]) => [kind, { configured: Boolean(url) }])),
    paths: {
      documents_root: docs || null,
      documents_root_exists: exists(docs),
      reports_root: reports || null,
      reports_root_exists: exists(reports),
    },
    root_readmes: {
      documents: exists(docs) && fs.existsSync(path.join(docs, "README.md")),
      reports: exists(reports) && fs.existsSync(path.join(reports, "README.md")),
    },
    default_report_recipient_count: recipientIds(config).length,
    legacy_files: LEGACY_FILES.map((rel) => path.join(os.homedir(), rel)).filter((p) => fs.existsSync(p)),
  };
}
