import path from "path";
import { NextResponse } from "next/server";

import { getUploadedFile, getUploadedPublicUrl } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    path?: string[];
  };
};

const contentTypes: Record<string, string> = {
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".zip": "application/zip"
};

function getContentType(filePath: string) {
  return contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const uploadPath = params.path?.join("/");

    if (!uploadPath) {
      return new NextResponse("Not found", { status: 404 });
    }

    const relativePath = `/uploads/${uploadPath}`;
    const publicUrl = getUploadedPublicUrl(relativePath);

    if (publicUrl) {
      return NextResponse.redirect(publicUrl, 307);
    }

    const file = await getUploadedFile(relativePath);

    return new NextResponse(file.buffer, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": file.contentType || getContentType(relativePath)
      }
    });
  } catch {
    return new NextResponse("Not found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }
}
