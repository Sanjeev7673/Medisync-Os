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

const hospitalBrandDomains: Record<string, string> = {
  "apollo": "apollohospitals.com",
  "frontier": "frontierlifeline.com",
  "mgm healthcare": "mgmhealthcare.in",
};

function getHospitalLogo(name: string) {
  const normalized = name.toLowerCase();
  const key = Object.keys(hospitalBrandDomains).find((brand) => normalized.includes(brand));
  if (!key) return null;
  return `https://www.google.com/s2/favicons?domain=${hospitalBrandDomains[key]}&sz=128`;
}

function getInitials(name: string) {
  return name
    .replace(/\([^)]*\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

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
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {result.matches.map((hospital) => {
                  const logo = getHospitalLogo(hospital.hospitalName);
                  return (
                    <article key={`${hospital.hospitalName}-${hospital.city}`} className="glass overflow-hidden rounded-[28px] p-5 md:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-white p-2 shadow-sm">
                            {logo ? (
                              <img
                                src={logo}
                                alt={`${hospital.hospitalName} logo`}
                                className="h-full w-full object-contain"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-lg font-extrabold text-[var(--care)]">{getInitials(hospital.hospitalName)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--muted)]">Matched provider</p>
                            <h3 className="mt-1 font-display text-lg font-extrabold leading-tight">{hospital.hospitalName}</h3>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--care)]">{hospital.tier}</span>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[var(--muted)]">
                        <span className="rounded-full bg-black/[.04] px-3 py-1.5">📍 {hospital.city}</span>
                        <span className="rounded-full bg-black/[.04] px-3 py-1.5">🏥 {hospital.ownership}</span>
                      </div>

                      <div className="mt-4 rounded-2xl bg-[var(--care-soft)] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--muted)]">Known for</p>
                        <p className="mt-1 text-sm leading-5 text-[var(--muted-strong)]">{hospital.knownFor}</p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-black/5 bg-white px-3 py-1.5 text-xs font-semibold">{hospital.specialty}</span>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <button type="button" className="min-h-10 flex-1 rounded-xl border border-[var(--ink)] px-3 py-2 text-xs font-bold text-[var(--ink)]">View Details</button>
                        <button type="button" className="min-h-10 flex-1 rounded-xl bg-[var(--ink)] px-3 py-2 text-xs font-bold text-white">Contact Hospital ↗</button>
                      </div>
                    </article>
                  );
                })}
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
