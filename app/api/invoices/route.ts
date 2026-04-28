import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/data";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/uploads";

const invoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  date: z.string().optional(),
  customerId: z.string().min(1),
  productName: z.string().min(1),
  services: z.string().optional().nullable(),
  validity: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  currency: z.enum(["USD", "INR"]),
  status: z.enum(["paid", "unpaid"]),
  botFileId: z.string().nullable().optional(),
  signaturePath: z.string().optional().nullable(),
  signatureName: z.string().optional().nullable()
});

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const customerId = searchParams.get("customerId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const toDate = to ? new Date(to) : undefined;
  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: status && status !== "all" ? status : undefined,
      customerId: customerId && customerId !== "all" ? customerId : undefined,
      date:
        from || to
          ? {
              gte: from ? new Date(from) : undefined,
              lte: toDate
            }
          : undefined
    },
    include: {
      customer: true,
      botFile: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const payload = invoiceSchema.parse({
      customerId: formData.get("customerId"),
      invoiceNumber: formData.get("invoiceNumber") || undefined,
      date: formData.get("date") || undefined,
      productName: formData.get("productName"),
      services: formData.get("services") || null,
      validity: formData.get("validity") || null,
      amount: formData.get("amount"),
      currency: formData.get("currency"),
      status: formData.get("status"),
      botFileId: formData.get("botFileId") || null,
      signaturePath: formData.get("signaturePath") || null,
      signatureName: formData.get("signatureName") || null
    });
    const date = payload.date ? new Date(payload.date) : new Date();
    const invoiceNumber = payload.invoiceNumber || (await generateInvoiceNumber(userId, date));
    const [customer, botFile, profile] = await Promise.all([
      prisma.customer.findFirst({ where: { id: payload.customerId, userId } }),
      payload.botFileId ? prisma.botFile.findFirst({ where: { id: payload.botFileId, userId } }) : null,
      getBusinessProfile(userId)
    ]);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 400 });
    }

    if (payload.botFileId && !botFile) {
      return NextResponse.json({ error: "Attachment not found." }, { status: 400 });
    }

    const signature = formData.get("signature");
    let signaturePath = payload.signaturePath === profile?.signaturePath ? profile?.signaturePath || null : null;

    if (signature instanceof File && signature.size > 0) {
      const uploaded = await saveUploadedFile(signature, {
        subdir: "signatures",
        allowedMimePrefixes: ["image/"],
        maxSize: 2 * 1024 * 1024
      });
      signaturePath = uploaded.relativePath;
    }

    const invoice = await prisma.invoice.create({
      data: {
        userId,
        invoiceNumber,
        date,
        customerId: payload.customerId,
        productName: payload.productName,
        services: payload.services || null,
        validity: payload.validity || null,
        amount: payload.amount,
        currency: payload.currency,
        status: payload.status,
        botFileId: payload.botFileId || null,
        signaturePath,
        signatureName: payload.signatureName || profile?.signatureName || profile?.businessName || null
      }
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save invoice." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Invoice id is required." }, { status: 400 });
  }

  await prisma.invoice.deleteMany({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
