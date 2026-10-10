import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadMcpUrls, MCP_ENV_KEYS } from "./environment.js";

const UPSTREAM_KINDS = Object.keys(MCP_ENV_KEYS);

export function resultValue(result) {
  if (result?.structuredContent !== undefined) return result.structuredContent;
  const texts = (result?.content || []).filter((item) => item.type === "text").map((item) => item.text);
  if (texts.length === 1) {
    try { return JSON.parse(texts[0]); } catch { return texts[0]; }
  }
  return texts.join("\n");
}

export function findValue(value, keys) {
  if (!value || typeof value !== "object") return undefined;
  for (const key of keys) if (value[key] !== undefined && value[key] !== null) return value[key];
  for (const child of Object.values(value)) {
    if (typeof child === "object") {
      const found = findValue(child, keys);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export class UpstreamClients {
  constructor(env = process.env, dependencies = {}) {
    this.env = env;
    this.clients = new Map();
    this.clientFactory = dependencies.clientFactory || (() => new Client({ name: "dingtalk", version: "0.1.0" }));
    this.transportFactory = dependencies.transportFactory || ((url) => new StreamableHTTPClientTransport(url));
  }

  async connectAll() {
    const urls = loadMcpUrls(this.env);
    const missing = UPSTREAM_KINDS.filter((kind) => !urls[kind]).map((kind) => MCP_ENV_KEYS[kind]);
    if (missing.length) {
      throw new Error(`DingTalk MCP is not configured; missing environment variables: ${missing.join(", ")}`);
    }

    const failed = [];
    await Promise.all(UPSTREAM_KINDS.map(async (kind) => {
      try {
        await this.client(kind);
      } catch {
        failed.push(kind);
      }
    }));
    if (failed.length) {
      await this.close();
      throw new Error(`DingTalk upstream MCP connection failed: ${failed.sort().join(", ")}`);
    }
  }

  async client(kind) {
    if (this.clients.has(kind)) return this.clients.get(kind);
    const envKey = MCP_ENV_KEYS[kind];
    if (!envKey) throw new Error(`Unknown DingTalk upstream kind: ${kind}`);
    const url = loadMcpUrls(this.env)[kind];
    if (!url) throw new Error(`${envKey} is required`);
    const client = this.clientFactory(kind);
    await client.connect(this.transportFactory(new URL(url), kind));
    this.clients.set(kind, client);
    return client;
  }

  async call(kind, name, args = {}) {
    const client = await this.client(kind);
    const result = await client.callTool({ name, arguments: args });
    if (result.isError) throw new Error(`DingTalk ${kind}.${name} failed: ${JSON.stringify(resultValue(result))}`);
    return resultValue(result);
  }

  async close() {
    await Promise.all([...this.clients.values()].map((client) => client.close()));
    this.clients.clear();
  }
}
