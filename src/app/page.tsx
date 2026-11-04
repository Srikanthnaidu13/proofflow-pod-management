import Link from "next/link";
import { Truck, ShieldCheck, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Truck size={30} />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            ProofFlow
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Fleet POD & Billing Management
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Welcome back
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Select your workspace to continue.
          </p>

          <div className="mt-8 space-y-4">
            <Link
              href="/driver"
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-blue-500 hover:bg-blue-50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-3 text-blue-700">
                  <Truck size={22} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Driver</p>
                  <p className="text-xs text-slate-500">
                    Capture proof of delivery
                  </p>
                </div>
              </div>
              <ArrowRight size={20} className="text-slate-400" />
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-blue-500 hover:bg-blue-50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-3 text-emerald-700">
                  <ShieldCheck size={22} className="text-emerald-700" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Billing Executive
                  </p>
                  <p className="text-xs text-slate-500">
                    Review PODs and manage billing
                  </p>
                </div>
              </div>
              <ArrowRight size={20} className="text-slate-400" />
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Secure delivery documentation and billing workflow
        </p>
      </div>
    </main>
  );
}
