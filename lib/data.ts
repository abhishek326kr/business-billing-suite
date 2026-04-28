import { prisma } from "@/lib/prisma";

export async function getBusinessProfile(userId: string) {
  return prisma.businessProfile.findUnique({
    where: { userId }
  });
}

export async function getInvoiceById(id: string, userId: string) {
  return prisma.invoice.findFirst({
    where: { id, userId },
    include: {
      customer: true,
      botFile: true
    }
  });
}
