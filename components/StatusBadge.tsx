import { WorkflowStatus } from "@/lib/types";

const STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  CREATED: { bg: "var(--care-soft)", fg: "var(--care)", label: "Submitted" },
  VALIDATING: { bg: "var(--care-soft)", fg: "var(--care)", label: "Validating" },
  CLASSIFIED: { bg: "var(--care-soft)", fg: "var(--care)", label: "Classified" },
  ROUTED: { bg: "var(--care-soft)", fg: "var(--care)", label: "Routed" },
  PENDING_REVIEW: { bg: "var(--amber-soft)", fg: "var(--amber)", label: "Awaiting specialist" },
  UNDER_REVIEW: { bg: "var(--amber-soft)", fg: "var(--amber)", label: "Under review" },
  APPROVED: { bg: "var(--care-soft)", fg: "var(--care)", label: "Approved" },
  REJECTED: { bg: "var(--danger-soft)", fg: "var(--danger)", label: "Declined" },
  MORE_INFORMATION_REQUIRED: { bg: "var(--amber-soft)", fg: "var(--amber)", label: "More info needed" },
  HOSPITAL_MATCHING: { bg: "var(--amber-soft)", fg: "var(--amber)", label: "Matching hospitals" },
  REFERRAL_CREATED: { bg: "var(--care-soft)", fg: "var(--care)", label: "Referral created" },
  APPOINTMENT_PENDING: { bg: "var(--amber-soft)", fg: "var(--amber)", label: "Appointment pending" },
  COMPLETED: { bg: "var(--care-soft)", fg: "var(--care)", label: "Completed" },
  CANCELLED: { bg: "var(--danger-soft)", fg: "var(--danger)", label: "Cancelled" },
  FAILED: { bg: "var(--danger-soft)", fg: "var(--danger)", label: "Failed" },
};

export default function StatusBadge({ status }: { status: WorkflowStatus }) {
  const style = STYLES[status] ?? STYLES.CREATED;
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: style.bg, color: style.fg }}>
      {style.label}
    </span>
  );
}