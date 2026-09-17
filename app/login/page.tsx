"use client";

import Image from "next/image";
import Link from "next/link";

export default function LoginPortalSelector() {
  return (
    <main className="mesh-bg relative min-h-screen overflow-hidden px-5 py-8 text-[var(--ink)] md:px-8 md:py-10">
      <div className="mesh-orb-delay absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#758FB5]/20 blur-3xl" />
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3"><Image src="/medisync-mark.svg" alt="MediSync" width={44} height={44} className="rounded-2xl shadow-lg" /><div><p className="font-display text-lg font-extrabold tracking-tight">MediSync</p><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[var(--muted)]">Care OS</p></div></Link>
        <div className="flex items-center gap-2">
          <Link href="/signin" className="rounded-full border border-black/10 bg-white/70 px-4 py-2.5 text-xs font-bold text-[var(--ink)] backdrop-blur">Sign in</Link>
          <Link href="/signup" className="rounded-full bg-[var(--ink)] px-4 py-2.5 text-xs font-bold text-white shadow-lg">Sign up</Link>
        </div>
      </nav>
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-100px)] max-w-5xl items-center justify-center py-12">
        <div className="glass w-full max-w-4xl rounded-[34px] p-2 shadow-[0_28px_90px_rgba(18,22,29,.14)]">
          <div className="rounded-[28px] bg-white p-8 text-center sm:p-12">
            <p className="mb-5 inline-flex rounded-full border border-black/5 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--care)]">MediSync authentication</p>
            <h1 className="font-display text-5xl font-extrabold leading-tight tracking-[-.045em] md:text-6xl">Welcome to <span className="text-[var(--care)]">MediSync.</span></h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--muted-strong)]">Choose an authentication path first. Then choose your portal. No dead ends, no duplicated authentication pages.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Link href="/signin" className="group flex min-h-44 flex-col justify-between rounded-[26px] bg-[var(--ink)] p-6 text-left text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 font-display text-lg font-extrabold">→</span><span className="text-xs font-bold uppercase tracking-[.14em] text-white/60">Existing user</span></div>
                <div><h2 className="mt-8 font-display text-2xl font-extrabold">Sign in</h2><p className="mt-2 text-sm leading-6 text-white/65">Choose Patient, Hospital, Insurance or Admin. Google and email sign-in are available there.</p></div>
              </Link>
              <Link href="/signup" className="group flex min-h-44 flex-col justify-between rounded-[26px] border border-black/10 bg-[#FAFAFA] p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl">
                <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--care-soft)] font-display text-lg font-extrabold text-[var(--care)]">+</span><span className="text-xs font-bold uppercase tracking-[.14em] text-[var(--muted)]">New user</span></div>
                <div><h2 className="mt-8 font-display text-2xl font-extrabold">Sign up</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Choose your role, complete its required details, then verify the account.</p></div>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-bold text-[var(--muted)]">
              <Link href="/signin" className="hover:text-[var(--care)]">Already have an account? Sign in</Link>
              <span className="text-black/15">•</span>
              <Link href="/signup" className="hover:text-[var(--care)]">New to MediSync? Sign up</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
