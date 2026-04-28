"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EmailModal({
  invoiceId,
  initialTo,
  initialSubject,
  botFileName
}: {
  invoiceId: string;
  initialTo: string;
  initialSubject: string;
  botFileName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function submitEmail(formData: FormData) {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: formData.get("to"),
          subject: formData.get("subject"),
          licenseKey: formData.get("licenseKey"),
          endpointUrl: formData.get("endpointUrl"),
          message: formData.get("message")
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || "Unable to send email.");
        return;
      }

      setMessage("Email sent.");
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Send Email</Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Send Invoice</h3>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <form action={submitEmail} className="space-y-4 p-6">
              <div>
                <Label htmlFor="to">To</Label>
                <Input id="to" name="to" defaultValue={initialTo} required />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" defaultValue={initialSubject} required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="licenseKey">License Key</Label>
                  <Input id="licenseKey" name="licenseKey" placeholder="XXXX-XXXX-XXXX-XXXX" />
                </div>
                <div>
                  <Label htmlFor="endpointUrl">Endpoint URL</Label>
                  <Input id="endpointUrl" name="endpointUrl" type="url" placeholder="https://..." />
                </div>
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  defaultValue="Please find your invoice attached. Let us know if you need anything else."
                />
              </div>
              <div className="rounded-xl bg-surface p-4 text-sm text-slate-600">
                Attachments: Invoice PDF{botFileName ? `, ${botFileName}` : ""}
              </div>
              {message ? <p className="text-sm text-slate-600">{message}</p> : null}
              <div className="flex gap-3">
                <Button type="submit" disabled={pending}>
                  {pending ? "Sending..." : "Send"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
