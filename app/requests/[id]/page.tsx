"use client";

import { useEffect, useState, use as usePromise } from "react";
import PatientShell from "@/components/PatientShell";
import StatusBadge from "@/components/StatusBadge";
import StatusRail from "@/components/StatusRail";
import { PatientRequest } from "@/lib/types";

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [record, setRecord] = useState<PatientRequest | null>(null);
  const [advancing, setAdvancing] = useState(false);
  async function load() {
    const res = await fetch(`/api/requests/${id}`);
    if (res.ok) { const data = await res.json(); setRecord((prev) => ({ ...(prev ?? ({} as PatientRequest)), ...data.request })); }
  }
  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  async function advance() { setAdvancing(true); await fetch("/api/dev/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: id }) }); await load(); setAdvancing(false); }
  if (!record) return <PatientShell><p className="text-sm text-[var(--muted)]">Loading…</p></PatientShell>;
  const recommendation = record.hospital_matching?.recommendations?.[0]; const isDone = record.workflow_status === "COMPLETED";
  return (
    <PatientShell>
      <header className="mb-8 flex items-start justify-between gap-4"><div><p className="text-xs text-[var(--muted)] mb-1">{record.request_id}</p><h1 className="font-display font-bold text-2xl">{record.specialty ? `${record.specialty} request` : "Request"}</h1></div><StatusBadge status={record.workflow_status} /></header>
      <div className="grid md:grid-cols-[280px_1fr] gap-10"><div><h2 className="font-display font-semibold text-sm uppercase tracking-wide text-[var(--muted)] mb-4">Status</h2><StatusRail request={record} /></div>
        <div className="flex flex-col gap-6">
          <section className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-5"><h3 className="text-sm font-semibold mb-2">What you told us</h3><p className="text-sm text-[var(--muted)]">{record.request}</p></section>
          {record.specialist_review?.status && <section className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-5"><h3 className="text-sm font-semibold mb-2">Specialist review</h3><p className="text-sm text-[var(--muted)]">{record.specialist_review.status === "APPROVED" ? "A specialist reviewed your request and approved next steps." : "A specialist reviewed your request."}{record.specialist_review.reviewed_by && ` — reviewed by ${record.specialist_review.reviewed_by}`}</p></section>}
          {recommendation && <section className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-5"><h3 className="text-sm font-semibold mb-3">Recommended hospital</h3><div className="flex items-center justify-between mb-3"><p className="font-medium">{recommendation.hospital_name}</p><span className="text-sm font-semibold" style={{ color: "var(--care)" }}>{Math.round(recommendation.match_score * 100)}% match</span></div><p className="text-xs text-[var(--muted)] mb-2">Why this hospital:</p><ul className="flex flex-wrap gap-2 mb-3">{recommendation.matched_capabilities.map((c) => <li key={c} className="text-xs rounded-full px-2.5 py-1" style={{ background: "var(--care-soft)", color: "var(--care)" }}>{c}</li>)}</ul><p className="text-sm text-[var(--muted)]">{recommendation.reason}</p></section>}
          {record.referral?.referral_id && <section className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-5"><h3 className="text-sm font-semibold mb-2">Referral</h3><p className="text-sm text-[var(--muted)]">Referral {record.referral.referral_id} — {record.referral.status?.toLowerCase()}</p></section>}
          {record.appointment?.status === "SCHEDULED" && record.appointment.scheduled_at && <section className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-5"><h3 className="text-sm font-semibold mb-2">Appointment</h3><p className="text-sm text-[var(--muted)]">Scheduled for {new Date(record.appointment.scheduled_at).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p></section>}
          {!isDone && <div className="border-t border-dashed border-[var(--border)] pt-5 mt-2"><p className="text-xs text-[var(--muted)] mb-2">Dev tool — not part of the product. Simulates the next SNS Workbench stage until the real workflow is wired to <code className="text-xs">/api/webhooks/sns</code>.</p><button onClick={advance} disabled={advancing} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--care-soft)] transition-colors disabled:opacity-50">{advancing ? "Advancing…" : "Advance workflow (dev)"}</button></div>}
        </div>
      </div>
    </PatientShell>
  );
}