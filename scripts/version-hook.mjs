#!/usr/bin/env node
// PostToolUse hook: bump patch + regenerate version file when an
// application file is edited. Skips package files, generated files,
// and the version tooling itself to avoid infinite loops.
import { spawnSync } from "node:child_process";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const root = resolve(__dirname, "..");

let raw = "";
try {
  raw = await new Promise((res, rej) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => res(buf));
    process.stdin.on("error", rej);
  });
} catch {
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(raw || "{}");
} catch {
  process.exit(0);
}

const tool = payload.tool_name || payload.toolName || "";
const editingTools = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
if (!editingTools.has(tool)) process.exit(0);

const input = payload.tool_input || payload.toolInput || {};
const filePath = input.file_path || input.filePath || input.notebook_path;
if (!filePath || typeof filePath !== "string") process.exit(0);

const abs = resolve(filePath);
const rel = relative(root, abs).split(sep).join("/");

if (rel.startsWith("..")) process.exit(0);

const excluded = [
  /^package\.json$/,
  /^package-lock\.json$/,
  /^pnpm-lock\.yaml$/,
  /^yarn\.lock$/,
  /^src\/generated\//,
  /^scripts\/write-version\.mjs$/,
  /^scripts\/version-hook\.mjs$/,
  /^node_modules\//,
  /^\.next\//,
  /^\.vercel\//,
  /^\.claude\//,
  /^\.git\//,
  /^prisma\/.*\.db/,
];

if (excluded.some((rx) => rx.test(rel))) process.exit(0);

const trackedExt = /\.(ts|tsx|js|jsx|mjs|cjs|css|scss|json|md|prisma|html)$/i;
if (!trackedExt.test(rel)) process.exit(0);

const result = spawnSync(
  process.execPath,
  [resolve(root, "scripts", "write-version.mjs"), "--bump-patch"],
  { cwd: root, stdio: "inherit" },
);

process.exit(result.status ?? 0);
