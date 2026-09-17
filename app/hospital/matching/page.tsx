"use client";

import { FormEvent, useState } from "react";
import RoleShell from "@/components/RoleShell";

type HospitalMatch = {
  hospitalName: string;
  city: string;
  tier: string;
  specialty: string;
  ownership: string;
  knownFor: string;
};

type MatchResponse = {
  matches: HospitalMatch[];
  count?: number;
  source?: string;
  demo?: boolean;
  disclaimer?: string;
};

export default function HospitalMatchingPage() {
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [hospitalTier, setHospitalTier] = useState("");
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function findHospitals(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/hospitals/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialty, city, hospitalTier }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Unable to find matching hospitals");
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to find matching hospitals");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RoleShell role="hospital">
      <div className="reveal max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">SNS workflow</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.04em] md:text-5xl">Hospital matching.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Search the MediSync hospital dataset through the connected SNS Workbench workflow.
        </p>

        <form onSubmit={findHospitals} className="glass mt-8 grid gap-3 rounded-[26px] p-4 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Specialty</span>
            <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Cardiology" className="min-h-12 w-full rounded-2xl border border-black/8 bg-white px-4 text-sm outline-none focus:border-[var(--care)]" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">City</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Chennai" className="min-h-12 w-full rounded-2xl border border-black/8 bg-white px-4 text-sm outline-none focus:border-[var(--care)]" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Tier</span>
            <select value={hospitalTier} onChange={(e) => setHospitalTier(e.target.value)} className="min-h-12 w-full rounded-2xl border border-black/8 bg-white px-4 text-sm outline-none">
              <option value="">Any tier</option>
              <option value="Tier 1">Tier 1</option>
              <option value="Tier 2">Tier 2</option>
              <option value="Tier 3">Tier 3</option>
            </select>
          </label>
          <button disabled={loading} className="min-h-12 rounded-2xl bg-[var(--ink)] px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Finding…" : "Find hospitals →"}
          </button>
        </form>

        {error && <div className="mt-5 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</div>}

        {result && (
          <section className="reveal reveal-delay-1 mt-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Matching results</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold">{result.count ?? result.matches.length} hospitals found</h2>
              </div>
              {result.demo && <span className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--care)]">Demo dataset</span>}
            </div>

            {result.matches.length ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {result.matches.map((hospital) => (
                  <article key={`${hospital.hospitalName}-${hospital.city}`} className="glass rounded-[28px] p-6 md:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--muted)]">Matched provider</p>
                        <h3 className="mt-1 font-display text-xl font-extrabold">{hospital.hospitalName}</h3>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--care)]">{hospital.tier}</span>
                    </div>
                    <p className="mt-4 text-sm text-[var(--muted)]">{hospital.city}</p>
                    <p className="mt-2 text-xs font-semibold text-[var(--muted-strong)]">{hospital.ownership}</p>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{hospital.knownFor}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="rounded-full bg-black/[.04] px-3 py-1.5 text-xs font-semibold">{hospital.specialty}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="glass mt-5 rounded-[28px] p-10 text-center">
                <h3 className="font-display text-xl font-bold">No matching hospitals found.</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">Try another specialty, city, or tier.</p>
              </div>
            )}

            <div className="mt-5 rounded-[24px] bg-[var(--care-soft)] px-5 py-4 text-xs leading-5 text-[var(--muted-strong)]">
              <strong>Source:</strong> {result.source || "MediSync hospital dataset"}. {result.disclaimer || "Hospital information and tier classification are dataset-based and not live clinical or quality verification."}
            </div>
          </section>
        )}
      </div>
    </RoleShell>
  );
}
