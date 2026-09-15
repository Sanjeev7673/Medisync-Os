"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PatientShell from "@/components/PatientShell";

type Step = "request" | "documents" | "complete";

export default function NewRequestPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [treatmentDuration, setTreatmentDuration] = useState("");
  const [medications, setMedications] = useState("");
  const [currentHospital, setCurrentHospital] = useState("");
  const [treatmentDetails, setTreatmentDetails] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<Step>("request");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  useEffect(() => { fetch("/api/auth/session").then((r) => r.json()).then((data) => setPatientId(data?.user?.patientId ?? null)).catch(() => undefined); }, []);

  async function createRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !patientId) return;
    setSubmitting(true); setError(null);
    const structuredRequest = [
      text.trim(),
      treatmentDuration.trim() ? `Treatment duration: ${treatmentDuration.trim()}` : "",
      currentHospital.trim() ? `Current / previous hospital: ${currentHospital.trim()}` : "",
      treatmentDetails.trim() ? `Previous treatment details: ${treatmentDetails.trim()}` : "",
      medications.trim() ? `Current / previous medications: ${medications.trim()}` : "",
    ].filter(Boolean).join("\n\n");
    try {
      const res = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patient_id: patientId, request: structuredRequest, request_source: "patient_portal", document_uploaded: files.length > 0 }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not submit your request");
      setRequestId(data.request.request_id); setStep("documents");
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong submitting your request. Please try again."); }
    finally { setSubmitting(false); }
  }

  async function uploadDocuments() {
    if (!requestId) return;
    if (!files.length) { router.push(`/requests/${requestId}`); return; }
    setSubmitting(true); setError(null);
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]; setProgress(`Analyzing report ${index + 1} of ${files.length}: ${file.name}`);
        const body = new FormData(); body.append("file", file); body.append("request_id", requestId);
        const response = await fetch("/api/documents", { method: "POST", body }); const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || `Unable to analyze ${file.name}`);
      }
      setStep("complete"); setProgress("All uploaded reports were analyzed and linked to this care request.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to process the uploaded reports."); }
    finally { setSubmitting(false); }
  }

  const stepIndex = step === "request" ? 0 : step === "documents" ? 1 : 2;
  return <PatientShell><div className="reveal max-w-6xl">
    <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">MediSync care intake</p><h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.04em] md:text-5xl">Create your portable medical record.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">Describe your current concern and treatment history, then upload your existing medical evidence. MediSync organizes the information into a standardized record for authorized healthcare professionals.</p></div>
    <div className="mb-6 grid gap-3 md:grid-cols-3">{["Care & treatment history", "Upload existing reports", "Review your MediSync record"].map((label, index) => <div key={label} className={`rounded-2xl p-4 ${index <= stepIndex ? "bg-[var(--ink)] text-white" : "bg-white/70"}`}><div className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold ${index <= stepIndex ? "bg-white/15 text-white" : "bg-black/5 text-[var(--muted)]"}`}>{String(index + 1).padStart(2, "0")}</div><p className={`mt-3 text-xs font-bold ${index <= stepIndex ? "text-white/80" : ""}`}>{label}</p></div>)}</div>
    {step === "request" && <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
      <form onSubmit={createRequest} className="glass rounded-[30px] p-6 md:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Step 01</p><h2 className="mt-1 font-display text-2xl font-extrabold">Tell us about your care.</h2>
        <label className="mt-7 block"><span className="text-sm font-bold">Current concern</span><textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} required maxLength={2000} placeholder="Example: I was treated for a bone injury and want to continue care using my existing MRI and treatment records." className="mt-3 w-full resize-none rounded-[22px] border border-black/8 bg-white/80 px-5 py-4 text-sm leading-6 outline-none focus:border-[var(--care)] focus:ring-4 focus:ring-[var(--care)]/10" /></label>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><label><span className="text-sm font-bold">Treatment duration</span><input value={treatmentDuration} onChange={(e) => setTreatmentDuration(e.target.value)} placeholder="e.g. 12 days / 3 months" className="mt-2 w-full rounded-2xl border border-black/8 bg-white/80 px-4 py-3 text-sm outline-none focus:border-[var(--care)]" /></label><label><span className="text-sm font-bold">Current / previous hospital</span><input value={currentHospital} onChange={(e) => setCurrentHospital(e.target.value)} placeholder="Hospital name" className="mt-2 w-full rounded-2xl border border-black/8 bg-white/80 px-4 py-3 text-sm outline-none focus:border-[var(--care)]" /></label></div>
        <label className="mt-4 block"><span className="text-sm font-bold">Previous treatment details</span><textarea value={treatmentDetails} onChange={(e) => setTreatmentDetails(e.target.value)} rows={4} maxLength={2000} placeholder="Procedures, therapies, hospital visits, or other relevant history." className="mt-2 w-full resize-none rounded-2xl border border-black/8 bg-white/80 px-4 py-3 text-sm leading-6 outline-none focus:border-[var(--care)]" /></label>
        <label className="mt-4 block"><span className="text-sm font-bold">Medication history</span><textarea value={medications} onChange={(e) => setMedications(e.target.value)} rows={4} maxLength={2000} placeholder="Medicine name, dose, frequency and duration if known. You can also upload the prescription / medication sheet." className="mt-2 w-full resize-none rounded-2xl border border-black/8 bg-white/80 px-4 py-3 text-sm leading-6 outline-none focus:border-[var(--care)]" /></label>
        <p className="mt-3 text-[11px] text-[var(--muted)]">Only provide healthcare information relevant to this request. Do not enter passwords, payment credentials or other account secrets.</p>
        {error && <div className="mt-5 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</div>}
        <button type="submit" disabled={submitting || !patientId || !text.trim()} className="group mt-7 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-45"><span>{submitting ? "Creating care record…" : "Continue to medical reports"}</span><span>→</span></button>
      </form>
      <aside className="glass rounded-[30px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">What happens next</p><div className="mt-6 space-y-5">{[["01", "Preserve your history", "Treatment duration, previous hospital, treatment details and medication history stay attached to the care request."],["02", "Analyze existing evidence", "MRI, CT, X-ray, lab and specialist reports can be organized and summarized."],["03", "Prepare human review", "The record is structured for authorized specialist review, not autonomous diagnosis."]].map(([n, title, desc]) => <div key={n} className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--care-soft)] text-xs font-bold text-[var(--care)]">{n}</span><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{desc}</p></div></div>)}</div></aside>
    </div>}
    {step === "documents" && <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><div className="glass rounded-[30px] p-6 md:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Step 02 · {requestId}</p><h2 className="mt-1 font-display text-2xl font-extrabold">Upload your existing medical reports.</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Upload MRI, CT, X-ray, laboratory, neurology, orthopaedic, discharge or medication reports. Each file is analyzed and linked to this request.</p><input multiple type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 10))} className="mt-7 block w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm" />{files.length > 0 && <div className="mt-4 space-y-2">{files.map((file) => <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm"><span className="truncate font-semibold">{file.name}</span><span className="ml-3 shrink-0 text-xs text-[var(--muted)]">{(file.size / 1024 / 1024).toFixed(1)} MB</span></div>)}</div>}{progress && <div className="mt-4 rounded-2xl bg-[var(--care-soft)] px-4 py-3 text-sm font-semibold text-[var(--muted-strong)]">{progress}</div>}{error && <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</div>}<div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => router.push(`/requests/${requestId}`)} disabled={submitting} className="rounded-2xl border border-black/10 bg-white px-5 py-4 text-sm font-bold">Skip for now</button><button type="button" onClick={uploadDocuments} disabled={submitting || !files.length} className="rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">{submitting ? "Analyzing reports…" : "Analyze and build record →"}</button></div></div><aside className="rounded-[30px] bg-[var(--ink)] p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Evidence first</p><h3 className="mt-3 font-display text-2xl font-extrabold">Keep the original reports.</h3><p className="mt-3 text-sm leading-6 text-white/60">MediSync keeps uploaded evidence alongside the structured analysis so another authorized provider can review the source material.</p><div className="mt-7 space-y-3 text-xs font-semibold text-white/70"><p>✓ Patient-scoped private storage</p><p>✓ File linked to care request</p><p>✓ Structured AI extraction</p><p>✓ Human review remains required</p></div></aside></div>}
    {step === "complete" && <div className="glass rounded-[30px] p-8 md:p-12"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--care-soft)] text-xl text-[var(--care)]">✓</div><p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[var(--care)]">MediSync record ready</p><h2 className="mt-2 font-display text-3xl font-extrabold">Your reports are now part of the care record.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">The uploaded evidence has been analyzed, structured and linked to request <strong>{requestId}</strong>. Review the standardized record and follow the next human-review steps.</p><div className="mt-7 flex flex-wrap gap-3"><button onClick={() => router.push(`/requests/${requestId}`)} className="rounded-2xl bg-[var(--ink)] px-5 py-3.5 text-sm font-bold text-white">Open care request →</button><button onClick={() => router.push("/documents")} className="rounded-2xl border border-black/10 bg-white px-5 py-3.5 text-sm font-bold">Open medical records</button></div></div>}
  </div></PatientShell>;
}
