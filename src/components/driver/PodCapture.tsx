"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { updateTrip } from "@/src/lib/proofflow";
import {
  Camera,
  Upload,
  X,
  CheckCircle,
  Loader2,
  Wifi,
  WifiOff,
  HardDrive,
  Volume2,
} from "lucide-react";

const MAX_SIZE = 300 * 1024;
const TRIP_ID = "TRP-66120";
const DB_NAME = "proofflow-offline";

type SavedPod = {
  tripId: string;
  fileName: string;
  fileType: string;
  blob: Blob;
  savedAt: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("pods")) {
        db.createObjectStore("pods", { keyPath: "tripId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveOfflinePod(file: File): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("pods", "readwrite");

    transaction.objectStore("pods").put({
      tripId: TRIP_ID,
      fileName: file.name,
      fileType: file.type,
      blob: file,
      savedAt: new Date().toISOString(),
    } satisfies SavedPod);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function getOfflinePod(): Promise<SavedPod | undefined> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("pods", "readonly");
    const request = transaction.objectStore("pods").get(TRIP_ID);

    request.onsuccess = () => {
      const result = request.result as SavedPod | undefined;
      db.close();
      resolve(result);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function deleteOfflinePod(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("pods", "readwrite");
    transaction.objectStore("pods").delete(TRIP_ID);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  const maxDimension = 1600;

  let scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height)
  );

  let quality = 0.82;
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 20; attempt++) {
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");

    if (!context) {
      bitmap.close();
      throw new Error("Could not process the image.");
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (blob && blob.size <= MAX_SIZE) break;

    if (quality > 0.5) {
      quality -= 0.1;
    } else {
      scale *= 0.8;
      quality = 0.82;
    }
  }

  bitmap.close();

  if (!blob || blob.size > MAX_SIZE) {
    throw new Error("Could not compress the image below 300 KB.");
  }

  return new File(
    [blob],
    file.name.replace(/\.[^/.]+$/, "") + ".jpg",
    { type: "image/jpeg", lastModified: Date.now() }
  );
}

export default function PodCapture() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [reconnectPending, setReconnectPending] = useState(false);
  const [online, setOnline] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [error, setError] = useState("");
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [submittedAt, setSubmittedAt] = useState("");
  const [language, setLanguage] = useState<"en" | "hi" | "mr">("en");
  const wasOfflineRef = useRef(false);
  const submissionInProgressRef = useRef(false);
  const previewUrlRef = useRef("");

  function updatePhoto(file: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextPreview = file ? URL.createObjectURL(file) : "";
    previewUrlRef.current = nextPreview;

    setPhoto(file);
    setPreview(nextPreview);
  }

  const translations = {
    en: {
      title: "Capture proof of delivery",
      description: "Take a clear photograph of the signed delivery document.",
      capture: "Take POD Photo",
      submit: "Submit for verification",
      remove: "Remove photo",
      instruction: "Please ensure the LR number, consignee stamp and signature are visible.",
      voice: "Please take a clear photograph of the delivery document.",
      speaker: "Listen to instructions",
    },
    hi: {
      title: "डिलीवरी का प्रमाण लें",
      description: "हस्ताक्षर किए गए डिलीवरी दस्तावेज़ की साफ़ फोटो लें।",
      capture: "POD फोटो लें",
      submit: "जाँच के लिए भेजें",
      remove: "फोटो हटाएँ",
      instruction: "कृपया LR नंबर, ग्राहक की मुहर और हस्ताक्षर साफ़ दिखाएँ।",
      voice: "कृपया डिलीवरी दस्तावेज़ की साफ़ फोटो लें।",
      speaker: "निर्देश सुनें",
    },
    mr: {
      title: "डिलिव्हरीचा पुरावा घ्या",
      description: "स्वाक्षरी केलेल्या डिलिव्हरी कागदपत्राचा स्पष्ट फोटो घ्या.",
      capture: "POD फोटो घ्या",
      submit: "तपासणीसाठी पाठवा",
      remove: "फोटो काढून टाका",
      instruction: "कृपया LR क्रमांक, ग्राहकाचा शिक्का आणि स्वाक्षरी स्पष्ट दिसू द्या.",
      voice: "कृपया डिलिव्हरी कागदपत्राचा स्पष्ट फोटो घ्या.",
      speaker: "सूचना ऐका",
    },
  };

  function speakInstructions() {
    if (!("speechSynthesis" in window)) {
      setError("Voice instructions are not supported on this device.");
      return;
    }

    window.speechSynthesis.cancel();

    const message = new SpeechSynthesisUtterance(
      translations[language].voice
    );

    message.lang = language === "en" ? "en-IN" : language === "hi" ? "hi-IN" : "mr-IN";
    message.rate = 0.85;

    window.speechSynthesis.speak(message);
  }

  useEffect(() => {
    let active = true;

    async function restoreSavedPhoto() {
      try {
        const saved = await getOfflinePod();

        if (active && saved) {
          const restoredFile = new File(
            [saved.blob],
            saved.fileName,
            { type: saved.fileType }
          );

          updatePhoto(restoredFile);
          setOfflineSaved(true);
        }
      } catch {
        if (active) {
          setError("Could not access offline storage on this device.");
        }
      } finally {
        if (active) setLoadingSaved(false);
      }
    }

    restoreSavedPhoto();

    const updateConnection = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);

      if (!isOnline) {
        wasOfflineRef.current = true;
      } else if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setReconnectPending(true);
      }
    };

    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);

    return () => {
      active = false;
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  async function handlePhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setError("");
    setSubmitted(false);

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Please select an image smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    try {
      setCompressing(true);
      updatePhoto(null);
      setOfflineSaved(false);

      const compressedFile = await compressImage(selectedFile);

      updatePhoto(compressedFile);
      setSaving(true);

      await saveOfflinePod(compressedFile);
      setOfflineSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save the photograph."
      );
    } finally {
      setCompressing(false);
      setSaving(false);
      event.target.value = "";
    }
  }

  async function removePhoto() {
    try {
      await deleteOfflinePod();
      updatePhoto(null);
      setOfflineSaved(false);
      setSubmitted(false);
      setError("");
    } catch {
      setError("Could not remove the saved photograph.");
    }
  }

  const captureGps = useCallback((): Promise<{
    latitude: number;
    longitude: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS is not supported on this device."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          reject(new Error("Location permission denied or GPS unavailable."));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }, []);
  const handleSubmit = useCallback(async () => {
    if (!photo || !offlineSaved || saving || submissionInProgressRef.current) return;

    submissionInProgressRef.current = true;
    setSaving(true);
    setError("");

    let location: { latitude: number; longitude: number } | null = null;

    try {
      try {
        location = await captureGps();
      } catch {
        location = null;
      }

      const submissionTime = new Date().toISOString();

      await updateTrip(TRIP_ID, {
        status: "submitted",
        podBlob: photo,
        podFileName: photo.name,
        submittedAt: submissionTime,
        latitude: location?.latitude,
        longitude: location?.longitude,
        gpsStatus: location ? "captured" : "unavailable",
        aiConfidence: "Pending AI check",
        issue: "",
      });

      setGpsLocation(location);
      setSubmittedAt(submissionTime);
      setSubmitted(true);
    } catch {
      setError("Could not save the POD submission. Please try again.");
    } finally {
      submissionInProgressRef.current = false;
      setSaving(false);
    }
  }, [photo, offlineSaved, saving, captureGps]);

  useEffect(() => {
    if (
      online &&
      reconnectPending &&
      photo &&
      offlineSaved &&
      !submitted &&
      !saving &&
      !loadingSaved &&
      !submissionInProgressRef.current
    ) {
      setReconnectPending(false);
      void handleSubmit();
    }
  }, [online, reconnectPending, photo, offlineSaved, submitted, saving, loadingSaved, handleSubmit]);

  return (
    <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-tint)] text-[var(--accent)]">
        <Camera size={38} />
      </div>

      <div className="mb-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setLanguage("en")}
          aria-pressed={language === "en"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${language === "en" ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--text-secondary)]"}`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLanguage("hi")}
          aria-pressed={language === "hi"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${language === "hi" ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--text-secondary)]"}`}
        >
          हिन्दी
        </button>
        <button
          type="button"
          onClick={() => setLanguage("mr")}
          aria-pressed={language === "mr"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${language === "mr" ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--text-secondary)]"}`}
        >
          मराठी
        </button>
      </div>

      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
        {translations[language].title}
      </h3>

      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        {translations[language].description}
      </p>

      <button
        type="button"
        onClick={speakInstructions}
        className="mx-auto mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent-tint)]"
      >
        <Volume2 size={19} />
        {translations[language].speaker}
      </button>

      <div className="mt-5 flex items-center justify-center gap-2 text-sm">
        {online ? (
          <span className="flex items-center gap-2 text-emerald-700">
            <Wifi size={17} /> Internet connected
          </span>
        ) : (
          <span className="flex items-center gap-2 text-amber-700">
            <WifiOff size={17} /> Offline mode
          </span>
        )}
      </div>

      {loadingSaved && (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Checking saved POD...
        </p>
      )}

      {!photo && !compressing && !loadingSaved && (
        <label className="mt-6 flex min-h-24 w-full cursor-pointer items-center justify-center gap-4 rounded-2xl bg-[var(--accent)] px-6 py-6 text-lg font-bold text-white shadow-sm transition hover:bg-[var(--accent-hover)] focus-within:outline-none focus-within:ring-4 focus-within:ring-[var(--accent-tint)]">
          <Camera size={30} />
          <span>{translations[language].capture}</span>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </label>
      )}

      {compressing && (
        <div className="mt-6 rounded-xl bg-[var(--accent-tint)] p-4 text-[var(--accent)]">
          <Loader2 className="mx-auto mb-2 animate-spin" size={25} />
          <p className="font-semibold">Compressing photograph...</p>
        </div>
      )}

      {saving && (
        <p className="mt-4 text-sm text-[var(--accent)]">
          Saving photograph on this device...
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {photo && preview && (
        <div className="mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- Local Blob URL preview. */}
          <img
            src={preview}
            alt="Compressed proof of delivery"
            className="mx-auto max-h-72 w-full rounded-xl border border-[var(--border)] object-contain"
          />

          <p className="mt-3 break-all text-xs text-[var(--text-secondary)]">
            {photo.name}
          </p>

          <p className="mt-2 text-sm font-semibold text-emerald-700">
            Image size: {(photo.size / 1024).toFixed(1)} KB
          </p>

          {offlineSaved && (
            <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">
              <HardDrive className="mx-auto mb-2" size={22} />
              <p className="text-sm font-semibold">
                POD saved on this device
              </p>
              <p className="mt-1 text-xs">
                It will remain available after refreshing this page.
              </p>
            </div>
          )}

          {submitted ? (
            <div className="mt-5 rounded-xl bg-[var(--accent-tint)] p-4 text-[var(--accent)]">
              <CheckCircle className="mx-auto mb-2" size={26} />
              <p className="font-semibold">POD ready for verification!</p>

              <div className="mt-4 space-y-2 text-left text-sm">
                <p>
                  <strong>Submission time:</strong>{" "}
                  {submittedAt
                    ? new Date(submittedAt).toLocaleString("en-IN")
                    : "Not available"}
                </p>

                <p>
                  <strong>GPS location:</strong>{" "}
                  {gpsLocation
                    ? `${gpsLocation.latitude.toFixed(5)}, ${gpsLocation.longitude.toFixed(5)}`
                    : "Location unavailable"}
                </p>
              </div>

              <p className="mt-3 text-xs">
                Demo only. Server upload and AI verification are not connected.
              </p>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <button
                onClick={handleSubmit}
                disabled={!offlineSaved || saving}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={19} />
                {translations[language].submit}
              </button>

              <button
                onClick={removePhoto}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
              >
                <X size={18} />
                {translations[language].remove}
              </button>
            </div>
          )}
        </div>
      )}

      <p className="mt-5 text-xs text-[var(--text-secondary)]">
        {translations[language].instruction}
      </p>
    </section>
  );
}
