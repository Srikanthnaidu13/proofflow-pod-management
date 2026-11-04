"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Truck,
  LayoutDashboard,
  FileSearch,
  Receipt,
  AlertTriangle,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "POD Review", href: "/review", icon: FileSearch },
  { label: "Billing Queue", href: "/billing", icon: Receipt },
  { label: "Missing PODs", href: "/missing-pods", icon: AlertTriangle },
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-[76px] items-center gap-3 border-b border-[var(--border)] px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
          <Truck size={22} />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            ProofFlow
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Fleet operations
          </p>
        </div>
      </div>

      <div className="px-4 pt-8">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
          Workspace
        </p>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[var(--accent-tint)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon size={19} strokeWidth={1.9} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-[var(--border)] p-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Company A
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Chhatrapati Sambhajinagar
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--accent)]">
            <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
            Fleet operations
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-[var(--border)] lg:block">
        {sidebar}
      </aside>

      <div className="lg:pl-[240px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[var(--border)] bg-white px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] lg:hidden"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            >
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Company A
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                POD and billing management
              </p>
            </div>
          </div>

          <Link
            href="/driver"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Driver workspace
            <ArrowUpRight size={14} />
          </Link>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/30"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation overlay"
            />
            <div className="relative h-full w-[280px] border-r border-[var(--border)]">
              {sidebar}
            </div>
          </div>
        )}

        <main className="mx-auto min-h-[calc(100vh-76px)] w-full max-w-[1280px] px-5 py-8 sm:px-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}