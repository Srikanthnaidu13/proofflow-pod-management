"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileSearch,
  Loader2,
  RotateCcw,
} from "lucide-react";
import {
  initializeTrips,
  updateTrip,
  type TripRecord,
  type AiPodAnalysis,
} from "../../lib/proofflow";

export default function ReviewQueue() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [zoomedPod, setZoomedPod] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (zoomedPod) {
      closeButtonRef.current?.focus();
    }
  }, [zoomedPod]);
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");

  useEffect(() => {
    if (!zoomedPod) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setZoomedPod(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [zoomedPod]);

  const previewUrlsRef = useRef<Record<string, string>>({});

  function applyTripRecords(records: TripRecord[]) {
    Object.values(previewUrlsRef.current).forEach((url) => {
      URL.revokeObjectURL(url);
    });

    const urls: Record<string, string> = {};

    records.forEach((trip) => {
      if (trip.podBlob instanceof Blob) {
        urls[trip.id] = URL.createObjectURL(trip.podBlob);
      }
    });

    previewUrlsRef.current = urls;
    setTrips(records);
    setPreviewUrls(urls);
  }

  async function loadTrips() {
    try {
      const records = await initializeTrips();
      applyTripRecords(records);
    } catch {
      setMessage("Could not load trip records. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    initializeTrips()
      .then((records) => {
        if (!cancelled) applyTripRecords(records);
      })
      .catch(() => {
        if (!cancelled) {
          setMessage("Could not load trip records. Please refresh the page.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;

      Object.values(previewUrlsRef.current).forEach((url) => {
        URL.revokeObjectURL(url);
      });

      previewUrlsRef.current = {};
    };
  }, []);

  const reviewItems = trips.filter(
    (trip) =>
      trip.status === "submitted" ||
      trip.status === "needs_review" ||
      trip.status === "retake_requested"
  );

  const clients = Array.from(new Set(reviewItems.map((trip) => trip.client))).sort();
  const branches = Array.from(
    new Set(reviewItems.map((trip) => trip.branch?.trim() || "Unassigned"))
  ).sort();

  const filteredReviewItems = reviewItems.filter(
    (trip) =>
      (selectedClient === "all" || trip.client === selectedClient) &&
      (selectedBranch === "all" ||
        (trip.branch?.trim() || "Unassigned") === selectedBranch)
  );

  const verifiedCount = trips.filter(
    (trip) =>
      trip.status === "verified" &&
      trip.verifiedAt &&
      new Date(trip.verifiedAt).toDateString() === new Date().toDateString()
  ).length;

  const retakeCount = trips.filter(
    (trip) => trip.status === "retake_requested"
  ).length;

  async function runAiCheck(trip: TripRecord) {
    if (!trip.podBlob) {
      setMessage("No POD photograph is available for AI analysis.");
      return;
    }

    setBusyId(trip.id);
    setMessage("");

    try {
      const imageBlob = trip.podBlob.type
        ? trip.podBlob
        : new Blob([trip.podBlob], { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("image", imageBlob, trip.podFileName || "pod-image.jpg");

      const response = await fetch("/api/analyze-pod", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as {
        success?: boolean;
        analysis?: AiPodAnalysis;
        error?: string;
      };

      if (!response.ok || !result.success || !result.analysis) {
        throw new Error(result.error || "Gemini could not analyse this photograph.");
      }

      const analysis = result.analysis;
      const checks = analysis.checks;

      const quantityMatch = checks.receivedQuantity.value.match(/\d+(?:\.\d+)?/);
      const extractedQuantity = quantityMatch
        ? Number(quantityMatch[0])
        : undefined;

      const criticalChecks = [
        checks.lrNumber,
        checks.consigneeStamp,
        checks.receivedQuantity,
        checks.deliveryDate,
        checks.signature,
      ];

      const hasCriticalUncertainty = criticalChecks.some(
        (check) => check.status !== "clear" || check.confidence !== "high"
      );

      let nextStatus: TripRecord["status"] = "needs_review";
      let nextRetakeCount = trip.retakeCount;
      let message = "";

      if (analysis.recommendation === "retake" && trip.retakeCount < 2) {
        nextStatus = "retake_requested";
        nextRetakeCount += 1;
        message = "A clearer photograph has been requested.";
      } else if (analysis.recommendation === "retake") {
        nextStatus = "needs_review";
        message = "Retake limit reached. Sent for manual billing review.";
      } else if (analysis.recommendation === "manual_review" || hasCriticalUncertainty) {
        nextStatus = "needs_review";
        message = "Sent for manual billing verification.";
      } else {
        nextStatus = "needs_review";
        message = "Gemini found the POD readable. Billing executive approval is still required.";
      }

      const changes: Partial<TripRecord> = {
        status: nextStatus,
        retakeCount: nextRetakeCount,
        aiAnalysis: analysis,
        aiConfidence: `Gemini AI: ${analysis.recommendation}. Human approval required.`,
        issue: analysis.summary || trip.issue,
      };

      if (checks.lrNumber.status !== "missing" && checks.lrNumber.value.trim()) {
        changes.lrNumber = checks.lrNumber.value.trim();
      }

      if (checks.consigneeStamp.status === "clear") {
        changes.consigneeStamp = "visible";
      } else if (checks.consigneeStamp.status === "missing") {
        changes.consigneeStamp = "not_visible";
      } else {
        changes.consigneeStamp = "unclear";
      }

      if (
        extractedQuantity !== undefined &&
        Number.isFinite(extractedQuantity) &&
        extractedQuantity >= 0
      ) {
        changes.quantityReceived = extractedQuantity;
      }

      if (checks.shortageDamageRemarks.value.trim()) {
        changes.shortageDamageRemarks = checks.shortageDamageRemarks.value.trim();
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(checks.deliveryDate.value.trim())) {
        changes.deliveryDate = checks.deliveryDate.value.trim();
      }

      if (checks.signature.status === "clear") {
        changes.signatureStatus = "present";
      } else if (checks.signature.status === "missing") {
        changes.signatureStatus = "missing";
      } else {
        changes.signatureStatus = "unclear";
      }

      await updateTrip(trip.id, changes);
      await loadTrips();

      setMessage(`${trip.id}: ${message}`);
    } catch (error) {
      console.error("Gemini POD analysis failed:", error);
      setMessage(
        error instanceof Error
          ? `Could not analyse this POD: ${error.message}`
          : "Could not analyse this POD. Please try again."
      );
    } finally {
      setBusyId(null);
    }
  }
  async function savePodCorrections(trip: TripRecord, form: HTMLFormElement) {
    const formData = new FormData(form);
    const quantityValue = String(formData.get("quantityReceived") || "").trim();
    const quantity = quantityValue === "" ? undefined : Number(quantityValue);

    if (quantity !== undefined && (!Number.isFinite(quantity) || quantity < 0)) {
      setMessage("Please enter a valid received quantity.");
      return;
    }

    setBusyId(trip.id);
    setMessage("");

    try {
      await updateTrip(trip.id, {
        lrNumber: String(formData.get("lrNumber") || "").trim(),
        consigneeStamp: formData.get("consigneeStamp") as TripRecord["consigneeStamp"],
        quantityReceived: quantity,
        shortageDamageRemarks: String(formData.get("shortageDamageRemarks") || "").trim(),
        deliveryDate: String(formData.get("deliveryDate") || "").trim(),
        signatureStatus: formData.get("signatureStatus") as TripRecord["signatureStatus"],
      });

      await loadTrips();
      setMessage(`${trip.id}: POD corrections saved successfully.`);
    } catch {
      setMessage("Could not save POD corrections. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function approvePod(trip: TripRecord) {
    setBusyId(trip.id);
    setMessage("");

    try {
      await updateTrip(trip.id, {
        status: "verified",
        verifiedAt: new Date().toISOString(),
        aiConfidence: "Approved by billing executive",
      });
      await loadTrips();
      setMessage(`${trip.id} has been marked as verified.`);
    } catch {
      setMessage("Could not update this trip. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function requestRetake(trip: TripRecord) {
    if (trip.retakeCount >= 2) {
      setMessage("The maximum of two retake requests has been reached.");
      return;
    }

    setBusyId(trip.id);
    setMessage("");

    try {
      await updateTrip(trip.id, {
        status: "retake_requested",
        retakeCount: trip.retakeCount + 1,
        issue: "A clearer POD photograph is required.",
      });
      await loadTrips();
      setMessage(`Retake requested for ${trip.id}.`);
    } catch {
      setMessage("Could not request a retake. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => loadTrips()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={16} className={loading ? "animate-spin" : ""} />
          Refresh queue
        </button>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Pending review" value={String(reviewItems.length)} />
        <SummaryCard label="Retake requests" value={String(retakeCount)} />
        <SummaryCard label="Verified today" value={String(verifiedCount)} />
      </section>

      {message && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-[var(--accent-tint)] bg-[var(--accent-tint)] p-3 text-sm text-[var(--accent)]"
        >
          {message}
        </p>
      )}

      {!loading && reviewItems.length > 0 && (
        <section className="mb-5 grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Filter by client
            <select
              value={selectedClient}
              onChange={(event) => setSelectedClient(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
            >
              <option value="all">All clients</option>
              {clients.map((client) => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Filter by branch
            <select
              value={selectedBranch}
              onChange={(event) => setSelectedBranch(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
            >
              <option value="all">All branches</option>
              {branches.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </label>
        </section>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-[var(--text-secondary)]">
          <Loader2 className="animate-spin" size={18} />
          Loading trip records...
        </div>
      ) : reviewItems.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <CheckCircle className="mx-auto text-[var(--success)]" size={36} />
          <h2 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
            All caught up!
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            There are no PODs waiting for review.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredReviewItems.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
              <FileSearch className="mx-auto text-[var(--text-secondary)]" size={32} />
              <h2 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                No matching PODs found
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Try changing the client or branch filters to see other review items.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedClient("all");
                  setSelectedBranch("all");
                }}
                className="mt-4 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
              >
                Clear filters
              </button>
            </div>
          ) : (
          filteredReviewItems.map((item) => {
            const isRetake = item.status === "retake_requested";
            const canRequestRetake =
              isRetake && item.retakeCount < 2;

            return (
              <section
                key={item.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      {item.id}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {item.client} | {item.vehicle} | {item.destination}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      LR: {item.lrNumber} | E-way bill: {item.ewayBill}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isRetake
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {item.status === "submitted"
  ? "Awaiting AI check"
  : isRetake
    ? "Retake requested"
    : "Needs review"}
                  </span>
                </div>

                {previewUrls[item.id] && (
                  <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                      Uploaded POD document
                    </p>
                    <button
                      type="button"
                      onClick={() => setZoomedPod(item.id)}
                      className="block w-full cursor-zoom-in rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      aria-label={`Zoom POD photograph for ${item.id}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- Local Blob URL preview. */}
                      <img
                        src={previewUrls[item.id]}
                        alt={`POD document for ${item.id}`}
                        className="max-h-96 w-full rounded-lg border border-[var(--border)] object-contain"
                      />
                    </button>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      Select the photograph to enlarge it.
                    </p>
                    {item.podFileName && (
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">
                        File: {item.podFileName}
                      </p>
                    )}
                  </div>
                )}
                <form
                  key={`${item.id}-${item.aiConfidence}`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void savePodCorrections(item, event.currentTarget);
                  }}
                  className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
                >
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      POD document verification
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Review the photograph and enter the details manually. These are not AI-extracted values.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-[var(--text-primary)]">
                      LR number
                      <input
                        name="lrNumber"
                        defaultValue={item.lrNumber}
                        required
                        className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label className="block text-sm font-medium text-[var(--text-primary)]">
                      Consignee stamp
                      <select
                        name="consigneeStamp"
                        defaultValue={item.consigneeStamp || "unclear"}
                        className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="visible">Visible</option>
                        <option value="not_visible">Not visible</option>
                        <option value="unclear">Unclear / Not checked</option>
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-[var(--text-primary)]">
                      Quantity received
                      <input
                        name="quantityReceived"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={item.quantityReceived ?? ""}
                        placeholder="Enter received quantity"
                        className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label className="block text-sm font-medium text-[var(--text-primary)]">
                      Delivery date
                      <input
                        name="deliveryDate"
                        type="date"
                        defaultValue={item.deliveryDate || ""}
                        className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label className="block text-sm font-medium text-[var(--text-primary)] sm:col-span-2">
                      Shortage / damage remarks
                      <textarea
                        name="shortageDamageRemarks"
                        rows={3}
                        defaultValue={item.shortageDamageRemarks ?? item.issue}
                        placeholder="Enter shortage or damage details, or write None"
                        className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label className="block text-sm font-medium text-[var(--text-primary)] sm:col-span-2">
                      Signature
                      <select
                        name="signatureStatus"
                        defaultValue={item.signatureStatus || "unclear"}
                        className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="present">Present</option>
                        <option value="missing">Missing</option>
                        <option value="unclear">Unclear / Not checked</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Contains personal data. Review only for authorised business purposes.
                    </p>
                    <button
                      type="submit"
                      disabled={busyId !== null}
                      className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      {busyId === item.id ? "Saving..." : "Save corrections"}
                    </button>
                  </div>
                </form>

                {item.aiAnalysis && (
                  <section className="mt-5 rounded-xl border border-[var(--border)] bg-white p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">Gemini AI analysis</h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          AI suggestions based on the POD photograph. Verify every field against the original image.
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--accent-tint)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                        {item.aiAnalysis.recommendation.replace("_", " ")}
                      </span>
                    </div>

                    <p className="mb-4 text-sm text-[var(--text-secondary)]">
                      {item.aiAnalysis.summary}
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: "LR number", field: item.aiAnalysis.checks.lrNumber },
                        { label: "Consignee stamp", field: item.aiAnalysis.checks.consigneeStamp },
                        { label: "Received quantity", field: item.aiAnalysis.checks.receivedQuantity },
                        { label: "Shortage / damage", field: item.aiAnalysis.checks.shortageDamageRemarks },
                        { label: "Delivery date", field: item.aiAnalysis.checks.deliveryDate },
                        { label: "Signature", field: item.aiAnalysis.checks.signature },
                      ].map(({ label, field }) => (
                        <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-[var(--text-secondary)]">{label}</p>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                              field.status === "clear"
                                ? "bg-[var(--success-tint)] text-[var(--success)]"
                                : field.status === "unclear"
                                  ? "bg-[var(--retake-tint)] text-[var(--retake)]"
                                  : "bg-[var(--review-tint)] text-[var(--review)]"
                            }`}>
                              {field.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                            {field.value || "Not detected"}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            Confidence: {field.confidence}
                          </p>
                          {field.evidence && (
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                              Evidence: {field.evidence}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-[var(--text-secondary)]">
                      Gemini provides suggestions only. A billing executive must verify the POD and approve it.
                    </p>
                  </section>
                )}
                <div className="mt-5 grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">POD submitted at</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                      {item.submittedAt
                        ? new Date(item.submittedAt).toLocaleString("en-IN")
                        : "Not available"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Driver GPS location</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                      {item.gpsStatus === "captured" &&
                      typeof item.latitude === "number" &&
                      typeof item.longitude === "number"
                        ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`
                        : "Location unavailable"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 rounded-xl bg-[var(--surface-muted)] p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Freight amount</p>
                    <p className="mt-1 font-semibold text-[var(--text-primary)]">
                      {"\u20B9"}{item.amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Verification result</p>
                    <p className="mt-1 font-semibold text-[var(--text-primary)]">
                      {item.aiConfidence}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <AlertTriangle
                    size={20}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {isRetake ? "Photo issue" : "Manual review required"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {item.issue}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Clock size={15} />
                  {item.retakeCount} of 2 retake attempts used
                </div>

                {item.status === "submitted" && (
                  <div className="mb-4 rounded-xl border border-[var(--accent-tint)] bg-[var(--accent-tint)] p-4">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">POD received successfully. The billing team can now review this submission.</p>
                    <p className="mt-1 text-xs text-[var(--accent)]">
                      Gemini AI will examine the photograph. A billing executive must approve the final result.
                    </p>
                    <button
                      onClick={() => runAiCheck(item)}
                      disabled={busyId !== null}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyId === item.id ? (
                        <Loader2 className="animate-spin" size={17} />
                      ) : (
                        <FileSearch size={17} />
                      )}
                      Analyse POD with Gemini AI
                    </button>
                  </div>
                )}
                <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--border)] pt-5">
                  <button
                    onClick={() => approvePod(item)}
                    disabled={busyId !== null}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyId === item.id ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <CheckCircle size={17} />
                    )}
                    Mark verified
                  </button>

                  {isRetake && (
                    <button
                      onClick={() => requestRetake(item)}
                      disabled={busyId !== null || !canRequestRetake}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={17} />
                      {canRequestRetake
                        ? "Request another retake"
                        : "Retake limit reached"}
                    </button>
                  )}
                </div>

                {!isRetake && (
                  <p className="mt-3 text-xs text-[var(--text-secondary)]">
                    Check the shortage or damage remarks before marking this
                    POD as verified.
                  </p>
                )}
              </section>
            );
          })
          )}
        </div>
      )}

      {zoomedPod && previewUrls[zoomedPod] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomedPod(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged POD photograph"
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setZoomedPod(null)}
            className="absolute right-5 top-5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- Local Blob URL preview. */}
          <img
            src={previewUrls[zoomedPod]}
            alt={`Enlarged POD document for ${zoomedPod}`}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
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
      <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
