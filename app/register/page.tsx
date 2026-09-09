"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setErrorCode("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorCode(data?.code || "");
        throw new Error(data?.error || "Unable to create account");
      }
      router.replace(data.redirectTo || "/patient/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mesh-bg relative min-h-screen overflow-hidden px-5 py-6 text-[var(--ink)] md:px-8 md:py-8">
      <div className="mesh-orb absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#B9C5EC]/60 blur-3xl" />
      <div className="mesh-orb-delay absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#758FB5]/20 blur-3xl" />
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between"><div className="flex items-center gap-3"><Image src="/medisync-mark.svg" alt="MediSync" width={44} height={44} className="rounded-2xl shadow-lg" /><div><p className="font-display text-lg font-extrabold tracking-tight">MediSync</p><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[var(--muted)]">Care OS</p></div></div><Link href="/login" className="text-sm font-bold text-[var(--care)]">Sign in →</Link></nav>
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-92px)] max-w-2xl items-center py-10"><div className="glass w-full rounded-[34px] p-2 shadow-[0_28px_90px_rgba(18,22,29,.14)]"><form onSubmit={submit} className="rounded-[28px] bg-white p-7 sm:p-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Join MediSync</p><h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">Create your patient account.</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Patient self-registration is open. Clinical and operational roles are provisioned separately by authorized administrators.</p>
        <label className="mt-7 block text-sm font-bold">Full name<input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 outline-none focus:border-[var(--care)]" /></label>
        <label className="mt-4 block text-sm font-bold">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 outline-none focus:border-[var(--care)]" /></label>
        <label className="mt-4 block text-sm font-bold">Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={10} className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 outline-none focus:border-[var(--care)]" /><span className="mt-2 block text-xs font-normal text-[var(--muted)]">10+ characters with uppercase, lowercase, and a number.</span></label>
        {error && <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--danger)]">{error}</div>}
        {errorCode === "ACCOUNT_EXISTS" && <Link href="/login" className="mt-3 flex w-full items-center justify-center rounded-2xl border border-black/10 px-5 py-3.5 text-sm font-bold text-[var(--care)] transition-transform hover:-translate-y-0.5">Go to sign in</Link>}
        <button disabled={loading} className="mt-6 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"><span>{loading ? "Creating account…" : "Create account"}</span><span>→</span></button>
      </form></div></section>
    </main>
  );
}
