"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RoleShell from "@/components/RoleShell";
import StatusBadge from "@/components/StatusBadge";
import { PatientRequest } from "@/lib/types";
import InsuranceAICopilot from "@/components/InsuranceAICopilot";

type Role = "patient" | "hospital" | "insurance_agent";
type SessionUser = { email?: string; name?: string; medisyncId?: string; patientId?: string; hospitalId?: string; insuranceAgentId?: string; role: Role | "specialist" | "admin" };
type Analysis = { document_type?: string; report_date?: string | null; summary?: string; findings?: Array<{ item: string; value: string | null; reference_range: string | null; status: string; evidence: string }>; key_observations?: string[]; priority?: string; specialty_hint?: string | null; workflow?: string; confidence?: number };
type Document = { id: string; original_filename: string; content_type: string | null; file_size_bytes: number | null; ocr_status: string; validation_status: string; request_id: string | null; created_at: string; metadata?: { ai_analysis?: Analysis } };

const config = {
  patient: { eyebrow: "Patient medical record", title: "Your healthcare record travels with you.", description: "Keep your existing investigations, reports and care requests together so authorized providers can review the same structured record when you move between hospitals.", primary: ["New care request", "/requests/new"], metrics: ["Active requests", "Completed", "Medical reports", "MediSync ID"], pipeline: ["Care request", "Report analysis", "Standardized record", "Human review", "Provider coordination"] },
  hospital: { eyebrow: "Hospital command center", title: "Coordinate the next patient safely.", description: "Review incoming MediSync records, existing investigations and human-approved workflow decisions in one operational view.", primary: ["Review referrals", "/hospital/referrals"], metrics: ["New referrals", "Under review", "Capacity alerts", "Today"], pipeline: ["Referral received", "Record review", "Investigation review", "Accept / request new", "Appointment"] },
  insurance_agent: { eyebrow: "Insurance operations", title: "Move coverage decisions forward.", description: "Review supporting medical evidence, hospital context and coverage information without separating the insurance workflow from the patient record.", primary: ["Open authorizations", "/insurance/authorizations"], metrics: ["Open cases", "Awaiting docs", "Under review", "Resolved"], pipeline: ["Case received", "Evidence check", "Coverage review", "Decision", "Care team notified"] },
} as const;

function dashboardForRole(role: SessionUser["role"]) { if (role === "hospital") return "/hospital/dashboard"; if (role === "insurance_agent") return "/insurance/dashboard"; if (role === "specialist") return "/specialist/dashboard"; if (role === "admin") return "/admin/dashboard"; return "/patient/dashboard"; }

function buildReport(documents: Document[]) {
  const analyzed = documents.filter((d) => d.metadata?.ai_analysis);
  const findings = analyzed.flatMap((d) => d.metadata?.ai_analysis?.findings ?? []).slice(0, 12);
  const observations = analyzed.flatMap((d) => d.metadata?.ai_analysis?.key_observations ?? []).slice(0, 8);
  const specialties = Array.from(new Set(analyzed.map((d) => d.metadata?.ai_analysis?.specialty_hint).filter(Boolean)));
  return { analyzedCount: analyzed.length, findings, observations, specialties };
}

