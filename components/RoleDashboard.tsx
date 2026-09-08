"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RoleShell from "@/components/RoleShell";
import StatusBadge from "@/components/StatusBadge";
import { PatientRequest } from "@/lib/types";

type Role = "patient" | "hospital" | "insurance_agent";
type SessionUser = { email?: string; name?: string; patientId?: string; hospitalId?: string; insuranceAgentId?: string; role: Role | "specialist" | "admin" };

const config = {
  patient: {
    eyebrow: "Patient overview", title: "Your care, connected.", description: "Follow every administrative step from your request to specialist review, referral and appointment.", primary: ["New request", "/requests/new"], metrics: ["Active journeys", "Completed", "Documents", "Appointments"], pipeline: ["Request received", "AI classification", "Specialist review", "Hospital match", "Appointment"],
  },
  hospital: {
    eyebrow: "Hospital command center", title: "Coordinate the next patient safely.", description: "A single operational view for incoming referrals, capacity, patient intake and appointment coordination.", primary: ["Review referrals", "/hospital/referrals"], metrics: ["New referrals", "Under review", "Capacity alerts", "Today"], pipeline: ["Referral received", "Clinical review", "Capacity match", "Accept / request info", "Appointment"],
  },
  insurance_agent: {
    eyebrow: "Insurance operations", title: "Move coverage decisions forward.", description: "Keep authorizations, supporting documents and case coordination visible in one calm workspace.", primary: ["Open authorizations", "/insurance/authorizations"], metrics: ["Open cases", "Awaiting docs", "Under review", "Resolved"], pipeline: ["Case received", "Document check", "Coverage review", "Decision", "Care team notified"],
  },
} as const;

function dashboardForRole(role: SessionUser["role"]) {
  if (role === "hospital") return "/hospital/dashboard";
  if (role === "insurance_agent") return "/insurance/dashboard";
  if (role === "specialist") return "/specialist/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/patient/dashboard";
}

export default function RoleDashboard({ role }: { role: Role }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [apiState, setApiState] = useState<"loading" | "ready" | "error">("loading");
  const c = config[role];

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then(async (response) => {
        if (!response.ok) throw new Error("session");
        return response.json();
      })
      .then(async (data) => {
        const session = data?.user as SessionUser | undefined;
        if (!session) throw new Error("session");
        if (session.role !== role) {
          router.replace(dashboardForRole(session.role));
          return;
        }
        if (cancelled) return;
        setUser(session);

        if (role === "patient" && session.patientId) {
          const response = await fetch(`/api/requests?patient_id=${encodeURIComponent(session.patientId)}`);
          if (!response.ok) throw new Error("request api");
          const body = await response.json();
          if (!cancelled) setRequests(body.requests ?? []);
        }
        if (!cancelled) setApiState("ready");
      })
      .catch(() => {
        if (!cancelled) setApiState("error");
      });
    return () => { cancelled = true; };
  }, [role, router]);

  const patientActive = requests.filter((item) => !["COMPLETED", "CANCELLED"].includes(item.workflow_status)).length;
  const patientCompleted = requests.filter((item) => item.workflow_status === "COMPLETED").length;
  const metricValues = useMemo(() => role === "patient" ? [patientActive, patientCompleted, "—", "—"] : ["—", "—", "—", "—"], [patientActive, patientCompleted, role]);
  const profileId = role === "patient" ? user?.patientId : role === "hospital" ? user?.hospitalId : user?.insuranceAgentId;

  return (
    <RoleShell role={role}>
      <div className="reveal flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">{c.eyebrow}</p><h1 className="font-display text-4xl font-extrabold tracking-[-.04em] md:text-5xl">{c.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{c.description}</p></div>
        <Link href={c.primary[1]} className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-[var(--ink)] px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-900/10 transition-all hover:-translate-y-0.5">{c.primary[0]} <span className="transition-transform group-hover:translate-x-1">→</span></Link>
      </div>

      <section className="reveal reveal-delay-1 mt-8 grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
        <div className="relative overflow-hidden rounded-[30px] bg-[var(--ink)] p-6 text-white shadow-[var(--shadow-md)] md:p-8">
          <div className="mesh-orb absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#B9C5EC]/20 blur-3xl" />
          <div className="relative"><div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-white/75">Live workflow</span><span className="text-xs text-white/50">{profileId ?? user?.email ?? "Secure session"}</span></div><h2 className="mt-12 max-w-xl font-display text-3xl font-extrabold leading-tight tracking-[-.03em]">Every handoff has a visible next step.</h2><div className="mt-8 grid gap-2 sm:grid-cols-5">{c.pipeline.map((step, index) => <div key={step} className="rounded-2xl border border-white/10 bg-white/[.06] p-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-[#B9C5EC] text-[var(--ink)]" : "bg-white/10 text-white/65"}`}>{index + 1}</span><p className="mt-3 text-[11px] font-semibold leading-4 text-white/70">{step}</p></div>)}</div></div>
        </div>
        <div className="glass rounded-[30px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Workspace health</p><div className="mt-7 flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${apiState === "error" ? "bg-[var(--danger)]" : "bg-[var(--success)]"}`} /><p className="text-sm font-bold">{apiState === "error" ? "Data service needs attention" : apiState === "loading" ? "Connecting securely…" : "Session connected"}</p></div><p className="mt-3 text-xs leading-5 text-[var(--muted)]">Your verified role controls which workflow data and actions are available in this workspace.</p></div>
      </section>

      <section className="reveal reveal-delay-2 mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">{c.metrics.map((label, index) => <div key={label} className="glass rounded-2xl p-5"><p className="font-display text-3xl font-extrabold">{metricValues[index]}</p><p className="mt-1 text-xs font-semibold text-[var(--muted)]">{label}</p></div>)}</section>

      <section className="reveal reveal-delay-3 mt-10 grid gap-4 lg:grid-cols-[1fr_.65fr]">
        <div><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">{role === "patient" ? "Your requests" : role === "hospital" ? "Referral queue" : "Coverage queue"}</p><h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">What needs attention</h2></div>
          {role === "patient" && requests.length > 0 ? <div className="grid gap-3">{requests.slice(0, 4).map((item) => <Link key={item.request_id} href={`/requests/${item.request_id}`} className="glass group rounded-[24px] p-5 transition-all hover:-translate-y-0.5"><div className="flex items-center justify-between gap-4"><div><p className="font-display font-extrabold">{item.specialty ? `${item.specialty} request` : "Care request"}</p><p className="mt-1 text-sm text-[var(--muted)] line-clamp-1">{item.request}</p></div><StatusBadge status={item.workflow_status} /></div></Link>)}</div> : <div className="glass rounded-[26px] p-8"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--care-soft)] text-[var(--care)]">✦</div><h3 className="mt-4 font-display text-lg font-bold">{role === "patient" ? "Start your first care journey" : role === "hospital" ? "Your referral queue is ready" : "Your authorization queue is ready"}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Live workflow records will appear here as requests move through the MediSync network.</p></div>}
        </div>
        <div className="glass rounded-[26px] p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Role guidance</p><div className="mt-5 space-y-4">{(role === "patient" ? ["Describe what you need", "Review AI classification", "Track specialist and referral steps"] : role === "hospital" ? ["Review incoming referrals", "Match capacity", "Confirm or request information"] : ["Check required documents", "Review coverage", "Record the authorization outcome"]).map((text, index) => <div key={text} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--care-soft)] text-xs font-bold text-[var(--care)]">{index + 1}</span><p className="pt-1 text-sm font-semibold text-[var(--muted-strong)]">{text}</p></div>)}</div></div>
      </section>
    </RoleShell>
  );
}
