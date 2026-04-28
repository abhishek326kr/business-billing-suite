import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput
} from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

type R2Config = {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
};

let r2Client: S3Client | undefined;

export function getUploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads"));
}

function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    bucket,
    endpoint,
    accessKeyId,
    secretAccessKey,
    publicUrl: process.env.R2_PUBLIC_URL?.replace(/\/+$/, "")
  };
}

export function isR2StorageConfigured() {
  return Boolean(getR2Config());
}

function getR2Client() {
  const config = getR2Config();

  if (!config) {
    return null;
  }

  r2Client ??= new S3Client({
    endpoint: config.endpoint,
    region: "auto",
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });

  return {
    client: r2Client,
    config
  };
}

function assertSafeRelativeUploadPath(relativePath: string) {
  const withoutPrefix = relativePath.replace(/^\/+/, "").replace(/^uploads\/?/, "");
  const normalized = path.posix.normalize(withoutPrefix.replaceAll("\\", "/"));

  if (!normalized || normalized === "." || normalized === ".." || normalized.startsWith("../")) {
    throw new Error("Invalid upload path.");
  }

  return normalized;
}

export function getUploadedFilePath(relativePath: string) {
  const uploadRoot = getUploadRoot();
  const normalized = assertSafeRelativeUploadPath(relativePath);
  const absolutePath = path.join(uploadRoot, normalized);

  if (!absolutePath.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new Error("Invalid upload path.");
  }

  return absolutePath;
}

export function getUploadedPublicUrl(relativePath: string) {
  const config = getR2Config();

  if (!config?.publicUrl) {
    return null;
  }

  const key = assertSafeRelativeUploadPath(relativePath);
  const encodedKey = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${config.publicUrl}/${encodedKey}`;
}

export async function ensureUploadDirectory(subdir?: string) {
  const uploadRoot = getUploadRoot();
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

  const extension = path.extname(file.name);
  const safeName = `${crypto.randomUUID()}${extension}`;
  const key = `${options?.subdir ? `${options.subdir}/` : ""}${safeName}`;
  const relativePath = `/uploads/${key}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const r2 = getR2Client();
  let absolutePath = "";

  if (r2) {
    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.config.bucket,
        Key: key,
        Body: buffer,
        ContentLength: buffer.byteLength,
        ContentType: file.type || undefined
      })
    );
  } else {
    const directory = await ensureUploadDirectory(options?.subdir);
    absolutePath = path.join(directory, safeName);
    await fs.writeFile(absolutePath, buffer);
  }

  return {
    absolutePath,
    relativePath,
    size: file.size
  };
}

export async function deleteUploadedFile(relativePath: string) {
  const r2 = getR2Client();

  if (r2) {
    await r2.client.send(
      new DeleteObjectCommand({
        Bucket: r2.config.bucket,
        Key: assertSafeRelativeUploadPath(relativePath)
      })
    );
    return;
  }

  const absolutePath = getUploadedFilePath(relativePath);
  await fs.rm(absolutePath, { force: true });
}

async function bodyToBuffer(body: NonNullable<GetObjectCommandOutput["Body"]>) {
  const chunks: Buffer[] = [];

  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export async function getUploadedFile(relativePath: string) {
  const r2 = getR2Client();

  if (r2) {
    const object = await r2.client.send(
      new GetObjectCommand({
        Bucket: r2.config.bucket,
        Key: assertSafeRelativeUploadPath(relativePath)
      })
    );

    if (!object.Body) {
      throw new Error("Uploaded file is empty.");
    }

    return {
      buffer: await bodyToBuffer(object.Body),
      contentType: object.ContentType
    };
  }

  return {
    buffer: await fs.readFile(getUploadedFilePath(relativePath)),
    contentType: undefined
  };
}

export async function readUploadedFile(relativePath: string) {
  const uploaded = await getUploadedFile(relativePath);
  return uploaded.buffer;
}
