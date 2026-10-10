#!/usr/bin/env node
import { build } from "esbuild";
import fs from "node:fs";

fs.rmSync("dist", { recursive: true, force: true });

await build({
  entryPoints: {
    server: "src/server.js",
    doctor: "scripts/doctor.js",
    "init-config": "scripts/init-config.js",
    setup: "scripts/setup.js",
  },
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outExtension: { ".js": ".cjs" },
  sourcemap: false,
  legalComments: "none",
});
