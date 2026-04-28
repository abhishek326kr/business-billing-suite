"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProfileFormProps = {
  profile: {
    businessName: string;
    logoPath?: string | null;
    signaturePath?: string | null;
    signatureName?: string | null;
    website?: string | null;
    email?: string | null;
    address?: string | null;
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpUser?: string | null;
    smtpFromName?: string | null;
  } | null;
};

export function ProfileForm({ profile }: ProfileFormProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(profile?.logoPath || null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(profile?.signaturePath || null);

  function submitProfile(formData: FormData) {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error || "Unable to save profile.");
        return;
      }

      setMessage("Profile saved.");
      if (payload.profile?.logoPath) {
        setLogoPreview(payload.profile.logoPath);
      }
      if (payload.profile?.signaturePath) {
        setSignaturePreview(payload.profile.signaturePath);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submitProfile} className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                name="businessName"
                defaultValue={profile?.businessName || ""}
                required
              />
            </div>

            <div>
              <Label htmlFor="website">Website URL</Label>
              <Input id="website" name="website" defaultValue={profile?.website || ""} />
            </div>
            <div>
              <Label htmlFor="email">Business Email</Label>
              <Input id="email" name="email" defaultValue={profile?.email || ""} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" defaultValue={profile?.address || ""} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="logo">Logo</Label>
              <Input
                id="logo"
                name="logo"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setLogoPreview(URL.createObjectURL(file));
                  }
                }}
              />
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo preview" className="mt-4 h-20 w-20 rounded-xl border border-border object-cover" />
              ) : null}
            </div>

            <div>
              <Label htmlFor="signatureName">Signature Name</Label>
              <Input
                id="signatureName"
                name="signatureName"
                defaultValue={profile?.signatureName || profile?.businessName || ""}
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
              {signaturePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signaturePreview}
                  alt="Signature preview"
                  className="mt-4 h-20 w-40 rounded-xl border border-border object-contain p-2"
                />
              ) : null}
            </div>

            <div className="md:col-span-2 border-t border-border pt-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">SMTP Settings</h3>
            </div>

            <div>
              <Label htmlFor="smtpHost">Host</Label>
              <Input id="smtpHost" name="smtpHost" defaultValue={profile?.smtpHost || ""} />
            </div>
            <div>
              <Label htmlFor="smtpPort">Port</Label>
              <Input id="smtpPort" name="smtpPort" type="number" defaultValue={profile?.smtpPort || ""} />
            </div>
            <div>
              <Label htmlFor="smtpUser">Username</Label>
              <Input id="smtpUser" name="smtpUser" defaultValue={profile?.smtpUser || ""} />
            </div>
            <div>
              <Label htmlFor="smtpPass">Password</Label>
              <Input id="smtpPass" name="smtpPass" type="password" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="smtpFromName">From Name</Label>
              <Input
                id="smtpFromName"
                name="smtpFromName"
                defaultValue={profile?.smtpFromName || ""}
              />
            </div>

            {message ? <p className="md:col-span-2 text-sm text-slate-600">{message}</p> : null}

            <div className="md:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
