import PatientShell from "@/components/PatientShell";
import DocumentIntelligence from "@/components/DocumentIntelligence";

export default function DocumentsPage() {
  return (
    <PatientShell>
      <div className="reveal max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Care documents</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.04em]">Your documents.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Upload a patient report and let MediSync extract document facts and administrative routing signals before authorized human review.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-5">
          {["Upload", "OCR / extraction", "Sanitize", "AI analysis", "Human review"].map((label, i) => <div key={label} className="rounded-2xl bg-white/80 p-4"><div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${i < 4 ? "bg-[var(--care-soft)] text-[var(--care)]" : "bg-black/5 text-[var(--muted)]"}`}>{String(i + 1).padStart(2, "0")}</div><p className="mt-3 text-xs font-bold">{label}</p></div>)}
        </div>
        <div className="mt-6"><DocumentIntelligence /></div>
        <div className="mt-5 rounded-[30px] bg-[var(--ink)] p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Privacy and safety</p><h2 className="mt-3 font-display text-2xl font-extrabold leading-tight">AI supports coordination, not diagnosis.</h2><p className="mt-4 max-w-3xl text-sm leading-6 text-white/60">MediSync extracts information from reports and provides workflow routing hints. It does not independently diagnose, prescribe, or make clinical decisions. Authorized specialists remain responsible for interpretation and care decisions.</p><div className="mt-7 grid gap-3 text-xs font-semibold text-white/75 sm:grid-cols-3"><p>✓ Private patient-scoped storage</p><p>✓ Human review required</p><p>✓ Auditable workflow handoff</p></div></div>
      </div>
    </PatientShell>
  );
}
