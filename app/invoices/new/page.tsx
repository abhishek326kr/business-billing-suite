import { redirect } from "next/navigation";

import { InvoiceForm } from "@/components/InvoiceForm";
import { getCurrentUserId } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/data";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const [customers, files, invoiceNumber, profile] = await Promise.all([
    prisma.customer.findMany({
      where: { userId },
      orderBy: { name: "asc" }
    }),
    prisma.botFile.findMany({
      where: { userId },
      orderBy: { uploadedAt: "desc" }
    }),
    generateInvoiceNumber(userId),
    getBusinessProfile(userId)
  ]);

  if (customers.length === 0) {
    redirect("/customers");
  }

  return (
    <InvoiceForm
      customers={customers}
      files={files}
      suggestedNumber={invoiceNumber}
      defaultSignaturePath={profile?.signaturePath || null}
      defaultSignatureName={profile?.signatureName || profile?.businessName || null}
    />
  );
}
