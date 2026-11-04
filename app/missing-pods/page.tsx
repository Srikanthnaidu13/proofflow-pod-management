"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  MapPin,
  AlertTriangle,
  IndianRupee,
  RefreshCw,
} from "lucide-react";
import {
  initializeTrips,
  type TripRecord,
} from "../../src/lib/proofflow";

export default function MissingPodsPage() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number | null>(null);

  async function loadTrips() {
    try {
      const records = await initializeTrips();
      setTrips(records.filter((trip) => trip.status === "missing"));
    } catch (error) {
      console.error("Could not load missing POD records:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    let cancelled = false;

    initializeTrips()
      .then((records) => {
        if (!cancelled) {
          setTrips(records.filter((trip) => trip.status === "missing"));
        }
      })
      .catch((error) => {
        console.error("Could not load missing POD records:", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const totalFreight = trips.reduce((sum, trip) => sum + trip.amount, 0);

  const ageingBuckets = [
    { label: "0–3 days", min: 0, max: 3, count: 0 },
    { label: "4–10 days", min: 4, max: 10, count: 0 },
    { label: "11–20 days", min: 11, max: 20, count: 0 },
    { label: "20+ days", min: 21, max: Infinity, count: 0 },
  ];

  let unavailableDateCount = 0;

  const currentTime = now;
  if (currentTime !== null) {
    trips.forEach((trip) => {
      if (!trip.tripCreatedAt || Number.isNaN(Date.parse(trip.tripCreatedAt))) {
        unavailableDateCount++;
        return;
      }

      const ageInDays = Math.max(
        0,
        Math.floor((currentTime - new Date(trip.tripCreatedAt).getTime()) / 86400000)
      );

      const bucket = ageingBuckets.find(
        (item) => ageInDays >= item.min && ageInDays <= item.max
      );

      if (bucket) bucket.count++;
    });
  }

  const branchCounts = trips.reduce<Record<string, number>>((counts, trip) => {
    counts[trip.branch] = (counts[trip.branch] || 0) + 1;
    return counts;
  }, {});

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)]"
        >
          <ArrowLeft size={18} />
          Back to dashboard
        </Link>

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              Missing POD Dashboard
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Track outstanding delivery documents across branches.
            </p>
          </div>

          <button
            onClick={() => {
              setLoading(true);
              loadTrips();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--review-tint)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text-secondary)]">Missing PODs</p>
              <div className="rounded-lg bg-[var(--review-tint)] p-2 text-[var(--review)]">
                <AlertTriangle size={22} />
              </div>
            </div>
            <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
              {loading ? "..." : trips.length}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Trips awaiting POD submission
            </p>
          </div>

          <div className="rounded-xl border border-[var(--retake-tint)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text-secondary)]">Freight at risk</p>
              <div className="rounded-lg bg-[var(--retake-tint)] p-2 text-[var(--retake)]">
                <IndianRupee size={22} />
              </div>
            </div>
            <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
              {loading ? "..." : formatAmount(totalFreight)}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Freight linked to missing PODs
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Branch-wise overview
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Number of trips with missing PODs at each branch.
          </p>

          {loading ? (
            <p className="mt-5 text-sm text-[var(--text-secondary)]">Loading branches...</p>
          ) : Object.keys(branchCounts).length === 0 ? (
            <p className="mt-5 text-sm text-[var(--text-secondary)]">
              No branches currently have missing PODs.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {Object.entries(branchCounts).map(([branch, count]) => (
                <div key={branch}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-[var(--text-primary)]">{branch}</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {count} {count === 1 ? "trip" : "trips"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--review)]"
                      style={{
                        width: `${(count / trips.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Missing POD ageing
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Time elapsed since each trip was imported into ProofFlow.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ageingBuckets.map((bucket) => (
              <div
                key={bucket.label}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4"
              >
                <p className="text-sm text-[var(--text-secondary)]">{bucket.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  {loading ? "..." : bucket.count}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">trips</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-[var(--text-secondary)]">
            {loading ? "Loading date information..." : `${unavailableDateCount} trips have no recorded creation date and are excluded from ageing buckets.`}
          </p>
        </section>

        <section className="mt-8 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Trips awaiting POD
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Follow up with drivers to collect delivery documents.
            </p>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-[var(--text-secondary)]">Loading trips...</p>
          ) : trips.length === 0 ? (
            <div className="p-8 text-center">
              <Camera className="mx-auto text-[var(--success)]" size={32} />
              <p className="mt-3 font-semibold text-[var(--text-primary)]">
                All caught up!
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                There are no trips with missing PODs.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-5"
                >
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{trip.id}</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {trip.client} · {trip.vehicle}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} />
                        {trip.destination}
                      </span>
                      <span>LR: {trip.lrNumber}</span>
                      <span>E-way bill: {trip.ewayBill}</span>
                      <span>Branch: {trip.branch}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-[var(--text-primary)]">
                        {formatAmount(trip.amount)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-[var(--review)]">
                        POD missing
                      </p>
                    </div>
                    <Link
                      href="/driver"
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                    >
                      <Camera size={16} />
                      Capture
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-5 text-xs text-[var(--text-secondary)]">
          Demonstration data from the shared local trip database. Ageing is calculated from ProofFlow import time. Older trips without a recorded creation date are excluded from the ageing buckets.
        </p>
      </div>
    </main>
  );
}
