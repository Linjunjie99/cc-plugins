#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDingTalkServer } from "./mcp.js";
import { UpstreamClients } from "./upstream.js";

const upstream = new UpstreamClients();

async function main() {
  await upstream.connectAll();
  const server = createDingTalkServer({ upstream });
  await server.connect(new StdioServerTransport());
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
      await upstream.close();
      process.exit(0);
    });
  }
}

main().catch(async (error) => {
  await upstream.close();
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
