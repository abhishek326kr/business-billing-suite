import { redirect } from "next/navigation";

import { InvoicesClient } from "@/components/InvoicesClient";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const [invoices, customers] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId },
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.customer.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <InvoicesClient
      initialInvoices={invoices.map((invoice) => ({
        ...invoice,
        date: invoice.date.toISOString()
      }))}
      customers={customers}
    />
  );
}
