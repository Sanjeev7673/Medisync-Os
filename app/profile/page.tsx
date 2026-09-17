"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const roleLabels: Record<string, string> = {
  patient: "Patient",
  hospital: "Hospital",
  insurance_agent: "Insurance Agent",
  specialist: "Specialist",
  admin: "Administrator",
};

type User = {
  name?: string;
  email?: string;
  role?: string;
  medisyncId?: string;
  patientId?: string;
  hospitalId?: string;
  insuranceAgentId?: string;
  organizationId?: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .finally(() => setLoading(false));
  }, []);

  const name = user?.name || user?.email?.split("@")[0] || "MediSync User";
  const role = roleLabels[user?.role || ""] || "MediSync User";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "MS";
  const identityId = user?.medisyncId || user?.patientId || user?.hospitalId || user?.insuranceAgentId;
  const dashboard = user?.role === "hospital" ? "/hospital/dashboard" : user?.role === "insurance_agent" ? "/insurance/dashboard" : user?.role === "specialist" ? "/specialist/dashboard" : user?.role === "admin" ? "/admin/dashboard" : "/patient/dashboard";

  return (
    <main className="mesh-bg min-h-screen px-5 py-6 text-[var(--ink)] md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href={dashboard} className="text-sm font-bold text-[var(--care)] transition hover:translate-x-[-2px]">← Back to workspace</Link>
          <span className="rounded-full bg-white/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)] shadow-sm">Secure profile</span>
        </div>

        <section className="glass animate-scale-in overflow-hidden rounded-[32px] shadow-[var(--shadow-md)]">
          <div className="relative overflow-hidden bg-[var(--ink)] px-6 py-10 text-white md:px-10 md:py-12">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--care)]/30 blur-3xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="float-card flex h-24 w-24 shrink-0 items-center justify-center rounded-[28px] bg-white/10 text-3xl font-extrabold ring-1 ring-white/15 backdrop-blur-xl">{loading ? "…" : initials}</div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[.22em] text-white/45">MediSync account</p>
                <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{loading ? "Loading profile" : name}</h1>
                <p className="mt-2 text-sm text-white/60">{user?.email || "Authenticated account"}</p>
                <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{role}</span>{identityId && <span className="rounded-full bg-white/10 px-3 py-1.5 font-mono text-[10px] font-semibold text-white/65">ID · {identityId}</span>}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2 md:p-10">
            <section className="rounded-[24px] border border-black/5 bg-white/70 p-6">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--muted)]">Account details</p>
              <div className="mt-5 space-y-4">
                <div><p className="text-xs text-[var(--muted)]">Full name</p><p className="mt-1 font-semibold">{name}</p></div>
                <div><p className="text-xs text-[var(--muted)]">Email</p><p className="mt-1 break-all font-semibold">{user?.email || "—"}</p></div>
                <div><p className="text-xs text-[var(--muted)]">Role</p><p className="mt-1 font-semibold">{role}</p></div>
              </div>
            </section>

            <section className="rounded-[24px] border border-black/5 bg-white/70 p-6">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--muted)]">MediSync identity</p>
              <div className="mt-5 space-y-4">
                <div><p className="text-xs text-[var(--muted)]">MediSync ID</p><p className="mt-1 break-all font-mono text-sm font-semibold">{user?.medisyncId || "—"}</p></div>
                <div><p className="text-xs text-[var(--muted)]">Role-linked ID</p><p className="mt-1 break-all font-mono text-sm font-semibold">{identityId || "—"}</p></div>
                <div><p className="text-xs text-[var(--muted)]">Organization</p><p className="mt-1 break-all font-mono text-sm font-semibold">{user?.organizationId || "—"}</p></div>
              </div>
            </section>

            <section className="rounded-[24px] border border-black/5 bg-[var(--care-soft)] p-6 md:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--care)]">Privacy & security</p>
              <div className="mt-4 grid gap-3 text-sm text-[var(--muted-strong)] md:grid-cols-3">
                <p>✓ Authenticated session</p><p>✓ Role-based workspace access</p><p>✓ Patient-scoped records where applicable</p>
              </div>
              <p className="mt-5 text-xs leading-5 text-[var(--muted)]">Your profile uses the authenticated MediSync session. Sensitive account credentials are not displayed here.</p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
