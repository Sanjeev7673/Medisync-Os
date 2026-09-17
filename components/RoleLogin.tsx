"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import HealthcareMotion from "@/components/HealthcareMotion";

type LoginRole = "patient" | "hospital" | "insurance_agent" | "admin";

type RoleConfig = {
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  dashboard: string;
};

const ROLE_CONFIG: Record<LoginRole, RoleConfig> = {
  patient: {
    label: "Patient Portal",
    eyebrow: "Personal care workspace",
    title: "Your healthcare, connected.",
    description: "Access your MediSync ID, medical records, care requests and authorized provider coordination.",
    accent: "Patient access",
    dashboard: "/patient/dashboard",
  },
  hospital: {
    label: "Hospital Portal",
    eyebrow: "Hospital operations workspace",
    title: "Coordinate care with context.",
    description: "Review referrals, patient evidence, investigations and care coordination tasks from one hospital workspace.",
    accent: "Hospital access",
    dashboard: "/hospital/dashboard",
  },
  insurance_agent: {
    label: "Insurance Portal",
    eyebrow: "Insurance operations workspace",
    title: "Review evidence. Move cases forward.",
    description: "Manage coverage cases, supporting medical evidence, authorizations and claim workflows.",
    accent: "Insurance access",
    dashboard: "/insurance/dashboard",
  },
  admin: {
    label: "Admin Portal",
    eyebrow: "MediSync administration",
    title: "Operate the care network.",
    description: "Manage platform operations, organizations, users, workflows, audit activity and system health.",
    accent: "Administrative access",
    dashboard: "/admin/dashboard",
  },
};

const PORTALS: { role: LoginRole; label: string; href: string }[] = [
  { role: "patient", label: "Patient", href: "/patient/login" },
  { role: "hospital", label: "Hospital", href: "/hospital/login" },
  { role: "insurance_agent", label: "Insurance", href: "/insurance/login" },
  { role: "admin", label: "Admin", href: "/admin/login" },
];

export default function RoleLogin({ role }: { role: LoginRole }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const config = ROLE_CONFIG[role];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, expectedRole: role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to sign in");
      const destination = returnTo?.startsWith("/") ? returnTo : data.redirectTo || config.dashboard;
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mesh-bg relative min-h-screen overflow-hidden px-5 py-6 text-[var(--ink)] md:px-8 md:py-8">
      <div className="mesh-orb absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#B9C5EC]/60 blur-3xl" />
      <div className="mesh-orb-delay absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#758FB5]/20 blur-3xl" />

      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link href="/login" className="flex shrink-0 items-center gap-3" aria-label="Back to MediSync portal selection">
          <Image src="/medisync-mark.svg" alt="MediSync" width={44} height={44} className="rounded-2xl shadow-lg" />
          <div><p className="font-display text-lg font-extrabold tracking-tight">MediSync</p><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[var(--muted)]">Care OS</p></div>
        </Link>

        <div className="hidden items-center gap-1 rounded-2xl border border-black/5 bg-white/65 p-1.5 shadow-sm backdrop-blur md:flex" aria-label="Portal navigation">
          {PORTALS.map((portal) => (
            <Link
              key={portal.role}
              href={portal.href}
              aria-current={portal.role === role ? "page" : undefined}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${portal.role === role ? "bg-[var(--ink)] text-white shadow-md" : "text-[var(--muted-strong)] hover:bg-white hover:text-[var(--ink)]"}`}
            >
              {portal.label}
            </Link>
          ))}
        </div>

        <Link href="/login" className="shrink-0 rounded-full border border-black/5 bg-white/60 px-4 py-2 text-xs font-bold text-[var(--muted-strong)] backdrop-blur transition hover:bg-white">
          All portals
        </Link>
      </nav>

      <div className="relative z-20 mx-auto mt-4 flex max-w-7xl items-center gap-2 overflow-x-auto pb-1 md:hidden" aria-label="Mobile portal navigation">
        {PORTALS.map((portal) => (
          <Link
            key={portal.role}
            href={portal.href}
            aria-current={portal.role === role ? "page" : undefined}
            className={`whitespace-nowrap rounded-full border px-3 py-2 text-[11px] font-bold ${portal.role === role ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-black/5 bg-white/65 text-[var(--muted-strong)]"}`}
          >
            {portal.label}
          </Link>
        ))}
      </div>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-132px)] max-w-7xl items-center gap-10 py-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
        <div className="reveal hidden lg:block">
          <p className="mb-5 inline-flex rounded-full border border-black/5 bg-white/60 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--care)] backdrop-blur">{config.eyebrow}</p>
          <h1 className="max-w-2xl font-display text-6xl font-extrabold leading-[.98] tracking-[-.045em] xl:text-7xl">{config.title}</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted-strong)]">{config.description}</p>
          <div className="mt-8 inline-flex rounded-2xl bg-white/65 px-4 py-3 text-xs font-bold text-[var(--care)] backdrop-blur">{config.accent} · Verified role-based access</div>
          <HealthcareMotion />
        </div>

        <div className="reveal reveal-delay-1 mx-auto w-full max-w-xl">
          <div className="glass rounded-[34px] p-2 shadow-[0_28px_90px_rgba(18,22,29,.14)]">
            <form onSubmit={submit} className="rounded-[28px] bg-white p-7 sm:p-9">
              <div className="mb-7">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">{config.label}</p>
                <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight">Sign in securely.</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">This portal only accepts accounts assigned to the {config.label.replace(" Portal", "").toLowerCase()} workspace.</p>
              </div>
              <label className="block text-sm font-bold">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 outline-none transition focus:border-[var(--care)]" /></label>
              <label className="mt-4 block text-sm font-bold">Password<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 outline-none transition focus:border-[var(--care)]" /></label>
              {error && <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--danger)]">{error}</div>}
              <button disabled={loading} className="group mt-5 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white shadow-xl transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"><span>{loading ? "Signing in…" : `Continue to ${config.label.replace(" Portal", "")}`}</span><span>→</span></button>
              {role === "patient" && <p className="mt-5 text-center text-sm text-[var(--muted)]">New to MediSync? <Link href="/register" className="font-bold text-[var(--care)] hover:underline">Create a patient account</Link></p>}
              <div className="mt-6 rounded-2xl bg-[var(--care-soft)]/65 p-4"><p className="text-xs leading-5 text-[var(--muted-strong)]"><strong>Secure by design.</strong> Your role is verified server-side. A hospital, insurance or admin account cannot enter another role's portal through a browser-selected role.</p></div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
