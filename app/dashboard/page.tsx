"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PatientShell from "@/components/PatientShell";
import StatusBadge from "@/components/StatusBadge";
import { PatientRequest } from "@/lib/types";

const CURRENT_PATIENT_ID = "P1001";

export default function DashboardPage() {
  const [requests, setRequests] = useState<PatientRequest[] | null>(null);
  useEffect(() => { fetch(`/api/requests?patient_id=${CURRENT_PATIENT_ID}`).then((r) => r.json()).then((data) => setRequests(data.requests)); }, []);
  return (
    <PatientShell>
      <header className="mb-8"><h1 className="font-display font-bold text-2xl">Welcome back</h1><p className="text-[var(--muted)] mt-1">Here&apos;s where things stand with your care requests.</p></header>
      <div className="mb-8"><Link href="/requests/new" className="inline-flex items-center rounded-md bg-[var(--ink)] text-white text-sm font-medium px-4 py-2.5 hover:opacity-90 transition-opacity">Submit a new request</Link></div>
      <section>
        <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-[var(--muted)] mb-3">Your requests</h2>
        {requests === null && <p className="text-sm text-[var(--muted)]">Loading…</p>}
        {requests?.length === 0 && <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center"><p className="text-sm text-[var(--muted)]">No requests yet. Submit one to get started.</p></div>}
        <div className="flex flex-col gap-3">{requests?.map((r) => <Link key={r.request_id} href={`/requests/${r.request_id}`} className="block bg-[var(--panel)] border border-[var(--border)] rounded-lg p-5 hover:border-[var(--care)] transition-colors"><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-[var(--muted)] mb-1">{r.request_id}</p><p className="font-medium">{r.specialty ? `${r.specialty} — ` : ""}{r.request_type?.replace("_", " ") ?? "Classifying request…"}</p><p className="text-sm text-[var(--muted)] mt-1 line-clamp-1">{r.request}</p></div><StatusBadge status={r.workflow_status} /></div></Link>)}</div>
      </section>
    </PatientShell>
  );
}