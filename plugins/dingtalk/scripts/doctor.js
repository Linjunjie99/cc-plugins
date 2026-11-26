#!/usr/bin/env node
import { setupStatus } from "../src/setup.js";

const status = setupStatus();
const checks = [
  ["contacts_mcp", status.mcp.contacts.configured],
  ["docs_mcp", status.mcp.docs.configured],
  ["log_mcp", status.mcp.log.configured],
  ["config", status.configured],
  ["documents_root", status.paths.documents_root_exists],
  ["reports_root", status.paths.reports_root_exists],
  ["documents_readme", status.root_readmes.documents],
  ["reports_readme", status.root_readmes.reports],
  ["report_recipients", status.default_report_recipient_count > 0],
];
for (const [name, ok] of checks) console.log(`${ok ? "OK" : "MISSING"}\t${name}`);
console.log(`config_file\t${status.config_file}`);
for (const file of status.legacy_files) console.log(`LEGACY\t${file} (no longer read; delete after setup)`);
if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
