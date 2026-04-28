"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Files,
  FileText,
  LayoutDashboard,
  LogOut,
  ReceiptIndianRupee,
  Users,
  Building2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: Building2 },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/files", label: "Files", icon: Files },
  { href: "/invoices", label: "Invoices", icon: FileText }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname === "/login" || pathname === "/signup") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="h-2 w-full bg-navy" />
      <div className="flex min-h-[calc(100vh-8px)]">
        <aside className="hidden w-72 border-r border-border bg-white lg:block">
          <div className="border-b border-border px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-white">
                <ReceiptIndianRupee className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Invoice Manager</p>
                <p className="text-sm text-slate-500">{session?.user.email}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                    active ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="flex items-center justify-between border-b border-border bg-white px-4 py-4 sm:px-8">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Invoice Management</h1>
              <p className="text-sm text-slate-500">Professional invoicing for your business</p>
            </div>
            <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </header>
          <main className="p-4 sm:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
