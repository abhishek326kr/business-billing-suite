import { redirect } from "next/navigation";

import { CustomerEmailClient } from "@/components/CustomerEmailClient";
import { getCurrentUserId } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  const [customers, files, profile] = await Promise.all([
    prisma.customer.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: { name: "asc" }
    }),
    prisma.botFile.findMany({
      where: { userId },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        uploadedAt: true
      },
      orderBy: { uploadedAt: "desc" }
    }),
    getBusinessProfile(userId)
  ]);

  return (
    <CustomerEmailClient
      customers={customers}
      files={files.map((file) => ({
        ...file,
        uploadedAt: file.uploadedAt.toISOString()
      }))}
      profile={
        profile
          ? {
              businessName: profile.businessName,
              logoPath: profile.logoPath,
              website: profile.website,
              email: profile.email
            }
          : null
      }
    />
  );
}
