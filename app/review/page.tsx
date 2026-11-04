import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";
import ReviewQueue from "../../src/components/review/ReviewQueue";

export default function ReviewPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--accent)]"
        >
          <ArrowLeft size={18} />
          Back to dashboard
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--accent-tint)] p-3 text-[var(--accent)]">
              <FileSearch size={25} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                POD Review Queue
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Review delivery documents that need attention.
              </p>
            </div>
          </div>
        </header>

        <ReviewQueue />

        <p className="mt-6 text-xs text-[var(--text-secondary)]">
          Demo environment using locally stored sample trip records.
        </p>
      </div>
    </main>
  );
}