import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/data";
import { generateInvoicePdf } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json({ error: "Customer is required for preview." }, { status: 400 });
    }

    const [profile, customer] = await Promise.all([
      getBusinessProfile(userId),
      prisma.customer.findFirst({ where: { id: customerId, userId } })
    ]);

    if (!profile || !customer) {
      return NextResponse.json({ error: "Preview data is incomplete." }, { status: 400 });
    }

    const pdf = await generateInvoicePdf({
      invoiceNumber: searchParams.get("invoiceNumber") || "INV-PREVIEW-0001",
      date: searchParams.get("date") || new Date().toISOString(),
      status: searchParams.get("status") || "paid",
      amount: Number(searchParams.get("amount") || 0),
      currency: searchParams.get("currency") || "USD",
      productName: searchParams.get("productName") || "Preview Product",
      services: searchParams.get("services") || "Preview services",
      validity: searchParams.get("validity") || "Preview validity",
      signaturePath: searchParams.get("signaturePath") === profile.signaturePath ? profile.signaturePath : null,
      signatureName: searchParams.get("signatureName") || profile.signatureName || profile.businessName,
      customer,
      business: profile
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="invoice-preview.pdf"'
      }
    });
  } catch (error) {
    console.error("Invoice preview PDF route failed.", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate invoice preview PDF." },
      { status: 500 }
    );
  }
}
