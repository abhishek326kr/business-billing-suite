import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { encryptValue } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const profile = await prisma.businessProfile.findUnique({ where: { userId } });
  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const logo = formData.get("logo");
    const signature = formData.get("signature");
    let logoPath: string | undefined;
    let signaturePath: string | undefined;

    if (logo instanceof File && logo.size > 0) {
      const uploaded = await saveUploadedFile(logo, {
        subdir: "logos",
        allowedMimePrefixes: ["image/"],
        maxSize: 5 * 1024 * 1024
      });
      logoPath = uploaded.relativePath;
    }

    if (signature instanceof File && signature.size > 0) {
      const uploaded = await saveUploadedFile(signature, {
        subdir: "signatures",
        allowedMimePrefixes: ["image/"],
        maxSize: 2 * 1024 * 1024
      });
      signaturePath = uploaded.relativePath;
    }

    const existing = await prisma.businessProfile.findUnique({ where: { userId } });
    const smtpPass = formData.get("smtpPass")?.toString();
    const businessName = formData.get("businessName")?.toString() || "Algo Trading Bot";

    const profile = await prisma.businessProfile.upsert({
      where: {
        userId
      },
      update: {
        businessName,
        website: formData.get("website")?.toString() || null,
        email: formData.get("email")?.toString() || null,
        address: formData.get("address")?.toString() || null,
        logoPath: logoPath || existing?.logoPath || null,
        signaturePath: signaturePath || existing?.signaturePath || null,
        signatureName: formData.get("signatureName")?.toString() || businessName,
        smtpHost: formData.get("smtpHost")?.toString() || null,
        smtpPort: formData.get("smtpPort") ? Number(formData.get("smtpPort")) : null,
        smtpUser: formData.get("smtpUser")?.toString() || null,
        smtpPass: smtpPass ? encryptValue(smtpPass) : existing?.smtpPass || null,
        smtpFromName: formData.get("smtpFromName")?.toString() || null
      },
      create: {
        userId,
        businessName,
        website: formData.get("website")?.toString() || null,
        email: formData.get("email")?.toString() || null,
        address: formData.get("address")?.toString() || null,
        logoPath: logoPath || null,
        signaturePath: signaturePath || null,
        signatureName: formData.get("signatureName")?.toString() || businessName,
        smtpHost: formData.get("smtpHost")?.toString() || null,
        smtpPort: formData.get("smtpPort") ? Number(formData.get("smtpPort")) : null,
        smtpUser: formData.get("smtpUser")?.toString() || null,
        smtpPass: smtpPass ? encryptValue(smtpPass) : null,
        smtpFromName: formData.get("smtpFromName")?.toString() || null
      }
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save profile." },
      { status: 400 }
    );
  }
}
