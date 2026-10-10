import assert from "node:assert/strict";
import test from "node:test";
import { UpstreamClients } from "../src/upstream.js";

const completeEnv = {
  DINGTALK_CONTACTS_MCP_URL: "https://example.test/contacts",
  DINGTALK_DOCS_MCP_URL: "https://example.test/docs",
  DINGTALK_LOG_MCP_URL: "https://example.test/log",
};

test("strict startup reports every missing variable before creating clients", async () => {
  let created = 0;
  const upstream = new UpstreamClients({}, { clientFactory: () => { created += 1; } });

  await assert.rejects(
    () => upstream.connectAll(),
    /DINGTALK_CONTACTS_MCP_URL, DINGTALK_DOCS_MCP_URL, DINGTALK_LOG_MCP_URL/,
  );
  assert.equal(created, 0);
});

test("strict startup connects all three upstream MCP services", async () => {
  const connected = [];
  const upstream = new UpstreamClients(completeEnv, {
    clientFactory: (kind) => ({
      async connect(transport) { connected.push([kind, transport.kind]); },
      async close() {},
    }),
    transportFactory: (_url, kind) => ({ kind }),
  });

  await upstream.connectAll();
  assert.deepEqual(connected.sort(), [
    ["contacts", "contacts"],
    ["docs", "docs"],
    ["log", "log"],
  ]);
});

test("upstream startup errors never expose credential-bearing URLs", async () => {
  const secret = "credential-bearing-secret";
  const env = { ...completeEnv, DINGTALK_DOCS_MCP_URL: `https://example.test/${secret}` };
  const upstream = new UpstreamClients(env, {
    clientFactory: (kind) => ({
      async connect() { if (kind === "docs") throw new Error(secret); },
      async close() {},
    }),
    transportFactory: () => ({}),
  });

  await assert.rejects(async () => {
    try {
      await upstream.connectAll();
    } catch (error) {
      assert.doesNotMatch(error.message, new RegExp(secret));
      throw error;
    }
  }, /DingTalk upstream MCP connection failed: docs/);
});
