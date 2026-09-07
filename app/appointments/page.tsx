import PatientShell from "@/components/PatientShell";

export default function AppointmentsPage() {
  return (
    <PatientShell>
      <header className="mb-8"><h1 className="font-display font-bold text-2xl">Appointments</h1><p className="text-[var(--muted)] mt-1">Once a referral is accepted, your appointment will appear here.</p></header>
      <div className="border border-dashed border-[var(--border)] rounded-lg p-10 text-center"><p className="text-sm text-[var(--muted)]">Appointment scheduling requires an external calendar integration — see the README for details.</p></div>
    </PatientShell>
  );
}