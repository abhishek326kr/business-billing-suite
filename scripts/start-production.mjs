import { spawnSync } from "child_process";
import path from "path";

const root = process.cwd();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const nextCommand = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next"
);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(npmCommand, ["run", "uploads:init"]);
run(npmCommand, ["run", "build:ensure"]);
run(nextCommand, ["start", ...process.argv.slice(2)]);
