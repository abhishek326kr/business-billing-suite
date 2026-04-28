"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FileUpload({ onUploaded }: { onUploaded: () => Promise<void> | void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function uploadFile(formData: FormData) {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error || "Upload failed.");
        return;
      }

      setMessage("File uploaded.");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      await onUploaded();
    });
  }

  return (
    <form action={uploadFile} className="flex flex-col gap-3 md:flex-row md:items-center">
      <Input ref={inputRef} name="file" type="file" required />
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading..." : "Upload File"}
      </Button>
      {message ? <p className="text-sm text-slate-500">{message}</p> : null}
    </form>
  );
}
