"use client";

import Link from "next/link";
import { ShieldCheck, ExternalLink, ArrowRight } from "lucide-react";

type Analysis = {
  specialty_hint?: string | null;
  document_type?: string | null;
  summary?: string | null;
  findings?: Array<{ item?: string; value?: string | null; status?: string }>;
};

type Match = {
  id: string;
  scheme: string;
  provider: string;
  type: string;
  why: string;
  eligibility: string;
  action: string;
  url: string;
  sourceLabel: string;
};

const CATALOG: Match[] = [
  {
    id: "cmchis",
    scheme: "Chief Minister's Comprehensive Health Insurance Scheme (CMCHIS)",
    provider: "United India Insurance Company Ltd.",
    type: "Government health scheme",
    why: "Your report has a healthcare specialty or finding that may relate to hospital-based care. CMCHIS publishes medical, surgical and diagnostic package categories and an empanelled-hospital network.",
    eligibility: "Eligibility must be checked separately on the official CMCHIS portal. Current portal criteria include Tamil Nadu residency and an income threshold.",
    action: "Check CMCHIS eligibility",
    url: "https://www.cmchistn.com/enrollment/",
    sourceLabel: "Official CMCHIS portal",
  },
  {
    id: "star",
    scheme: "Star Health health insurance",
    provider: "Star Health and Allied Insurance Co. Ltd.",
    type: "Private insurer",
    why: "A private health-insurance option with a large network-hospital locator. Exact coverage depends on the selected policy, exclusions, waiting periods and underwriting.",
    eligibility: "Policy eligibility and coverage are not confirmed from a medical report alone.",
    action: "Check network hospitals",
    url: "https://www.starhealth.in/lookup/hospital/",
    sourceLabel: "Official Star Health network locator",
  },
  {
    id: "niva",
    scheme: "Niva Bupa health insurance",
    provider: "Niva Bupa Health Insurance Company Limited",
    type: "Private insurer",
    why: "A private health-insurance option with a network-hospital locator for Tamil Nadu. Exact benefits and eligibility depend on the selected policy and its terms.",
    eligibility: "Policy eligibility and coverage are not confirmed from a medical report alone.",
    action: "Find a network hospital",
    url: "https://www.nivabupa.com/",
    sourceLabel: "Official Niva Bupa portal",
  },
];

function isPotentiallyRelevant(analysis: Analysis) {
  const text = [
    analysis.specialty_hint,
    analysis.document_type,
    analysis.summary,
    ...(analysis.findings ?? []).flatMap((f) => [f.item, f.value, f.status]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const healthcareSignal =
    /cardio|heart|ortho|bone|joint|neuro|brain|cancer|oncolog|eye|ophthal|kidney|renal|dialysis|liver|transplant|ent|matern|obstet|gyn|diabet|endocr|surg|hospital|mri|ct|scan|x-ray|ultrasound|biopsy|lab|patholog/.test(text);

  return healthcareSignal ? CATALOG : [CATALOG[0], CATALOG[1], CATALOG[2]];
}

export default function InsuranceCoverageMatches({
  documentId,
  analysis,
}: {
  documentId: string;
  analysis: Analysis;
}) {
  const matches = isPotentiallyRelevant(analysis);
  const specialty = analysis.specialty_hint?.trim() || "the analyzed medical evidence";

  return (
    <section className="mt-6 rounded-[28px] border border-[#0b5960]/10 bg-white p-6 shadow-[0_18px_60px_rgba(4,38,42,.08)] md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#075e66]">AI-assisted coverage matching</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold text-[#102a32]">Insurance options from this report</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            MediSync used the report's extracted evidence and specialty hint ({specialty}) to surface relevant insurance pathways. This is not a coverage or eligibility decision.
          </p>
        </div>
        <Link
          href={`/patient/insurance?documentId=${encodeURIComponent(documentId)}`}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#102a32] px-4 py-3 text-sm font-bold text-white"
        >
          Open insurance view <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {matches.map((match) => (
          <article key={match.id} className="rounded-2xl border border-black/5 bg-[#f7fbfb] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6f3f4] text-[#075e66]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{match.type}</p>
                <p className="text-sm font-extrabold text-[#123f44]">{match.provider}</p>
              </div>
            </div>
            <h3 className="mt-4 text-base font-extrabold text-[#102a32]">{match.scheme}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-600">{match.why}</p>
            <div className="mt-4 rounded-xl bg-white p-3">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Eligibility / coverage</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-600">{match.eligibility}</p>
            </div>
            <a
              href={match.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs font-bold text-[#075e66]"
            >
              {match.action} <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="mt-2 text-[9px] text-slate-400">{match.sourceLabel}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#0b5960]/10 bg-[#f2f8f9] p-4 text-xs leading-5 text-slate-600 md:flex-row md:items-center md:justify-between">
        <span>Coverage, exclusions, waiting periods, network status and final eligibility must be confirmed with the scheme/insurer.</span>
        <Link href={`/hospitals/compare?specialty=${encodeURIComponent(analysis.specialty_hint || "")}`} className="font-bold text-[#075e66]">
          Continue to hospital matching →
        </Link>
      </div>
    </section>
  );
}
