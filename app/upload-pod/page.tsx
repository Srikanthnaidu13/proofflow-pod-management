"use client";


import { useState, useSyncExternalStore } from "react";
import { Camera, CheckCircle, Truck, Upload } from "lucide-react";
import { updateTrip } from "@/src/lib/proofflow";

async function compressPodImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  try {
    const maxSize = 300 * 1024;
    let scale = 1;
    let quality = 0.82;

    for (let attempt = 0; attempt < 12; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not process the POD photograph.");
      }

      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality);
      });

      if (blob && blob.size <= maxSize) {
        return blob;
      }

      if (quality > 0.5) {
        quality -= 0.1;
      } else {
        scale *= 0.8;
        quality = 0.8;
      }
    }

    throw new Error("Could not compress the photograph below 300 KB.");
  } finally {
    bitmap.close();
  }
}

function captureUploadGps(): Promise<{
  latitude: number;
  longitude: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS is not supported."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => reject(new Error("GPS unavailable or permission denied.")),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}
function subscribeToLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getLocationSearch() {
  return window.location.search;
}

function getServerLocationSearch() {
  return "";
}

export default function UploadPodPage() {
  const search = useSyncExternalStore(
    subscribeToLocation,
    getLocationSearch,
    getServerLocationSearch
  );

  const tripId =
    new URLSearchParams(search).get("trip") || "TRP-66120";

  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submissionTime, setSubmissionTime] = useState("");
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!file || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const compressedImage = await compressPodImage(file);

      let location: { latitude: number; longitude: number } | null = null;

      try {
        location = await captureUploadGps();
      } catch {
        location = null;
      }

      const submittedAt = new Date().toISOString();

      await updateTrip(tripId, {
        status: "submitted",
        podBlob: compressedImage,
        podFileName: file.name,
        submittedAt,
        latitude: location?.latitude,
        longitude: location?.longitude,
        gpsStatus: location ? "captured" : "unavailable",
        issue: "",
        aiConfidence: "Pending AI check",
      });

      setSubmissionTime(submittedAt);
      setGpsLocation(location);
      setSubmitted(true);
    } catch (err) {
      console.error("POD submission failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "POD submission failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-10">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
            <Truck size={28} />
          </div>

          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">ProofFlow</h1>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Secure POD upload for hired drivers
          </p>
        </div>

        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle size={54} className="mx-auto mb-4 text-[var(--success)]" />

            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              POD submitted successfully!
            </h2>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Your photograph has been saved for operations review.
            </p>

            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              Trip: {tripId}
            </p>

            <div className="mt-5 rounded-xl bg-[var(--background)] p-4 text-left">
              <p className="text-xs text-[var(--text-secondary)]">Submission time</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                {submissionTime
                  ? new Date(submissionTime).toLocaleString("en-IN")
                  : "Not available"}
              </p>

              <p className="mt-4 text-xs text-[var(--text-secondary)]">GPS location</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                {gpsLocation
                  ? `${gpsLocation.latitude.toFixed(5)}, ${gpsLocation.longitude.toFixed(5)}`
                  : "Location unavailable"}
              </p>
            </div>

            <p className="mt-3 text-xs text-[var(--success)]">
              Your delivery proof is awaiting verification.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-xl bg-[var(--accent-tint)] p-4">
              <p className="text-xs font-medium text-[var(--accent)]">
                TRIP REFERENCE
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                {tripId}
              </p>
            </div>

            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Upload delivery proof
            </h2>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Take a clear photograph of the signed LR/POD document.
            </p>

            <label className="mt-6 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--background)] p-5 text-center hover:border-[var(--accent)]">
              <Camera size={34} className="mb-3 text-[var(--accent)]" />

              <span className="font-semibold text-[var(--text-primary)]">
                {file ? file.name : "Take or select POD photo"}
              </span>

              <span className="mt-1 text-xs text-[var(--text-secondary)]">
                JPG or PNG image | Compressed below 300 KB
              </span>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setError("");
                }}
              />
            </label>

            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!file || submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-4 font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:bg-[var(--border)]"
            >
              <Upload size={19} />
              {submitting ? "Saving POD..." : "Submit POD"}
            </button>

            <p className="mt-4 text-center text-xs text-[var(--text-secondary)]">
              Demo upload saved in this browser. Server upload and SMS delivery
              are not connected.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
