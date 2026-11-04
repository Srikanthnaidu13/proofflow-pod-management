"use client";

import { useEffect, useState } from "react";
import { Copy, MessageSquare, Send, ExternalLink } from "lucide-react";
import { initializeTrips, type TripRecord } from "@/src/lib/proofflow";

export default function SmsUploadGenerator() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [tripId, setTripId] = useState("");
  const [mobile, setMobile] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    initializeTrips()
      .then((records) => {
        setTrips(records);
        const missingTrip = records.find((trip) => trip.status === "missing");
        if (missingTrip) setTripId(missingTrip.id);
        else if (records.length > 0) setTripId(records[0].id);
      })
      .catch((error) => console.error("Trip loading failed:", error));
  }, []);

  function generateLink() {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setMessage("Enter a valid 10-digit Indian mobile number.");
      setGeneratedLink("");
      return;
    }

    if (!tripId) {
      setMessage("Please select a trip.");
      return;
    }

    const link = `${window.location.origin}/upload-pod?trip=${encodeURIComponent(tripId)}`;
    setGeneratedLink(link);
    setMessage("Demo SMS generated. No actual SMS was sent.");
  }

  async function copyLink() {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setMessage("Upload link copied to clipboard.");
    } catch {
      setMessage("Copy failed. You can select and copy the link manually.");
    }
  }

  const selectedTrip = trips.find((trip) => trip.id === tripId);

  return (
    <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-xl bg-[var(--accent-tint)] p-3 text-[var(--accent)]">
          <MessageSquare size={22} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Hired Driver POD Link
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Generate a trip-specific upload link for drivers without the app.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            Select trip
          </label>
          <select
            value={tripId}
            onChange={(event) => {
              setTripId(event.target.value);
              setGeneratedLink("");
              setMessage("");
            }}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Choose a trip</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.id} — {trip.client} ({trip.vehicle})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            Driver mobile number
          </label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={mobile}
            onChange={(event) => {
              setMobile(event.target.value.replace(/\D/g, "").slice(0, 10));
              setGeneratedLink("");
              setMessage("");
            }}
            placeholder="Enter 10-digit mobile number"
            className="w-full rounded-xl border border-[var(--border)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {selectedTrip && (
        <div className="mt-4 rounded-xl bg-[var(--surface-muted)] p-4 text-sm">
          <p className="font-semibold text-[var(--text-primary)]">
            {selectedTrip.id} · {selectedTrip.destination}
          </p>
          <p className="mt-1 text-[var(--text-secondary)]">
            LR: {selectedTrip.lrNumber} · E-way bill: {selectedTrip.ewayBill}
          </p>
        </div>
      )}

      <button
        onClick={generateLink}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--accent-hover)] sm:w-auto"
      >
        <Send size={18} />
        Generate SMS upload link
      </button>

      {message && (
        <p className="mt-4 text-sm font-medium text-[var(--text-secondary)]" role="status">
          {message}
        </p>
      )}

      {generatedLink && (
        <div className="mt-5 rounded-xl border border-[var(--accent-tint)] bg-[var(--accent-tint)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            SMS preview · {mobile}
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-primary)]">
            ProofFlow: Please upload the signed POD for trip {tripId}.
            Open this secure upload link: {generatedLink}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent-tint)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent-tint)]"
            >
              <Copy size={16} />
              Copy link
            </button>
            <a
              href={generatedLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Open upload page
              <ExternalLink size={16} />
            </a>
          </div>

          <p className="mt-3 text-xs text-[var(--accent)]">
            Simulation only: no SMS provider is connected and no message has been sent.
          </p>
        </div>
      )}
    </section>
  );
}
