"use client";

import { useEffect, useState } from "react";
import {
  getTrips,
  type TripRecord,
} from "@/src/lib/proofflow";
import {
  FileCheck,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function ClientPodPage() {
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [podUrl, setPodUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let objectUrl = "";

    async function loadTrip() {
      try {
        const params = new URLSearchParams(window.location.search);
        const tripId = params.get("trip");

        if (!tripId) {
          setMessage("No trip ID was provided in this link.");
          return;
        }

        const records = await getTrips();
        const record = records.find((item) => item.id === tripId);

        if (!record) {
          setMessage("Trip record not found in this demonstration workspace.");
          return;
        }

        setTrip(record);

        if (record.status !== "verified" && record.status !== "billed") {
          setMessage("This POD is not yet approved for client viewing.");
          return;
        }

        if (!record.podBlob) {
          setMessage("No POD photograph is available for this trip yet.");
          return;
        }

        objectUrl = URL.createObjectURL(record.podBlob);
        setPodUrl(objectUrl);
      } catch {
        setMessage("Unable to load the POD record.");
      } finally {
        setLoading(false);
      }
    }

    loadTrip();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  const formatDate = (value?: string) => {
    if (!value) return "Not recorded";

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Not recorded"
      : date.toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        });
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xl font-bold tracking-tight text-[var(--accent)]">
              ProofFlow
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Client document portal
            </p>
          </div>
          <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
            Read only
          </span>
        </header>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent)]">
              <FileCheck size={22} />
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
              Proof of delivery
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              View the delivery document and trip information shared by Company A.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 py-12 text-sm text-[var(--text-secondary)]">
              <Loader2 size={19} className="animate-spin" />
              Loading delivery record...
            </div>
          ) : !trip ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
              <AlertCircle className="mb-2 text-[var(--review)]" size={22} />
              <p className="text-sm text-[var(--text-primary)]">{message}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 rounded-xl bg-[var(--surface-muted)] p-4 sm:grid-cols-2">
                <Detail label="Trip ID" value={trip.id} />
                <Detail label="Client" value={trip.client} />
                <Detail label="LR number" value={trip.lrNumber} />
                <Detail label="E-way bill" value={trip.ewayBill} />
                <Detail label="Destination" value={trip.destination} />
                <Detail label="Vehicle" value={trip.vehicle} />
                <Detail
                  label="POD submitted"
                  value={formatDate(trip.submittedAt)}
                />
                <Detail
                  label="Delivery status"
                  value={trip.status === "billed" ? "Billed" : trip.status === "verified" ? "Verified" : trip.status === "missing" ? "Missing POD" : trip.status === "submitted" ? "Submitted" : trip.status === "retake_requested" ? "Retake requested" : "Needs review"}
                />
              </div>

              {podUrl ? (
                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="text-[var(--success)]" size={19} />
                    <h2 className="font-semibold text-[var(--text-primary)]">
                      Verified POD document
                    </h2>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Local Blob URL preview. */}
                    <img
                      src={podUrl}
                      alt="Proof of delivery document"
                      className="mx-auto max-h-[650px] w-full rounded-lg object-contain"
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    This document is available in the current demonstration browser.
                  </p>
                </div>
              ) : (
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--retake-tint)] bg-[var(--retake-tint)] p-4">
                  <AlertCircle className="mt-0.5 shrink-0 text-[var(--retake)]" size={20} />
                  <p className="text-sm text-[var(--text-primary)]">{message}</p>
                </div>
              )}
            </>
          )}
        </section>

        <footer className="mt-6 text-center text-xs text-[var(--text-secondary)]">
          ProofFlow | Demonstration client portal | Read-only access
        </footer>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}