import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { getBusinessProfile, getInvoiceById } from "@/lib/data";
import { sendInvoiceEmail } from "@/lib/mailer";
import { generateInvoicePdf } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const to = body.to?.toString() || "";
    const subject = body.subject?.toString() || "";
    const message = body.message?.toString() || "";
    const licenseKey = body.licenseKey?.toString() || "";
    const endpointUrl = body.endpointUrl?.toString() || "";
    const [invoice, profile] = await Promise.all([
      getInvoiceById(id, userId),
      getBusinessProfile(userId)
    ]);

    if (!invoice || !profile) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    assertRateLimit(`invoice-email:${id}`);

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

    await sendInvoiceEmail({
      config: {
        smtpHost: profile.smtpHost,
        smtpPort: profile.smtpPort,
        smtpUser: profile.smtpUser,
        smtpPass: profile.smtpPass,
        smtpFromName: profile.smtpFromName,
        businessEmail: profile.email,
        businessName: profile.businessName,
        logoPath: profile.logoPath
      },
      to,
      subject,
      message,
      licenseKey,
      endpointUrl,
      invoicePdf: pdf,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.date,
      invoiceAmount: invoice.amount,
      invoiceCurrency: invoice.currency,
      customerName: invoice.customer.name,
      botFilePath: invoice.botFile?.filePath,
      botFileName: invoice.botFile?.fileName
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        sentAt: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send email." },
      { status: 400 }
    );
  }
}
