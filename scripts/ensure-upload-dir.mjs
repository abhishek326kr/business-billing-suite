import fs from "fs";
import path from "path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const r2Keys = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];

function loadLocalEnv() {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envFile = fs.readFileSync(envPath, "utf8");

  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

function hasR2Config() {
  return r2Keys.every((key) => Boolean(process.env[key]));
}

loadLocalEnv();

if (hasR2Config()) {
  console.log("R2 upload storage configured; skipping local upload folder setup.");
  process.exit(0);
}

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(root, "public", "uploads"));
const dirs = [uploadRoot, path.join(uploadRoot, "logos"), path.join(uploadRoot, "signatures")];

for (const dir of dirs) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log(`Local upload fallback folders ready at ${uploadRoot}`);
