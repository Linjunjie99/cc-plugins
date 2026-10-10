import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function readMarkdown(file) {
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.startsWith("---\n")) return { raw, body: raw, data: {} };
  const end = raw.indexOf("\n---\n", 4);
  if (end < 0) throw new Error(`Invalid YAML front matter: ${file}`);
  return {
    raw,
    data: YAML.parse(raw.slice(4, end)) || {},
    body: raw.slice(end + 5),
  };
}

export function serializeMarkdown(data, body) {
  const cleanBody = body.replace(/^\n+/, "");
  return `---\n${YAML.stringify(data, { lineWidth: 0 }).trimEnd()}\n---\n${cleanBody}`;
}

export function writeMarkdownAtomic(file, data, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${crypto.randomUUID()}`;
  fs.writeFileSync(temp, serializeMarkdown(data, body), { mode: 0o600 });
  fs.renameSync(temp, file);
}

export function slugify(value) {
  const slug = value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
  return slug || "dingtalk-document";
}

export function firstHeading(body, fallback = "DingTalk document") {
  return body.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback;
}

export function findLocalOnlyReferences(body) {
  const findings = [];
  for (const [index, line] of body.split("\n").entries()) {
    if (/file:\/\//i.test(line) || /(?:^|[\s(])\/(?:root|home|mnt|tmp)\//.test(line)) {
      findings.push({ line: index + 1, text: line.trim() });
    }
  }
  return findings;
}
