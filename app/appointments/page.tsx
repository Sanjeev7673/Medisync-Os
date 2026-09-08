import PatientShell from "@/components/PatientShell";

export default function AppointmentsPage() {
  return (
    <PatientShell>
      <div className="reveal max-w-5xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Care calendar</p><h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.04em]">Appointments.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Once a referral is accepted and scheduling is connected, your confirmed appointment will appear here.</p>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="glass rounded-[30px] p-6 md:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Upcoming care</p><h2 className="mt-1 font-display text-xl font-extrabold">Your schedule</h2></div><span className="rounded-full bg-[var(--care-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--care)]">Ready</span></div><div className="mt-7 rounded-[24px] bg-white/75 p-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--care-soft)] text-lg text-[var(--care)]">□</div><h3 className="mt-4 font-display text-lg font-bold">No appointments yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Your appointment will appear here after the referral and scheduling stages are completed.</p></div></div>
          <div className="rounded-[30px] bg-[var(--ink)] p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Care flow</p><div className="mt-7 space-y-4">{["Specialist review","Hospital / provider match","Referral","Appointment"].map((item, i) => <div key={item} className="flex items-center gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${i === 3 ? "bg-white/10 text-white/50" : "bg-[#B9C5EC]/20 text-[#B9C5EC]"}`}>{i + 1}</span><span className="text-sm font-semibold text-white/75">{item}</span></div>)}</div><p className="mt-8 text-xs leading-5 text-white/45">Scheduling is intentionally shown as a coordination stage, not an autonomous clinical decision.</p></div>
        </div>
      </div>
    </PatientShell>
  );
}