export default function RoleDashboard({ role }: { role: Role }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [apiState, setApiState] = useState<"loading" | "ready" | "error">("loading");
  const c = config[role];

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then(async (response) => { if (!response.ok) throw new Error("session"); return response.json(); })
      .then(async (data) => {
        const session = data?.user as SessionUser | undefined;
        if (!session) throw new Error("session");
        if (session.role !== role) { router.replace(dashboardForRole(session.role)); return; }
        if (cancelled) return;
        setUser(session);
        if (role === "patient" && session.patientId) {
          const [requestResponse, documentResponse] = await Promise.all([fetch(`/api/requests?patient_id=${encodeURIComponent(session.patientId)}`, { cache: "no-store" }), fetch("/api/documents", { cache: "no-store" })]);
          if (!requestResponse.ok || !documentResponse.ok) throw new Error("data api");
          const [requestBody, documentBody] = await Promise.all([requestResponse.json(), documentResponse.json()]);
          if (!cancelled) { setRequests(requestBody.requests ?? []); setDocuments(documentBody.documents ?? []); }
        }
        if (!cancelled) setApiState("ready");
      })
      .catch(() => { if (!cancelled) setApiState("error"); });
    return () => { cancelled = true; };
  }, [role, router]);

  const patientActive = requests.filter((item) => !["COMPLETED", "CANCELLED"].includes(item.workflow_status)).length;
  const patientCompleted = requests.filter((item) => item.workflow_status === "COMPLETED").length;
  const report = useMemo(() => buildReport(documents), [documents]);
  const metricValues = role === "patient" ? [patientActive, patientCompleted, documents.length, user?.medisyncId ?? "—"] : ["—", "—", "—", "—"];
  const profileId = role === "patient" ? user?.medisyncId : role === "hospital" ? user?.hospitalId : user?.insuranceAgentId;
  const latestRequest = requests[0];
  const latestDocument = documents[0];

  return (
    <RoleShell role={role}>
      <div className="reveal flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">{c.eyebrow}</p><h1 className="font-display text-4xl font-extrabold tracking-[-.04em] md:text-5xl">{c.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">{c.description}</p></div>
        <Link href={c.primary[1]} className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-[var(--ink)] px-5 py-3.5 text-sm font-bold text-white shadow-xl transition-all hover:-translate-y-0.5">{c.primary[0]} <span>→</span></Link>
      </div>

      <section className="reveal reveal-delay-1 mt-8 grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
        <div className="relative overflow-hidden rounded-[30px] bg-[var(--ink)] p-6 text-white shadow-[var(--shadow-md)] md:p-8"><div className="mesh-orb absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#B9C5EC]/20 blur-3xl" /><div className="relative"><div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-white/75">MediSync identity</span><span className="text-xs text-white/50">{profileId ?? user?.email ?? "Secure session"}</span></div><h2 className="mt-10 max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-[-.03em]">{role === "patient" ? "One permanent ID. One portable medical record." : "One connected workflow from evidence to human decision."}</h2><div className="mt-8 grid gap-2 sm:grid-cols-5">{c.pipeline.map((step, index) => <div key={step} className="rounded-2xl border border-white/10 bg-white/[.06] p-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-[#B9C5EC] text-[var(--ink)]" : "bg-white/10 text-white/65"}`}>{index + 1}</span><p className="mt-3 text-[11px] font-semibold leading-4 text-white/70">{step}</p></div>)}</div></div></div>
        <div className="glass rounded-[30px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Workspace health</p><div className="mt-7 flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${apiState === "error" ? "bg-[var(--danger)]" : "bg-[var(--success)]"}`} /><p className="text-sm font-bold">{apiState === "error" ? "Data service needs attention" : apiState === "loading" ? "Connecting securely…" : "Live data connected"}</p></div><p className="mt-3 text-xs leading-5 text-[var(--muted)]">Your verified role controls the records and actions available in this workspace.</p>{role === "patient" && <div className="mt-6 rounded-2xl bg-[var(--care-soft)] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--care)]">Permanent MediSync ID</p><p className="mt-1 break-all font-display text-lg font-extrabold">{user?.medisyncId ?? "Generating…"}</p><p className="mt-1 text-xs text-[var(--muted)]">Use this identity when sharing your MediSync record with an authorized provider.</p></div>}</div>
      </section>

      <section className="reveal reveal-delay-2 mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">{c.metrics.map((label, index) => <div key={label} className="glass rounded-2xl p-5"><p className="font-display text-2xl font-extrabold break-words md:text-3xl">{metricValues[index]}</p><p className="mt-1 text-xs font-semibold text-[var(--muted)]">{label}</p></div>)}</section>

      {role === "patient" ? <>
        <section className="reveal reveal-delay-3 mt-10 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <div className="glass rounded-[28px] p-6 md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Current care request</p><h2 className="mt-1 font-display text-2xl font-extrabold">{latestRequest ? latestRequest.specialty ? `${latestRequest.specialty} care journey` : "Active care journey" : "Start your care journey"}</h2></div>{latestRequest && <StatusBadge status={latestRequest.workflow_status} />}</div>{latestRequest ? <><p className="mt-4 text-sm leading-6 text-[var(--muted)]">{latestRequest.request}</p><div className="mt-5 flex flex-wrap gap-3"><Link href={`/requests/${latestRequest.request_id}`} className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white">Open request →</Link><Link href="/documents" className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold">Medical records</Link></div></> : <><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Describe the problem and upload your existing medical evidence. MediSync will organize it into a portable record.</p><Link href="/requests/new" className="mt-5 inline-flex rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white">Create care request →</Link></>}</div>
          <div className="rounded-[28px] bg-[var(--ink)] p-6 text-white md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Existing investigations</p><p className="mt-2 font-display text-2xl font-extrabold">{documents.length} report{documents.length === 1 ? "" : "s"} in your record</p><p className="mt-3 text-sm leading-6 text-white/60">Original files stay alongside structured analysis so an authorized receiving provider can review the source evidence before deciding whether a repeat investigation is appropriate.</p>{latestDocument && <div className="mt-5 rounded-2xl bg-white/10 p-4"><p className="text-xs font-bold text-white/80">Latest report</p><p className="mt-1 truncate text-sm font-semibold">{latestDocument.original_filename}</p><p className="mt-1 text-xs text-white/45">{latestDocument.metadata?.ai_analysis?.document_type || latestDocument.content_type || "Medical report"}</p></div>}</div>
        </section>

        <section className="reveal reveal-delay-3 mt-4 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <div className="glass rounded-[28px] p-6 md:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--care)]">MediSync standardized report</p><h2 className="mt-1 font-display text-2xl font-extrabold">Structured from your uploaded evidence.</h2></div><span className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--care)]">{report.analyzedCount} analyzed</span></div>{report.analyzedCount ? <><div className="mt-5 rounded-2xl bg-white/70 p-5"><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Record summary</p><p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{documents.find((d) => d.metadata?.ai_analysis?.summary)?.metadata?.ai_analysis?.summary || "Structured evidence is available for review."}</p></div>{report.specialties.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{report.specialties.map((s) => <span key={s} className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--care)]">{s}</span>)}</div>}{report.findings.length > 0 && <div className="mt-5 overflow-hidden rounded-2xl border border-black/5"><div className="bg-black/[.03] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Extracted findings</div><div className="divide-y divide-black/5">{report.findings.slice(0, 6).map((f, i) => <div key={`${f.item}-${i}`} className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_.8fr_.7fr]"><p className="text-sm font-bold">{f.item}</p><p className="text-sm">{f.value || "Not reported"}</p><p className="text-xs uppercase tracking-wide text-[var(--muted)]">{f.status.replaceAll("_", " ")}</p></div>)}</div></div>}<p className="mt-5 text-xs leading-5 text-[var(--muted)]">This report is a structured representation of the uploaded source records. It is not a diagnosis, prescription or autonomous clinical decision.</p></> : <div className="mt-6 rounded-2xl bg-white/70 p-6"><p className="text-sm font-bold">No analyzed reports yet.</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Upload your MRI, CT, X-ray, laboratory or specialist reports to build the record.</p><Link href="/documents" className="mt-4 inline-flex rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white">Upload medical report →</Link></div>}</div>
          <div className="glass rounded-[28px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Provider coordination</p><h2 className="mt-1 font-display text-xl font-extrabold">Connect with an authorized specialist.</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Your structured record can support human specialist review and care coordination. Clinical decisions remain with the authorized professional.</p><div className="mt-6 space-y-3"><Link href="/appointments" className="flex items-center justify-between rounded-2xl bg-[var(--ink)] px-4 py-3.5 text-sm font-bold text-white">Appointments <span>→</span></Link><Link href="/requests/new" className="flex items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-bold">Request specialist review <span>→</span></Link></div><div className="mt-6 rounded-2xl bg-[var(--care-soft)] p-4"><p className="text-xs font-bold text-[var(--care)]">Next product connection</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Doctor directory, secure online consultation and appointment booking will use the same MediSync record and workflow.</p></div></div>
        </section>

        <section className="reveal reveal-delay-3 mt-4 grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-[28px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Hospital level</p><h2 className="mt-1 font-display text-xl font-extrabold">Same-tier care first.</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">MediSync hospital matching should prioritize hospitals in the same MediSync tier as your current provider, then let you explore higher-tier options when you want a higher treatment level.</p><Link href="/requests/new" className="mt-5 inline-flex rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold">Explore care options →</Link></div>
          <div className="glass rounded-[28px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Insurance</p><h2 className="mt-1 font-display text-xl font-extrabold">Coverage connected to the record.</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Coverage and benefits should be shown for participating insurers against the selected hospital and existing medical evidence, so patients, providers and insurers work from the same context.</p><Link href="/insurance/dashboard" className="mt-5 inline-flex rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold">Insurance workspace →</Link></div>
        </section>
      </> : <>
        <section className="reveal reveal-delay-3 mt-10 grid gap-4 lg:grid-cols-[1fr_.65fr]"><div className="glass rounded-[26px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">{role === "hospital" ? "Referral queue" : "Coverage queue"}</p><h2 className="mt-1 font-display text-2xl font-extrabold">What needs attention</h2><div className="mt-6 space-y-3">{(role === "hospital" ? ["Review incoming MediSync records", "Check existing investigations before requesting repeats", "Confirm acceptance or request new evidence"] : ["Review patient evidence", "Check coverage and participating hospitals", "Record the authorization outcome"]).map((text, index) => <div key={text} className="flex gap-3 rounded-2xl bg-black/[.025] p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--care-soft)] text-xs font-bold text-[var(--care)]">{index + 1}</span><p className="pt-1 text-sm font-semibold text-[var(--muted-strong)]">{text}</p></div>)}</div></div><div className="glass rounded-[26px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Human decision boundary</p><p className="mt-5 font-display text-xl font-extrabold">AI assists. Authorized people decide.</p><p className="mt-3 text-sm leading-6 text-[var(--muted)]">MediSync can classify, summarize and surface relevant evidence. Acceptance of an existing investigation, treatment decisions and insurance outcomes remain with authorized professionals.</p></div></section>
        <InsuranceAICopilot />
      </>}
    </RoleShell>
  );
}
