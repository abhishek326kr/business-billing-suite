import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const root = process.cwd();
const buildIdPath = path.join(root, ".next", "BUILD_ID");

if (fs.existsSync(buildIdPath)) {
  console.log("Production build found; skipping next build.");
  process.exit(0);
}

console.log("Production build missing; running npm run build.");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCommand, ["run", "build"], {
  cwd: root,
  env: process.env,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
