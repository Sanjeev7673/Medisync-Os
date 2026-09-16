"use client";

import { useEffect, useMemo, useState } from "react";

type Finding = {
  item: string;
  value: string | null;
  reference_range: string | null;
  status: "normal" | "abnormal" | "unclear" | "not_reported";
  evidence: string;
};

type Analysis = {
  document_type?: string;
  report_date?: string | null;
  summary?: string;
  findings?: Finding[];
  key_observations?: string[];
  supportive_findings?: string[];
  limitations_and_concerns?: string[];
  possible_associations?: string[];
  symptom_associations?: string[];
  red_flags?: string[];
  questions_for_clinician?: string[];
  priority?: string;
  specialty_hint?: string | null;
  workflow?: string;
  confidence?: number;
  requires_human_review?: boolean;
};

type Document = {
  id: string;
  original_filename: string;
  content_type: string | null;
  file_size_bytes: number | null;
  ocr_status: string;
  validation_status: string;
  processing_status?: string;
  processing_error?: string | null;
  created_at: string;
  metadata?: { ai_analysis?: Analysis };
};

const PROCESSING_STATES = new Set(["UPLOADING", "PROCESSING", "REVIEW_REQUIRED"]);

function normalizeStatus(value?: string) {
  return String(value || "").trim().toUpperCase();
}

function statusLabel(value?: string) {
  return String(value || "not reported").replaceAll("_", " ").toLowerCase();
}

function Section({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <section className="mt-6">
      <h4 className="border-b border-[#0b5960]/15 pb-2 text-[10px] font-black uppercase tracking-[.16em] text-[#075e66]">{title}</h4>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="rounded-xl bg-white px-3 py-2 text-[11px] leading-5 text-slate-700 shadow-sm">{item}</li>
        ))}
      </ul>
    </section>
  );
}

