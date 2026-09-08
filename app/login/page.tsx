"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <main className="mesh-bg relative min-h-screen overflow-hidden px-5 py-6 text-[var(--ink)] md:px-8 md:py-8">
      <div className="mesh-orb absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#B9C5EC]/60 blur-3xl" />
      <div className="mesh-orb-delay absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#758FB5]/20 blur-3xl" />
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--ink)] text-white shadow-xl"><span className="font-display text-lg font-extrabold">M</span></div><div><p className="font-display text-lg font-extrabold tracking-tight">MediSync</p><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[var(--muted)]">Care OS</p></div></div>
        <div className="hidden items-center gap-2 rounded-full border border-black/5 bg-white/55 px-3 py-2 text-xs font-semibold text-[var(--muted)] backdrop-blur md:flex"><span className="h-2 w-2 rounded-full bg-[var(--success)]" /> Secure patient access</div>
      </nav>
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-92px)] max-w-7xl items-center gap-10 py-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
        <div className="reveal hidden lg:block">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/60 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--care)] backdrop-blur">AI-assisted · Human-led care</p>
          <h1 className="max-w-2xl font-display text-6xl font-extrabold leading-[.98] tracking-[-.045em] xl:text-7xl">Healthcare coordination that feels <span className="text-[var(--care)]">human.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted-strong)]">One calm place to share a request, follow specialist review, coordinate referrals, and stay on top of your next step.</p>
          <div className="relative mt-12 h-44 max-w-xl">
            <div className="float-card glass absolute left-0 top-5 w-64 rounded-3xl p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-2xl bg-[var(--care-soft)] text-center leading-10">✦</div><div><p className="text-xs font-bold text-[var(--muted)]">AI routing</p><p className="font-display text-sm font-bold">Cardiology request</p></div></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/5"><div className="h-full w-3/4 rounded-full bg-[var(--care)]" /></div></div>
            <div className="float-card-delay glass absolute right-2 top-0 w-56 rounded-3xl p-4"><p className="text-xs font-bold text-[var(--muted)]">Care journey</p><div className="mt-3 flex items-center gap-2"><span className="h-7 w-7 rounded-full bg-[var(--success-soft)] text-center text-xs leading-7 text-[var(--success)]">✓</span><span className="h-px flex-1 bg-[var(--blue-soft)]"/><span className="h-7 w-7 rounded-full bg-[var(--care-soft)] text-center text-xs leading-7 text-[var(--care)]">2</span><span className="h-px flex-1 bg-black/10"/><span className="h-7 w-7 rounded-full bg-black/5 text-center text-xs leading-7 text-[var(--muted)]">3</span></div></div>
          </div>
        </div>
        <div className="reveal reveal-delay-1 mx-auto w-full max-w-md">
          <div className="glass rounded-[34px] p-2 shadow-[0_28px_90px_rgba(18,22,29,.14)]">
            <div className="rounded-[28px] bg-white p-7 sm:p-9">
              <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Welcome to MediSync</p><h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight">Your care, in one place.</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Sign in to access your care requests, referrals, documents, and appointments.</p></div>
              <a href="/api/auth/login" className="group flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white shadow-xl shadow-slate-900/10 transition-transform hover:-translate-y-0.5"><span>Continue securely</span><span className="text-lg transition-transform group-hover:translate-x-1">→</span></a>
              {error && <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-xs font-semibold text-[var(--danger)]">Authentication could not be completed. Please try again.</div>}
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[var(--care-soft)]/65 p-4"><span className="mt-0.5 text-[var(--care)]">◉</span><p className="text-xs leading-5 text-[var(--muted-strong)]"><strong>Private by design.</strong> Authentication is handled through your configured secure identity provider and MediSync keeps the application session protected.</p></div>
              <p className="mt-7 text-center text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--muted)]">MediSync · Patient Portal</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() { return <Suspense fallback={null}><LoginForm /></Suspense>; }
