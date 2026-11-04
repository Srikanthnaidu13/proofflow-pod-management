"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SmsUploadGenerator from "@/src/components/sms/SmsUploadGenerator";
import TripImport from "@/src/components/trips/TripImport";
import AppShell from "@/src/components/layout/AppShell";
import {
  Truck,
  FileCheck,
  Clock,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Upload,
  CircleAlert,
} from "lucide-react";
import {
  initializeTrips,
  type TripRecord,
} from "../../src/lib/proofflow";

export default function DashboardPage() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTrips() {
    try {
      const records = await initializeTrips();
      setTrips(records);
    } catch (error) {
      console.error("Dashboard loading failed:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    initializeTrips()
      .then((records) => {
        if (!cancelled) setTrips(records);
      })
      .catch((error) => {
        console.error("Dashboard loading failed:", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const totalTrips = trips.length;

  const verifiedTrips = trips.filter(
    (trip) => trip.status === "verified" || trip.status === "billed"
  ).length;

  const awaitingReview = trips.filter(
    (trip) =>
      trip.status === "needs_review" ||
      trip.status === "retake_requested" ||
      trip.status === "submitted"
  ).length;

  const missingPods = trips.filter(
    (trip) => trip.status === "missing"
  ).length;

  const completedInvoiceCycles = trips.filter((trip) => {
    if (!trip.submittedAt || !trip.billedAt) return false;

    const submitted = Date.parse(trip.submittedAt);
    const billed = Date.parse(trip.billedAt);

    return Number.isFinite(submitted) &&
      Number.isFinite(billed) &&
      billed >= submitted;
  });

  const averagePodToInvoiceDays =
    completedInvoiceCycles.length > 0
      ? completedInvoiceCycles.reduce((total, trip) => {
          return total +
            (Date.parse(trip.billedAt!) - Date.parse(trip.submittedAt!)) /
              86400000;
        }, 0) / completedInvoiceCycles.length
      : null;

  const comparablePodSubmissions = trips.filter((trip) => {
    if (!trip.tripCreatedAt || !trip.submittedAt) return false;

    const created = Date.parse(trip.tripCreatedAt);
    const submitted = Date.parse(trip.submittedAt);

    return Number.isFinite(created) &&
      Number.isFinite(submitted) &&
      submitted >= created;
  });

  const podsWithin24Hours =
    comparablePodSubmissions.length > 0
      ? (comparablePodSubmissions.filter((trip) => {
          return (
            Date.parse(trip.submittedAt!) -
              Date.parse(trip.tripCreatedAt!) <=
            86400000
          );
        }).length /
          comparablePodSubmissions.length) *
        100
      : null;

  const branchStats = Array.from(
    trips.reduce((branches, trip) => {
      const branch = trip.branch?.trim() || "Unassigned";

      const current = branches.get(branch) || {
        branch,
        totalTrips: 0,
        missingPods: 0,
        freightAtRisk: 0,
      };

      current.totalTrips += 1;

      if (trip.status === "missing") {
        current.missingPods += 1;
        current.freightAtRisk += trip.amount;
      }

      branches.set(branch, current);
      return branches;
    }, new Map<string, {
      branch: string;
      totalTrips: number;
      missingPods: number;
      freightAtRisk: number;
    }>()).values()
  ).sort((a, b) => b.missingPods - a.missingPods);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const statusConfig: Record<
    string,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    missing: {
      label: "Missing POD",
      className: "bg-[var(--review-tint)] text-[var(--review)]",
      icon: <CircleAlert size={14} />,
    },
    submitted: {
      label: "Submitted",
      className: "bg-[var(--offline-tint)] text-[var(--offline)]",
      icon: <Upload size={14} />,
    },
    verified: {
      label: "Verified",
      className: "bg-[var(--success-tint)] text-[var(--success)]",
      icon: <CheckCircle2 size={14} />,
    },
    needs_review: {
      label: "Needs review",
      className: "bg-[var(--review-tint)] text-[var(--review)]",
      icon: <AlertTriangle size={14} />,
    },
    retake_requested: {
      label: "Retake requested",
      className: "bg-[var(--retake-tint)] text-[var(--retake)]",
      icon: <AlertTriangle size={14} />,
    },
    billed: {
      label: "Billed",
      className: "bg-[var(--success-tint)] text-[var(--success)]",
      icon: <CheckCircle2 size={14} />,
    },
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Fleet operations
            </p>
            <h1 className="text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">
              Billing dashboard
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Monitor trip documentation and billing readiness.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
            Billing executive
          </div>
        </header>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Fleet overview
            </h2>
            <span className="text-xs text-[var(--text-secondary)]">
              {loading ? "Updating..." : "Current trip records"}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total trips"
              value={loading ? "..." : String(totalTrips)}
              icon={<Truck size={19} />}
              tone="neutral"
            />
            <StatCard
              title="Verified PODs"
              value={loading ? "..." : String(verifiedTrips)}
              icon={<FileCheck size={19} />}
              tone="success"
            />
            <StatCard
              title="Awaiting review"
              value={loading ? "..." : String(awaitingReview)}
              icon={<Clock size={19} />}
              tone="warning"
            />
            <StatCard
              title="Missing PODs"
              value={loading ? "..." : String(missingPods)}
              icon={<AlertTriangle size={19} />}
              tone="danger"
            />
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              POD performance
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Calculated from trips with complete recorded timestamps.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              title="Avg. POD-to-invoice time"
              value={
                loading
                  ? "..."
                  : averagePodToInvoiceDays === null
                    ? "—"
                    : `${averagePodToInvoiceDays.toFixed(1)} days`
              }
              icon={<Clock size={19} />}
              tone="neutral"
            />
            <StatCard
              title="PODs submitted within 24h"
              value={
                loading
                  ? "..."
                  : podsWithin24Hours === null
                    ? "—"
                    : `${podsWithin24Hours.toFixed(0)}%`
              }
              icon={<CheckCircle2 size={19} />}
              tone="success"
            />
          </div>

          {!loading && (
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              Based on {completedInvoiceCycles.length} completed invoice
              {completedInvoiceCycles.length === 1 ? " cycle" : " cycles"} and{" "}
              {comparablePodSubmissions.length} trips with comparable POD
              submission timestamps.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Branch-wise POD report
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Missing delivery documents and freight exposure by branch.
            </p>
          </div>

          {loading ? (
            <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
              Loading branch report...
            </p>
          ) : branchStats.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
              No branch records available.
            </p>
          ) : (
            <div className="space-y-5">
              {branchStats.map((branch) => {
                const barWidth =
                  missingPods > 0
                    ? (branch.missingPods / missingPods) * 100
                    : 0;

                return (
                  <div key={branch.branch} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {branch.branch}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {branch.missingPods} missing of {branch.totalTrips} trips
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--review)] transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="overflow-x-auto border-t border-[var(--border)] pt-4">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs text-[var(--text-secondary)]">
                    <tr>
                      <th className="py-3 pr-4 font-medium">Branch</th>
                      <th className="px-4 py-3 text-right font-medium">Total trips</th>
                      <th className="px-4 py-3 text-right font-medium">Missing PODs</th>
                      <th className="py-3 pl-4 text-right font-medium">Freight at risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {branchStats.map((branch) => (
                      <tr key={branch.branch}>
                        <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">
                          {branch.branch}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                          {branch.totalTrips}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--review)]">
                          {branch.missingPods}
                        </td>
                        <td className="py-3 pl-4 text-right font-medium tabular-nums text-[var(--text-primary)]">
                          {formatAmount(branch.freightAtRisk)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-5">
          <TripImport onImported={loadTrips} />
          <SmsUploadGenerator />
        </section>

        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Recent trips
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Trip records and proof-of-delivery status
              </p>
            </div>

            <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
              {loading ? "Loading..." : `${trips.length} trips`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[var(--surface)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-4">Trip ID</th>
                  <th className="px-5 py-4">Client</th>
                  <th className="px-5 py-4">Vehicle</th>
                  <th className="px-5 py-4">Destination</th>
                  <th className="px-5 py-4 text-right">Freight</th>
                  <th className="px-5 py-4">POD status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]">
                      Loading trip records...
                    </td>
                  </tr>
                ) : trips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]">
                      No trip records found.
                    </td>
                  </tr>
                ) : (
                  trips.map((trip) => {
                    const status = statusConfig[trip.status];

                    return (
                      <tr
                        key={trip.id}
                        className="transition-colors hover:bg-[var(--surface)]"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-[var(--text-primary)]">
                          {trip.id}
                        </td>
                        <td className="px-5 py-4 text-[var(--text-secondary)]">
                          {trip.client}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-[var(--text-secondary)]">
                          {trip.vehicle}
                        </td>
                        <td className="px-5 py-4 text-[var(--text-secondary)]">
                          {trip.destination}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums text-[var(--text-primary)]">
                          {formatAmount(trip.amount)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                              status?.className ||
                              "bg-[var(--offline-tint)] text-[var(--offline)]"
                            }`}
                          >
                            {status?.icon || <CircleAlert size={14} />}
                            {status?.label || trip.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--border)] px-5 py-4 sm:px-6">
            <QuickLink href="/review" label="Open review queue" />
            <QuickLink href="/missing-pods" label="View missing PODs" />
            <QuickLink href="/billing" label="Open billing queue" />
          </div>
        </section>

        <p className="text-xs text-[var(--text-secondary)]">
          Demonstration data is stored locally in this browser. External integrations are simulated.
        </p>
      </div>
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "bg-[var(--surface)] text-[var(--text-secondary)]",
    success: "bg-[var(--success-tint)] text-[var(--success)]",
    warning: "bg-[var(--retake-tint)] text-[var(--retake)]",
    danger: "bg-[var(--review-tint)] text-[var(--review)]",
  };

  return (
    <article className="rounded-xl border border-[var(--border)] bg-white p-5 transition-colors hover:bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {title}
        </p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon}
        </div>
      </div>
      <p className="mt-5 text-[28px] font-semibold leading-none tabular-nums tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
    </article>
  );
}

function QuickLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition hover:text-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
    >
      {label}
      <ArrowRight size={15} />
    </Link>
  );
}