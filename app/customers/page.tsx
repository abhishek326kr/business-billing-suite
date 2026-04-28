import { redirect } from "next/navigation";

import { CustomersClient } from "@/components/CustomersClient";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const customers = await prisma.customer.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          invoices: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return <CustomersClient initialCustomers={customers} />;
}
