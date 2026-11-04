export type PodStatus =
  | "missing"
  | "submitted"
  | "verified"
  | "needs_review"
  | "retake_requested"
  | "billed";

export type PodFieldCheck = {
  status: "clear" | "unclear" | "missing";
  value: string;
  confidence: "high" | "medium" | "low";
  evidence: string;
};

export type AiPodAnalysis = {
  recommendation: "verified" | "retake" | "manual_review";
  summary: string;
  checks: {
    lrNumber: PodFieldCheck;
    consigneeStamp: PodFieldCheck;
    receivedQuantity: PodFieldCheck;
    shortageDamageRemarks: PodFieldCheck;
    deliveryDate: PodFieldCheck;
    signature: PodFieldCheck;
  };
};
export type TripRecord = {
  id: string;
  client: string;
  vehicle: string;
  destination: string;
  amount: number;
  lrNumber: string;
  ewayBill: string;
  branch: string;
  status: PodStatus;
  issue: string;
  aiConfidence: string;
  aiAnalysis?: AiPodAnalysis;
  retakeCount: number;
  consigneeStamp?: "visible" | "not_visible" | "unclear";
  quantityReceived?: number;
  shortageDamageRemarks?: string;
  deliveryDate?: string;
  signatureStatus?: "present" | "missing" | "unclear";
  tripCreatedAt?: string;
  podBlob?: Blob;
  podFileName?: string;
  submittedAt?: string;
  latitude?: number;
  longitude?: number;
  gpsStatus?: "captured" | "unavailable";
  verifiedAt?: string;
  billedAt?: string;
};

const DB_NAME = "proofflow-data";
const DB_VERSION = 1;
const STORE_NAME = "trips";

const initialTrips: TripRecord[] = [
  {
    id: "TRP-66120",
    client: "Company B",
    vehicle: "MH20 EL 4521",
    destination: "Nagpur",
    amount: 38500,
    lrNumber: "LR-66120",
    ewayBill: "EWB-66120",
    branch: "Aurangabad",
    status: "verified",
    issue: "POD verified successfully.",
    aiConfidence: "Demo seed: verified",
    retakeCount: 0,
  },
  {
    id: "TRP-66134",
    client: "Company C",
    vehicle: "MH20 GT 7718",
    destination: "Pune",
    amount: 26000,
    lrNumber: "LR-66134",
    ewayBill: "EWB-66134",
    branch: "Pune",
    status: "retake_requested",
    issue: "Consignee stamp is not clearly visible.",
    aiConfidence: "Low confidence",
    retakeCount: 1,
  },
  {
    id: "TRP-66141",
    client: "Company D",
    vehicle: "MH17 BY 3092",
    destination: "Indore",
    amount: 41200,
    lrNumber: "LR-66141",
    ewayBill: "EWB-66141",
    branch: "Indore",
    status: "needs_review",
    issue: "Shortage of 6 cartons mentioned on the POD.",
    aiConfidence: "Manual review required",
    retakeCount: 0,
  },
];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getTrips(): Promise<TripRecord[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result as TripRecord[]);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function initializeTrips(): Promise<TripRecord[]> {
  const existingTrips = await getTrips();

  if (existingTrips.length > 0) {
    return existingTrips;
  }

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    initialTrips.forEach((trip) => store.put(trip));

    transaction.oncomplete = () => {
      db.close();
      resolve(initialTrips);
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function importTrips(
  importedTrips: TripRecord[]
): Promise<{ imported: number; skipped: number }> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    let imported = 0;
    let skipped = 0;

    importedTrips.forEach((trip) => {
      const request = store.get(trip.id);

      request.onsuccess = () => {
        if (request.result) {
          skipped++;
          return;
        }

        store.add({ ...trip, tripCreatedAt: trip.tripCreatedAt || new Date().toISOString() });
        imported++;
      };
    });

    transaction.oncomplete = () => {
      db.close();
      resolve({ imported, skipped });
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function updateTrip(
  id: string,
  changes: Partial<TripRecord>
): Promise<TripRecord> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const current = request.result as TripRecord | undefined;

      if (!current) {
        transaction.abort();
        return;
      }

      store.put({ ...current, ...changes });
    };

    transaction.oncomplete = async () => {
      db.close();
      const trips = await getTrips();
      const updated = trips.find((trip) => trip.id === id);

      if (updated) resolve(updated);
      else reject(new Error("Updated trip could not be found."));
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(new Error("Trip update was cancelled."));
    };
  });
}
