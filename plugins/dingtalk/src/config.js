import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "smol-toml";

// Behavioural defaults only. Machine-specific values (paths, recipients) have no default: they
// come from the shared configuration file written by the setup skill.
const DEFAULTS = {
  version: 1,
  timezone: "Asia/Shanghai",
  paths: { documents_root: "", reports_root: "" },
  documents: { target: { workspace_id: "", folder_id: "" } },
  reports: {
    require_confirmation: true,
    to_chat: false,
    recipients: { common: [], daily: [], weekly: [], monthly: [], annual: [] },
  },
};

export const SETUP_HINT = "Run the dingtalk-setup skill to configure DingTalk on this machine.";

// One configuration file per machine, shared by the Claude Code and Codex plugins.
export function configPath(env = process.env) {
  return env.DINGTALK_CONFIG || path.join(os.homedir(), ".config", "dingtalk", "config.toml");
}

export function expandHome(value) {
  if (value === "~") return os.homedir();
  if (value?.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

// Store paths under the home directory as ~/... so the file reads the same on every machine.
export function portablePath(value) {
  const absolute = path.resolve(expandHome(value));
  const home = os.homedir();
  return absolute === home || absolute.startsWith(home + path.sep)
    ? `~${absolute.slice(home.length)}`
    : absolute;
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

export function readConfigFile(file) {
  return fs.existsSync(file) ? parse(fs.readFileSync(file, "utf8")) : null;
}

// Returns { config, file, configured }. `configured` is false when the file or a required path is
// missing; callers that need paths use requireConfig instead.
export function loadConfig({ env = process.env } = {}) {
  const file = configPath(env);
  const raw = readConfigFile(file);
  const config = mergeConfig(DEFAULTS, raw || {});
  if (config.version !== 1) throw new Error(`Unsupported DingTalk config version ${config.version} in ${file}`);
  config.paths.documents_root = expandHome(config.paths.documents_root);
  config.paths.reports_root = expandHome(config.paths.reports_root);
  const configured = Boolean(raw && config.paths.documents_root && config.paths.reports_root);
  return { config, file, configured };
}

export function requireConfig(options) {
  const loaded = loadConfig(options);
  if (!loaded.configured) {
    throw new Error(`DingTalk is not configured: ${loaded.file} is missing or has no documents_root/reports_root. ${SETUP_HINT}`);
  }
  return loaded;
}

export { DEFAULTS };
