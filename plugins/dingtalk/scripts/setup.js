#!/usr/bin/env node
import { parseArgs } from "node:util";
import { initialize, setRecipients, setupStatus } from "../src/setup.js";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    "documents-root": { type: "string" },
    "reports-root": { type: "string" },
    "user-id": { type: "string", multiple: true },
    "report-type": { type: "string", multiple: true },
  },
});

const command = positionals[0] || "status";
let result;

try {
  if (command === "status") {
    result = setupStatus();
  } else if (command === "initialize") {
    result = initialize({ documents_root: values["documents-root"], reports_root: values["reports-root"] });
  } else if (command === "set-recipients") {
    result = setRecipients({ user_ids: values["user-id"], report_types: values["report-type"] });
  } else {
    throw new Error(`Unknown command: ${command}. Use status, initialize, or set-recipients.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
