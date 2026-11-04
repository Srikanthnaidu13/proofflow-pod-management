import Link from "next/link";
import {
  Truck,
  ShieldCheck,
  ArrowUpRight,
  LayoutDashboard,
  FileSearch,
  Receipt,
  AlertTriangle,
  Camera,
} from "lucide-react";

const workspaces = [
  {
    title: "Billing Dashboard",
    description: "View fleet trips and POD statistics",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "POD Review Queue",
    description: "Review, verify and request retakes",
    href: "/review",
    icon: FileSearch,
  },
  {
    title: "Billing Queue",
    description: "Prepare billing exports and mark trips billed",
    href: "/billing",
    icon: Receipt,
  },
  {
    title: "Missing POD Dashboard",
    description: "Track missing documents by branch",
    href: "/missing-pods",
    icon: AlertTriangle,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--surface)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex h-[76px] max-w-[1120px] items-center gap-3 px-5 sm:px-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
            <Truck size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              ProofFlow
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Fleet POD & Billing Management
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[960px] px-5 py-12 sm:px-8 sm:py-16">
        <section className="mb-9">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
            Company A · Fleet operations
          </p>
          <h2 className="text-[32px] font-semibold tracking-tight text-[var(--text-primary)] sm:text-[40px]">
            Welcome back
          </h2>
          <p className="mt-2 text-base text-[var(--text-secondary)]">
            Select your workspace to continue.
          </p>
        </section>

        <section className="mb-10">
          <Link
            href="/driver"
            className="group flex flex-col gap-6 overflow-hidden rounded-xl border border-[var(--border)] bg-white p-6 transition hover:border-[var(--accent)] sm:flex-row sm:items-center sm:justify-between sm:p-8"
          >
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-tint)] text-[var(--accent)]">
                <Camera size={30} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Driver workspace
                </p>
                <h3 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                  Capture proof of delivery
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Open your trip and submit a POD photograph.
                </p>
              </div>
            </div>

            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-full border border-[var(--border)] text-[var(--accent)] transition group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white sm:self-center">
              <ArrowUpRight size={20} />
            </span>
          </Link>
        </section>

        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[var(--accent)]">
              <ShieldCheck size={19} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Operations workspace
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Manage delivery documents and billing
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {workspaces.map((workspace) => {
              const Icon = workspace.icon;

              return (
                <Link
                  key={workspace.href}
                  href={workspace.href}
                  className="group flex min-h-[112px] items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-white p-5 transition hover:border-[var(--accent)]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--text-secondary)] transition group-hover:bg-[var(--accent-tint)] group-hover:text-[var(--accent)]">
                      <Icon size={21} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                        {workspace.title}
                      </h4>
                      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                        {workspace.description}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight
                    size={17}
                    className="shrink-0 text-[var(--text-secondary)] transition group-hover:text-[var(--accent)]"
                  />
                </Link>
              );
            })}
          </div>
        </section>

        <footer className="mt-12 border-t border-[var(--border)] pt-5">
          <p className="text-xs text-[var(--text-secondary)]">
            Secure delivery documentation and billing workflow
          </p>
        </footer>
      </div>
    </main>
  );
}