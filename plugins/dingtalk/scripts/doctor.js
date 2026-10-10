#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../src/config.js";
import { loadMcpUrls } from "../src/environment.js";

const { config, sources } = loadConfig({ cwd: process.cwd() });
const urls = loadMcpUrls();
const checks = [
  ["contacts_mcp", Boolean(urls.contacts)],
  ["docs_mcp", Boolean(urls.docs)],
  ["log_mcp", Boolean(urls.log)],
  ["documents_root", fs.existsSync(config.paths.documents_root)],
  ["reports_root", fs.existsSync(config.paths.reports_root)],
  ["documents_readme", fs.existsSync(path.join(config.paths.documents_root, "README.md"))],
  ["reports_readme", fs.existsSync(path.join(config.paths.reports_root, "README.md"))],
];
for (const [name, ok] of checks) console.log(`${ok ? "OK" : "MISSING"}\t${name}`);
console.log(`project_config\t${sources.project || "none"}`);
console.log(`user_config\t${sources.user}`);
if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
