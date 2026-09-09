"use client";

import Link from "next/link";
import { useParams, useEffect, useState } from "react";
import type { PatientRequest } from "@/lib/types";

type AuditEntry = { action: string; created_at: string; actor_user_id?: string | null };

export default function SpecialistReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const requestId = decodeURIComponent(params.id);
  const [request, setRequest] = useState<PatientRequest | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"APPROVE" | "REJECT" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/specialist/requests/${encodeURIComponent(requestId)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Unable to load request");
        return body;
      })
      .then((body) => {
        setRequest(body.request);
        setAudit(body.audit ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load request"))
      .finally(() => setLoading(false));
  }, [requestId]);

  async function review(decision: "APPROVE" | "REJECT") {
    setSubmitting(decision);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/specialist/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, decision }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Unable to submit review");
      setSuccess(decision === "APPROVE" ? "Approved. The request is moving to hospital matching." : "Rejected. The request has been closed as rejected.");
      setTimeout(() => { window.location.href = "/specialist/reviews"; }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit review");
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) return <main className="mx-auto max-w-4xl p-6">Loading request…</main>;
  if (error && !request) return <main className="mx-auto max-w-4xl space-y-4 p-6"><p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</p><Link className="underline" href="/specialist/reviews">Back to queue</Link></main>;
  if (!request) return null;

  const canReview = request.workflow_status === "PENDING_REVIEW";

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <Link href="/specialist/reviews" className="text-sm underline">← Back to review queue</Link>
      <header>
        <p className="text-sm text-slate-500">Specialist Review</p>
        <h1 className="text-3xl font-semibold">{request.request_id}</h1>
        <p className="mt-2 text-slate-600">Human review is required before the workflow can continue.</p>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
      {success && <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">{success}</p>}

      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">Request</h2>
        <p className="whitespace-pre-wrap text-slate-700">{request.request}</p>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-slate-500">Type:</span> {request.request_type ?? "Unclassified"}</div>
          <div><span className="text-slate-500">Specialty:</span> {request.specialty ?? "—"}</div>
          <div><span className="text-slate-500">AI confidence:</span> {request.ai_confidence == null ? "—" : `${Math.round(request.ai_confidence * 100)}%`}</div>
          <div><span className="text-slate-500">Created:</span> {new Date(request.created_at).toLocaleString()}</div>
          <div><span className="text-slate-500">Document uploaded:</span> {request.document_uploaded ? "Yes" : "No"}</div>
          <div><span className="text-slate-500">Document required:</span> {request.document_required == null ? "—" : request.document_required ? "Yes" : "No"}</div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">AI classification</h2>
        <p className="text-sm text-slate-700">{request.classification_reason ?? "No classification reason recorded."}</p>
        <p className="text-xs text-slate-500">AI output is advisory. The specialist makes the final workflow decision.</p>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="text-lg font-semibold">Documents</h2>
        <p className="text-sm text-slate-600">{request.document_uploaded ? "A document was marked as uploaded for this request." : "No document is attached to this request."}</p>
      </section>

      {audit.length > 0 && (
        <section className="rounded-xl border p-5">
          <h2 className="text-lg font-semibold">Audit trail</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            {audit.map((entry, index) => <div key={`${entry.created_at}-${index}`} className="flex justify-between gap-4"><span>{entry.action}</span><span>{new Date(entry.created_at).toLocaleString()}</span></div>)}
          </div>
        </section>
      )}

      {canReview && (
        <section className="flex flex-wrap gap-3 rounded-xl border p-5">
          <button type="button" disabled={submitting !== null} onClick={() => review("REJECT")} className="rounded-lg border px-5 py-2.5 font-medium disabled:opacity-50">{submitting === "REJECT" ? "Rejecting…" : "Reject"}</button>
          <button type="button" disabled={submitting !== null} onClick={() => review("APPROVE")} className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white disabled:opacity-50">{submitting === "APPROVE" ? "Approving…" : "Approve & Continue"}</button>
        </section>
      )}
    </main>
  );
}
