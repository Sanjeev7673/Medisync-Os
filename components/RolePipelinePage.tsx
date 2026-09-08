"use client";

import RoleShell from "@/components/RoleShell";

type Role = "hospital" | "insurance_agent";
type PipelineItem = { title: string; eyebrow: string; text: string; steps: string[] };

const content: Record<Role, Record<string, PipelineItem>> = {
  hospital: {
    referrals: { title: "Referral intake", eyebrow: "Hospital pipeline", text: "Review incoming MediSync referrals, supporting information and the next operational action.", steps: ["Received", "Information check", "Specialist context", "Capacity match", "Decision"] },
    capacity: { title: "Capacity planning", eyebrow: "Hospital operations", text: "Keep available services and appointment capacity visible for referral matching.", steps: ["Service inventory", "Available capacity", "Match request", "Reserve slot", "Confirm"] },
    appointments: { title: "Hospital appointments", eyebrow: "Scheduling", text: "Coordinate accepted referrals into confirmed appointment slots.", steps: ["Accepted referral", "Scheduling", "Patient notified", "Appointment confirmed"] },
  },
  insurance_agent: {
    authorizations: { title: "Authorization desk", eyebrow: "Insurance pipeline", text: "Review coverage requests, supporting documents and authorization outcomes.", steps: ["Case received", "Document check", "Coverage review", "Decision", "Care team notified"] },
    cases: { title: "Coverage cases", eyebrow: "Case coordination", text: "Track cases that require document follow-up, review or resolution.", steps: ["New", "Waiting for information", "Under review", "Decision", "Resolved"] },
    policies: { title: "Policy workspace", eyebrow: "Coverage context", text: "Keep policy context available to support consistent administrative review.", steps: ["Policy lookup", "Coverage rules", "Eligibility", "Limits", "Review complete"] },
  },
};

export default function RolePipelinePage({ role, section }: { role: Role; section: string }) {
  const item = content[role][section];
  if (!item) return <RoleShell role={role}><div className="glass rounded-3xl p-8"><h1 className="font-display text-2xl font-extrabold">Workflow not found</h1></div></RoleShell>;
  return <RoleShell role={role}><div className="reveal"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">{item.eyebrow}</p><h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.04em]">{item.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{item.text}</p></div><section className="reveal reveal-delay-1 mt-8 rounded-[30px] bg-[var(--ink)] p-6 text-white shadow-[var(--shadow-md)] md:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/50">Workflow pipeline</p><div className="mt-8 grid gap-3 md:grid-cols-5">{item.steps.map((step, index) => <div key={step} className="rounded-2xl border border-white/10 bg-white/[.06] p-5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B9C5EC] text-xs font-extrabold text-[var(--ink)]">{index + 1}</span><p className="mt-4 text-sm font-bold">{step}</p><p className="mt-2 text-xs leading-5 text-white/50">Ready for live workflow data.</p></div>)}</div></section><div className="reveal reveal-delay-2 mt-6 glass rounded-[26px] p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Live connection</p><p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">This navigation and pipeline are ready for the corresponding backend records. No clinical or coverage decision is made automatically by this interface.</p></div></RoleShell>;
}
