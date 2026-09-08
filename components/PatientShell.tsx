"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "◈" },
  { href: "/requests/new", label: "New request", icon: "＋" },
  { href: "/documents", label: "Documents", icon: "▱" },
  { href: "/appointments", label: "Appointments", icon: "□" },
];

export default function PatientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ patientId?: string; email?: string; role?: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => undefined);
  }, []);

  return (
    <div className="mesh-bg min-h-screen text-[var(--ink)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] p-3 md:p-5 lg:p-6 gap-4 lg:gap-6">
        <aside className="glass hidden w-[238px] shrink-0 rounded-[28px] p-4 md:flex md:flex-col">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-4">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--ink)] text-white shadow-lg">
              <span className="font-display text-lg font-extrabold">M</span>
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[var(--blue-soft)] ring-4 ring-white/70" />
            </div>
            <div><p className="font-display text-[17px] font-extrabold tracking-tight">MediSync</p><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--muted)]">Care OS</p></div>
          </Link>

          <div className="px-3 pb-4 pt-7 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--muted)]">Your care</div>
          <nav className="flex flex-col gap-1.5">
            {NAV.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return <Link key={item.href} href={item.href} className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all ${active ? "bg-[var(--ink)] text-white shadow-lg shadow-slate-900/10" : "text-[var(--muted-strong)] hover:bg-white hover:text-[var(--ink)]"}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-xl text-sm ${active ? "bg-white/10" : "bg-[var(--care-soft)] text-[var(--care)]"}`}>{item.icon}</span>{item.label}
              </Link>;
            })}
          </nav>

          <div className="mt-auto rounded-[22px] bg-gradient-to-br from-[#eef2ff] to-white p-4">
            <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Secure session</span><span className="pulse-soft h-2 w-2 rounded-full bg-[var(--success)]" /></div>
            <p className="font-display text-sm font-bold">{user?.patientId || "MediSync patient"}</p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{user?.email || "Authenticated account"}</p>
            <Link href="/api/auth/logout" className="mt-3 inline-flex text-xs font-bold text-[var(--care)] hover:underline">Sign out securely →</Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden rounded-[28px] bg-white/55 px-4 py-4 md:px-7 md:py-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
