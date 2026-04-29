"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Files,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptIndianRupee,
  Users,
  Building2,
  X
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (pathname === "/login" || pathname === "/signup") {
    return <>{children}</>;
  }

  const renderNavigation = () => (
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
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface">
      <div className="h-2 w-full bg-navy" />
      <div className="flex min-h-[calc(100vh-8px)]">
        <aside className="hidden w-72 border-r border-border bg-white lg:block">
          <div className="border-b border-border px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-white">
                <ReceiptIndianRupee className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">Invoice Manager</p>
                <p className="truncate text-sm text-slate-500">{session?.user.email}</p>
              </div>
            </div>
          </div>

          {renderNavigation()}
        </aside>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="Close navigation menu"
              className="absolute inset-0 bg-slate-900/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative flex h-full w-[min(86vw,20rem)] flex-col bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
                    <ReceiptIndianRupee className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">Invoice Manager</p>
                    <p className="truncate text-sm text-slate-500">{session?.user.email}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-10 shrink-0 p-0"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {renderNavigation()}
              <div className="mt-auto border-t border-border p-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </aside>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-3 sm:px-6 lg:static lg:px-8 lg:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-10 shrink-0 p-0 lg:hidden"
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">Invoice Management</h1>
                <p className="hidden text-sm text-slate-500 sm:block">Professional invoicing for your business</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="hidden shrink-0 sm:inline-flex"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </header>
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
