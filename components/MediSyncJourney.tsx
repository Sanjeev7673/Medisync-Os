"use client";

import { usePathname } from "next/navigation";

const journeys = {
  patient: [
    ["Request", "/requests/new"],
    ["Records", "/documents"],
    ["Specialist", "/appointments"],
    ["Coordination", "/patient/dashboard"],
  ],
  hospital: [
    ["Referrals", "/hospital/referrals"],
    ["Review", "/hospital/dashboard"],
    ["Capacity", "/hospital/capacity"],
    ["Appointments", "/hospital/appointments"],
  ],
  insurance_agent: [
    ["Cases", "/insurance/cases"],
    ["Evidence", "/insurance/dashboard"],
    ["Authorizations", "/insurance/authorizations"],
    ["Policies", "/insurance/policies"],
  ],
} as const;

export default function MediSyncJourney({ role }: { role: keyof typeof journeys }) {
  const pathname = usePathname();
  const items = journeys[role];
  const activeIndex = Math.max(0, items.findIndex(([, href]) => pathname === href || pathname.startsWith(`${href}/`)));

  return (
    <section className="animate-fade-up mb-8 overflow-hidden rounded-[24px] border border-black/5 bg-white/65 px-4 py-3 shadow-[var(--shadow-sm)] backdrop-blur-xl md:px-5">
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-none">
        <div className="hidden shrink-0 pr-1 sm:block">
          <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[var(--muted)]">MediSync flow</p>
          <p className="text-xs font-bold text-[var(--muted-strong)]">Your workspace journey</p>
        </div>
        <div className="relative flex min-w-max flex-1 items-center justify-between gap-0 py-1">
          <div className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-black/8" />
          <div className="absolute left-3 top-1/2 h-px -translate-y-1/2 bg-[var(--care)] transition-all duration-700" style={{ width: `${items.length === 1 ? 0 : (activeIndex / (items.length - 1)) * 100}%` }} />
          {items.map(([label, href], index) => {
            const active = index === activeIndex;
            const complete = index < activeIndex;
            return (
              <a key={href} href={href} className="group relative z-10 flex items-center gap-2 px-1 text-xs font-semibold text-[var(--muted-strong)] transition-colors hover:text-[var(--care)]">
                <span className={`relative flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-bold transition-all duration-500 ${active ? "border-[var(--care)] bg-[var(--care)] text-white shadow-[0_0_0_5px_rgba(37,73,168,.08)]" : complete ? "border-[var(--care)] bg-[var(--care-soft)] text-[var(--care)]" : "border-black/10 bg-white text-[var(--muted)]"}`}>
                  {complete ? "✓" : index + 1}
                  {active && <span className="pulse-soft absolute inset-0 rounded-full" />}
                </span>
                <span className={`hidden sm:inline ${active ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
