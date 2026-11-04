"use client";

import { useEffect, useMemo, useState } from "react";
import {
  initializeTrips,
  updateTrip,
  type TripRecord,
} from "../../lib/proofflow";
import {
  Download,
  FileSpreadsheet,
  CheckCircle,
  Loader2,
  Receipt,
} from "lucide-react";

export default function BillingQueue() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [selectedClient, setSelectedClient] = useState("All clients");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function loadTrips() {
    try {
      const records = await initializeTrips();
      setTrips(records);
    } catch {
      setMessage("Unable to load trip records.");
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
      .catch(() => {
        if (!cancelled) setMessage("Unable to load trip records.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const verifiedTrips = useMemo(
    () => trips.filter((trip) => trip.status === "verified"),
    [trips]
  );

  const billedTrips = useMemo(
    () => trips.filter((trip) => trip.status === "billed"),
    [trips]
  );

  const clients = [
    "All clients",
    ...Array.from(new Set(verifiedTrips.map((trip) => trip.client))),
  ];

  const filteredTrips = verifiedTrips.filter(
    (trip) =>
      selectedClient === "All clients" ||
      trip.client === selectedClient
  );

  const totalAmount = filteredTrips.reduce(
    (total, trip) => total + trip.amount,
    0
  );

  function exportCsv() {
    if (filteredTrips.length === 0) {
      setMessage("There are no verified trips to export.");
      return;
    }

    const headers = [
      "Trip ID",
      "Client",
      "Vehicle",
      "Destination",
      "LR Number",
      "E-way Bill",
      "Branch",
      "Freight Amount",
      "POD Status",
      "Verified At",
    ];

    const rows = filteredTrips.map((trip) => [
      trip.id,
      trip.client,
      trip.vehicle,
      trip.destination,
      trip.lrNumber,
      trip.ewayBill,
      trip.branch,
      trip.amount,
      "Verified",
      trip.verifiedAt ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `proofflow-billing-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setMessage("Billing CSV exported successfully.");
  }

  async function markAsBilled(trip: TripRecord) {
    setBusyId(trip.id);
    setMessage("");

    try {
      await updateTrip(trip.id, {
        status: "billed",
        billedAt: new Date().toISOString(),
      });
      await loadTrips();
      setMessage(`${trip.id} has been marked as billed.`);
    } catch {
      setMessage("Unable to update billing status.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Ready for billing"
          value={String(verifiedTrips.length)}
        />
        <SummaryCard
          label="Already billed"
          value={String(billedTrips.length)}
        />
        <SummaryCard
          label="Verified freight total"
          value={`₹${verifiedTrips
            .reduce((sum, trip) => sum + trip.amount, 0)
            .toLocaleString("en-IN")}`}
        />
      </div>

      {message && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-[var(--accent-tint)] bg-[var(--accent-tint)] p-3 text-sm text-[var(--accent)]"
        >
          {message}
        </p>
      )}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Verified trips
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Only verified PODs can enter the billing workflow.
            </p>
          </div>

          <button
            onClick={exportCsv}
            disabled={loading || filteredTrips.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={17} />
            Export billing CSV
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            Filter by client
            <select
              value={selectedClient}
              onChange={(event) => setSelectedClient(event.target.value)}
              className="ml-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              {clients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </label>

          <p className="text-sm text-[var(--text-secondary)]">
            Filtered freight:{" "}
            <strong className="text-[var(--text-primary)]">
              ₹{totalAmount.toLocaleString("en-IN")}
            </strong>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-[var(--text-secondary)]">
            <Loader2 className="animate-spin" size={18} />
            Loading billing records...
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt className="mx-auto text-[var(--text-secondary)]" size={34} />
            <p className="mt-3 font-semibold text-[var(--text-primary)]">
              No verified trips available
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Approve PODs in the review queue before billing.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs uppercase text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3">Trip / LR</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Freight</th>
                  <th className="px-4 py-3">POD</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[var(--text-primary)]">
                        {trip.id}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {trip.lrNumber}
                      </p>
                    </td>
                    <td className="px-4 py-4">{trip.client}</td>
                    <td className="px-4 py-4">{trip.destination}</td>
                    <td className="px-4 py-4 font-semibold">
                      ₹{trip.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Verified
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/client-pod?trip=${encodeURIComponent(trip.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-tint)]"
                        >
                          View client POD
                        </a>
                        <button
                          onClick={() => markAsBilled(trip)}
                        disabled={busyId !== null}
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
                      >
                        {busyId === trip.id ? (
                          <Loader2 className="animate-spin" size={15} />
                        ) : (
                          <CheckCircle size={15} />
                        )}
                          Mark billed
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--accent-tint)] bg-[var(--accent-tint)] p-4">
        <FileSpreadsheet className="mt-0.5 shrink-0 text-[var(--accent)]" size={20} />
        <p className="text-sm text-[var(--text-primary)]">
          The CSV is a billing-data export for the demonstration. It is not a
          certified Tally import file, and invoices are never sent
          automatically.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
