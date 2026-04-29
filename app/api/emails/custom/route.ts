import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/data";
import { sendCustomerEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const customEmailSchema = z.object({
  customerId: z.string().min(1, "Choose a customer."),
  subject: z.string().trim().min(1, "Subject is required.").max(180, "Subject is too long."),
  message: z.string().trim().min(1, "Message is required.").max(10_000, "Message is too long."),
  attachmentIds: z.array(z.string()).max(10, "Attach 10 files or fewer.").default([])
});

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = customEmailSchema.parse(await request.json());
    const [profile, customer, files] = await Promise.all([
      getBusinessProfile(userId),
      prisma.customer.findFirst({
        where: {
          id: payload.customerId,
          userId
        }
      }),
      payload.attachmentIds.length
        ? prisma.botFile.findMany({
            where: {
              id: {
                in: payload.attachmentIds
              },
              userId
            }
          })
        : Promise.resolve([])
    ]);

    if (!profile) {
      return NextResponse.json({ error: "Business profile not found." }, { status: 404 });
    }

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    if (files.length !== payload.attachmentIds.length) {
      return NextResponse.json({ error: "One or more attachments were not found." }, { status: 404 });
    }

    assertRateLimit(`custom-email:${userId}:${customer.id}`);

    const filesById = new Map(files.map((file) => [file.id, file]));
    const orderedAttachments = payload.attachmentIds.flatMap((id) => {
      const file = filesById.get(id);

      return file
        ? [
            {
              fileName: file.fileName,
              filePath: file.filePath
            }
          ]
        : [];
    });

    await sendCustomerEmail({
      config: {
        smtpHost: profile.smtpHost,
        smtpPort: profile.smtpPort,
        smtpUser: profile.smtpUser,
        smtpPass: profile.smtpPass,
        smtpFromName: profile.smtpFromName,
        businessEmail: profile.email,
        businessName: profile.businessName,
        businessWebsite: profile.website,
        logoPath: profile.logoPath
      },
      to: customer.email,
      subject: payload.subject,
      message: payload.message,
      customerName: customer.name,
      attachments: orderedAttachments
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.errors[0]?.message || "Invalid email payload."
        : error instanceof Error
          ? error.message
          : "Unable to send email.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
