import PatientShell from "@/components/PatientShell";

export default function DocumentsPage() {
  return (
    <PatientShell>
      <div className="reveal max-w-5xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Care documents</p><h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.04em]">Your documents.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">A calm place to see the document workflow. Upload processing will connect to the configured document pipeline when enabled.</p>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
          <div className="glass rounded-[30px] p-6 md:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Document pipeline</p><h2 className="mt-1 font-display text-xl font-extrabold">Secure processing journey</h2></div><span className="rounded-full bg-[var(--warning-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--warning)]">Preparing</span></div>
            <div className="mt-8 grid gap-3 sm:grid-cols-5">{["Upload","OCR","Sanitize","AI process","Storage"].map((label, i) => <div key={label} className="rounded-2xl bg-white/80 p-4"><div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${i === 0 ? "bg-[var(--care-soft)] text-[var(--care)]" : "bg-black/5 text-[var(--muted)]"}`}>{String(i + 1).padStart(2, "0")}</div><p className="mt-3 text-xs font-bold">{label}</p></div>)}</div>
            <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-white/45 p-7 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--care-soft)] text-lg text-[var(--care)]">↑</div><p className="mt-4 font-display font-bold">Document upload is not connected yet</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">The interface is ready for the PDF → OCR → sanitization workflow.</p></div>
          </div>
          <div className="rounded-[30px] bg-[var(--ink)] p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Privacy</p><h2 className="mt-3 font-display text-2xl font-extrabold leading-tight">Your documents belong in a protected workflow.</h2><p className="mt-4 text-sm leading-6 text-white/60">MediSync separates document processing from clinical decision-making and keeps the patient journey auditable.</p><div className="mt-8 space-y-3 text-xs font-semibold text-white/75"><p>✓ Controlled processing</p><p>✓ Sanitization before downstream use</p><p>✓ Human review where required</p></div></div>
        </div>
      </div>
    </PatientShell>
  );
}
