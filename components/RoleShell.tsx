"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import MediSyncJourney from "@/components/MediSyncJourney";

const navByRole = {
  patient: [
    { label: "Overview", href: "/patient/dashboard", icon: "⌂" },
    { label: "New request", href: "/requests/new", icon: "＋" },
    { label: "Documents", href: "/documents", icon: "□" },
    { label: "Appointments", href: "/appointments", icon: "◷" },
    { label: "Profile", href: "/profile", icon: "◎" },
  ],
  hospital: [
    { label: "Overview", href: "/hospital/dashboard", icon: "⌂" },
    { label: "Referrals", href: "/hospital/referrals", icon: "↗" },
    { label: "Hospital matching", href: "/hospital/matching", icon: "⌕" },
    { label: "Capacity", href: "/hospital/capacity", icon: "▦" },
    { label: "Appointments", href: "/hospital/appointments", icon: "◷" },
    { label: "Profile", href: "/profile", icon: "◎" },
  ],
  insurance_agent: [
    { label: "Overview", href: "/insurance/dashboard", icon: "⌂" },
    { label: "Authorizations", href: "/insurance/authorizations", icon: "✓" },
    { label: "Cases", href: "/insurance/cases", icon: "◇" },
    { label: "Policies", href: "/insurance/policies", icon: "□" },
    { label: "Profile", href: "/profile", icon: "◎" },
  ],
} as const;

const labels = { patient: "Patient workspace", hospital: "Hospital workspace", insurance_agent: "Insurance workspace" };

async function signOut(router: ReturnType<typeof useRouter>) {
  await fetch("/api/auth/logout", { method: "POST" });
  router.replace("/login");
  router.refresh();
}

export default function RoleShell({ role, children }: { role: keyof typeof navByRole; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; name?: string; patientId?: string; hospitalId?: string; insuranceAgentId?: string; medisyncId?: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" }).then((r) => r.json()).then((data) => setUser(data?.user ?? null)).catch(() => undefined);
  }, []);

  const homeHref = role === "patient" ? "/patient/dashboard" : role === "hospital" ? "/hospital/dashboard" : "/insurance/dashboard";
  const displayName = user?.name || user?.email?.split("@")[0] || "MediSync user";
  const identityId = user?.medisyncId || user?.patientId || user?.hospitalId || user?.insuranceAgentId;

  return (
    <div className="mesh-bg min-h-screen text-[var(--ink)]">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-px bg-gradient-to-r from-transparent via-[var(--care)]/40 to-transparent" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 p-5 lg:block">
        <div className="glass animate-slide-in flex h-full flex-col rounded-[30px] p-4 shadow-[var(--shadow-md)]">
          <Link href={homeHref} className="group flex items-center gap-3 px-2 py-3"><div className="relative transition-transform duration-300 group-hover:scale-105"><Image src="/medisync-mark.svg" alt="MediSync" width={42} height={42} className="rounded-2xl" /><span className="pulse-soft absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[var(--success)] ring-4 ring-white/80" /></div><div><p className="font-display text-lg font-extrabold tracking-tight">MediSync</p><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[var(--muted)]">Care OS</p></div></Link>
          <Link href="/profile" className="group animate-fade-up mt-7 rounded-2xl bg-[var(--ink)] p-4 text-white transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-extrabold uppercase ring-1 ring-white/15">{displayName.slice(0, 1)}</span><div className="min-w-0"><p className="truncate font-display text-sm font-extrabold">{displayName}</p><p className="mt-0.5 truncate text-[10px] text-white/55">{user?.email ?? labels[role]}</p></div><span className="ml-auto text-white/45 transition group-hover:translate-x-0.5">→</span></div><div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3"><span className="text-[9px] font-bold uppercase tracking-[.16em] text-white/45">{labels[role]}</span><span className="text-[9px] font-semibold text-white/45">View profile</span></div></Link>
          <nav className="mt-7 space-y-1">{navByRole[role].map((item, index) => { const active = pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link key={item.href} href={item.href} className={`group animate-fade-up relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 ${active ? "bg-[var(--care)] text-white shadow-lg shadow-blue-900/10" : "text-[var(--muted-strong)] hover:bg-white hover:shadow-sm"}`} style={{ animationDelay: `${120 + index * 60}ms` }}>{active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-white/80" />}<span className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs transition-transform duration-300 group-hover:scale-110 ${active ? "bg-white/10" : "bg-[var(--care-soft)] text-[var(--care)]"}`}>{item.icon}</span><span>{item.label}</span><span className={`ml-auto transition-all duration-300 ${active ? "translate-x-0 opacity-70" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-40"}`}>→</span></Link>; })}</nav>
          <div className="mt-auto rounded-[22px] border border-black/5 bg-white/55 p-4 backdrop-blur-xl"><div className="flex items-center gap-2"><span className="pulse-soft h-2 w-2 rounded-full bg-[var(--success)]" /><span className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Secure session</span></div><p className="mt-2 truncate text-xs font-semibold text-[var(--muted-strong)]">{identityId || user?.email || "Authenticated workspace"}</p><button type="button" onClick={() => signOut(router)} className="mt-3 flex w-full items-center justify-between rounded-xl px-2 py-2 text-xs font-bold text-[var(--muted-strong)] transition hover:bg-black/5"><span>Sign out</span><span>↗</span></button></div>
        </div>
      </aside>
      <main className="min-h-screen lg:pl-72"><div className="mx-auto max-w-7xl px-5 py-5 md:px-8 md:py-8"><header className="animate-fade-up mb-6 flex items-center justify-between lg:hidden"><Link href={homeHref} className="group flex items-center gap-2"><Image src="/medisync-mark.svg" alt="MediSync" width={38} height={38} className="rounded-xl" /><span className="font-display font-extrabold">MediSync</span></Link><Link href="/profile" className="motion-hover flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-extrabold text-white">{displayName.slice(0, 1).toUpperCase()}</Link></header><MediSyncJourney role={role} />{children}</div></main>
    </div>
  );
}
