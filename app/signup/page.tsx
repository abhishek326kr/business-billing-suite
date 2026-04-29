import { redirect } from "next/navigation";

import { SignupForm } from "@/components/SignupForm";
import { getAuthSession } from "@/lib/auth";

export default async function SignupPage() {
  const session = await getAuthSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="absolute inset-x-0 top-0 h-2 bg-navy" />
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-navy sm:text-sm sm:tracking-[0.24em]">
            New Business
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Create Your Workspace</h1>
          <p className="mt-3 text-slate-500">Sign up to manage your own customers, files, invoices, and profile.</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
