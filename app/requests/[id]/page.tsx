"use client";

import { useEffect, useMemo, useState, use as usePromise } from "react";
import Link from "next/link";
import PatientShell from "@/components/PatientShell";
import StatusBadge from "@/components/StatusBadge";
import StatusRail from "@/components/StatusRail";
import { PatientRequest } from "@/lib/types";

type HospitalMatch = {
  hospital_id: string;
  hospital_name: string;
  city: string | null;
  state: string | null;
  address: string;
  specialties: string[];
  matched_capabilities: string[];
  match_basis: string;
  medisync_tier: string | null;
  tier_basis?: string | null;
};

const TIER_ORDER = ["Tier 1", "Tier 2", "Tier 3", "Unverified tier"] as const;

const tierDescription: Record<string, string> = {
  "Tier 1": "Providers with a verified Tier 1 classification in the MediSync hospital catalog.",
  "Tier 2": "Providers with a verified Tier 2 classification in the MediSync hospital catalog.",
  "Tier 3": "Providers with a verified Tier 3 classification in the MediSync hospital catalog.",
  "Unverified tier": "Active providers with documented capabilities whose MediSync tier has not yet been verified.",
};

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [record, setRecord] = useState<PatientRequest | null>(null);
  const [matches, setMatches] = useState<HospitalMatch[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>("All tiers");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/requests/${id}`, { cache: "no-store" });
    if (res.ok) { const data = await res.json(); setRecord(data.request); setError(null); }
    else setError((await res.json().catch(() => ({})))?.error || "Unable to load request");
  }

  async function loadMatches() {
    setMatchLoading(true);
    try { const res = await fetch(`/api/requests/${id}/hospitals`, { cache: "no-store" }); const data = await res.json(); if (res.ok) setMatches(data.hospitals || []); }
    finally { setMatchLoading(false); }
  }

  useEffect(() => { load().catch(() => setError("Unable to load request")); loadMatches().catch(() => setMatchLoading(false)); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const tierGroups = useMemo(() => {
    const filtered = selectedTier === "All tiers" ? matches : matches.filter((match) => (match.medisync_tier || "Unverified tier") === selectedTier);
    return TIER_ORDER.map((tier) => ({ tier, hospitals: filtered.filter((match) => (match.medisync_tier || "Unverified tier") === tier) })).filter((group) => group.hospitals.length > 0);
  }, [matches, selectedTier]);

  if (error && !record) return <PatientShell><div className="glass rounded-[28px] p-8 text-center"><p className="font-display font-bold">{error}</p><Link href="/dashboard" className="mt-4 inline-flex text-sm font-bold text-[var(--care)]">Back to overview →</Link></div></PatientShell>;
  if (!record) return <PatientShell><div className="glass rounded-[28px] p-8"><div className="h-4 w-48 animate-pulse rounded-full bg-black/5"/><div className="mt-4 h-3 w-80 animate-pulse rounded-full bg-black/5"/></div></PatientShell>;

  const recommendation = record.hospital_matching?.recommendations?.[0];
  const tierCounts = TIER_ORDER.map((tier) => ({ tier, count: matches.filter((match) => (match.medisync_tier || "Unverified tier") === tier).length })).filter((item) => item.count > 0);

  return <PatientShell>
    <div className="reveal"><Link href="/dashboard" className="text-xs font-bold text-[var(--muted)] transition-colors hover:text-[var(--care)]">← Back to overview</Link><header className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Care journey · {record.request_id}</p><h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.04em]">{record.specialty ? `${record.specialty} care` : "Care request"}</h1><p className="mt-2 text-sm text-[var(--muted)]">Submitted {new Date(record.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p></div><StatusBadge status={record.workflow_status} /></header></div>

    <div className="mt-8 grid gap-5 lg:grid-cols-[.78fr_1.22fr]">
      <section className="glass reveal reveal-delay-1 rounded-[30px] p-6 md:p-7"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Journey status</p><h2 className="mt-1 font-display text-xl font-extrabold">Where things stand</h2></div><StatusRail request={record}/></section>
      <div className="reveal reveal-delay-2 space-y-5">
        <section className="rounded-[30px] bg-[var(--ink)] p-6 text-white md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Your request</p><p className="mt-4 font-display text-xl font-bold leading-8">“{record.request}”</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/65">{record.request_type?.replaceAll("_", " ") || "Processing"}</span>{record.specialty && <span className="rounded-full bg-[#B9C5EC]/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B9C5EC]">{record.specialty}</span>}</div></section>

        {(record.request_type || record.ai_confidence !== null || record.classification_reason) && <section className="glass rounded-[30px] p-6 md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">AI-assisted classification</p><h3 className="mt-1 font-display text-xl font-extrabold">Administrative triage</h3></div>{record.ai_confidence !== null && <span className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-xs font-bold text-[var(--care)]">{Math.round(record.ai_confidence * 100)}% confidence</span>}</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-black/[.03] p-4"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--muted)]">Workflow category</p><p className="mt-1 text-sm font-bold">{record.request_type?.replaceAll("_", " ") || "Not classified yet"}</p></div><div className="rounded-2xl bg-black/[.03] p-4"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--muted)]">Specialist review</p><p className="mt-1 text-sm font-bold">{record.specialist_review_required === true ? "Required" : record.specialist_review_required === false ? "Not required" : "Pending classification"}</p></div></div>{record.classification_reason && <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{record.classification_reason}</p>}<p className="mt-4 text-[11px] leading-5 text-[var(--muted)]">AI assists administrative routing only. It does not diagnose, prescribe, or make autonomous clinical decisions.</p></section>}

        {record.specialist_review?.status && <section className="glass rounded-[30px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Human review</p><h3 className="mt-1 font-display text-xl font-extrabold">Specialist review</h3><div className="mt-5 rounded-2xl bg-[var(--care-soft)] p-4"><p className="text-sm font-bold">{record.specialist_review.status === "APPROVED" ? "Next steps approved" : `Review status: ${record.specialist_review.status.toLowerCase().replaceAll("_", " ")}`}</p>{record.specialist_review.reviewed_by && <p className="mt-1 text-xs text-[var(--muted)]">Assigned specialist: {record.specialist_review.reviewed_by}</p>}</div></section>}

        <section className="glass rounded-[30px] p-6 md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Receiving-provider review</p><h3 className="mt-1 font-display text-xl font-extrabold">Relevant hospitals by MediSync tier</h3></div><button onClick={loadMatches} disabled={matchLoading} className="text-xs font-bold text-[var(--care)]">{matchLoading ? "Refreshing…" : "Refresh"}</button></div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Hospitals are first matched to the request specialty and documented capabilities, then organized by their verified MediSync Hospital Tier. This helps you compare providers at different tiers without treating tier as a clinical quality guarantee.</p>

          {tierCounts.length > 0 && <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setSelectedTier("All tiers")} className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition ${selectedTier === "All tiers" ? "bg-[var(--ink)] text-white" : "bg-black/[.04] text-[var(--muted)]"}`}>All tiers · {matches.length}</button>{tierCounts.map(({ tier, count }) => <button key={tier} onClick={() => setSelectedTier(tier)} className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition ${selectedTier === tier ? "bg-[var(--care)] text-white" : "bg-black/[.04] text-[var(--muted)]"}`}>{tier} · {count}</button>)}</div>}

          {matchLoading && !matches.length ? <div className="mt-5 h-24 animate-pulse rounded-2xl bg-black/5"/> : matches.length ? <div className="mt-5 space-y-6">{tierGroups.map((group) => <div key={group.tier}><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--care)]">MediSync Hospital Tier</p><h4 className="mt-1 font-display text-lg font-extrabold">{group.tier}</h4><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{tierDescription[group.tier]}</p></div><span className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--care)]">{group.hospitals.length} match{group.hospitals.length === 1 ? "" : "es"}</span></div><div className="space-y-3">{group.hospitals.slice(0, 5).map((match) => <div key={match.hospital_id} className="rounded-2xl border border-black/[.06] bg-white/80 p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="font-display text-lg font-bold">{match.hospital_name}</p><p className="mt-1 text-xs text-[var(--muted)]">{[match.address, match.city, match.state].filter(Boolean).join(", ") || "Provider location available"}</p></div><span className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--care)]">{match.medisync_tier || "Tier not verified"}</span></div><p className="mt-4 text-xs font-semibold text-[var(--muted-strong)]">{match.match_basis}</p>{match.tier_basis && <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">Tier basis: {match.tier_basis}</p>}{match.matched_capabilities.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{match.matched_capabilities.map((capability) => <span key={capability} className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--care)]">{capability}</span>)}</div>}<p className="mt-4 text-[11px] leading-5 text-[var(--muted)]">Existing investigation acceptance is decided by the receiving provider. This match does not guarantee acceptance or eliminate the need for a new investigation.</p></div>)}</div></div>)}{!tierGroups.length && <div className="rounded-2xl bg-white/70 p-5"><p className="text-sm font-bold">No hospitals in this tier.</p><button onClick={() => setSelectedTier("All tiers")} className="mt-2 text-xs font-bold text-[var(--care)]">View all tiers →</button></div>}</div> : <div className="mt-5 rounded-2xl bg-white/70 p-5"><p className="text-sm font-bold">No documented matches yet.</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Provider capabilities may be added as the hospital network is onboarded.</p></div>}
        </section>

        {recommendation && <section className="glass rounded-[30px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Workflow recommendation</p><p className="mt-3 font-display text-lg font-bold">{recommendation.hospital_name}</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{recommendation.reason}</p></section>}
        {record.referral?.referral_id && <section className="glass rounded-[30px] p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Referral</p><div className="mt-3 flex items-center justify-between"><p className="font-display font-bold">{record.referral.referral_id}</p><span className="text-xs font-bold text-[var(--care)]">{record.referral.status?.replaceAll("_", " ")}</span></div></section>}
        {record.appointment?.status === "SCHEDULED" && record.appointment.scheduled_at && <section className="glass rounded-[30px] p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Appointment</p><p className="mt-2 font-display text-lg font-bold">{new Date(record.appointment.scheduled_at).toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></section>}
      </div>
    </div>
  </PatientShell>;
}
