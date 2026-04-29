"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Mail, Paperclip, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

type Customer = {
  id: string;
  name: string;
  email: string;
};

type BotFile = {
  id: string;
  fileName: string;
  fileSize?: number | null;
  uploadedAt: string;
};

type BusinessProfile = {
  businessName: string;
  logoPath?: string | null;
  website?: string | null;
  email?: string | null;
};

function formatFileSize(bytes?: number | null) {
  if (!bytes) {
    return "Unknown size";
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getInitialMessage(businessName?: string) {
  return `I hope you are doing well.

We wanted to share an update with you. Please review the details below and reply if you need anything else.

Regards,
${businessName || "Your team"}`;
}

export function CustomerEmailClient({
  customers,
  files,
  profile
}: {
  customers: Customer[];
  files: BotFile[];
  profile: BusinessProfile | null;
}) {
  const [pending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState(getInitialMessage(profile?.businessName));
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId),
    [customerId, customers]
  );

  const selectedFiles = useMemo(
    () => files.filter((file) => attachmentIds.includes(file.id)),
    [attachmentIds, files]
  );

  function toggleAttachment(id: string) {
    setAttachmentIds((current) =>
      current.includes(id) ? current.filter((attachmentId) => attachmentId !== id) : [...current, id]
    );
  }

  function sendEmail() {
    setStatus(null);

    startTransition(async () => {
      const response = await fetch("/api/emails/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerId,
          subject,
          message,
          attachmentIds
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatus({ type: "error", text: payload.error || "Unable to send email." });
        return;
      }

      setStatus({ type: "success", text: "Email sent successfully." });
    });
  }

  if (customers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">Add a customer before sending a custom email.</p>
          <Link href="/customers" className="block sm:inline-flex">
            <Button className="w-full sm:w-auto">Add Customer</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(320px,420px)]">
      <Card className="min-w-0">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Send Customer Email</CardTitle>
            <Badge>{selectedFiles.length} attachments</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form action={sendEmail} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="customerId">Customer</Label>
                <select
                  id="customerId"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"
                  required
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="to">To</Label>
                <Input id="to" value={selectedCustomer?.email || ""} readOnly />
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Account update"
                required
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-[220px]"
                required
              />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <Label>Attach Files</Label>
                {files.length ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-navy"
                    onClick={() => setAttachmentIds(attachmentIds.length === files.length ? [] : files.map((file) => file.id))}
                  >
                    {attachmentIds.length === files.length ? "Clear all" : "Select all"}
                  </button>
                ) : null}
              </div>
              {files.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {files.map((file) => (
                    <label
                      key={file.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={attachmentIds.includes(file.id)}
                        onChange={() => toggleAttachment(file.id)}
                        className="mt-1 h-4 w-4 rounded border-border text-navy"
                      />
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-medium text-slate-900">{file.fileName}</span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {formatFileSize(file.fileSize)} - {formatDate(file.uploadedAt)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-slate-500">
                  No uploaded files yet. Upload files from the Files page to attach them here.
                </p>
              )}
            </div>

            {status ? (
              <p className={status.type === "success" ? "text-sm text-emerald-700" : "text-sm text-red-600"}>
                {status.text}
              </p>
            ) : null}

            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={pending || !customerId || !subject.trim() || !message.trim()}
              >
                <Send className="mr-2 h-4 w-4" />
                {pending ? "Sending..." : "Send Email"}
              </Button>
              <Link href="/files" className="block sm:inline-flex">
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  <Paperclip className="mr-2 h-4 w-4" />
                  Manage Files
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Email Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border bg-white">
            <div className="bg-navy p-5 text-white">
              <div className="flex min-w-0 items-center gap-3">
                {profile?.logoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.logoPath}
                    alt={profile.businessName}
                    className="h-12 w-12 shrink-0 rounded-xl border border-white/30 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-lg font-semibold text-navy">
                    {(profile?.businessName || "B").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">Customer message</p>
                  <p className="truncate text-lg font-semibold">{profile?.businessName || "Business"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-navy">
                  {subject || "Subject preview"}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Hi {selectedCustomer?.name || "there"},</p>
              </div>

              <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                {message || "Your message will appear here."}
              </p>

              {selectedFiles.length ? (
                <div className="rounded-xl bg-surface p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Paperclip className="h-4 w-4" />
                    Attached files
                  </div>
                  <div className="space-y-2">
                    {selectedFiles.map((file) => (
                      <p key={file.id} className="break-words text-sm text-slate-600">
                        {file.fileName}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="border-t border-border pt-4 text-xs leading-5 text-slate-500">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4" />
                  Sent by {profile?.businessName || "your business"}
                </div>
                {[profile?.website, profile?.email].filter(Boolean).join(" | ")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
