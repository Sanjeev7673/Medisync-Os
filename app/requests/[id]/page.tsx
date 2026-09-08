"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import PatientShell from "@/components/PatientShell";
import StatusBadge from "@/components/StatusBadge";
import StatusRail from "@/components/StatusRail";
import { PatientRequest } from "@/lib/types";

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [record, setRecord] = useState<PatientRequest | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/requests/${id}`);
    if (res.ok) { const data = await res.json(); setRecord(data.request); setError(null); }
    else setError((await res.json().catch(() => ({})))?.error || "Unable to load request");
  }
  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  async function advance() { setAdvancing(true); await fetch("/api/dev/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: id }) }); await load(); setAdvancing(false); }

  if (error && !record) return <PatientShell><div className="glass rounded-[28px] p-8 text-center"><p className="font-display font-bold">{error}</p><Link href="/dashboard" className="mt-4 inline-flex text-sm font-bold text-[var(--care)]">Back to overview →</Link></div></PatientShell>;
  if (!record) return <PatientShell><div className="glass rounded-[28px] p-8"><div className="h-4 w-48 animate-pulse rounded-full bg-black/5"/><div className="mt-4 h-3 w-80 animate-pulse rounded-full bg-black/5"/></div></PatientShell>;

  const recommendation = record.hospital_matching?.recommendations?.[0];
  const isDone = record.workflow_status === "COMPLETED";

  return <PatientShell>
    <div className="reveal">
      <Link href="/dashboard" className="text-xs font-bold text-[var(--muted)] transition-colors hover:text-[var(--care)]">← Back to overview</Link>
      <header className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Care journey · {record.request_id}</p><h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.04em]">{record.specialty ? `${record.specialty} care` : "Care request"}</h1><p className="mt-2 text-sm text-[var(--muted)]">Submitted {new Date(record.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p></div><StatusBadge status={record.workflow_status} /></header>
    </div>

    <div className="mt-8 grid gap-5 lg:grid-cols-[.78fr_1.22fr]">
      <section className="glass reveal reveal-delay-1 rounded-[30px] p-6 md:p-7"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Journey status</p><h2 className="mt-1 font-display text-xl font-extrabold">Where things stand</h2></div><StatusRail request={record}/></section>
      <div className="reveal reveal-delay-2 space-y-5">
        <section className="rounded-[30px] bg-[var(--ink)] p-6 text-white md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Your request</p><p className="mt-4 font-display text-xl font-bold leading-8">“{record.request}”</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/65">{record.request_type?.replaceAll("_", " ") || "Processing"}</span>{record.specialty && <span className="rounded-full bg-[#B9C5EC]/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B9C5EC]">{record.specialty}</span>}</div></section>
        {record.specialist_review?.status && <section className="glass rounded-[30px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Human review</p><h3 className="mt-1 font-display text-xl font-extrabold">Specialist review</h3><div className="mt-5 rounded-2xl bg-[var(--care-soft)] p-4"><p className="text-sm font-bold">{record.specialist_review.status === "APPROVED" ? "Next steps approved" : `Review status: ${record.specialist_review.status.toLowerCase().replaceAll("_", " ")}`}</p>{record.specialist_review.reviewed_by && <p className="mt-1 text-xs text-[var(--muted)]">Reviewed by {record.specialist_review.reviewed_by}</p>}</div></section>}
        {recommendation && <section className="glass rounded-[30px] p-6 md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Hospital matching</p><h3 className="mt-1 font-display text-xl font-extrabold">Recommended provider</h3></div><span className="rounded-full bg-[var(--success-soft)] px-3 py-1.5 text-xs font-bold text-[var(--success)]">{Math.round(recommendation.match_score * 100)}% match</span></div><p className="mt-5 font-display text-lg font-bold">{recommendation.hospital_name}</p><div className="mt-3 flex flex-wrap gap-2">{recommendation.matched_capabilities.map((c) => <span key={c} className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--care)]">{c}</span>)}</div><p className="mt-4 text-sm leading-6 text-[var(--muted)]">{recommendation.reason}</p></section>}
        {record.referral?.referral_id && <section className="glass rounded-[30px] p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Referral</p><div className="mt-3 flex items-center justify-between"><p className="font-display font-bold">{record.referral.referral_id}</p><span className="text-xs font-bold text-[var(--care)]">{record.referral.status?.replaceAll("_", " ")}</span></div></section>}
        {record.appointment?.status === "SCHEDULED" && record.appointment.scheduled_at && <section className="glass rounded-[30px] p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Appointment</p><p className="mt-2 font-display text-lg font-bold">{new Date(record.appointment.scheduled_at).toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></section>}
        {!isDone && <div className="rounded-[22px] border border-dashed border-black/10 bg-white/45 p-4"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--muted)]">Development environment</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Workflow simulation remains available for testing until the live SNS stages are connected end-to-end.</p><button onClick={advance} disabled={advancing} className="mt-3 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{advancing ? "Advancing…" : "Advance workflow (dev)"}</button></div>}
      </div>
    </div>
  </PatientShell>;
}
