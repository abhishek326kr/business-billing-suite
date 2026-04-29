"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { deleteFileAction } from "@/app/actions";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type BotFile = {
  id: string;
  fileName: string;
  filePath: string;
  fileSize?: number | null;
  uploadedAt: string;
};

export function FilesClient({ initialFiles }: { initialFiles: BotFile[] }) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);

  async function refreshFiles() {
    const response = await fetch("/api/files");
    const payload = await response.json();
    setFiles(payload.files || []);
  }

  async function deleteFile(id: string) {
    await deleteFileAction(id);
    await refreshFiles();
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <CardTitle>Bot / EA Files</CardTitle>
        <FileUpload onUploaded={refreshFiles} />
      </CardHeader>
      <CardContent>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-slate-500">
                <th className="pb-3">Filename</th>
                <th className="pb-3">Size</th>
                <th className="pb-3">Uploaded</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-b border-border/70">
                  <td className="py-4 font-medium text-slate-900">{file.fileName}</td>
                  <td className="py-4 text-slate-600">
                    {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : "Unknown"}
                  </td>
                  <td className="py-4 text-slate-600">{formatDate(file.uploadedAt)}</td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <a href={file.filePath} target="_blank" className="inline-flex">
                        <Button variant="outline" type="button">
                          View
                        </Button>
                      </a>
                      <Button variant="destructive" type="button" onClick={() => deleteFile(file.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {files.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No files uploaded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 md:hidden">
          {files.map((file) => (
            <div key={file.id} className="rounded-xl border border-border p-4">
              <p className="break-words font-medium text-slate-900">{file.fileName}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Size</p>
                  <p className="font-medium text-slate-700">
                    {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Uploaded</p>
                  <p className="font-medium text-slate-700">{formatDate(file.uploadedAt)}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a href={file.filePath} target="_blank" className="block">
                  <Button variant="outline" type="button" className="w-full">
                    View
                  </Button>
                </a>
                <Button variant="destructive" type="button" onClick={() => deleteFile(file.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {files.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No files uploaded yet.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
