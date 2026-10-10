#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { userConfigPath } from "../src/config.js";

const root = path.dirname(path.dirname(path.resolve(process.argv[1])));
const destination = userConfigPath();
if (fs.existsSync(destination)) {
  console.log(`Configuration already exists: ${destination}`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(path.join(root, "config.example.toml"), destination);
fs.chmodSync(destination, 0o600);
console.log(`Created ${destination}`);
