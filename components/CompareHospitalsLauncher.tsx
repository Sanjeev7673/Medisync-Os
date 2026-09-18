"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Analysis = { specialty_hint?: string | null };
type Document = { id: string; created_at: string; metadata?: { ai_analysis?: Analysis } };

export default function CompareHospitalsLauncher() {
  const router = useRouter();
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/documents", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const documents: Document[] = Array.isArray(data?.documents) ? data.documents : [];
        const analyzed = documents
          .filter((doc) => doc.metadata?.ai_analysis?.specialty_hint)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setSpecialty(analyzed[0]?.metadata?.ai_analysis?.specialty_hint?.trim() || "");
      })
      .catch(() => setSpecialty(""))
      .finally(() => setLoading(false));
  }, []);

  const compare = () => {
    if (!specialty) return;
    router.push(`/hospitals/compare?specialty=${encodeURIComponent(specialty)}`);
  };

  return (
    <section className="mt-6 rounded-[24px] border border-[#0b5960]/10 bg-gradient-to-r from-[#eaf7f7] to-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#075e66]">Next step</p>
          <h3 className="mt-1 text-lg font-extrabold text-[#102a32]">Find hospitals for this report</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {loading ? "Reading the latest AI analysis…" : specialty ? `AI report specialty: ${specialty}` : "A supported specialty was not provided by the AI report."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" onClick={() => router.push("/documents")} className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-[#075e66] transition hover:bg-[#f2f8f9]">View documents</button>
          <button
          type="button"
          onClick={compare}
          disabled={loading || !specialty}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#075e66] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#064f56] disabled:cursor-not-allowed disabled:opacity-45"
        >
          🏥 Compare Hospitals <span>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
