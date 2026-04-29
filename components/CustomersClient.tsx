"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { deleteCustomerAction } from "@/app/actions";
import { CustomerForm } from "@/components/CustomerForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  _count?: {
    invoices: number;
  };
};

export function CustomersClient({
  initialCustomers
}: {
  initialCustomers: Customer[];
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();

  async function refreshCustomers() {
    const response = await fetch("/api/customers");
    const payload = await response.json();
    setCustomers(payload.customers || []);
    setEditingCustomer(undefined);
  }

  async function deleteCustomer(id: string) {
    await deleteCustomerAction(id);
    await refreshCustomers();
    router.refresh();
  }

  const filtered = useMemo(() => {
    const value = query.toLowerCase();
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.phone, customer.city, customer.country]
        .filter(Boolean)
        .some((item) => item!.toLowerCase().includes(value))
    );
  }, [customers, query]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,420px),minmax(0,1fr)]">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            customer={editingCustomer}
            onSuccess={refreshCustomers}
            onCancel={editingCustomer ? () => setEditingCustomer(undefined) : undefined}
          />
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Customers</CardTitle>
          <div className="w-full md:w-80">
            <Input
              placeholder="Search customers"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-slate-500">
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Invoices</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id} className="border-b border-border/70">
                    <td className="py-4">
                      <p className="font-medium text-slate-900">{customer.name}</p>
                      <p className="text-slate-500">{customer.email}</p>
                    </td>
                    <td className="py-4 text-slate-600">{customer.phone || "N/A"}</td>
                    <td className="py-4 text-slate-600">
                      {[customer.city, customer.state, customer.country].filter(Boolean).join(", ") || "N/A"}
                    </td>
                    <td className="py-4">
                      <Badge>{customer._count?.invoices || 0}</Badge>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditingCustomer(customer)}>
                          Edit
                        </Button>
                        <Button variant="destructive" onClick={() => deleteCustomer(customer.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No customers found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {filtered.map((customer) => (
              <div key={customer.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{customer.name}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{customer.email}</p>
                  </div>
                  <Badge>{customer._count?.invoices || 0}</Badge>
                </div>

                <div className="mt-4 grid gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Contact</p>
                    <p className="font-medium text-slate-700">{customer.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Location</p>
                    <p className="font-medium text-slate-700">
                      {[customer.city, customer.state, customer.country].filter(Boolean).join(", ") || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setEditingCustomer(customer)}>
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={() => deleteCustomer(customer.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No customers found.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
