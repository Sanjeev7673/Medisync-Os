"use client";
import { useEffect, useState } from "react";

type Finding = { item: string; value: string | null; reference_range: string | null; status: "normal" | "abnormal" | "unclear" | "not_reported"; evidence: string };
type Analysis = { document_type?: string; report_date?: string | null; summary?: string; findings?: Finding[]; key_observations?: string[]; supportive_findings?: string[]; limitations_and_concerns?: string[]; possible_associations?: string[]; symptom_associations?: string[]; red_flags?: string[]; questions_for_clinician?: string[]; priority?: string; specialty_hint?: string | null; workflow?: string; confidence?: number; requires_human_review?: boolean };
type Document = { id: string; original_filename: string; content_type: string | null; file_size_bytes: number | null; ocr_status: string; validation_status: string; processing_status?: string; processing_error?: string | null; created_at: string; metadata?: { ai_analysis?: Analysis } };

function priorityLabel(v?: string) {
  return ({ routine: "Routine review", review_soon: "Review soon", urgent_review: "Urgent human review", unclear: "Priority unclear" } as Record<string, string>)[v || ""] || "Awaiting review";
}
function statusLabel(v?: string) {
  return (v || "not_reported").replaceAll("_", " ");
}
function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return <section className="mt-7"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">{title}</p><ul className="mt-3 space-y-2">{items.map((x, i) => <li key={i} className="border-l-2 border-[var(--care)] bg-white/60 px-4 py-3 text-sm leading-6">{x}</li>)}</ul></section>;
}

