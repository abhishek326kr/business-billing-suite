"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/uploads";

export async function deleteCustomerAction(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  await prisma.customer.deleteMany({ where: { id, userId } });
  revalidatePath("/customers");
}

export async function deleteInvoiceAction(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  await prisma.invoice.deleteMany({ where: { id, userId } });
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

export async function deleteFileAction(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const file = await prisma.botFile.findFirst({ where: { id, userId } });
  if (!file) return;

  await deleteUploadedFile(file.filePath);
  await prisma.botFile.delete({ where: { id: file.id } });
  revalidatePath("/files");
}
