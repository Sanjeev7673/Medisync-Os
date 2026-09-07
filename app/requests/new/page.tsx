"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PatientShell from "@/components/PatientShell";

const CURRENT_PATIENT_ID = "P1001";

export default function NewRequestPage() {
  const router = useRouter(); const [text, setText] = useState(""); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState<string | null>(null);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); if (!text.trim()) return; setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patient_id: CURRENT_PATIENT_ID, request: text, request_source: "patient_portal", document_uploaded: false }) });
      if (!res.ok) throw new Error("Could not submit request"); const data = await res.json(); router.push(`/requests/${data.request.request_id}`);
    } catch { setError("Something went wrong submitting your request. Please try again."); setSubmitting(false); }
  }
  return (
    <PatientShell>
      <header className="mb-8"><h1 className="font-display font-bold text-2xl">Submit a new request</h1><p className="text-[var(--muted)] mt-1">Describe what you need help with. MediSync will route it to the right place — a specialist reviews anything clinical before it moves forward.</p></header>
      <form onSubmit={handleSubmit} className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-6 max-w-2xl">
        <label className="flex flex-col gap-2 mb-5"><span className="text-sm font-medium">What&apos;s going on?</span><textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} required placeholder="e.g. I have a heart-related health concern and need to consult a cardiologist." className="rounded-md border border-[var(--border)] px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--care)]" /></label>
        <label className="flex items-center gap-2 mb-6 text-sm text-[var(--muted)]"><input type="checkbox" disabled className="rounded" />Attach a document (coming soon)</label>
        {error && <p className="text-sm mb-4" style={{ color: "var(--danger)" }}>{error}</p>}
        <button type="submit" disabled={submitting} className="rounded-md bg-[var(--ink)] text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50">{submitting ? "Submitting…" : "Submit request"}</button>
      </form>
    </PatientShell>
  );
}