import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "smol-toml";

const DEFAULTS = {
  version: 1,
  timezone: "Asia/Shanghai",
  paths: {
    company_root: "/root/workspace/10_company",
    documents_root: "/root/workspace/10_company/documents",
    reports_root: "/root/workspace/10_company/reporting",
  },
  documents: { target: { workspace_id: "", folder_id: "" } },
  reports: {
    require_confirmation: true,
    to_chat: false,
    recipients: { common: [], daily: [], weekly: [], monthly: [], annual: [] },
  },
};

export function claudeHome(env = process.env) {
  return env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}

export function userConfigPath(env = process.env) {
  return path.join(claudeHome(env), "dingtalk.toml");
}

// The Codex plugin's user configuration. Read only, to seed a first Claude Code setup.
export function codexUserConfigPath(env = process.env) {
  return path.join(env.CODEX_HOME || path.join(os.homedir(), ".codex"), "dingtalk.toml");
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

export function mergeConfig(base, overlay) {
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(overlay || {})) {
    result[key] = isObject(value) && isObject(result[key])
      ? mergeConfig(result[key], value)
      : structuredClone(value);
  }
  return result;
}

function readToml(file) {
  if (!fs.existsSync(file)) return {};
  return parse(fs.readFileSync(file, "utf8"));
}

export function findProjectConfig(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, ".claude", "dingtalk.toml");
    if (fs.existsSync(candidate)) return candidate;
    if (fs.existsSync(path.join(current, ".git"))) return null;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function loadConfig({ cwd = process.cwd(), explicit = {} } = {}) {
  const userFile = userConfigPath();
  const projectFile = findProjectConfig(cwd);
  let config = mergeConfig(DEFAULTS, readToml(userFile));
  if (projectFile && projectFile !== userFile) config = mergeConfig(config, readToml(projectFile));
  config = mergeConfig(config, explicit);
  if (config.version !== 1) throw new Error(`Unsupported dingtalk.toml version: ${config.version}`);
  return { config, sources: { user: userFile, project: projectFile } };
}

export { DEFAULTS };
