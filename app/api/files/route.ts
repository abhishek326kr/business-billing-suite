import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/uploads";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const files = await prisma.botFile.findMany({
    where: { userId },
    orderBy: {
      uploadedAt: "desc"
    }
  });

  return NextResponse.json({ files });
}

export async function DELETE(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "File id is required." }, { status: 400 });
  }

  const file = await prisma.botFile.findFirst({ where: { id, userId } });

  if (!file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  await deleteUploadedFile(file.filePath);
  await prisma.botFile.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
