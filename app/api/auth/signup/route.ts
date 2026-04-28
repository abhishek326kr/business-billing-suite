import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  businessName: z.string().min(1, "Business name is required.")
});

export async function POST(request: Request) {
  try {
    const payload = signupSchema.parse(await request.json());
    const email = payload.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    }

    const password = await bcrypt.hash(payload.password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password,
        businessProfile: {
          create: {
            businessName: payload.businessName.trim()
          }
        }
      },
      select: {
        id: true,
        email: true
      }
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create account." },
      { status: 400 }
    );
  }
}
