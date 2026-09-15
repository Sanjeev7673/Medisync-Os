import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { verifyReportShareToken } from "@/lib/report-share";

type Finding = { item?: string; value?: string | null; reference_range?: string | null; status?: string; evidence?: string };
type Analysis = { document_type?: string; report_date?: string | null; summary?: string; findings?: Finding[]; key_observations?: string[]; supportive_findings?: string[]; limitations_and_concerns?: string[]; possible_associations?: string[]; symptom_associations?: string[]; red_flags?: string[]; questions_for_clinician?: string[]; priority?: string; specialty_hint?: string | null; workflow?: string; confidence?: number; requires_human_review?: boolean };

export const dynamic = "force-dynamic";

export default async function SharedReport({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> }) {
  const { id } = await params;
  const { token } = await searchParams;
  if (!verifyReportShareToken(id, token || "")) notFound();

  const { data: doc, error } = await getDb().from("documents").select("id,original_filename,metadata,created_at,processing_status").eq("id", id).maybeSingle<{ id: string; original_filename: string; metadata: Record<string, unknown>; created_at: string; processing_status: string }>();
  if (error || !doc) notFound();
  const a = (doc.metadata?.ai_analysis || {}) as Analysis;
  const recordId = `MSR-${doc.id.slice(0, 8).toUpperCase()}`;
  const statusText = a.priority === "urgent_review" ? "Urgent human review" : a.priority === "review_soon" ? "Review soon" : "Completed";

  return <main className="min-h-screen bg-[#eef5f6] px-3 py-6 text-[#173c43] print:bg-white print:px-0">
    <article className="mx-auto max-w-[1050px] overflow-hidden bg-white shadow-[0_20px_70px_rgba(4,47,52,.14)] print:shadow-none">
      <header className="relative overflow-hidden bg-[#075e66] px-7 py-7 text-white md:px-10">
        <div className="absolute -right-20 -top-24 h-64 w-[70%] rounded-full border-[28px] border-[#0b8791]/70" /><div className="absolute -right-28 top-7 h-48 w-[65%] rounded-full border-[20px] border-[#13a6b2]/50" />
        <div className="relative z-10 flex items-start justify-between gap-6"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-[#075e66] text-4xl font-light">+</div><div><div className="text-3xl font-black tracking-[-.04em]">MEDISYNC</div><div className="text-[10px] font-bold uppercase tracking-[.24em] text-white/80">HEALTH RECORDS · ANYTIME · ANYWHERE</div></div></div><div className="hidden text-right sm:block"><div className="text-sm font-black uppercase tracking-[.18em]">Clinical Evidence Report</div><div className="mt-1 text-[9px] uppercase tracking-[.2em] text-white/70">Secure shared view</div></div></div>
      </header>

      <div className="p-6 md:p-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row"><div><p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#08717a]">AI-assisted document analysis</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] md:text-4xl">Clinical Evidence Report</h1><p className="mt-2 text-sm text-slate-500">Standardized evidence extracted from the original source document.</p></div><div className="rounded-2xl bg-[#f0f7f8] p-5 text-sm"><div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2"><b>Report ID</b><span>{recordId}</span><b>Generated</b><span>{new Date(doc.created_at).toLocaleString("en-IN")}</span><b>Source</b><span className="max-w-[280px] truncate" title={doc.original_filename}>{doc.original_filename}</span><b>Status</b><span className="font-bold text-[#087f57]">✓ {statusText}</span></div></div></div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#0b5960]/15"><div className="bg-[#eaf5f6] px-5 py-3 text-sm font-black uppercase tracking-[.14em] text-[#075e66]">Patient & report information</div><div className="grid sm:grid-cols-2"><div className="grid grid-cols-[130px_1fr] border-b border-[#0b5960]/10 p-4 text-sm sm:border-r"><span className="text-slate-500">Patient</span><b>Patient record</b><span className="text-slate-500">Document</span><b>{a.document_type || "Medical report"}</b></div><div className="grid grid-cols-[130px_1fr] p-4 text-sm"><span className="text-slate-500">Report date</span><b>{a.report_date || "Not reported"}</b><span className="text-slate-500">Workflow</span><b>{a.workflow || "DOCUMENT"}</b></div></div></section>

        <section className="mt-7 overflow-hidden rounded-2xl border border-[#0b5960]/15"><div className="bg-[#eaf5f6] px-5 py-3 text-sm font-black uppercase tracking-[.14em] text-[#075e66]">Documented findings</div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="bg-[#075e66] text-left text-[10px] uppercase tracking-[.12em] text-white"><tr><th className="px-4 py-3">Finding</th><th className="px-4 py-3">Reported value</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Interpretation</th></tr></thead><tbody>{(a.findings || []).map((f, i) => <tr key={i} className="border-b border-[#0b5960]/10 last:border-0"><td className="px-4 py-3 font-bold">{f.item || "—"}<div className="mt-1 text-[10px] font-normal text-slate-500">{f.evidence || "Source evidence"}</div></td><td className="px-4 py-3 font-semibold">{f.value || "Not reported"}</td><td className="px-4 py-3 text-slate-600">{f.reference_range || "—"}</td><td className="px-4 py-3 font-semibold uppercase text-[11px]">{(f.status || "not_reported").replaceAll("_", " ")}</td></tr>)}</tbody></table></div></section>

        <div className="mt-7 grid gap-5 md:grid-cols-2"><section className="rounded-2xl bg-[#f3f8f9] p-5"><h2 className="text-sm font-black uppercase tracking-[.12em] text-[#075e66]">Clinical summary</h2><p className="mt-3 text-sm leading-6 text-slate-700">{a.summary || "No summary was reported in the source document."}</p></section><section className="rounded-2xl bg-[#f3f8f9] p-5"><h2 className="text-sm font-black uppercase tracking-[.12em] text-[#075e66]">Key observations</h2><ul className="mt-3 space-y-2 text-sm text-slate-700">{(a.key_observations || []).map((x, i) => <li key={i} className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#08717a] text-[10px] font-bold text-white">{i + 1}</span>{x}</li>)}</ul></section></div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[#0b5960]/15 p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">Suggested specialty</p><p className="mt-2 font-bold">{a.specialty_hint || "General review"}</p></div><div className="rounded-2xl border border-[#0b5960]/15 p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">AI confidence</p><p className="mt-2 text-2xl font-black text-[#075e66]">{typeof a.confidence === "number" ? `${Math.round(a.confidence * 100)}%` : "—"}</p></div><div className="rounded-2xl border border-[#0b5960]/15 p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">Review status</p><p className="mt-2 font-bold">Human review required</p></div></div>

        <div className="mt-8 flex flex-col gap-5 border-t border-[#0b5960]/15 pt-6 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-double border-[#08717a] text-xl text-[#08717a]">✓</div><div><p className="font-black uppercase tracking-[.12em] text-[#075e66]">Verified by MediSync</p><p className="text-xs text-slate-500">Secure report integrity and standardized processing</p></div></div><p className="mt-3 max-w-2xl text-xs leading-5 text-slate-500">This shared report is an AI-assisted standardized evidence record. The original source remains authoritative. It is not a prescription, diagnosis, or treatment order.</p></div><div className="w-48 text-center"><div className="border-b border-slate-400 pb-2 text-2xl italic text-slate-500">MediSync</div><p className="mt-1 text-[9px] font-bold uppercase tracking-[.15em] text-slate-500">Digital verification</p></div></div>
      </div>
      <footer className="bg-[#075e66] px-7 py-5 text-white md:px-10"><div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><b className="tracking-[.16em]">MEDISYNC</b><span className="text-xs text-white/75">Secure · Interoperable · Patient Controlled · Human Review Required</span></div></footer>
    </article>
  </main>;
}
