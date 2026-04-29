import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const [recentInvoices, totalInvoices, revenue, unpaidCount] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.invoice.count({ where: { userId } }),
    prisma.invoice.aggregate({
      where: { userId },
      _sum: { amount: true }
    }),
    prisma.invoice.count({
      where: { userId, status: "unpaid" }
    })
  ]);

  const totalRevenue = revenue._sum.amount || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Total Invoices</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{totalInvoices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Total Revenue</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(totalRevenue, "USD")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Unpaid Count</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{unpaidCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <Link href="/invoices/new" className="block sm:inline-flex">
          <Button className="w-full sm:w-auto">New Invoice</Button>
        </Link>
        <Link href="/customers" className="block sm:inline-flex">
          <Button variant="outline" className="w-full sm:w-auto">
            Add Customer
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-slate-500">
                  <th className="pb-3">Invoice</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border/70">
                    <td className="py-4 font-medium text-slate-900">{invoice.invoiceNumber}</td>
                    <td className="py-4 text-slate-600">{invoice.customer.name}</td>
                    <td className="py-4 text-slate-600">{formatDate(invoice.date)}</td>
                    <td className="py-4 text-slate-600">{formatCurrency(invoice.amount, invoice.currency)}</td>
                    <td className="py-4 text-slate-600">{invoice.status.toUpperCase()}</td>
                  </tr>
                ))}
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No invoices yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {recentInvoices.map((invoice) => (
              <div key={invoice.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{invoice.invoiceNumber}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{invoice.customer.name}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Date</p>
                    <p className="font-medium text-slate-700">{formatDate(invoice.date)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Status</p>
                    <p className="font-medium text-slate-700">{invoice.status.toUpperCase()}</p>
                  </div>
                </div>
              </div>
            ))}
            {recentInvoices.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No invoices yet.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
