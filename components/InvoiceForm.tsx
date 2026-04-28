"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Customer = {
  id: string;
  name: string;
  email: string;
};

type BotFile = {
  id: string;
  fileName: string;
};

export function InvoiceForm({
  customers,
  files,
  suggestedNumber,
  defaultSignaturePath,
  defaultSignatureName
}: {
  customers: Customer[];
  files: BotFile[];
  suggestedNumber: string;
  defaultSignaturePath?: string | null;
  defaultSignatureName?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0]?.id || "");
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(defaultSignaturePath || null);
  const formRef = useRef<HTMLFormElement>(null);

  const filteredCustomers = useMemo(
    () => customers.filter((customer) => customer.name.toLowerCase().includes(query.toLowerCase())),
    [customers, query]
  );

  function handleSubmit(formData: FormData) {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/invoices", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || "Unable to create invoice.");
        return;
      }

      router.push(`/invoices/${payload.invoice.id}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Invoice</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2 grid gap-5 lg:grid-cols-[1fr,280px]">
            <div>
              <Label htmlFor="customerSearch">Customer Search</Label>
              <Input
                id="customerSearch"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customer by name"
              />
            </div>
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <select
                id="customerId"
                name="customerId"
                value={selectedCustomer}
                onChange={(event) => setSelectedCustomer(event.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"
                required
              >
                {filteredCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input id="invoiceNumber" name="invoiceNumber" defaultValue={suggestedNumber} required />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div>
            <Label htmlFor="productName">Product Name</Label>
            <Input id="productName" name="productName" required />
          </div>
          <div>
            <Label htmlFor="services">Services Included</Label>
            <Input id="services" name="services" required />
          </div>
          <div>
            <Label htmlFor="validity">Validity</Label>
            <Input id="validity" name="validity" placeholder="1 Month / Lifetime" />
          </div>
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" step="0.01" required />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <select id="currency" name="currency" className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm">
              <option value="USD">USD ($)</option>
              <option value="INR">INR (Rs.)</option>
            </select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select id="status" name="status" className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm">
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="botFileId">Attach Bot File</Label>
            <select id="botFileId" name="botFileId" className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm">
              <option value="">No attachment</option>
              {files.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.fileName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="signatureName">Signature Name</Label>
            <Input
              id="signatureName"
              name="signatureName"
              defaultValue={defaultSignatureName || ""}
              placeholder="Authorized signatory"
            />
          </div>
          <div>
            <Label htmlFor="signature">Digital Signature</Label>
            <Input
              id="signature"
              name="signature"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setSignaturePreview(URL.createObjectURL(file));
                }
              }}
            />
            <input type="hidden" name="signaturePath" defaultValue={defaultSignaturePath || ""} />
            {signaturePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signaturePreview}
                alt="Signature preview"
                className="mt-4 h-20 w-40 rounded-xl border border-border object-contain p-2"
              />
            ) : null}
          </div>

          {message ? <p className="md:col-span-2 text-sm text-red-600">{message}</p> : null}

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const currentForm = formRef.current;
                if (!currentForm) return;
                const data = new FormData(currentForm);
                const params = new URLSearchParams();
                for (const [key, value] of data.entries()) {
                  if (typeof value === "string" && value) {
                    params.set(key, value);
                  }
                }
                const url = `/api/invoices/preview?${params.toString()}`;
                setPreviewUrl(url);
                window.open(url, "_blank");
              }}
            >
              Preview Invoice
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Generating..." : "Save & Generate Invoice"}
            </Button>
          </div>

          {previewUrl ? <p className="md:col-span-2 text-sm text-slate-500">Preview route: {previewUrl}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