export default function DocumentIntelligence() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const r = await fetch("/api/documents", { cache: "no-store" });
    if (r.ok) setDocuments((await r.json()).documents || []);
  }
  useEffect(() => { load().catch(() => undefined); }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const b = new FormData();
      b.append("file", file);
      const r = await fetch("/api/documents", { method: "POST", body: b });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Unable to analyze report");
      setSuccess(d.workflow?.triggered ? "Report analyzed, saved and routed for workflow coordination." : "Report analyzed and saved. Human review is required before clinical action.");
      setFile(null);
      const input = document.getElementById("report-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to analyze report");
    } finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <div className="glass rounded-[30px] p-6 md:p-8 print:hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--care)]">AI document intelligence</p><h2 className="mt-1 font-display text-2xl font-extrabold">Upload a patient report.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">MediSync extracts evidence, standardizes the source record and prepares it for authorized clinical review.</p></div>
        <span className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--care)]">Human-in-the-loop</span>
      </div>
      <form onSubmit={upload} className="mt-7 rounded-[24px] border border-dashed border-black/10 bg-white/65 p-5 md:p-6">
        <label htmlFor="report-file" className="block text-sm font-bold">Medical report <span className="font-normal text-[var(--muted)]">PDF, PNG, JPEG or WEBP · max 15 MB</span></label>
        <input id="report-file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-4 block w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm" />
        {file && <p className="mt-2 text-xs text-[var(--muted)]">Selected: {file.name}</p>}
        {error && <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</div>}
        {success && <div className="mt-4 rounded-2xl bg-[var(--care-soft)] px-4 py-3 text-sm font-semibold text-[var(--care)]">{success}</div>}
        <button disabled={!file || busy} className="mt-5 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-45"><span>{busy ? "Uploading, processing and analyzing…" : "Analyze report"}</span><span>→</span></button>
      </form>
    </div>

    {documents.length > 0 && <div className="space-y-5">{documents.map(doc => {
      const a = doc.metadata?.ai_analysis;
      return <article key={doc.id} className="overflow-hidden rounded-[30px] border border-black/10 bg-[#fbfcfa] shadow-[0_24px_80px_rgba(20,35,30,.08)]">
        {a ? <>
          <div className="border-b border-black/10 px-6 pb-6 pt-7 md:px-10 md:pt-9">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[.24em] text-[var(--care)]">MEDISYNC HEALTH RECORD</p>
                <h3 className="mt-2 font-display text-2xl font-extrabold tracking-[-.03em] md:text-3xl">Standardized Clinical Record</h3>
                <p className="mt-1 text-xs font-medium text-[var(--muted)]">AI-assisted extraction from the original source document</p>
              </div>
              <span className="shrink-0 rounded-full border border-[var(--warning)]/20 bg-[var(--warning-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--warning)]">{priorityLabel(a.priority)}</span>
            </div>

            <div className="mt-7 grid gap-0 overflow-hidden rounded-2xl border border-black/10 bg-white md:grid-cols-2">
              <div className="border-b border-black/10 p-4 md:border-r md:border-b-0"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Source document</p><p className="mt-1 text-sm font-bold break-words">{doc.original_filename}</p></div>
              <div className="border-b border-black/10 p-4 md:border-b-0"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Document type</p><p className="mt-1 text-sm font-bold">{a.document_type || "Medical document"}</p></div>
              <div className="border-b border-black/10 p-4 md:border-r md:border-b-0"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Report date</p><p className="mt-1 text-sm font-bold">{a.report_date || "Not reported"}</p></div>
              <div className="p-4"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">MediSync processing</p><p className="mt-1 text-sm font-bold">{doc.processing_status || "COMPLETED"}</p></div>
            </div>
          </div>

          <div className="px-6 py-6 md:px-10 md:py-8">
            <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5 md:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Clinical summary from source evidence</p>
              <p className="mt-3 text-[15px] leading-7 text-[var(--muted-strong)]">{a.summary || "No summary was reported."}</p>
            </section>

            <section className="mt-7">
              <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Documented measurements & findings</p><p className="mt-1 text-xs text-[var(--muted)]">Values are reproduced from the analyzed source; they are not new clinical measurements.</p></div></div>
              {a.findings?.length ? <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white"><div className="grid grid-cols-[1.15fr_.75fr_.9fr] border-b border-black/10 bg-black/[.025] px-4 py-3 text-[9px] font-bold uppercase tracking-[.14em] text-[var(--muted)]"><span>Finding</span><span>Reported value</span><span>Reference / status</span></div><div className="divide-y divide-black/5">{a.findings.map((f, i) => <div key={`${f.item}-${i}`} className="grid grid-cols-[1.15fr_.75fr_.9fr] gap-3 px-4 py-4"><div><p className="text-sm font-bold">{f.item}</p><p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">{f.evidence}</p></div><div className="text-sm font-semibold">{f.value || "Not reported"}</div><div><p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{statusLabel(f.status)}</p>{f.reference_range && <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">{f.reference_range}</p>}</div></div>)}</div></div> : <div className="mt-4 rounded-2xl bg-white p-5 text-sm text-[var(--muted)]">No structured findings were reported.</div>}
            </section>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[var(--muted)]">Specialty routing hint</p><p className="mt-2 text-sm font-bold">{a.specialty_hint || "General review"}</p></div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[var(--muted)]">Workflow</p><p className="mt-2 text-sm font-bold">{a.workflow || "DOCUMENT"}</p></div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[var(--muted)]">AI confidence</p><p className="mt-2 text-sm font-bold">{typeof a.confidence === "number" ? `${Math.round(a.confidence * 100)}%` : "—"}</p></div>
            </div>

            <List title="Key observations" items={a.key_observations} />
            <List title="Positive / supportive findings" items={a.supportive_findings} />
            <List title="Possible associations — not a diagnosis" items={a.possible_associations} />
            <List title="Symptoms potentially associated with documented findings" items={a.symptom_associations} />
            <List title="Limitations / concerns" items={a.limitations_and_concerns} />
            <List title="Red flags documented in the source" items={a.red_flags} />
            <List title="Questions to discuss with your clinician" items={a.questions_for_clinician} />

            <section className="mt-8 rounded-2xl border border-dashed border-black/15 bg-[#f7f8f5] p-5 md:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Authorized clinical review</p><p className="mt-2 text-sm font-bold">Pending clinician review</p><p className="mt-1 max-w-xl text-xs leading-5 text-[var(--muted)]">This standardized record supports care coordination. It is not a prescription, diagnosis, or treatment order.</p></div>
                <div className="min-w-[210px] border-t border-black/20 pt-2 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--muted)]">Clinician review / notes</div>
              </div>
            </section>
          </div>

          <div className="border-t border-black/10 bg-[var(--ink)] px-6 py-5 text-white md:px-10">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/55">MediSync · Evidence standardization</p><p className="text-[10px] font-semibold text-white/55">AI-assisted · Human review required</p></div>
            <p className="mt-2 max-w-4xl text-[11px] leading-5 text-white/55">Original source documents remain the authoritative evidence. MediSync does not independently diagnose, prescribe, change medication, or make autonomous clinical decisions.</p>
          </div>
        </> : <div className="p-6 md:p-8"><p className="text-sm font-bold">Processing status: {doc.processing_status || doc.ocr_status}</p><p className="mt-2 text-sm text-[var(--muted)]">{doc.processing_error || "Your document is being processed. The completed structured analysis will appear here."}</p></div>}
      </article>;
    })}</div>}
  </div>;
}
