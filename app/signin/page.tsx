"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";

const roles = [
  { key: "patient", label: "Patient" },
  { key: "hospital", label: "Hospital" },
  { key: "insurance_agent", label: "Insurance" },
  { key: "admin", label: "Admin" },
] as const;

type Role = (typeof roles)[number]["key"];

export default function SignInPage() {
  const [role, setRole] = useState<Role>("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, expectedRole: role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to sign in");
      window.location.assign(data.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090D16] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,.14),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(34,211,238,.12),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[.2] [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:42px_42px]" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/medisync-mark.svg" alt="MediSync" width={40} height={40} className="rounded-xl" />
          <div><b className="font-display text-lg">MediSync</b><p className="text-[9px] uppercase tracking-[.25em] text-slate-500">Care OS</p></div>
        </Link>
        <Link href="/signup" className="rounded-full border border-white/10 bg-white/[.05] px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10">Create account</Link>
      </header>

      <section className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-5 pb-12">
        <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-white/[.045] p-2 shadow-[0_30px_100px_rgba(0,0,0,.5)] backdrop-blur-2xl">
          <div className="rounded-[24px] border border-white/[.07] bg-[#0D1320]/95 p-7 sm:p-9">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"><ShieldCheck className="h-6 w-6" /></div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-300">Secure access</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Sign in to MediSync</h1>
              <p className="mt-2 text-sm text-slate-500">Use your portal credentials to continue.</p>
            </div>

            <div className="mb-6 grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
              {roles.map((item) => <button key={item.key} type="button" onClick={() => setRole(item.key)} className={`rounded-lg px-2 py-2.5 text-xs font-bold transition ${role === item.key ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/20" : "text-slate-500 hover:text-white"}`}>{item.label}</button>)}
            </div>

            <form onSubmit={submit} className="space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">Email address</span><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10" /></label>
              <label className="block"><div className="mb-2 flex justify-between"><span className="text-xs font-bold text-slate-300">Password</span><Link href="/forgot-password" className="text-xs font-bold text-cyan-300 hover:text-cyan-200">Forgot password?</Link></div><div className="relative"><input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 pr-12 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10" /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white" aria-label="Toggle password visibility">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
              {error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-xs text-red-300">{error}</p>}
              <button disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3.5 text-sm font-extrabold text-[#071019] shadow-[0_10px_35px_rgba(16,185,129,.18)] transition hover:brightness-110 disabled:opacity-50">{loading ? "Signing in..." : "Sign in"}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
            </form>

            <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-600"><span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" /></div>
            <Link href={`/forgot-password?role=${role}`} className="block w-full rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] px-4 py-3 text-center text-xs font-bold text-cyan-200 hover:bg-cyan-300/[.08]">Get OTP by email</Link>
            <p className="mt-6 text-center text-xs text-slate-500">New to MediSync? <Link href="/signup" className="font-bold text-emerald-300">Sign up</Link></p>
          </div>
        </div>
      </section>
    </main>
  );
}
