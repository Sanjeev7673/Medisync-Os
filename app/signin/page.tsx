"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Building2, CircleUserRound, Eye, EyeOff, Hospital, KeyRound, ShieldCheck, UserPlus } from "lucide-react";

type Mode = "signin" | "signup";
type Role = "patient" | "hospital" | "insurance" | "admin";

const roles = [
  { key: "patient" as Role, label: "Patient", icon: CircleUserRound, signIn: "/patient/login", signUp: "/register/patient" },
  { key: "hospital" as Role, label: "Hospital", icon: Hospital, signIn: "/hospital/login", signUp: "/register/hospital" },
  { key: "insurance" as Role, label: "Insurance", icon: ShieldCheck, signIn: "/insurance/login", signUp: "/register/insurance" },
  { key: "admin" as Role, label: "Admin", icon: Building2, signIn: "/admin/login", signUp: "/register/admin" },
];

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("patient");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup");
  }, []);

  const selected = roles.find((item) => item.key === role)!;
  const setDetail = (key: string, value: string) => setDetails((current) => ({ ...current, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "signup" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, expectedRole: role }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to sign in");
        window.location.assign(data.redirectTo);
        return;
      }

      const payload: Record<string, unknown> = { role, email, password };
      if (role === "patient") Object.assign(payload, { name: details.name, dob: details.dob, phone: details.phone });
      if (role === "hospital") Object.assign(payload, { hospitalName: details.hospitalName, registrationId: details.registrationId });
      if (role === "insurance") Object.assign(payload, { agencyName: details.agencyName, agencyId: details.agencyId });
      if (role === "admin") Object.assign(payload, { name: details.name, adminId: details.adminId });

      const res = await fetch("/api/auth/register-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create account");
      sessionStorage.setItem("medisync_registration_email", email);
      sessionStorage.setItem("medisync_registration_role", role);
      window.location.assign(`/register/${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090D16] text-white selection:bg-cyan-400/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.13),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(34,211,238,0.12),transparent_25%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.07),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(148,163,184,0.5)_0.7px,transparent_0.7px)] [background-size:18px_18px]" />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-1.5 shadow-[0_0_35px_rgba(16,185,129,0.12)] backdrop-blur-xl">
            <Image src="/medisync-mark.svg" alt="MediSync" width={38} height={38} className="rounded-xl" />
          </div>
          <div><p className="font-display text-lg font-extrabold tracking-tight">MediSync</p><p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">Care OS</p></div>
        </Link>
        <Link href="/" className="rounded-full border border-white/10 bg-white/[0.045] px-4 py-2.5 text-xs font-bold text-slate-300 backdrop-blur-xl transition hover:bg-white/[0.08] hover:text-white">Back to home</Link>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-92px)] max-w-6xl items-center justify-center px-5 pb-12 pt-5 sm:px-8 lg:px-10 lg:pb-16">
        <div className="w-full max-w-3xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300 backdrop-blur-xl">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Secure healthcare access
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-[-0.045em] text-white sm:text-5xl">One platform. <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">Every care role.</span></h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Sign in or create your MediSync account from one simple authentication page.</p>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-2 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-3">
            <div className="rounded-[24px] border border-white/[0.07] bg-[#0D1320]/90 p-5 sm:p-7 lg:p-9">
              <div className="mx-auto flex w-full max-w-md rounded-2xl border border-white/10 bg-black/20 p-1">
                {(["signin", "signup"] as Mode[]).map((item) => (
                  <button key={item} type="button" onClick={() => { setMode(item); setError(""); }} className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${mode === item ? "border border-emerald-300/20 bg-gradient-to-r from-emerald-400/15 to-cyan-400/10 text-white shadow-[0_0_25px_rgba(16,185,129,0.08)]" : "text-slate-400 hover:text-white"}`}>
                    {item === "signin" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>

              <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_1.25fr]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">{mode === "signin" ? "Continue securely" : "Create access"}</p>
                  <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white">{mode === "signin" ? "Choose your portal" : "Create your account"}</h2>
                  <div className="mt-5 grid gap-2">
                    {roles.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" onClick={() => { setRole(item.key); setDetails({}); setError(""); }} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${role === item.key ? "border-emerald-300/30 bg-emerald-400/[0.08]" : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.06]"}`}><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><Icon className="h-4 w-4" /></span><span className="text-sm font-bold text-white">{item.label}</span></button>; })}
                  </div>
                </div>

                <div>
                  <form onSubmit={submit} className="space-y-4">
                    {mode === "signup" && role === "patient" && <div className="grid gap-4 sm:grid-cols-2"><Field label="Full name" value={details.name || ""} onChange={(v) => setDetail("name", v)} /><Field label="Date of birth" type="date" value={details.dob || ""} onChange={(v) => setDetail("dob", v)} /><Field label="Phone" value={details.phone || ""} onChange={(v) => setDetail("phone", v)} /></div>}
                    {mode === "signup" && role === "hospital" && <div className="grid gap-4 sm:grid-cols-2"><Field label="Hospital name" value={details.hospitalName || ""} onChange={(v) => setDetail("hospitalName", v)} /><Field label="Registration / License ID" value={details.registrationId || ""} onChange={(v) => setDetail("registrationId", v)} /></div>}
                    {mode === "signup" && role === "insurance" && <div className="grid gap-4 sm:grid-cols-2"><Field label="Agency name" value={details.agencyName || ""} onChange={(v) => setDetail("agencyName", v)} /><Field label="Agency ID" value={details.agencyId || ""} onChange={(v) => setDetail("agencyId", v)} /></div>}
                    {mode === "signup" && role === "admin" && <div className="grid gap-4 sm:grid-cols-2"><Field label="Full name" value={details.name || ""} onChange={(v) => setDetail("name", v)} /><Field label="Admin ID" value={details.adminId || ""} onChange={(v) => setDetail("adminId", v)} /></div>}

                    <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                    <label className="block"><div className="mb-2 flex justify-between"><span className="text-xs font-bold text-slate-300">Password</span>{mode === "signin" && <Link href={`/forgot-password?role=${role}`} className="text-xs font-bold text-cyan-300">Forgot password?</Link>}</div><div className="relative"><input required minLength={mode === "signup" ? 10 : undefined} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "Min 10 characters" : "Enter your password"} className="w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 pr-12 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50" /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
                    {mode === "signup" && <label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">Confirm password</span><div className="relative"><input required type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 pr-12 text-sm text-white outline-none focus:border-cyan-400/50" /><button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">{showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>}
                    {error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-xs text-red-300">{error}</p>}
                    <button disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3.5 text-sm font-extrabold text-[#071019] transition hover:brightness-110 disabled:opacity-50">{loading ? (mode === "signin" ? "Signing in..." : "Creating account...") : (mode === "signin" ? "Sign in" : "Create account")}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
                  </form>
                  {mode === "signin" && <Link href={`/forgot-password?role=${role}`} className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] px-4 py-3 text-xs font-bold text-cyan-200"><KeyRound className="h-4 w-4" /> Get OTP by email</Link>}
                </div>
              </div>

              <div className="mt-6 border-t border-white/[0.07] pt-5 text-center text-[11px] text-slate-500">
                {mode === "signin" ? <>New to MediSync? <button type="button" onClick={() => setMode("signup")} className="font-bold text-emerald-300">Sign up</button></> : <>Already registered? <button type="button" onClick={() => setMode("signin")} className="font-bold text-cyan-300">Sign in</button></>}
              </div>
            </div>
          </div>
          <p className="mt-5 text-center text-[10px] leading-5 text-slate-600">Secure authentication • Role-based access • Built for care teams</p>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">{label}</span><input required type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50" /></label>;
}
