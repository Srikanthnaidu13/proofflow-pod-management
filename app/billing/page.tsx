import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";
import BillingQueue from "../../src/components/billing/BillingQueue";

export default function BillingPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--accent)]"
        >
          <ArrowLeft size={18} />
          Back to dashboard
        </Link>

        <header className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-[var(--accent-tint)] p-3 text-[var(--accent)]">
            <Receipt size={25} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              Billing Queue
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Manage verified PODs and prepare billing exports.
            </p>
          </div>
        </header>

        <BillingQueue />

        <p className="mt-6 text-xs text-[var(--text-secondary)]">
          Demonstration billing workflow using local trip records.
        </p>
      </div>
    </main>
  );
}