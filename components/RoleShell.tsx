"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

const navByRole = {
  patient: [
    { label: "Overview", href: "/patient/dashboard", icon: "⌂" },
    { label: "New request", href: "/requests/new", icon: "＋" },
    { label: "Documents", href: "/documents", icon: "□" },
    { label: "Appointments", href: "/appointments", icon: "◷" },
  ],
  hospital: [
    { label: "Overview", href: "/hospital/dashboard", icon: "⌂" },
    { label: "Referrals", href: "/hospital/referrals", icon: "↗" },
    { label: "Capacity", href: "/hospital/capacity", icon: "▦" },
    { label: "Appointments", href: "/hospital/appointments", icon: "◷" },
  ],
  insurance_agent: [
    { label: "Overview", href: "/insurance/dashboard", icon: "⌂" },
    { label: "Authorizations", href: "/insurance/authorizations", icon: "✓" },
    { label: "Cases", href: "/insurance/cases", icon: "◇" },
    { label: "Policies", href: "/insurance/policies", icon: "□" },
  ],
} as const;

const labels = {
  patient: "Patient workspace",
  hospital: "Hospital workspace",
  insurance_agent: "Insurance workspace",
};

async function signOut(router: ReturnType<typeof useRouter>) {
  await fetch("/api/auth/logout", { method: "POST" });
  router.replace("/login");
  router.refresh();
}

export default function RoleShell({ role, children }: { role: keyof typeof navByRole; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; patientId?: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" }).then((r) => r.json()).then((data) => setUser(data?.user ?? null)).catch(() => undefined);
  }, []);

  return (
    <div className="mesh-bg min-h-screen text-[var(--ink)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 p-5 lg:block">
        <div className="glass flex h-full flex-col rounded-[30px] p-4 shadow-[var(--shadow-md)]">
          <Link href={role === "patient" ? "/patient/dashboard" : role === "hospital" ? "/hospital/dashboard" : "/insurance/dashboard"} className="flex items-center gap-3 px-2 py-3">
            <Image src="/medisync-mark.svg" alt="MediSync" width={42} height={42} className="rounded-2xl" />
            <div><p className="font-display text-lg font-extrabold tracking-tight">MediSync</p><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[var(--muted)]">Care OS</p></div>
          </Link>
          <div className="mt-7 rounded-2xl bg-[var(--ink)] p-4 text-white"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/50">Active workspace</p><p className="mt-1 font-display text-sm font-extrabold">{labels[role]}</p><p className="mt-1 truncate text-xs text-white/55">{user?.email ?? "Secure session"}</p></div>
          <nav className="mt-7 space-y-1">
            {navByRole[role].map((item) => { const active = pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all ${active ? "bg-[var(--care)] text-white shadow-lg shadow-blue-900/10" : "text-[var(--muted-strong)] hover:bg-black/5"}`}><span className="flex h-7 w-7 items-center justify-center rounded-xl bg-black/5 text-xs">{item.icon}</span>{item.label}</Link>; })}
          </nav>
          <div className="mt-auto border-t border-black/5 pt-4"><button type="button" onClick={() => signOut(router)} className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm font-semibold text-[var(--muted-strong)] hover:bg-black/5"><span>Sign out</span><span>↗</span></button></div>
        </div>
      </aside>
      <main className="min-h-screen lg:pl-72"><div className="mx-auto max-w-7xl px-5 py-5 md:px-8 md:py-8"><header className="mb-8 flex items-center justify-between lg:hidden"><Link href={role === "patient" ? "/patient/dashboard" : role === "hospital" ? "/hospital/dashboard" : "/insurance/dashboard"} className="flex items-center gap-2"><Image src="/medisync-mark.svg" alt="MediSync" width={38} height={38} className="rounded-xl" /><span className="font-display font-extrabold">MediSync</span></Link><button type="button" onClick={() => signOut(router)} className="rounded-xl bg-white/70 px-3 py-2 text-xs font-bold">Sign out</button></header>{children}</div></main>
    </div>
  );
}
