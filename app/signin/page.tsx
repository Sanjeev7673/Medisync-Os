"use client";

import Image from "next/image";
import Link from "next/link";

const roles = [
  { href: "/patient/login", label: "Patient", description: "Personal healthcare workspace.", icon: "P" },
  { href: "/hospital/login", label: "Hospital", description: "Hospital operations workspace.", icon: "H" },
  { href: "/insurance/login", label: "Insurance", description: "Insurance operations workspace.", icon: "I" },
  { href: "/admin/login", label: "Admin", description: "MediSync administration.", icon: "A" },
];

export default function SignInPage() {
  return (
    <main className="mesh-bg relative min-h-screen overflow-hidden px-5 py-8 text-[var(--ink)] md:px-8 md:py-10">
      <div className="mesh-orb-delay absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#758FB5]/20 blur-3xl" />
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3"><Image src="/medisync-mark.svg" alt="MediSync" width={44} height={44} className="rounded-2xl shadow-lg" /><div><p className="font-display text-lg font-extrabold tracking-tight">MediSync</p><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[var(--muted)]">Care OS</p></div></Link>
        <Link href="/signup" className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-xs font-bold text-white shadow-lg">Sign up →</Link>
      </nav>
      <section className="relative z-10 mx-auto max-w-6xl py-12 md:py-16">
        <div className="mx-auto max-w-3xl text-center"><p className="mb-5 inline-flex rounded-full border border-black/5 bg-white/60 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--care)] backdrop-blur">Welcome back</p><h1 className="font-display text-5xl font-extrabold leading-tight tracking-[-.045em] md:text-7xl">Choose your <span className="text-[var(--care)]">portal.</span></h1><p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--muted-strong)] md:text-lg">Select your role to continue to its secure sign-in page.</p></div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {roles.map((role, index) => <Link key={role.href} href={role.href} className={`glass reveal reveal-delay-${Math.min(index + 1, 3)} group block rounded-[28px] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)] md:p-7`}>
            <div className="flex items-start justify-between gap-5"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ink)] font-display text-lg font-extrabold text-white shadow-lg">{role.icon}</span><span className="text-xl text-[var(--care)] transition-transform group-hover:translate-x-1">→</span></div>
            <h2 className="mt-7 font-display text-2xl font-extrabold">{role.label}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{role.description}</p><p className="mt-6 text-xs font-bold uppercase tracking-[.14em] text-[var(--care)]">Continue to {role.label} →</p>
          </Link>)}
        </div>
        <div className="mx-auto mt-8 max-w-3xl rounded-[24px] bg-white/60 p-5 text-center text-xs leading-5 text-[var(--muted-strong)] backdrop-blur">Forgot your password? <Link href="/forgot-password" className="font-bold text-[var(--care)] hover:underline">Get OTP by email →</Link><span className="mx-2 text-black/15">•</span>New here? <Link href="/signup" className="font-bold text-[var(--care)] hover:underline">Create an account →</Link></div>
      </section>
    </main>
  );
}
