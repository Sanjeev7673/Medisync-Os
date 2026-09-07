import { PatientRequest } from "@/lib/types";

interface Step { key: string; label: string; done: boolean; active: boolean; }

function buildSteps(r: PatientRequest): Step[] {
  const status = r.workflow_status;
  const order = ["CREATED","CLASSIFIED","PENDING_REVIEW","APPROVED_STAGE","HOSPITAL_MATCHING","REFERRAL_CREATED","APPOINTMENT_PENDING","COMPLETED"];
  const idx = order.findIndex((s) => s === status) === -1 ? order.indexOf(status === "UNDER_REVIEW" ? "PENDING_REVIEW" : status) : order.indexOf(status);
  const labels: Record<string, string> = {
    CREATED: "Request submitted", CLASSIFIED: "AI classification", PENDING_REVIEW: "Specialist review",
    APPROVED_STAGE: "Specialist approved", HOSPITAL_MATCHING: "Hospital matching", REFERRAL_CREATED: "Referral created",
    APPOINTMENT_PENDING: "Appointment", COMPLETED: "Completed",
  };
  const currentIdx = idx === -1 ? 0 : idx;
  return order.map((key, i) => ({ key, label: labels[key], done: i < currentIdx || status === "COMPLETED", active: i === currentIdx && status !== "COMPLETED" }));
}

export default function StatusRail({ request }: { request: PatientRequest }) {
  const steps = buildSteps(request);
  const isRejected = request.workflow_status === "REJECTED";
  return (
    <ol className="flex flex-col gap-0">
      {steps.map((step, i) => (
        <li key={step.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: step.done ? "var(--care)" : step.active ? "var(--amber)" : "var(--border)", color: step.done || step.active ? "white" : "var(--muted)" }}>
              {step.done ? "✓" : i + 1}
            </span>
            {i < steps.length - 1 && <span className="w-px flex-1 min-h-6" style={{ background: step.done ? "var(--care)" : "var(--border)" }} />}
          </div>
          <div className="pb-6">
            <p className="text-sm font-medium" style={{ color: step.done || step.active ? "var(--ink)" : "var(--muted)" }}>{step.label}</p>
            {step.active && !isRejected && <p className="text-xs text-[var(--muted)] mt-0.5">In progress</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}