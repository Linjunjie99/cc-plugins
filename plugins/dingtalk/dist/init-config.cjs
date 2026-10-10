#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/init-config.js
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);

// src/config.js
var import_node_os = __toESM(require("node:os"), 1);
var import_node_path = __toESM(require("node:path"), 1);
function claudeHome(env = process.env) {
  return env.CLAUDE_CONFIG_DIR || import_node_path.default.join(import_node_os.default.homedir(), ".claude");
}
function userConfigPath(env = process.env) {
  return import_node_path.default.join(claudeHome(env), "dingtalk.toml");
}

// scripts/init-config.js
var root = import_node_path2.default.dirname(import_node_path2.default.dirname(import_node_path2.default.resolve(process.argv[1])));
var destination = userConfigPath();
if (import_node_fs.default.existsSync(destination)) {
  console.log(`Configuration already exists: ${destination}`);
  process.exit(0);
}
import_node_fs.default.mkdirSync(import_node_path2.default.dirname(destination), { recursive: true });
import_node_fs.default.copyFileSync(import_node_path2.default.join(root, "config.example.toml"), destination);
import_node_fs.default.chmodSync(destination, 384);
console.log(`Created ${destination}`);
