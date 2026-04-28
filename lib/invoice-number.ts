import { prisma } from "@/lib/prisma";

export async function generateInvoiceNumber(userId?: string, date = new Date()) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const stamp = `${y}${m}${d}`;

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const latest = await prisma.invoice.findFirst({
    where: {
      userId,
      date: {
        gte: start,
        lte: end
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const currentSequence = latest?.invoiceNumber.split("-").pop() ?? "0000";
  const nextSequence = `${Number(currentSequence) + 1}`.padStart(4, "0");

  return `INV-${stamp}-${nextSequence}`;
}
