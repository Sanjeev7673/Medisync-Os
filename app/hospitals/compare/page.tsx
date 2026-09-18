"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PatientShell from "@/components/PatientShell";
import Link from "next/link";

type Hospital = {
  hospitalName: string;
  city: string;
  district?: string;
  tier: string;
  specialty: string;
  emoji?: string;
  ownership: string;
  knownFor: string;
  logoUrl?: string;
  logoFallback?: string;
  cost?: string;
  costTreatment?: string;
  costType?: string;
  costSource?: string;
};

type MatchData = {
  matches: Hospital[];
  count?: number;
  source?: string;
  demo?: boolean;
  disclaimer?: string;
};

function ComparePageContent() {
  const params = useSearchParams();
  const specialty = params.get("specialty") || "";
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!specialty) {
      setLoading(false);
      setError("The AI report did not provide a specialty for hospital matching.");
      return;
    }

    setLoading(true);
    setError("");
    fetch("/api/hospitals/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "patient-portal-user",
        specialty,
        city: "",
        hospitalTier: "",
      }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || result?.success === false) throw new Error(result?.error || "Unable to load hospitals");
        return result;
      })
      .then((result) => setData(result.data || { matches: [] }))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load hospitals"))
      .finally(() => setLoading(false));
  }, [specialty]);

  const matches = useMemo(() => data?.matches || [], [data]);

  return (
    <PatientShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <Link href="/patient/dashboard" className="hover:text-[#075e66]">Overview</Link><span>›</span>
            <Link href="/documents" className="hover:text-[#075e66]">Documents</Link><span>›</span>
            <span className="text-[#075e66]">Hospital matching</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/documents" className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-[#075e66] hover:bg-[#f2f8f9]">← Documents</Link>
            <Link href="/requests/new" className="rounded-xl bg-[#075e66] px-3 py-2 text-xs font-bold text-white hover:bg-[#064f56]">＋ New request</Link>
          </div>
        </div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">MediSync hospital matching</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.04em]">Compare Hospitals</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Hospitals are matched from the specialty explicitly returned by the patient report AI analysis. MediSync does not infer a diagnosis or claim that one hospital is clinically better than another.
        </p>

        <div className="mt-6 rounded-[24px] border border-[#0b5960]/10 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Report specialty</p>
          <p className="mt-2 text-xl font-extrabold text-[#075e66]">{specialty || "Not provided"}</p>
        </div>

        {loading && <div className="mt-6 rounded-[24px] bg-white p-8 text-sm font-semibold text-slate-600 shadow-sm">Finding hospitals…</div>}
        {error && <div className="mt-6 rounded-[24px] border border-red-100 bg-white p-8 shadow-sm"><p className="text-sm font-semibold text-red-600">{error}</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/documents" className="rounded-xl border border-black/10 px-4 py-2 text-xs font-bold text-[#075e66]">Back to documents</Link><Link href="/requests/new" className="rounded-xl bg-[#075e66] px-4 py-2 text-xs font-bold text-white">Create new request</Link></div></div>}

        {!loading && !error && (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Link href="/documents" className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-[#075e66] hover:bg-[#f2f8f9]">← Documents</Link>
                <Link href="/patient/dashboard" className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Dashboard</Link>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-extrabold">Hospitals for {specialty}</h2>
                <p className="mt-1 text-xs text-slate-500">{matches.length} matching dataset entries</p>
              </div>
            </div>

            {matches.length === 0 ? (
              <div className="mt-5 rounded-[24px] bg-white p-8 text-sm text-slate-600 shadow-sm">No hospitals were returned for this specialty.</div>
            ) : (
              <div className="mt-5 space-y-8">
                {(["Tier 1", "Tier 2", "Tier 3"] as const).map((tier) => {
                  const tierMatches = matches.filter((hospital) => hospital.tier.trim().toLowerCase() === tier.toLowerCase());
                  if (!tierMatches.length) return null;
                  return (
                    <section key={tier}>
                      <div className="mb-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#075e66]">Dataset tier</p>
                          <h3 className="mt-1 text-xl font-extrabold text-[#102a32]">{tier}</h3>
                        </div>
                        <span className="rounded-full bg-[#eaf5f6] px-3 py-1.5 text-[10px] font-bold text-[#075e66]">{tierMatches.length} {tierMatches.length === 1 ? "hospital" : "hospitals"}</span>
                      </div>
                      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {tierMatches.map((hospital, index) => (
                          <article key={`${hospital.hospitalName}-${hospital.city}-${index}`} className="overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-sm">
                            <div className="flex items-center gap-4 border-b border-black/5 p-5">
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f1f7f8] text-xl font-black text-[#075e66]">
                                {hospital.logoUrl ? <img src={hospital.logoUrl} alt="" className="h-10 w-10 object-contain" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span>{hospital.logoFallback || hospital.hospitalName.slice(0, 2).toUpperCase()}</span>}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-extrabold leading-5 text-[#102a32]">{hospital.emoji || "🏥"} {hospital.hospitalName}</h3>
                                <p className="mt-1 text-xs text-slate-500">{hospital.city}{hospital.district && hospital.district !== hospital.city ? ` · ${hospital.district}` : ""}</p>
                              </div>
                            </div>
                            <div className="space-y-4 p-5 text-xs">
                              <div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#eaf5f6] px-3 py-1 font-bold text-[#075e66]">{hospital.tier}</span><span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">{hospital.ownership}</span></div>
                              <div><p className="font-black uppercase tracking-[.12em] text-[9px] text-slate-400">Known for</p><p className="mt-1 leading-5 text-slate-700">{hospital.knownFor || "Not provided"}</p></div>
                              <div><p className="font-black uppercase tracking-[.12em] text-[9px] text-slate-400">Cost information</p><p className="mt-1 font-bold text-[#123f44]">{hospital.cost || "Requires hospital confirmation"}</p>{hospital.costTreatment && <p className="mt-1 text-[10px] text-slate-500">Reference treatment: {hospital.costTreatment}</p>}{hospital.costType === "REFERENCE_ESTIMATE" && <p className="mt-1 text-[10px] text-amber-700">Reference estimate, not a guaranteed tariff.</p>}</div>
                              {hospital.costSource && <p className="border-t border-black/5 pt-3 text-[9px] leading-4 text-slate-400">Source: {hospital.costSource}</p>}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            <div className="mt-6 rounded-2xl bg-[#f2f8f9] p-5 text-[10px] leading-5 text-slate-500">
              {data?.disclaimer || "Hospital information is dataset-based. Cost information may require hospital confirmation. No live availability or clinical quality ranking is implied."}
            </div>
          </>
        )}
      </div>
    </PatientShell>
  );
}

export default function CompareHospitalsPage() {
  return <Suspense fallback={<PatientShell><div className="p-8 text-sm text-slate-500">Loading hospital comparison…</div></PatientShell>}><ComparePageContent /></Suspense>;
}
