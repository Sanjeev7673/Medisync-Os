"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PatientShell from "@/components/PatientShell";

type Hospital = {
  id: string; name: string; address_line1: string | null; city: string | null; state: string | null; phone: string | null;
  specialties: string[]; capabilities: string[]; medisync_tier: "Tier 1" | "Tier 2" | "Tier 3" | null; tier_basis: string | null;
  catalog_metadata: Record<string, unknown>;
};

const tiers = ["", "Tier 1", "Tier 2", "Tier 3"] as const;

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [specialty, setSpecialty] = useState("");
  const [tier, setTier] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(value = specialty, selectedTier = tier) {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (value.trim()) params.set("specialty", value.trim());
      if (selectedTier) params.set("tier", selectedTier);
      const query = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(`/api/hospitals${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load hospitals");
      setHospitals(data.hospitals || []);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load hospitals"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load("", ""); }, []);

  return <PatientShell>
    <div className="reveal max-w-6xl">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Provider network</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.04em] md:text-5xl">Find a receiving hospital.</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">Explore hospitals from the MediSync Tamil Nadu catalog by documented provider information. Tiering is shown from the supplied catalog and is not a clinical quality guarantee.</p>

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="glass mt-8 flex flex-col gap-3 rounded-[26px] p-4 md:flex-row">
        <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Filter by specialty, e.g. Orthopaedics" className="min-h-12 flex-1 rounded-2xl border border-black/8 bg-white px-4 text-sm outline-none focus:border-[var(--care)]" />
        <select value={tier} onChange={(e) => { setTier(e.target.value); load(specialty, e.target.value); }} className="min-h-12 rounded-2xl border border-black/8 bg-white px-4 text-sm outline-none">
          <option value="">All MediSync tiers</option>{tiers.slice(1).map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="rounded-2xl bg-[var(--ink)] px-6 py-3 text-sm font-bold text-white">Find hospitals →</button>
      </form>

      <div className="mt-7 rounded-[24px] bg-[var(--care-soft)] px-5 py-4 text-xs leading-5 text-[var(--muted-strong)]"><strong>MediSync Hospital Tier:</strong> the current primary tier is sourced from the workbook's <strong>By Hospital Type</strong> classification. The workbook also contains city, bed-capacity and multi-specialty classifications; those remain source data and are not silently merged into a single quality score.</div>

      {error && <div className="mt-5 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</div>}
      {loading ? <div className="mt-6 grid gap-4 md:grid-cols-2"><div className="glass h-56 animate-pulse rounded-[28px]"/><div className="glass h-56 animate-pulse rounded-[28px]"/></div> : hospitals.length ? <div className="mt-6 grid gap-4 md:grid-cols-2">{hospitals.map((hospital) => { const meta = hospital.catalog_metadata || {}; return <article key={hospital.id} className="glass rounded-[28px] p-6 md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--muted)]">Active provider</p><h2 className="mt-1 font-display text-xl font-extrabold">{hospital.name}</h2></div>{hospital.medisync_tier ? <span className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--care)]">{hospital.medisync_tier}</span> : <span className="rounded-full bg-black/[.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Tier not listed</span>}</div><p className="mt-4 text-sm text-[var(--muted)]">{[hospital.address_line1, hospital.city, hospital.state].filter(Boolean).join(", ") || "Location available in provider profile"}</p>{hospital.medisync_tier && <p className="mt-2 text-[11px] text-[var(--muted)]">Tier basis: {hospital.tier_basis || "catalog"}</p>}{typeof meta.ownership === "string" && <p className="mt-2 text-xs font-semibold text-[var(--muted-strong)]">{meta.ownership}</p>}{typeof meta.notes === "string" && <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{meta.notes}</p>}{hospital.specialties.length > 0 && <div className="mt-5"><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Specialties</p><div className="mt-2 flex flex-wrap gap-2">{hospital.specialties.slice(0, 6).map((item) => <span key={item} className="rounded-full bg-black/[.04] px-3 py-1.5 text-xs font-semibold">{item}</span>)}</div></div>} {hospital.capabilities.length > 0 && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Documented capabilities</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{hospital.capabilities.join(" · ")}</p></div>}<Link href="/requests/new" className="mt-6 inline-flex rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white">Continue with MediSync request →</Link></article>; })}</div> : <div className="glass mt-6 rounded-[28px] p-10 text-center"><h2 className="font-display text-xl font-bold">No matching hospitals found.</h2><p className="mt-2 text-sm text-[var(--muted)]">Try another specialty or tier, or continue your care request so the workflow can determine the appropriate provider route.</p></div>}
    </div>
  </PatientShell>;
}
