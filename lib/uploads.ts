import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const uploadRoot = path.join(process.cwd(), "public", "uploads");

export async function ensureUploadDirectory(subdir?: string) {
  const target = subdir ? path.join(uploadRoot, subdir) : uploadRoot;
  await fs.mkdir(target, { recursive: true });
  return target;
}

export async function saveUploadedFile(
  file: File,
  options?: {
    subdir?: string;
    allowedMimePrefixes?: string[];
    maxSize?: number;
  }
) {
  const maxSize = options?.maxSize ?? 50 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error("File size must be 50MB or less.");
  }

  if (
    options?.allowedMimePrefixes?.length &&
    !options.allowedMimePrefixes.some((prefix) => file.type.startsWith(prefix))
  ) {
    throw new Error("Invalid file type.");
  }

  const directory = await ensureUploadDirectory(options?.subdir);
  const extension = path.extname(file.name);
  const safeName = `${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(directory, safeName);
  const relativePath = `/uploads/${options?.subdir ? `${options.subdir}/` : ""}${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(absolutePath, buffer);

  return {
    absolutePath,
    relativePath,
    size: file.size
  };
}

export async function deleteUploadedFile(relativePath: string) {
  const absolutePath = path.join(process.cwd(), "public", relativePath.replace(/^\/+/, ""));
  await fs.rm(absolutePath, { force: true });
}
