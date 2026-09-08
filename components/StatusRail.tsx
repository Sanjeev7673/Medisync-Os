import { PatientRequest } from "@/lib/types";

interface Step { key: string; label: string; done: boolean; active: boolean; }

function buildSteps(r: PatientRequest): Step[] {
  const status = r.workflow_status;
  const order = ["CREATED", "VALIDATING", "CLASSIFIED", "ROUTED", "PENDING_REVIEW", "APPROVED", "HOSPITAL_MATCHING", "REFERRAL_CREATED", "APPOINTMENT_PENDING", "COMPLETED"];
  const labels: Record<string, string> = { CREATED: "Request submitted", VALIDATING: "Request validation", CLASSIFIED: "AI classification", ROUTED: "Workflow routing", PENDING_REVIEW: "Specialist review", APPROVED: "Specialist approved", HOSPITAL_MATCHING: "Hospital matching", REFERRAL_CREATED: "Referral created", APPOINTMENT_PENDING: "Appointment", COMPLETED: "Completed" };
  const normalized = status === "UNDER_REVIEW" ? "PENDING_REVIEW" : status;
  const idx = order.indexOf(normalized);
  const currentIdx = idx === -1 ? 0 : idx;
  return order.map((key, i) => ({ key, label: labels[key], done: i < currentIdx || status === "COMPLETED", active: i === currentIdx && status !== "COMPLETED" }));
}

export default function StatusRail({ request }: { request: PatientRequest }) {
  const steps = buildSteps(request);
  const terminal = ["REJECTED", "MORE_INFORMATION_REQUIRED", "CANCELLED", "FAILED"].includes(request.workflow_status);
  return <ol className="space-y-0">{steps.map((step, i) => <li key={step.key} className="flex gap-4"><div className="flex flex-col items-center"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[11px] font-bold transition-all ${step.done ? "bg-[var(--care)] text-white shadow-lg shadow-blue-900/10" : step.active ? "pulse-soft bg-[var(--ink)] text-white" : "bg-black/5 text-[var(--muted)]"}`}>{step.done ? "✓" : i + 1}</span>{i < steps.length - 1 && <span className={`w-px flex-1 min-h-7 ${step.done ? "bg-[var(--care)]/35" : "bg-black/8"}`} />}</div><div className="pb-7 pt-1"><p className={`text-sm font-bold ${step.done || step.active ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{step.label}</p>{step.active && !terminal && <p className="mt-1 text-xs font-medium text-[var(--care)]">Currently in progress</p>}</div></li>)}</ol>;
}
