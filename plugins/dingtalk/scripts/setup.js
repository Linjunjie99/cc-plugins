#!/usr/bin/env node
import { parseArgs } from "node:util";
import { initialize, setRecipients, setupStatus } from "../src/setup.js";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    "project-dir": { type: "string" },
    "company-root": { type: "string" },
    "documents-root": { type: "string" },
    "reports-root": { type: "string" },
    "user-id": { type: "string", multiple: true },
    "report-type": { type: "string", multiple: true },
  },
});

const command = positionals[0] || "initialize";
let result;

if (command === "status") {
  result = setupStatus({ cwd: process.cwd() });
} else if (command === "initialize") {
  result = initialize({
    project_dir: values["project-dir"],
    company_root: values["company-root"],
    documents_root: values["documents-root"],
    reports_root: values["reports-root"],
  });
} else if (command === "set-recipients") {
  result = setRecipients({
    project_dir: values["project-dir"],
    user_ids: values["user-id"],
    report_types: values["report-type"],
  });
} else {
  throw new Error(`Unknown command: ${command}. Use status, initialize, or set-recipients.`);
}

console.log(JSON.stringify(result, null, 2));
