"use client";

import Link from "next/link";
import OperationsShell from "@/components/OperationsShell";

type Role = "specialist" | "admin";

const content = {
  specialist: {
    reviews: ["Pending specialist reviews", "Review AI classification, patient context and supporting documents before taking a human-approved action."],
    patients: ["Patient context", "Authorized patient records and request history will appear here as the data layer is connected."],
    referrals: ["Referral coordination", "Approved cases can be coordinated with hospital capability and availability workflows."],
  },
  admin: {
    requests: ["Administration requests", "Monitor patient records, operational requests and workflow exceptions from one queue."],
    credentials: ["Provider credentialing", "Track provider credentials, expiry dates, missing documents and administrator review."],
    insurance: ["Insurance documentation", "Review coverage documents, missing information and authorization cases."],
    compliance: ["Compliance monitoring", "Surface missing, inconsistent or expired administrative information for review."],
    audit: ["Audit trail", "Review workflow actions and human approvals as an auditable administrative record."],
  },
} as const;

type Key = keyof typeof content.specialist | keyof typeof content.admin;

export default function OperationsQueue({ role, section }: { role: Role; section: Key }) {
  const item = content[role][section as never] as readonly [string, string];
  return (
    <OperationsShell role={role}>
      <div className="reveal">
        <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">{role === "admin" ? "Administration" : "Specialist operations"}</p>
        <h1 className="font-display text-4xl font-extrabold tracking-[-.04em] md:text-5xl">{item[0]}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{item[1]}</p>
      </div>
      <div className="reveal reveal-delay-1 mt-8 grid gap-4 md:grid-cols-3">
        {["Ready for integration", "Human review required", "Audit-ready"].map((label, index) => <div key={label} className="glass rounded-[26px] p-6"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--care-soft)] text-sm font-bold text-[var(--care)]">{index + 1}</span><h2 className="mt-5 font-display text-lg font-extrabold">{label}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">This workspace is prepared for the live workflow and data layer.</p></div>)}
      </div>
      <div className="reveal reveal-delay-2 mt-6 rounded-[26px] bg-[var(--ink)] p-6 text-white md:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/50">Next layer</p><p className="mt-3 max-w-2xl font-display text-2xl font-extrabold">Connect this queue to the MediSync workflow engine and authoritative data store.</p><Link href={`/${role}/dashboard`} className="mt-6 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[var(--ink)]">Back to overview →</Link></div>
    </OperationsShell>
  );
}
