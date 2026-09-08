"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard";
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
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to sign in");
      const destination = returnTo.startsWith("/") ? returnTo : data.redirectTo;
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
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3"><Image src="/medisync-mark.svg" alt="MediSync" width={44} height={44} className="rounded-2xl shadow-lg" /><div><p className="font-display text-lg font-extrabold tracking-tight">MediSync</p><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[var(--muted)]">Care OS</p></div></div>
        <div className="hidden items-center gap-2 rounded-full border border-black/5 bg-white/55 px-3 py-2 text-xs font-semibold text-[var(--muted)] backdrop-blur md:flex"><span className="h-2 w-2 rounded-full bg-[var(--success)]" /> Secure role-based access</div>
      </nav>
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-92px)] max-w-7xl items-center gap-10 py-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
        <div className="reveal hidden lg:block">
          <p className="mb-5 inline-flex rounded-full border border-black/5 bg-white/60 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--care)] backdrop-blur">AI-assisted · Human-led care</p>
          <h1 className="max-w-2xl font-display text-6xl font-extrabold leading-[.98] tracking-[-.045em] xl:text-7xl">Healthcare coordination that feels <span className="text-[var(--care)]">human.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted-strong)]">One connected care network where the right information reaches the right authorized team at the right next step.</p>
        </div>
        <div className="reveal reveal-delay-1 mx-auto w-full max-w-xl">
          <div className="glass rounded-[34px] p-2 shadow-[0_28px_90px_rgba(18,22,29,.14)]">
            <form onSubmit={submit} className="rounded-[28px] bg-white p-7 sm:p-9">
              <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Welcome to MediSync</p><h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight">Sign in securely.</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Your account determines your workspace and permissions. Role selection is never trusted from the browser.</p></div>
              <label className="block text-sm font-bold">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 outline-none transition focus:border-[var(--care)]" /></label>
              <label className="mt-4 block text-sm font-bold">Password<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 outline-none transition focus:border-[var(--care)]" /></label>
              {error && <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--danger)]">{error}</div>}
              <button disabled={loading} className="group mt-5 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white shadow-xl transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"><span>{loading ? "Signing in…" : "Sign in"}</span><span>→</span></button>
              <p className="mt-5 text-center text-sm text-[var(--muted)]">New to MediSync? <Link href="/register" className="font-bold text-[var(--care)] hover:underline">Create a patient account</Link></p>
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[var(--care-soft)]/65 p-4"><span className="mt-0.5 text-[var(--care)]">◉</span><p className="text-xs leading-5 text-[var(--muted-strong)]"><strong>Secure by design.</strong> Credentials are verified server-side and the session is encrypted and signed before protected routes are reached.</p></div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() { return <Suspense fallback={null}><LoginForm /></Suspense>; }
