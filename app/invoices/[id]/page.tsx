import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmailModal } from "@/components/EmailModal";
import { InvoicePreview } from "@/components/InvoicePreview";
import { Button } from "@/components/ui/button";
import { getCurrentUserId } from "@/lib/auth";
import { getBusinessProfile, getInvoiceById } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const [invoice, profile] = await Promise.all([
    getInvoiceById(id, userId),
    getBusinessProfile(userId)
  ]);

  if (!invoice || !profile) {
    notFound();
  }

  const previewData = {
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.date,
    status: invoice.status,
    amount: invoice.amount,
    currency: invoice.currency,
    productName: invoice.productName,
    services: invoice.services,
    validity: invoice.validity,
    signaturePath: invoice.signaturePath,
    signatureName: invoice.signatureName,
    customer: invoice.customer,
    business: profile
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank">
          <Button>Download PDF</Button>
        </a>
        <EmailModal
          invoiceId={invoice.id}
          initialTo={invoice.customer.email}
          initialSubject={`Invoice #${invoice.invoiceNumber} from ${profile.businessName}`}
          botFileName={invoice.botFile?.fileName}
        />
        <Link href="/invoices">
          <Button variant="outline">Back to Invoices</Button>
        </Link>
      </div>
      <InvoicePreview invoice={previewData} />
    </div>
  );
}
