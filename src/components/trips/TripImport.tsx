"use client";

import { useState } from "react";
import { FileSpreadsheet, Upload, CheckCircle, AlertTriangle } from "lucide-react";
import { importTrips, type TripRecord } from "../../lib/proofflow";

const requiredColumns = [
  "id",
  "client",
  "vehicle",
  "destination",
  "amount",
  "lrNumber",
  "ewayBill",
  "branch",
];

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

type TripImportProps = {
  onImported?: () => void;
};

export default function TripImport({ onImported }: TripImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const [previewTrips, setPreviewTrips] = useState<TripRecord[]>([]);

  function downloadTemplate() {
    const csv = [
      requiredColumns.join(","),
      "TRP-66301,Company G,MH20 EF 1234,Mumbai,35000,LR-66301,EWB-66301,Aurangabad",
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "proofflow-trip-template.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  async function handleFileChange(selectedFile: File | undefined) {
    setFile(null);
    setError("");
    setMessage("");
    setPreviewCount(0);

    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      return;
    }

    try {
      const text = await selectedFile.text();
      const lines = text.trim().split(/\r?\n/);

      if (lines.length < 2) {
        setError("The CSV must contain a header and at least one trip.");
        return;
      }

      const headers = parseCSVLine(lines[0]).map((header) =>
        header.replace(/^\uFEFF/, "").trim()
      );

      const missingColumns = requiredColumns.filter(
        (column) => !headers.includes(column)
      );

      if (missingColumns.length > 0) {
        setError(`Missing columns: ${missingColumns.join(", ")}`);
        return;
      }

      const records: TripRecord[] = [];
      const invalidRows: number[] = [];
      const seenIds = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = parseCSVLine(lines[i]);

        if (values.length !== headers.length) {
          invalidRows.push(i + 1);
          continue;
        }

        const row = Object.fromEntries(
          headers.map((header, index) => [header, values[index]])
        );

        const amount = Number(row.amount);

        if (
          !row.id ||
          !row.client ||
          !row.vehicle ||
          !row.destination ||
          !row.lrNumber ||
          !row.ewayBill ||
          !row.branch ||
          !Number.isFinite(amount) ||
          amount <= 0 ||
          seenIds.has(row.id)
        ) {
          invalidRows.push(i + 1);
          continue;
        }

        seenIds.add(row.id);

        records.push({
          id: row.id,
          client: row.client,
          vehicle: row.vehicle,
          destination: row.destination,
          amount,
          lrNumber: row.lrNumber,
          ewayBill: row.ewayBill,
          branch: row.branch,
          status: "missing",
          issue: "",
          aiConfidence: "Not checked",
          retakeCount: 0,
        });
      }

      if (records.length === 0) {
        setError("No valid trip records found. Please check your CSV.");
        return;
      }

      if (invalidRows.length > 0) {
        setError(
          `Invalid rows: ${invalidRows.join(", ")}. Correct them before importing.`
        );
        return;
      }

      setFile(selectedFile);
      setPreviewCount(records.length);
      setPreviewTrips(records);
    } catch {
      setError("Could not read the CSV file.");
    }
  }

  async function handleImport() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      const headers = parseCSVLine(lines[0]).map((header) =>
        header.replace(/^\uFEFF/, "").trim()
      );

      const records: TripRecord[] = lines.slice(1)
        .filter((line) => line.trim())
        .map((line) => {
          const values = parseCSVLine(line);
          const row = Object.fromEntries(
            headers.map((header, index) => [header, values[index]])
          );

          return {
            id: row.id,
            client: row.client,
            vehicle: row.vehicle,
            destination: row.destination,
            amount: Number(row.amount),
            lrNumber: row.lrNumber,
            ewayBill: row.ewayBill,
            branch: row.branch,
            status: "missing",
            issue: "",
            aiConfidence: "Not checked",
            retakeCount: 0,
          };
        });

      const result = await importTrips(records);

      setMessage(
        `Import completed: ${result.imported} trips imported and ${result.skipped} duplicate trips skipped.`
      );
      setFile(null);
      setPreviewCount(0);
      onImported?.();
    } catch {
      setError("Trip import failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-[var(--accent-tint)] p-3 text-[var(--accent)]">
          <FileSpreadsheet size={23} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Daily Trip Import
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Import trip details using a CSV file.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border-2 border-dashed border-[var(--border)] p-6 text-center">
        <Upload className="mx-auto text-[var(--text-secondary)]" size={30} />
        <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
          Select your daily trip CSV
        </p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Required: {requiredColumns.join(", ")}
        </p>

        <button
          type="button"
          onClick={downloadTemplate}
          className="mt-4 rounded-lg border border-[var(--accent-tint)] bg-[var(--accent-tint)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent-tint)]"
        >
          Download CSV Template
        </button>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => handleFileChange(event.target.files?.[0])}
          className="mx-auto mt-5 block max-w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-muted)] file:px-4 file:py-2 file:font-semibold file:text-[var(--text-primary)]"
        />

        {file && (
          <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
            {file.name} - {previewCount} valid trip records
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={18} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {message && (
        <div className="mt-4 flex gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle size={18} className="shrink-0" />
          <p>{message}</p>
        </div>
      )}

      {previewTrips.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)]">
          <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <h3 className="font-semibold text-[var(--text-primary)]">
              CSV Preview
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Review your trip records before importing.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-[var(--surface-muted)] text-xs text-[var(--text-secondary)]">
                <tr>
                  <th className="p-3">Trip ID</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3 text-right">Freight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {previewTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td className="p-3 font-medium text-[var(--text-primary)]">
                      {trip.id}
                    </td>
                    <td className="p-3 text-[var(--text-primary)]">{trip.client}</td>
                    <td className="p-3 text-[var(--text-primary)]">{trip.vehicle}</td>
                    <td className="p-3 text-[var(--text-primary)]">{trip.destination}</td>
                    <td className="p-3 text-right font-medium text-[var(--text-primary)]">
                      {trip.amount.toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={!file || loading}
        className="mt-5 w-full rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Importing trips..." : "Import trips"}
      </button>

      <p className="mt-3 text-xs text-[var(--text-secondary)]">
        Existing trip IDs are skipped to protect their current POD and billing
        information. Imported trips start with missing POD status.
      </p>
    </section>
  );
}