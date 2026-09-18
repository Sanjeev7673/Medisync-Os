"use client";

import { useEffect, useMemo, useState } from "react";
import InsuranceCoverageMatches from "@/components/InsuranceCoverageMatches";

type Finding = {
  item: string;
  value?: string;
  unit?: string;
  reference_range?: string;
  status?: "normal" | "abnormal" | "unclear" | "not_reported";
  evidence?: string;
};

type Analysis = {
  document_type?: string;
  report_date?: string;
  patient_name?: string;
  patient_id?: string;
  date_of_birth?: string;
  sex?: string;
  referring_unit?: string;
  specimen?: string;
  summary?: string;
  findings?: Finding[];
  key_observations?: string[];
  supportive_findings?: string[];
  limitations_and_concerns?: string[];
  possible_associations?: string[];
  questions_for_clinician?: string[];
  red_flags?: string[];
  priority?: string;
  specialty_hint?: string;
  workflow?: string;
  confidence?: number;
  requires_human_review?: boolean;
};

type Document = {
  id: string;
  original_filename: string;
  ocr_status: string;
  processing_status?: string;
  processing_error?: string | null;
  created_at: string;
  metadata?: { ai_analysis?: Analysis };
};

const PROCESSING_STATES = new Set(["UPLOADING", "PROCESSING", "REVIEW_REQUIRED"]);
const valueOrNotProvided = (value?: string | null) => value && value.trim() ? value : "Not provided";
const statusLabel = (value?: string) => String(value || "not_reported").replaceAll("_", " ").toLowerCase();

