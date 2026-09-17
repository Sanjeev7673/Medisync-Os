"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, UserPlus } from "lucide-react";

const roles = [
  { key: "patient", label: "Patient", fields: ["Full name", "Date of birth", "Phone"] },
  { key: "hospital", label: "Hospital", fields: ["Hospital name", "Registration / License ID"] },
  { key: "insurance", label: "Insurance", fields: ["Agency name", "Agency ID"] },
  { key: "admin", label: "Admin", fields: ["Full name", "Admin ID"] },
] as const;

type Role = (typeof roles)[number]["key"];

export default function SignUpPage() {
  const [role, setRole] = useState<Role>("patient");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = roles.find(r => r.key === role)!;

  function changeRole(next: Role) { setRole(next); setDetails({}); setError(""); }
  function setDetail(label: string, value: string) { setDetails(d => ({ ...d, [label]: value })); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(""); setMessage("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { role, email, password };
      if (role === "patient") Object.assign(payload, { name: details["Full name"], dob: details["Date of birth"], phone: details.Phone });
      if (role === "hospital") Object.assign(payload, { hospitalName: details["Hospital name"], registrationId: details["Registration / License ID"] });
      if (role === "insurance") Object.assign(payload, { agencyName: details["Agency name"], agencyId: details["Agency ID"] });
      if (role === "admin") Object.assign(payload, { name: details["Full name"], adminId: details["Admin ID"] });
      const res = await fetch("/api/auth/register-role", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create account");
      setMessage(data.message || "OTP sent to your email. Check your inbox to verify your account.");
      sessionStorage.setItem("medisync_registration_email", email);
      sessionStorage.setItem("medisync_registration_role", role);
      window.location.assign(`/register/${role}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create account"); }
    finally { setLoading(false); }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090D16] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,.14),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(34,211,238,.12),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[.2] [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:42px_42px]" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3"><Image src="/medisync-mark.svg" alt="MediSync" width={40} height={40} className="rounded-xl" /><div><b className="font-display text-lg">MediSync</b><p className="text-[9px] uppercase tracking-[.25em] text-slate-500">Care OS</p></div></Link>
        <Link href="/signin" className="rounded-full border border-white/10 bg-white/[.05] px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10">Already have an account? Sign in</Link>
      </header>
      <section className="relative z-10 flex items-center justify-center px-5 pb-12 pt-5">
        <div className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-white/[.045] p-2 shadow-[0_30px_100px_rgba(0,0,0,.5)] backdrop-blur-2xl">
          <div className="rounded-[24px] border border-white/[.07] bg-[#0D1320]/95 p-7 sm:p-9">
            <div className="mb-7 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><UserPlus className="h-6 w-6" /></div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Create your account</p><h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Sign up to MediSync</h1><p className="mt-2 text-sm text-slate-500">Choose your role and complete the matching registration form.</p></div>
            <div className="mb-6 grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-black/20 p-1">{roles.map(item => <button key={item.key} type="button" onClick={() => changeRole(item.key)} className={`rounded-lg px-2 py-2.5 text-xs font-bold transition ${role === item.key ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/20" : "text-slate-500 hover:text-white"}`}>{item.label}</button>)}</div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">{selected.fields.map(field => <label key={field} className="block"><span className="mb-2 block text-xs font-bold text-slate-300">{field}</span><input required type={field === "Date of birth" ? "date" : "text"} value={details[field] || ""} onChange={e => setDetail(field, e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-sm text-white outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10" /></label>)}</div>
              <label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">Email address</span><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10" /></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">Password</span><div className="relative"><input required minLength={10} type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 10 characters" className="w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 pr-12 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50" /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label><label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">Confirm password</span><div className="relative"><input required type={showConfirm ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 pr-12 text-sm text-white outline-none focus:border-cyan-400/50" /><button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">{showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label></div>
              {error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-xs text-red-300">{error}</p>}{message && <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-xs text-emerald-300">{message}</p>}
              <button disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3.5 text-sm font-extrabold text-[#071019] shadow-[0_10px_35px_rgba(34,211,238,.16)] hover:brightness-110 disabled:opacity-50">{loading ? "Creating account..." : "Create account"}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
            </form>
            <p className="mt-6 text-center text-xs text-slate-500">Already registered? <Link href="/signin" className="font-bold text-cyan-300">Sign in</Link></p>
          </div>
        </div>
      </section>
    </main>
  );
}
