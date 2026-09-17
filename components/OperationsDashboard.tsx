"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OperationsShell from "@/components/OperationsShell";

type Role = "specialist" | "admin";
type SessionUser = { email?: string; name?: string; role?: string; specialistId?: string };
type AdminMetrics = {
  users: number;
  hospitals: number;
  insuranceOrganizations: number;
  specialists: number;
  activeWorkflows: number;
  pendingReviews: number;
  failedWorkflows: number;
};

const config = {
  specialist: {
    eyebrow: "Specialist workspace",
    title: "Review the right case, at the right time.",
    description: "AI-assisted summaries and workflow context help authorized specialists review requests without losing human control.",
    primary: ["Open review queue", "/specialist/reviews"],
    metrics: ["Pending reviews", "In progress", "Needs information", "Completed"],
    steps: ["Request received", "AI classification", "Patient context", "Specialist review", "Referral"],
    guidance: ["Review the AI classification", "Check patient context and documents", "Approve, reject or request more information"],
  },
  admin: {
    eyebrow: "Administration workspace",
    title: "Run healthcare administration from one control plane.",
    description: "Coordinate operational records, provider credentials, insurance organizations and workflow exceptions with an auditable trail.",
    primary: ["Review workflows", "/admin/requests"],
    metrics: ["Users", "Hospitals", "Insurance organizations", "Specialists", "Active workflows", "Pending reviews", "Failed workflows"],
    steps: ["Data received", "Validation", "AI assistance", "Human review", "Audited outcome"],
    guidance: ["Resolve missing or inconsistent operational information", "Review credential and organization exceptions", "Keep sensitive outcomes human-approved and auditable"],
  },
} as const;

export default function OperationsDashboard({ role }: { role: Role }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [metricsError, setMetricsError] = useState(false);
  const c = config[role];

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        const session = data?.user as SessionUser | undefined;
        if (!session) { router.replace("/login"); return; }
        if (session.role !== role) {
          if (session.role === "hospital") router.replace("/hospital/dashboard");
          else if (session.role === "insurance_agent") router.replace("/insurance/dashboard");
          else if (session.role === "specialist") router.replace("/specialist/dashboard");
          else if (session.role === "admin") router.replace("/admin/dashboard");
          else router.replace("/patient/dashboard");
          return;
        }
        setUser(session);
        if (role === "admin") {
          fetch("/api/admin/overview")
            .then((response) => {
              if (!response.ok) throw new Error("metrics unavailable");
              return response.json();
            })
            .then((data) => setMetrics(data.metrics ?? null))
            .catch(() => setMetricsError(true));
        }
      })
      .catch(() => router.replace("/login"));
  }, [role, router]);

  const adminMetricValues = metrics
    ? [metrics.users, metrics.hospitals, metrics.insuranceOrganizations, metrics.specialists, metrics.activeWorkflows, metrics.pendingReviews, metrics.failedWorkflows]
    : [null, null, null, null, null, null, null];

  return (
    <OperationsShell role={role}>
      <div className="reveal flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">{c.eyebrow}</p><h1 className="max-w-4xl font-display text-4xl font-extrabold tracking-[-.04em] md:text-5xl">{c.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">{c.description}</p></div>
        <Link href={c.primary[1]} className="group inline-flex shrink-0 items-center justify-center gap-3 rounded-2xl bg-[var(--ink)] px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-900/10 transition-all hover:-translate-y-0.5">{c.primary[0]} <span className="transition-transform group-hover:translate-x-1">→</span></Link>
      </div>

      <section className="reveal reveal-delay-1 mt-8 grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
        <div className="relative overflow-hidden rounded-[30px] bg-[var(--ink)] p-6 text-white shadow-[var(--shadow-md)] md:p-8">
          <div className="mesh-orb absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#B9C5EC]/20 blur-3xl" />
          <div className="relative"><div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-white/75">Workflow control</span><span className="text-xs text-white/50">{role === "specialist" ? user?.name ?? "Authorized specialist" : "Authorized administrator"}</span></div><h2 className="mt-12 max-w-xl font-display text-3xl font-extrabold leading-tight tracking-[-.03em]">Every administrative handoff has a visible next step.</h2><div className="mt-8 grid gap-2 sm:grid-cols-5">{c.steps.map((step, index) => <div key={step} className="rounded-2xl border border-white/10 bg-white/[.06] p-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-[#B9C5EC] text-[var(--ink)]" : "bg-white/10 text-white/65"}`}>{index + 1}</span><p className="mt-3 text-[11px] font-semibold leading-4 text-white/70">{step}</p></div>)}</div></div>
        </div>
        <div className="glass rounded-[30px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Workspace health</p><div className="mt-7 flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-[var(--success)]" /><p className="text-sm font-bold">Session connected</p></div><p className="mt-3 text-xs leading-5 text-[var(--muted)]">Role and server-side authorization determine which operational records and actions are available.</p></div>
      </section>

      {role === "admin" && <div className="mt-8 rounded-2xl border border-black/5 bg-white/60 px-4 py-3 text-xs text-[var(--muted)]"><span className="font-bold text-[var(--ink)]">Live database metrics.</span> Values below are loaded from MediSync Supabase data; no demo values are substituted. {metricsError ? "The metrics service is currently unavailable." : ""}</div>}

      <section className="reveal reveal-delay-2 mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {c.metrics.map((label, index) => <div key={label} className="glass rounded-2xl p-5"><p className="font-display text-3xl font-extrabold">{role === "admin" ? (adminMetricValues[index] ?? "—") : "—"}</p><p className="mt-1 text-xs font-semibold text-[var(--muted)]">{label}</p></div>)}
      </section>

      <section className="reveal reveal-delay-3 mt-10 grid gap-4 lg:grid-cols-[1fr_.65fr]">
        <div className="glass rounded-[26px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Operational focus</p><h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">What needs attention</h2><div className="mt-6 space-y-3">{c.guidance.map((text, index) => <div key={text} className="flex gap-3 rounded-2xl bg-black/[.025] p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--care-soft)] text-xs font-bold text-[var(--care)]">{index + 1}</span><p className="pt-1 text-sm font-semibold text-[var(--muted-strong)]">{text}</p></div>)}</div></div>
        <div className="glass rounded-[26px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Safety principle</p><p className="mt-5 font-display text-xl font-extrabold">AI assists. Authorized people decide.</p><p className="mt-3 text-sm leading-6 text-[var(--muted)]">MediSync can classify, summarize and surface exceptions, but sensitive healthcare and administrative outcomes remain under human review.</p></div>
      </section>
    </OperationsShell>
  );
}
