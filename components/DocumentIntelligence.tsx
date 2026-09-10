"use client";

import { useEffect, useState } from "react";

type Finding = { item: string; value: string | null; reference_range: string | null; status: "normal" | "abnormal" | "unclear" | "not_reported"; evidence: string };
type Analysis = { document_type?: string; report_date?: string | null; summary?: string; findings?: Finding[]; key_observations?: string[]; priority?: string; specialty_hint?: string | null; workflow?: string; confidence?: number; requires_human_review?: boolean; limitations?: string[] };
type Document = { id: string; original_filename: string; content_type: string | null; file_size_bytes: number | null; ocr_status: string; validation_status: string; created_at: string; metadata?: { ai_analysis?: Analysis } };

function priorityLabel(value?: string) {
  return ({ routine: "Routine review", review_soon: "Review soon", urgent_review: "Urgent human review", unclear: "Priority unclear" } as Record<string, string>)[value || ""] || "Awaiting review";
}

export default function DocumentIntelligence() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const response = await fetch("/api/documents", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setDocuments(data.documents || []);
  }

  useEffect(() => { load().catch(() => undefined); }, []);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/documents", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to analyze report");
      setSuccess(data.workflow?.triggered ? "Report analyzed and routed for workflow coordination." : "Report analyzed and saved. Human review is required before clinical action.");
      setFile(null);
      const input = document.getElementById("report-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="glass rounded-[30px] p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--care)]">AI document intelligence</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">Upload a patient report.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">MediSync extracts report facts, flags, reference ranges, and routing hints. It does not diagnose or prescribe; an authorized human remains responsible for clinical interpretation.</p>
          </div>
          <span className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--care)]">Human-in-the-loop</span>
        </div>
        <form onSubmit={upload} className="mt-7 rounded-[24px] border border-dashed border-black/10 bg-white/65 p-5 md:p-6">
          <label htmlFor="report-file" className="block text-sm font-bold">Medical report <span className="font-normal text-[var(--muted)]">PDF, PNG, JPEG or WEBP · max 15 MB</span></label>
          <input id="report-file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-4 block w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm" />
          {file && <p className="mt-2 text-xs text-[var(--muted)]">Selected: {file.name}</p>}
          {error && <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</div>}
          {success && <div className="mt-4 rounded-2xl bg-[var(--care-soft)] px-4 py-3 text-sm font-semibold text-[var(--care)]">{success}</div>}
          <button disabled={!file || busy} className="mt-5 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-45"><span>{busy ? "Uploading and analyzing report…" : "Analyze report"}</span><span>→</span></button>
        </form>
      </div>

      {documents.length > 0 && <div className="space-y-4">
        {documents.map((document) => {
          const analysis = document.metadata?.ai_analysis;
          return <article key={document.id} className="glass rounded-[30px] p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Analyzed report</p><h3 className="mt-1 font-display text-xl font-extrabold">{document.original_filename}</h3><p className="mt-1 text-xs text-[var(--muted)]">{new Date(document.created_at).toLocaleString()} · {analysis?.document_type || document.content_type || "Document"}</p></div>
              <span className="rounded-full bg-[var(--warning-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--warning)]">{priorityLabel(analysis?.priority)}</span>
            </div>
            {analysis ? <>
              <div className="mt-6 rounded-2xl bg-white/70 p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--muted)]">AI summary</p><p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{analysis.summary}</p></div>
              <div className="mt-5 grid gap-4 md:grid-cols-3"><div className="rounded-2xl bg-white/70 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Routing hint</p><p className="mt-2 text-sm font-bold">{analysis.specialty_hint || "General review"}</p></div><div className="rounded-2xl bg-white/70 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Workflow</p><p className="mt-2 text-sm font-bold">{analysis.workflow || "DOCUMENT"}</p></div><div className="rounded-2xl bg-white/70 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Confidence</p><p className="mt-2 text-sm font-bold">{typeof analysis.confidence === "number" ? `${Math.round(analysis.confidence * 100)}%` : "—"}</p></div></div>
              {analysis.findings?.length ? <div className="mt-6 overflow-hidden rounded-2xl border border-black/5"><div className="bg-black/[.03] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Extracted findings</div><div className="divide-y divide-black/5">{analysis.findings.map((finding, index) => <div key={`${finding.item}-${index}`} className="grid gap-2 px-4 py-4 md:grid-cols-[1.1fr_.8fr_.8fr]"><div><p className="text-sm font-bold">{finding.item}</p><p className="mt-1 text-xs text-[var(--muted)]">{finding.evidence}</p></div><div className="text-sm">{finding.value || "Not reported"}</div><div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{finding.status.replaceAll("_", " ")}{finding.reference_range ? ` · ${finding.reference_range}` : ""}</div></div>)}</div></div> : null}
              {analysis.key_observations?.length ? <div className="mt-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--muted)]">Key observations</p><ul className="mt-3 space-y-2">{analysis.key_observations.map((item, index) => <li key={index} className="rounded-2xl bg-white/65 px-4 py-3 text-sm leading-6">{item}</li>)}</ul></div> : null}
              <div className="mt-6 rounded-2xl bg-[var(--care-soft)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--muted-strong)]">AI-assisted administrative analysis only. Human specialist review is required before any clinical decision or action.</div>
            </> : <p className="mt-5 text-sm text-[var(--muted)]">Processing status: {document.ocr_status}. Analysis will appear when processing completes.</p>}
          </article>;
        })}
      </div>}
    </div>
  );
}