function Section({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return <section className="mt-6"><h4 className="border-b border-[#0b5960]/15 pb-2 text-[10px] font-black uppercase tracking-[.16em] text-[#075e66]">{title}</h4><ul className="mt-3 grid gap-2 sm:grid-cols-2">{items.map((item, i) => <li key={i} className="rounded-xl bg-white px-3 py-2 text-[11px] leading-5 text-slate-700 shadow-sm">{item}</li>)}</ul></section>;
}

function ShareQr({ documentId }: { documentId: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => { fetch(`/api/documents/${encodeURIComponent(documentId)}/share`, { method: "POST" }).then(r => r.json()).then(d => setUrl(d.url || "")).catch(() => undefined); }, [documentId]);
  const qr = url ? `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=190&margin=1&ecLevel=M` : "";
  return <aside className="rounded-2xl border border-[#0b5960]/10 bg-white p-4 text-center shadow-sm"><div className="mx-auto flex h-36 w-36 items-center justify-center rounded-xl bg-[#f3f8f9]">{qr ? <img src={qr} alt="Secure report QR code" className="h-32 w-32" /> : <span className="text-[10px] text-slate-500">Generating secure QR…</span>}</div><p className="mt-3 text-[10px] font-black uppercase tracking-[.14em] text-[#075e66]">Scan to view report</p><p className="mt-1 text-[9px] text-slate-500">Secure share link · expires in 30 days</p>{url && <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[9px] font-bold text-[#08717a] underline">Open shared report</a>}</aside>;
}

function ProcessingCard({ doc }: { doc: Document }) {
  const status = String(doc.processing_status || doc.ocr_status || "processing").toUpperCase();
  const failed = status === "FAILED" || status === "ERROR";
  return <div className="rounded-[24px] border border-black/5 bg-white p-6 shadow-sm"><p className="text-sm font-black uppercase tracking-[.12em] text-[#075e66]">{failed ? "Processing failed" : "Processing in progress"}</p><p className="mt-1 text-sm text-[var(--muted)]">{failed ? doc.processing_error || "Document processing failed." : "OCR and AI analysis are still processing this document."}</p></div>;
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

  const hasProcessing = useMemo(() => documents.some(d => PROCESSING_STATES.has(String(d.processing_status || d.ocr_status).toUpperCase()) && !d.metadata?.ai_analysis), [documents]);
  useEffect(() => { load().catch(() => undefined); }, []);
  useEffect(() => { if (!hasProcessing) return; const timer = window.setInterval(() => load().catch(() => undefined), 3000); return () => window.clearInterval(timer); }, [hasProcessing]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/documents", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to analyze document");
      setSuccess("Document uploaded. OCR tables and source-grounded AI extraction completed.");
      setFile(null);
      const input = document.getElementById("report-file") as HTMLInputElement | null; if (input) input.value = "";
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to analyze document"); }
    finally { setBusy(false); }
  }

  return <div className="space-y-7">
    <div className="glass rounded-[30px] p-6 md:p-8 print:hidden">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--care)]">AI document intelligence</p>
      <h2 className="mt-1 font-display text-2xl font-extrabold">Upload a patient report.</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">MediSync extracts the original report text and tables, then structures only source-grounded evidence for clinician review.</p>
      <form onSubmit={upload} className="mt-7 rounded-[24px] border border-dashed border-black/10 bg-white/65 p-5 md:p-6">
        <label htmlFor="report-file" className="block text-sm font-bold">Medical report <span className="font-normal text-[var(--muted)]">PDF, PNG, JPEG or WEBP · max 15 MB</span></label>
        <input id="report-file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-4 block w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm" />
        {file && <p className="mt-2 text-xs text-[var(--muted)]">Selected: {file.name}</p>}
        {error && <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</div>}
        {success && <div className="mt-4 rounded-2xl bg-[var(--care-soft)] px-4 py-3 text-sm font-semibold text-[var(--care)]">{success}</div>}
        <button disabled={!file || busy} className="mt-5 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-45"><span>{busy ? "Extracting and analyzing…" : "Analyze report"}</span><span>→</span></button>
      </form>
    </div>

    {documents.length > 0 && <div className="space-y-8">{documents.map(doc => {
      const a = doc.metadata?.ai_analysis;
      if (!a) return <article key={doc.id} className="mx-auto w-full max-w-[1060px]"><ProcessingCard doc={doc} /></article>;
      const recordId = `MSR-${doc.id.slice(0, 8).toUpperCase()}`;
      const confidence = typeof a.confidence === "number" ? Math.max(0, Math.min(100, Math.round(a.confidence * 100))) : null;
      return <article key={doc.id} className="mx-auto w-full max-w-[1060px] overflow-hidden rounded-[4px] bg-white shadow-[0_24px_80px_rgba(4,38,42,.14)]">
        <header className="relative overflow-hidden bg-[#075e66] px-7 py-7 text-white md:px-10"><div className="relative z-10 flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-5xl font-light text-[#075e66]">+</div><div><p className="text-[28px] font-black leading-none">MEDISYNC</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[.3em] text-white/80">HEALTH RECORDS · ANYTIME · ANYWHERE</p></div></div></header>
        <div className="p-6 md:p-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.3em] text-[#08717a]">AI-assisted document analysis</p><h1 className="mt-2 text-[34px] font-extrabold tracking-[-.035em] text-[#102a32] md:text-[42px]">Clinical Evidence Report</h1><p className="mt-2 text-[11px] uppercase tracking-[.34em] text-slate-500">Source-grounded extraction · human review required</p></div><div className="rounded-2xl bg-[#f1f7f8] p-5"><div className="grid grid-cols-[112px_1fr] gap-x-3 gap-y-2 text-[11px]"><b>Report ID</b><span>{recordId}</span><b>Generated</b><span>{new Date(doc.created_at).toLocaleString("en-IN")}</span><b>Source</b><span className="truncate" title={doc.original_filename}>{doc.original_filename}</span><b>Type</b><span>{valueOrNotProvided(a.document_type)}</span><b>Status</b><span className="font-bold text-[#07804f]">✓ Completed</span></div></div></div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_190px]"><section className="overflow-hidden rounded-2xl border border-[#0b5960]/15"><div className="bg-[#eaf5f6] px-5 py-3 text-[12px] font-black uppercase tracking-[.14em] text-[#075e66]">Patient information</div><div className="grid sm:grid-cols-2"><div className="grid grid-cols-[120px_1fr] p-4 text-[11px]"><span className="border-b py-2 text-slate-500">Patient</span><b className="border-b py-2">{valueOrNotProvided(a.patient_name)}</b><span className="border-b py-2 text-slate-500">Patient ID</span><b className="border-b py-2">{valueOrNotProvided(a.patient_id)}</b><span className="border-b py-2 text-slate-500">Date of birth</span><b className="border-b py-2">{valueOrNotProvided(a.date_of_birth)}</b><span className="py-2 text-slate-500">Sex</span><b className="py-2">{valueOrNotProvided(a.sex)}</b></div><div className="grid grid-cols-[120px_1fr] p-4 text-[11px]"><span className="border-b py-2 text-slate-500">Report date</span><b className="border-b py-2">{valueOrNotProvided(a.report_date)}</b><span className="border-b py-2 text-slate-500">Specimen</span><b className="border-b py-2">{valueOrNotProvided(a.specimen)}</b><span className="border-b py-2 text-slate-500">Referring unit</span><b className="border-b py-2">{valueOrNotProvided(a.referring_unit)}</b><span className="py-2 text-slate-500">Review</span><b className="py-2">Human review required</b></div></div></section><ShareQr documentId={doc.id} /></div>

          <section className="mt-7 overflow-hidden rounded-2xl border border-[#0b5960]/15"><div className="bg-[#eaf5f6] px-5 py-3 text-[12px] font-black uppercase tracking-[.14em] text-[#075e66]">Documented findings</div><div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-[11px]"><thead className="bg-[#075e66] text-left text-[9px] uppercase tracking-[.1em] text-white"><tr><th className="px-4 py-3">Test / finding</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Reference range</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{(a.findings || []).map((f, i) => <tr key={i} className="border-b border-[#0b5960]/10"><td className="px-4 py-3 font-bold">{valueOrNotProvided(f.item)}{f.evidence && <div className="mt-1 text-[9px] font-normal leading-4 text-slate-500">Evidence: {f.evidence}</div>}</td><td className="px-4 py-3 font-semibold">{valueOrNotProvided(f.value)}</td><td className="px-4 py-3 text-slate-600">{valueOrNotProvided(f.unit)}</td><td className="px-4 py-3 text-slate-600">{valueOrNotProvided(f.reference_range)}</td><td className={`px-4 py-3 font-semibold capitalize ${f.status === "abnormal" ? "text-[#c73c2b]" : "text-[#07804f]"}`}>{statusLabel(f.status)}</td></tr>)}</tbody></table></div>{!a.findings?.length && <p className="p-5 text-[11px] text-slate-500">No measurable findings were explicitly extracted from the source.</p>}</section>

          <div className="mt-6 grid gap-5 md:grid-cols-2"><section className="rounded-2xl bg-[#f2f8f9] p-5"><h2 className="text-[12px] font-black uppercase tracking-[.14em] text-[#075e66]">Clinical summary · AI generated</h2><p className="mt-3 text-[11px] leading-6 text-slate-700">{valueOrNotProvided(a.summary)}</p></section><section className="rounded-2xl bg-[#f2f8f9] p-5"><h2 className="text-[12px] font-black uppercase tracking-[.14em] text-[#075e66]">Key observations</h2><ul className="mt-3 space-y-2">{(a.key_observations || []).map((x, i) => <li key={i} className="text-[11px] leading-5 text-slate-700">• {x}</li>)}</ul>{!a.key_observations?.length && <p className="mt-3 text-[11px] text-slate-500">No source-grounded observations reported.</p>}</section></div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-[#f2f8f9] p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">Specialty hint</p><p className="mt-2 text-sm font-bold text-[#123f44]">{valueOrNotProvided(a.specialty_hint)}</p></div><div className="rounded-2xl bg-[#f2f8f9] p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">Priority</p><p className="mt-2 text-sm font-bold text-[#123f44]">{valueOrNotProvided(a.priority)}</p></div><div className="rounded-2xl bg-[#f2f8f9] p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">AI extraction confidence</p><p className="mt-2 text-2xl font-black text-[#075e66]">{confidence === null ? "Not reported" : `${confidence}%`}</p></div></div>

          <Section title="Supportive findings / limitations" items={[...(a.supportive_findings || []), ...(a.limitations_and_concerns || [])]} /><Section title="Possible associations — not a diagnosis" items={a.possible_associations} /><Section title="Questions to discuss with your clinician" items={a.questions_for_clinician} /><Section title="Source-documented red flags" items={a.red_flags} />

          <section className="mt-8 rounded-2xl border border-[#0b5960]/15 bg-[#fff8e8] p-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8a6500]">Human review required</p><p className="mt-2 text-[11px] leading-5 text-slate-700">This report contains AI-assisted extraction only. The original source document remains authoritative and a qualified clinician must verify all extracted clinical information before clinical use.</p></section>

          <InsuranceCoverageMatches documentId={doc.id} analysis={a} />
        </div>
        <footer className="bg-[#075e66] px-7 py-5 text-white md:px-10"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] font-black uppercase tracking-[.2em]">MEDISYNC</p><p className="text-[9px] font-semibold text-white/80">Secure & Encrypted · Patient Controlled</p></div></footer>
      </article>;
    })}</div>}
  </div>;
}
