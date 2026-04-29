"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Customer = {
  id?: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
};

export function CustomerForm({
  customer,
  onSuccess,
  onCancel
}: {
  customer?: Customer;
  onSuccess: () => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: customer?.id,
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          address: formData.get("address"),
          city: formData.get("city"),
          state: formData.get("state"),
          country: formData.get("country"),
          pincode: formData.get("pincode")
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Unable to save customer.");
        return;
      }

      await onSuccess();
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={customer?.name || ""} required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={customer?.email || ""} required />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={customer?.phone || ""} />
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={customer?.address || ""} />
      </div>
      <div>
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" defaultValue={customer?.city || ""} />
      </div>
      <div>
        <Label htmlFor="state">State</Label>
        <Input id="state" name="state" defaultValue={customer?.state || ""} />
      </div>
      <div>
        <Label htmlFor="country">Country</Label>
        <Input id="country" name="country" defaultValue={customer?.country || ""} />
      </div>
      <div>
        <Label htmlFor="pincode">Pincode</Label>
        <Input id="pincode" name="pincode" defaultValue={customer?.pincode || ""} />
      </div>
      {error ? <p className="text-sm text-red-600 md:col-span-2 xl:col-span-1">{error}</p> : null}
      <div className="grid gap-3 md:col-span-2 sm:flex xl:col-span-1 xl:grid">
        <Button type="submit" className="w-full sm:w-auto xl:w-full" disabled={pending}>
          {pending ? "Saving..." : customer?.id ? "Update Customer" : "Add Customer"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" className="w-full sm:w-auto xl:w-full" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