function ShareQr({ documentId }: { documentId: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/documents/${encodeURIComponent(documentId)}/share`, { method: "POST" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Share unavailable");
        if (active) setUrl(data.url || "");
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Share unavailable");
      });
    return () => { active = false; };
  }, [documentId]);

  const qr = url ? `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=190&margin=1&ecLevel=M` : "";

  return (
    <aside className="rounded-2xl border border-[#0b5960]/10 bg-white p-4 text-center shadow-sm">
      <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-xl bg-[#f3f8f9]">
        {qr ? <img src={qr} alt="QR code to securely view this MediSync report" className="h-32 w-32" /> : <span className="px-4 text-[10px] font-semibold text-slate-500">{error || "Generating secure QR…"}</span>}
      </div>
      <p className="mt-3 text-[10px] font-black uppercase tracking-[.14em] text-[#075e66]">Scan to view report</p>
      <p className="mt-1 text-[9px] leading-4 text-slate-500">Secure share link · expires in 30 days</p>
      {url && <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[9px] font-bold text-[#08717a] underline">Open shared report</a>}
    </aside>
  );
}

function ProcessingCard({ doc }: { doc: Document }) {
  const status = normalizeStatus(doc.processing_status || doc.ocr_status);
  const error = doc.processing_error;
  const failed = status === "FAILED" || status === "ERROR";
  const completed = status === "COMPLETED" || Boolean(doc.metadata?.ai_analysis);

  const stages = ["Upload", "OCR / extraction", "Sanitize", "AI analysis", "Human review"];
  let activeIndex = 0;
  if (status === "PROCESSING") activeIndex = 2;
  if (status === "REVIEW_REQUIRED") activeIndex = 4;
  if (completed) activeIndex = 4;

  return (
    <div className="rounded-[24px] border border-black/5 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[.12em] text-[#075e66]">{failed ? "Processing failed" : completed ? "Processing completed" : "Processing in progress"}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {failed ? error || "SNS Workbench could not complete this document." : completed ? "The structured analysis is ready for authorized review." : "SNS Agent Workbench is processing this document. This page updates automatically."}
          </p>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${failed ? "bg-red-50 text-red-700" : completed ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
          {statusLabel(status || "processing")}
        </span>
      </div>

      {!failed && !completed && (
        <div className="mt-5 grid gap-2 sm:grid-cols-5">
          {stages.map((label, index) => {
            const done = index < activeIndex;
            const active = index === activeIndex;
            return (
              <div key={label} className={`rounded-xl px-3 py-3 text-center text-[10px] font-bold transition-all ${done ? "bg-emerald-50 text-emerald-700" : active ? "bg-[#eaf5f6] text-[#075e66] ring-1 ring-[#08717a]/20" : "bg-slate-50 text-slate-400"}`}>
                <div className="text-[9px] font-black">{done ? "✓" : String(index + 1).padStart(2, "0")}</div>
                <div className="mt-1">{label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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

  const hasProcessing = useMemo(
    () => documents.some((doc) => PROCESSING_STATES.has(normalizeStatus(doc.processing_status || doc.ocr_status)) && !doc.metadata?.ai_analysis),
    [documents],
  );

  useEffect(() => { load().catch(() => undefined); }, []);

  useEffect(() => {
    if (!hasProcessing) return;
    const timer = window.setInterval(() => { load().catch(() => undefined); }, 3000);
    return () => window.clearInterval(timer);
  }, [hasProcessing]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/documents", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to start document processing");

      setSuccess("Document uploaded successfully. SNS Agent Workbench has started OCR and AI processing.");
      setFile(null);
      const input = document.getElementById("report-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start document processing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <div className="glass rounded-[30px] p-6 md:p-8 print:hidden">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--care)]">AI document intelligence</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">Upload a patient report.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">MediSync securely sends PDF and medical images to SNS Agent Workbench for OCR, AI analysis and human review preparation.</p>
          </div>
          <span className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--care)]">Human-in-the-loop</span>
        </div>

        <form onSubmit={upload} className="mt-7 rounded-[24px] border border-dashed border-black/10 bg-white/65 p-5 md:p-6">
          <label htmlFor="report-file" className="block text-sm font-bold">Medical report <span className="font-normal text-[var(--muted)]">PDF, PNG, JPEG or WEBP · max 15 MB</span></label>
          <input id="report-file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-4 block w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm" />
          {file && <p className="mt-2 text-xs text-[var(--muted)]">Selected: {file.name}</p>}
          {error && <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</div>}
          {success && <div className="mt-4 rounded-2xl bg-[var(--care-soft)] px-4 py-3 text-sm font-semibold text-[var(--care)]">{success}</div>}
          <button disabled={!file || busy} className="mt-5 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white shadow-xl transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"><span>{busy ? "Uploading and starting Workbench…" : "Analyze report"}</span><span>→</span></button>
        </form>
      </div>

      {documents.length > 0 && (
        <div className="space-y-8">
          {documents.map((doc) => {
            const a = doc.metadata?.ai_analysis;
            const status = normalizeStatus(doc.processing_status || doc.ocr_status);
            const recordId = `MSR-${doc.id.slice(0, 8).toUpperCase()}`;

            if (!a) {
              return <article key={doc.id} className="mx-auto w-full max-w-[1060px]"><ProcessingCard doc={doc} /></article>;
            }

            return (
              <article key={doc.id} className="mx-auto w-full max-w-[1060px] overflow-hidden rounded-[4px] bg-white shadow-[0_24px_80px_rgba(4,38,42,.14)] print:max-w-none print:shadow-none">
                <header className="relative overflow-hidden bg-[#075e66] px-7 py-7 text-white md:px-10"><div className="absolute -right-24 -top-28 h-72 w-[72%] rounded-full border-[30px] border-[#0b8791]/70" /><div className="absolute -right-32 top-8 h-52 w-[68%] rounded-full border-[18px] border-[#13a6b2]/55" /><div className="relative z-10 flex items-start justify-between gap-6"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-5xl font-light text-[#075e66] shadow-lg">+</div><div><p className="text-[28px] font-black leading-none tracking-[-.04em]">MEDISYNC</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[.3em] text-white/80">HEALTH RECORDS · ANYTIME · ANYWHERE</p></div></div><div className="hidden text-right sm:block"><p className="text-[16px] font-black uppercase tracking-[.15em]">Connecting People</p><p className="text-[12px] italic text-white/75">Care and Confidence</p><div className="mt-2 text-[9px] font-semibold uppercase tracking-[.18em] text-white/60">Secure clinical coordination</div></div></div></header>

                <div className="p-6 md:p-10">
                  <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.3em] text-[#08717a]">AI-assisted document analysis</p><h1 className="mt-2 text-[34px] font-extrabold tracking-[-.035em] text-[#102a32] md:text-[42px]">Clinical Evidence Report</h1><p className="mt-2 text-[11px] uppercase tracking-[.34em] text-slate-500">Standardized medical evidence · human review required</p></div><div className="rounded-2xl bg-[#f1f7f8] p-5"><div className="grid grid-cols-[112px_1fr] gap-x-3 gap-y-2 text-[11px]"><b>Report ID</b><span>{recordId}</span><b>Generated</b><span>{new Date(doc.created_at).toLocaleString("en-IN")}</span><b>Source</b><span className="truncate" title={doc.original_filename}>{doc.original_filename}</span><b>Type</b><span>{a.document_type || "Medical report"}</span><b>Status</b><span className="font-bold text-[#07804f]">✓ Completed</span></div></div></div>

                  <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_190px]"><section className="overflow-hidden rounded-2xl border border-[#0b5960]/15"><div className="bg-[#eaf5f6] px-5 py-3 text-[12px] font-black uppercase tracking-[.14em] text-[#075e66]">Patient information</div><div className="grid sm:grid-cols-2"><div className="grid grid-cols-[120px_1fr] gap-y-0 border-b border-[#0b5960]/10 p-4 text-[11px] sm:border-b-0 sm:border-r"><span className="border-b py-2 text-slate-500">Patient</span><b className="border-b py-2">Patient record</b><span className="border-b py-2 text-slate-500">Report date</span><b className="border-b py-2">{a.report_date || "Not reported"}</b><span className="py-2 text-slate-500">Document</span><b className="py-2">{a.document_type || "Medical report"}</b></div><div className="grid grid-cols-[120px_1fr] gap-y-0 p-4 text-[11px]"><span className="border-b py-2 text-slate-500">MediSync ID</span><b className="border-b py-2">Protected patient identity</b><span className="border-b py-2 text-slate-500">Workflow</span><b className="border-b py-2">{a.workflow || "DOCUMENT"}</b><span className="py-2 text-slate-500">Review</span><b className="py-2">Human review required</b></div></div></section><ShareQr documentId={doc.id} /></div>

                  <section className="mt-7 overflow-hidden rounded-2xl border border-[#0b5960]/15"><div className="flex items-center justify-between bg-[#eaf5f6] px-5 py-3"><h2 className="text-[12px] font-black uppercase tracking-[.14em] text-[#075e66]">Documented findings</h2><span className="text-[9px] italic text-slate-500">Values extracted and structured from source evidence</span></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-[11px]"><thead className="bg-[#075e66] text-left text-[9px] uppercase tracking-[.1em] text-white"><tr><th className="px-4 py-3">Test parameter / finding</th><th className="px-4 py-3">Reported value</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Reference range</th><th className="px-4 py-3">Interpretation</th></tr></thead><tbody>{(a.findings || []).map((f, i) => { const abnormal = f.status === "abnormal"; return <tr key={i} className="border-b border-[#0b5960]/10 last:border-0"><td className="px-4 py-3 font-bold">{f.item}<div className="mt-1 max-w-[260px] text-[9px] font-normal leading-4 text-slate-500">{f.evidence}</div></td><td className="px-4 py-3 font-semibold">{f.value || "Not reported"}</td><td className="px-4 py-3 text-slate-600">{f.value?.match(/([a-zA-Zµ×\/]+)$/)?.[1] || "—"}</td><td className="px-4 py-3 text-slate-600">{f.reference_range || "—"}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-2 font-semibold capitalize ${abnormal ? "text-[#c73c2b]" : "text-[#07804f]"}`}><span className={`h-2.5 w-2.5 rounded-full ${abnormal ? "bg-[#d94835]" : "bg-[#0b9b68]"}`} />{statusLabel(f.status)}</span></td></tr>; })}</tbody></table></div></section>

                  <div className="mt-6 grid gap-5 md:grid-cols-2"><section className="rounded-2xl bg-[#f2f8f9] p-5"><h2 className="text-[12px] font-black uppercase tracking-[.14em] text-[#075e66]">Clinical summary · AI generated</h2><p className="mt-3 text-[11px] leading-6 text-slate-700">{a.summary || "No summary was reported in the source document."}</p></section><section className="rounded-2xl bg-[#f2f8f9] p-5"><h2 className="text-[12px] font-black uppercase tracking-[.14em] text-[#075e66]">Key observations</h2><ol className="mt-3 space-y-2">{(a.key_observations || []).map((x, i) => <li key={i} className="flex gap-3 text-[11px] leading-5 text-slate-700"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#08717a] font-black text-white">{i + 1}</span><span>{x}</span></li>)}</ol></section></div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-[#f2f8f9] p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">Suggested specialty</p><p className="mt-2 text-sm font-bold text-[#123f44]">{a.specialty_hint || "General review"}</p></div><div className="rounded-2xl bg-[#f2f8f9] p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">Workflow</p><p className="mt-2 text-sm font-bold text-[#123f44]">{a.workflow || "DOCUMENT"}</p></div><div className="rounded-2xl bg-[#f2f8f9] p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">AI confidence</p><div className="mt-2 flex items-center gap-3"><strong className="text-2xl text-[#075e66]">{typeof a.confidence === "number" ? `${Math.round(a.confidence * 100)}%` : "—"}</strong><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#dce9eb]"><div className="h-full rounded-full bg-[#08717a]" style={{ width: `${typeof a.confidence === "number" ? Math.max(0, Math.min(100, a.confidence * 100)) : 0}%` }} /></div></div></div></div>

                  <Section title="Key observations and supportive evidence" items={[...(a.supportive_findings || []), ...(a.limitations_and_concerns || [])]} /><Section title="Possible associations — not a diagnosis" items={a.possible_associations} /><Section title="Questions to discuss with your clinician" items={a.questions_for_clinician} /><Section title="Source-documented red flags" items={a.red_flags} />

                  <section className="mt-8 border-t border-[#0b5960]/20 pt-6"><div className="grid gap-7 md:grid-cols-[1.1fr_220px_1fr] md:items-center"><div><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-double border-[#08717a] text-xl font-black text-[#08717a]">✓</div><div><p className="text-[12px] font-black uppercase tracking-[.13em] text-[#075e66]">Verified by MediSync</p><p className="text-[9px] text-slate-500">Document processing & standardization seal</p></div></div><p className="mt-3 text-[9px] leading-5 text-slate-500">MediSync verifies that this record was processed through its secure document-intelligence workflow and structured from the source document. This seal does not represent a physician diagnosis or treatment approval.</p></div><div className="mx-auto flex h-40 w-40 flex-col items-center justify-center rounded-full border-[5px] border-double border-[#08717a] text-center text-[#075e66] shadow-inner"><div className="text-3xl font-light">+</div><p className="text-[10px] font-black uppercase tracking-[.12em]">MEDISYNC</p><p className="mt-1 text-[8px] font-bold uppercase tracking-[.14em]">Verified Record</p><p className="mt-1 text-[7px]">Secure · Standardized</p></div><div className="md:pl-5"><div className="mb-7 border-b border-slate-500 pb-2 text-right text-lg italic text-slate-500">Authorized clinician</div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Clinical review / signature</p><p className="mt-1 text-[9px] text-slate-500">Pending authorized clinician review</p></div></div></section>
                </div>
                <footer className="bg-[#075e66] px-7 py-5 text-white md:px-10"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] font-black uppercase tracking-[.2em]">MEDISYNC</p><p className="text-[9px] font-semibold text-white/80">Secure & Encrypted · Interoperable Healthcare · Patient Controlled</p></div><p className="mt-2 text-[8px] leading-4 text-white/60">Original source documents remain authoritative. MediSync assists with extraction and care coordination; it does not independently diagnose, prescribe, change medication, or make autonomous clinical decisions.</p></footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
