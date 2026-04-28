import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { getBusinessProfile, getInvoiceById } from "@/lib/data";
import { generateInvoicePdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [invoice, profile] = await Promise.all([
    getInvoiceById(params.id, userId),
    getBusinessProfile(userId)
  ]);

  if (!invoice || !profile) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const pdf = await generateInvoicePdf({
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
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`
    }
  });
}
