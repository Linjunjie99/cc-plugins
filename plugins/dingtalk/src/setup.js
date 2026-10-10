import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "smol-toml";
import { codexUserConfigPath, DEFAULTS, loadConfig, mergeConfig, userConfigPath } from "./config.js";
import { loadMcpUrls } from "./environment.js";

function readToml(file) {
  return fs.existsSync(file) ? parse(fs.readFileSync(file, "utf8")) : {};
}

function configTarget(projectDir, env = process.env) {
  return projectDir
    ? path.join(path.resolve(projectDir), ".claude", "dingtalk.toml")
    : userConfigPath(env);
}

// A first user-level setup starts from the Codex plugin's configuration when one exists, so paths
// and verified recipients carry over. The Codex file is only read, never written.
function importSource(projectDir, target, env) {
  const codexFile = codexUserConfigPath(env);
  return !projectDir && !fs.existsSync(target) && fs.existsSync(codexFile) ? codexFile : null;
}

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

export function initialize({ project_dir, company_root, documents_root, reports_root, env = process.env } = {}) {
  const target = configTarget(project_dir, env);
  const imported = importSource(project_dir, target, env);
  const existing = readToml(imported || target);
  const seeded = imported ? mergeConfig(DEFAULTS, existing).paths : DEFAULTS.paths;
  const company = path.resolve(company_root || seeded.company_root);
  const docs = path.resolve(documents_root || (company_root ? path.join(company, "documents") : seeded.documents_root));
  const reports = path.resolve(reports_root || (company_root ? path.join(company, "reporting") : seeded.reports_root));
  const overlay = {
    version: 1,
    paths: { company_root: company, documents_root: docs, reports_root: reports },
  };
  const config = mergeConfig(mergeConfig(DEFAULTS, existing), overlay);
  writeConfig(target, config);

  fs.mkdirSync(docs, { recursive: true });
  for (const dir of ["daily", "weekly", "monthly", "annual", "imported"]) {
    fs.mkdirSync(path.join(reports, dir), { recursive: true });
  }
  writeReadmeIfMissing(docs, DOCUMENTS_README);
  writeReadmeIfMissing(reports, REPORTS_README);
  return {
    config_file: target,
    imported_from: imported,
    documents_root: docs,
    reports_root: reports,
    root_readmes: {
      documents: path.join(docs, "README.md"),
      reports: path.join(reports, "README.md"),
    },
    default_recipients: [...new Set(Object.values(config.reports.recipients || {}).flat().filter(Boolean).map(String))],
  };
}

export function setRecipients({ user_ids, report_types = ["daily", "weekly", "monthly", "annual"], project_dir, env = process.env } = {}) {
  const allowed = new Set(["daily", "weekly", "monthly", "annual"]);
  if (!user_ids?.length) throw new Error("At least one verified organization userId is required");
  if (!report_types.length || report_types.some((type) => !allowed.has(type))) throw new Error("report_types must contain daily, weekly, monthly, or annual");
  const target = configTarget(project_dir, env);
  const config = mergeConfig(DEFAULTS, readToml(target));
  const ids = [...new Set(user_ids.map(String))];
  for (const type of report_types) config.reports.recipients[type] = ids;
  writeConfig(target, config);
  return { config_file: target, report_types, recipient_user_ids: ids };
}

export function setupStatus({ cwd = process.cwd(), env = process.env } = {}) {
  const urls = loadMcpUrls(env);
  const userConfig = userConfigPath(env);
  const { config, sources } = loadConfig({ cwd });
  const recipientIds = new Set(Object.values(config.reports.recipients || {}).flat().filter(Boolean).map(String));
  const documentsReadme = path.join(config.paths.documents_root, "README.md");
  const reportsReadme = path.join(config.paths.reports_root, "README.md");
  return {
    user_config: userConfig,
    user_config_exists: fs.existsSync(userConfig),
    codex_user_config_exists: fs.existsSync(codexUserConfigPath(env)),
    mcp: Object.fromEntries(Object.entries(urls).map(([kind, url]) => [kind, { configured: Boolean(url), source: url ? "environment" : "missing" }])),
    paths: {
      documents_root: config.paths.documents_root,
      documents_root_exists: fs.existsSync(config.paths.documents_root),
      reports_root: config.paths.reports_root,
      reports_root_exists: fs.existsSync(config.paths.reports_root),
    },
    root_readmes: {
      documents: fs.existsSync(documentsReadme),
      reports: fs.existsSync(reportsReadme),
    },
    default_report_recipient_count: recipientIds.size,
    effective_config: sources.project || sources.user,
    cwd: path.resolve(cwd),
  };
}
