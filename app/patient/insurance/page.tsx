"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PatientShell from "@/components/PatientShell";
import InsuranceCoverageMatches from "@/components/InsuranceCoverageMatches";

type Analysis = {
  specialty_hint?: string | null;
  document_type?: string | null;
  summary?: string | null;
  findings?: Array<{ item?: string; value?: string | null; status?: string }>;
};

type Document = {
  id: string;
  original_filename: string;
  created_at: string;
  metadata?: { ai_analysis?: Analysis };
};

export default function PatientInsurancePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/documents", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Unable to load reports"))))
      .then((data) => setDocuments(data.documents ?? []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, []);

  const analyzed = useMemo(
    () => documents.filter((d) => d.metadata?.ai_analysis).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [documents]
  );

  return (
    <PatientShell>
      <div className="reveal">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Insurance connection</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.04em] md:text-5xl">Coverage connected to your medical evidence.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Upload a report first. MediSync uses the source-grounded AI analysis to surface insurance pathways, then lets you continue to hospital matching or the official insurer/scheme portal.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/documents" className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold">← Documents</Link>
            <Link href="/hospitals/compare" className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white">Hospital matching →</Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 glass rounded-[28px] p-7 text-sm text-[var(--muted)]">Loading your analyzed reports…</div>
        ) : analyzed.length === 0 ? (
          <div className="mt-8 glass rounded-[28px] p-7">
            <p className="text-sm font-bold">No analyzed report available yet.</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Upload a medical report so MediSync can extract the evidence and connect the result to relevant insurance pathways.</p>
            <Link href="/documents" className="mt-5 inline-flex rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white">Upload report →</Link>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {analyzed.slice(0, 3).map((doc) => (
              <div key={doc.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--muted)]">Analyzed report</p>
                    <p className="mt-1 text-sm font-extrabold">{doc.original_filename}</p>
                  </div>
                  <span className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--care)]">
                    {doc.metadata?.ai_analysis?.specialty_hint || "General review"}
                  </span>
                </div>
                <InsuranceCoverageMatches documentId={doc.id} analysis={doc.metadata!.ai_analysis!} />
              </div>
            ))}
          </div>
        )}
      </div>
    </PatientShell>
  );
}
