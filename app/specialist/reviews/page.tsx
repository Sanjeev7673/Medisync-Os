"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PatientRequest } from "@/lib/types";

export default function SpecialistReviewsPage() {
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/specialist/review-queue", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Unable to load review queue");
        return body.requests as PatientRequest[];
      })
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load review queue"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Specialist Workspace</p>
        <h1 className="text-3xl font-semibold">Review Queue</h1>
        <p className="mt-2 text-slate-600">Review assigned requests and make the final human workflow decision.</p>
      </div>
      {loading && <p className="text-slate-600">Loading assigned requests…</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
      {!loading && !error && requests.length === 0 && <div className="rounded-xl border p-6 text-slate-600">No requests are currently assigned to you.</div>}
      <section className="grid gap-4">
        {requests.map((item) => (
          <Link key={item.request_id} href={`/specialist/reviews/${encodeURIComponent(item.request_id)}`} className="rounded-xl border p-5 transition hover:shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{item.request_id}</h2>
                <p className="mt-1 text-sm text-slate-600">{item.request_type ?? "Unclassified"} · {item.specialty ?? "Specialty pending"}</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Pending Review</span>
            </div>
            <p className="mt-4 line-clamp-2 text-sm text-slate-700">{item.request}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>AI confidence: {item.ai_confidence == null ? "—" : `${Math.round(item.ai_confidence * 100)}%`}</span>
              <span>Created: {new Date(item.created_at).toLocaleString()}</span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
