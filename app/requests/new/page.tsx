"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PatientShell from "@/components/PatientShell";

export default function NewRequestPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetch("/api/auth/session").then((r) => r.json()).then((data) => setPatientId(data?.user?.patientId ?? null)).catch(() => undefined); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !patientId) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patient_id: patientId, request: text.trim(), request_source: "patient_portal", document_uploaded: false }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not submit request");
      router.push(`/requests/${data.request.request_id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong submitting your request. Please try again."); setSubmitting(false); }
  }

  return (
    <PatientShell>
      <div className="reveal max-w-5xl">
        <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Start a care journey</p><h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.04em] md:text-5xl">Tell us what you need.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Describe your request in your own words. MediSync will classify the administrative workflow and route clinical requests for human specialist review.</p></div>
        <div className="grid gap-5 lg:grid-cols-[1.45fr_.75fr]">
          <form onSubmit={handleSubmit} className="glass rounded-[30px] p-6 md:p-8">
            <div className="mb-8 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Step 01</p><h2 className="mt-1 font-display text-xl font-extrabold">Your request</h2></div><div className="flex gap-1.5"><span className="h-1.5 w-10 rounded-full bg-[var(--ink)]"/><span className="h-1.5 w-10 rounded-full bg-black/10"/><span className="h-1.5 w-10 rounded-full bg-black/10"/></div></div>
            <label className="block"><span className="text-sm font-bold">What would you like help with?</span><textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} required maxLength={2000} placeholder="For example: I need help finding the right specialist for a heart-related concern." className="mt-3 w-full resize-none rounded-[22px] border border-black/8 bg-white/80 px-5 py-4 text-sm leading-6 outline-none transition-all placeholder:text-black/30 focus:border-[var(--care)] focus:ring-4 focus:ring-[var(--care)]/10" /></label>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--muted)]"><span>{text.length}/2000 characters</span><span>Never include passwords or payment details.</span></div>
            {error && <div className="mt-5 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</div>}
            <button type="submit" disabled={submitting || !patientId || !text.trim()} className="group mt-7 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white shadow-xl shadow-slate-900/10 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"><span>{submitting ? "Creating your care journey…" : "Continue with request"}</span><span className="text-lg transition-transform group-hover:translate-x-1">→</span></button>
          </form>

          <aside className="space-y-4">
            <div className="glass rounded-[30px] p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">What happens next</p><div className="mt-6 space-y-5"><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--care-soft)] text-xs font-bold text-[var(--care)]">01</span><div><p className="text-sm font-bold">AI classification</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Your request is categorized for the appropriate workflow.</p></div></div><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--care-soft)] text-xs font-bold text-[var(--care)]">02</span><div><p className="text-sm font-bold">Human review</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Clinical requests can move to qualified specialist review.</p></div></div><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--care-soft)] text-xs font-bold text-[var(--care)]">03</span><div><p className="text-sm font-bold">Care coordination</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Follow referral, hospital matching, and appointment progress.</p></div></div></div></div>
            <div className="rounded-[30px] bg-[var(--ink)] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Designed around you</p><p className="mt-3 font-display text-xl font-extrabold leading-snug">You stay informed while the workflow does the coordination.</p></div>
          </aside>
        </div>
      </div>
    </PatientShell>
  );
}
