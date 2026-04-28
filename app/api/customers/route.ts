import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  pincode: z.string().optional().nullable()
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const customers = await prisma.customer.findMany({
    where: { userId },
    include: {
      _count: {
        select: { invoices: true }
      }
    },
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = customerSchema.parse(await request.json());
    const { id, ...data } = payload;

    if (id) {
      const existing = await prisma.customer.findFirst({ where: { id, userId } });
      if (!existing) {
        return NextResponse.json({ error: "Customer not found." }, { status: 404 });
      }

      const customer = await prisma.customer.update({
        where: { id },
        data
      });

      return NextResponse.json({ customer });
    }

    const customer = await prisma.customer.create({
      data: {
        ...data,
        userId
      }
    });

    return NextResponse.json({ customer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save customer." },
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
    return NextResponse.json({ error: "Customer id is required." }, { status: 400 });
  }

  await prisma.customer.deleteMany({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
