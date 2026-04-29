"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { deleteInvoiceAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";

type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  customer: {
    id: string;
    name: string;
  };
};

type Customer = {
  id: string;
  name: string;
};

export function InvoicesClient({
  initialInvoices,
  customers
}: {
  initialInvoices: InvoiceRecord[];
  customers: Customer[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState("all");
  const [customerId, setCustomerId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [invoices, setInvoices] = useState(initialInvoices);

  async function deleteInvoice(id: string) {
    await deleteInvoiceAction(id);
    setInvoices((current) => current.filter((invoice) => invoice.id !== id));
    router.refresh();
  }

  const filtered = useMemo(() => {
    return invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.date);
      if (status !== "all" && invoice.status !== status) return false;
      if (customerId !== "all" && invoice.customer.id !== customerId) return false;
      if (dateFrom && invoiceDate < new Date(dateFrom)) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (invoiceDate > end) return false;
      }
      return true;
    });
  }, [customerId, dateFrom, dateTo, invoices, status]);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Invoices</CardTitle>
          <Link href="/invoices/new" className="block sm:inline-flex">
            <Button className="w-full sm:w-auto">New Invoice</Button>
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-lg border border-border bg-white px-3 text-sm">
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-11 rounded-lg border border-border bg-white px-3 text-sm">
            <option value="all">All Customers</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-slate-500">
                <th className="pb-3">Invoice No</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border/70">
                  <td className="py-4 font-medium text-slate-900">{invoice.invoiceNumber}</td>
                  <td className="py-4 text-slate-600">{invoice.customer.name}</td>
                  <td className="py-4 text-slate-600">{formatDate(invoice.date)}</td>
                  <td className="py-4 text-slate-600">{formatCurrency(invoice.amount, invoice.currency)}</td>
                  <td className="py-4">
                    <Badge variant={invoice.status === "paid" ? "success" : "destructive"}>
                      {invoice.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/invoices/${invoice.id}`}>
                        <Button variant="outline">View PDF</Button>
                      </Link>
                      <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank">
                        <Button type="button" variant="outline">
                          Download PDF
                        </Button>
                      </a>
                      <Link href={`/invoices/${invoice.id}`}>
                        <Button variant="outline">Send Email</Button>
                      </Link>
                      <Button variant="destructive" onClick={() => deleteInvoice(invoice.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No invoices match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 md:hidden">
          {filtered.map((invoice) => (
            <div key={invoice.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{invoice.invoiceNumber}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{invoice.customer.name}</p>
                </div>
                <Badge variant={invoice.status === "paid" ? "success" : "destructive"}>
                  {invoice.status.toUpperCase()}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Date</p>
                  <p className="font-medium text-slate-700">{formatDate(invoice.date)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Amount</p>
                  <p className="font-medium text-slate-700">{formatCurrency(invoice.amount, invoice.currency)}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <Link href={`/invoices/${invoice.id}`} className="block">
                  <Button variant="outline" className="w-full">
                    View PDF
                  </Button>
                </Link>
                <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" className="block">
                  <Button type="button" variant="outline" className="w-full">
                    Download PDF
                  </Button>
                </a>
                <Link href={`/invoices/${invoice.id}`} className="block">
                  <Button variant="outline" className="w-full">
                    Send Email
                  </Button>
                </Link>
                <Button variant="destructive" className="w-full" onClick={() => deleteInvoice(invoice.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No invoices match the current filters.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
