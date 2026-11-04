import Link from "next/link";
import { Truck, MapPin, Clock, ArrowLeft } from "lucide-react";
import PodCapture from "@/src/components/driver/PodCapture";

export default function DriverPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8">
      <div className="mx-auto max-w-lg">

        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--accent)]"
        >
          <ArrowLeft size={18} />
          Back to home
        </Link>

        <header className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-[var(--accent)] p-3 text-white">
            <Truck size={26} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              ProofFlow
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Driver workspace
            </p>
          </div>
        </header>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
            Hello, Driver!
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Your assigned delivery details
          </p>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Active trip
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-tint)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              In progress
            </span>
          </div>

          <h3 className="text-xl font-semibold text-[var(--text-primary)]">
            TRP-66120
          </h3>

          <div className="mt-5 space-y-5">
            <div className="flex items-center gap-3">
              <Truck size={20} className="text-[var(--accent)]" />
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Vehicle number</p>
                <p className="font-semibold text-[var(--text-primary)]">MH20 EL 4521</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-[var(--accent)]" />
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Delivery destination</p>
                <p className="font-semibold text-[var(--text-primary)]">Nagpur</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock size={20} className="text-[var(--accent)]" />
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Delivery reference</p>
                <p className="font-semibold text-[var(--text-primary)]">LR-66120</p>
              </div>
            </div>
          </div>
        </section>

        <PodCapture />

        <p className="mt-6 text-center text-xs text-[var(--text-secondary)]">
          Your delivery information will be handled securely.
        </p>
      </div>
    </main>
  );
}