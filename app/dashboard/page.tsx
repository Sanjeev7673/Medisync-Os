"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PatientShell from "@/components/PatientShell";
import StatusBadge from "@/components/StatusBadge";
import { PatientRequest } from "@/lib/types";

export default function DashboardPage() {
  const [requests, setRequests] = useState<PatientRequest[] | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then((data) => {
      const id = data?.user?.patientId;
      setPatientId(id ?? null);
      if (id) return fetch(`/api/requests?patient_id=${encodeURIComponent(id)}`).then((r) => r.json()).then((body) => setRequests(body.requests ?? []));
      setRequests([]);
    }).catch(() => setRequests([]));
  }, []);

  const active = requests?.filter((r) => !["COMPLETED", "CANCELLED"].includes(r.workflow_status)) ?? [];
  const completed = requests?.filter((r) => r.workflow_status === "COMPLETED").length ?? 0;

  return (
    <PatientShell>
      <div className="reveal">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Patient overview</p><h1 className="font-display text-4xl font-extrabold tracking-[-.04em] md:text-5xl">Good to see you.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Your care journey stays organized here — from the first request to the next confirmed step.</p></div>
          <Link href="/requests/new" className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-[var(--ink)] px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-900/10 transition-all hover:-translate-y-0.5">Start a new request <span className="transition-transform group-hover:translate-x-1">→</span></Link>
        </div>
      </div>

      <section className="reveal reveal-delay-1 mt-8 grid gap-4 md:grid-cols-[1.55fr_.85fr]">
        <div className="relative overflow-hidden rounded-[30px] bg-[var(--ink)] p-6 text-white shadow-[var(--shadow-md)] md:p-8">
          <div className="mesh-orb absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#B9C5EC]/20 blur-3xl" />
          <div className="relative"><div className="flex items-center justify-between"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-white/75">Care journey</span><span className="text-xs text-white/50">{patientId || "Secure session"}</span></div>
            <h2 className="mt-12 max-w-lg font-display text-3xl font-extrabold leading-tight tracking-[-.03em]">Keep moving forward, one care step at a time.</h2>
            <div className="mt-8 flex max-w-xl items-center gap-2"><div className="h-2 flex-1 rounded-full bg-white/15"><div className="h-full w-1/3 rounded-full bg-[#B9C5EC]" /></div><span className="text-xs font-semibold text-white/65">AI-assisted</span></div>
          </div>
        </div>
        <div className="glass rounded-[30px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">At a glance</p><div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[var(--care-soft)] p-4"><p className="font-display text-3xl font-extrabold text-[var(--care)]">{active.length}</p><p className="mt-1 text-xs font-semibold text-[var(--muted)]">Active journeys</p></div><div className="rounded-2xl bg-[var(--success-soft)] p-4"><p className="font-display text-3xl font-extrabold text-[var(--success)]">{completed}</p><p className="mt-1 text-xs font-semibold text-[var(--muted)]">Completed</p></div></div><p className="mt-5 text-xs leading-5 text-[var(--muted)]">AI helps coordinate administrative steps; clinical decisions remain with qualified specialists.</p></div>
      </section>

      <section className="reveal reveal-delay-2 mt-10"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Your care journeys</p><h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">Active requests</h2></div><span className="text-xs font-semibold text-[var(--muted)]">{requests?.length ?? "—"} total</span></div>
        {requests === null && <div className="glass rounded-[26px] p-8"><div className="h-3 w-40 animate-pulse rounded-full bg-black/5" /><div className="mt-4 h-3 w-72 animate-pulse rounded-full bg-black/5" /></div>}
        {requests?.length === 0 && <div className="glass rounded-[26px] p-10 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--care-soft)] text-xl text-[var(--care)]">✦</div><h3 className="mt-4 font-display text-lg font-bold">Your care journey starts here</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Tell MediSync what you need help with and we’ll route the administrative workflow to the appropriate next step.</p><Link href="/requests/new" className="mt-5 inline-flex rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-bold text-white">Submit your first request →</Link></div>}
        <div className="grid gap-4">{requests?.map((r, index) => <Link key={r.request_id} href={`/requests/${r.request_id}`} className="glass group reveal block rounded-[26px] p-5 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)] md:p-6" style={{ animationDelay: `${index * 70}ms` }}><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--care-soft)] text-[var(--care)]">✦</div><div><div className="flex flex-wrap items-center gap-2"><p className="font-display text-base font-extrabold">{r.specialty ? `${r.specialty} care` : "Care request"}</p><span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{r.request_id}</span></div><p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)] line-clamp-2">{r.request}</p></div></div><div className="flex items-center gap-4 pl-16 md:pl-0"><StatusBadge status={r.workflow_status} /><span className="text-lg text-[var(--muted)] transition-transform group-hover:translate-x-1">→</span></div></div></Link>)}</div>
      </section>
    </PatientShell>
  );
}
