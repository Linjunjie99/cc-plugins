export const MCP_ENV_KEYS = {
  contacts: "DINGTALK_CONTACTS_MCP_URL",
  docs: "DINGTALK_DOCS_MCP_URL",
  log: "DINGTALK_LOG_MCP_URL",
};

export function loadMcpUrls(env = process.env) {
  return Object.fromEntries(
    Object.entries(MCP_ENV_KEYS).map(([kind, name]) => [kind, env[name] || ""]),
  );
}
