import { redirect } from "next/navigation";

import { FilesClient } from "@/components/FilesClient";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const files = await prisma.botFile.findMany({
    where: { userId },
    orderBy: {
      uploadedAt: "desc"
    }
  });

  return <FilesClient initialFiles={files.map((file) => ({ ...file, uploadedAt: file.uploadedAt.toISOString() }))} />;
}
