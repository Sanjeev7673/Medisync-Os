import PatientShell from "@/components/PatientShell";

export default function DocumentsPage() {
  return (
    <PatientShell>
      <header className="mb-8"><h1 className="font-display font-bold text-2xl">Documents</h1><p className="text-[var(--muted)] mt-1">Upload and track medical documents you share with your care team.</p></header>
      <div className="border border-dashed border-[var(--border)] rounded-lg p-10 text-center"><p className="text-sm text-[var(--muted)]">Document upload isn&apos;t connected yet — this page is a placeholder for the Document workflow.</p></div>
    </PatientShell>
  );
}