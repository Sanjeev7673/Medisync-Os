"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Building2, CircleUserRound, Eye, EyeOff, Hospital, KeyRound, ShieldCheck } from "lucide-react";

type Mode = "signin" | "signup";
type Role = "PATIENT" | "HOSPITAL" | "INSURANCE" | "ADMIN";

type AuthWebhookRequest = {
  action: "AUTH";
  role: Role;
  email: string;
};

type AuthWebhookResponse = {
  success: boolean;
  message?: string;
  user?: { email: string; role: Role };
  token?: string;
};

const roles = [
  { key: "PATIENT" as Role, label: "Patient", icon: CircleUserRound },
  { key: "HOSPITAL" as Role, label: "Hospital", icon: Hospital },
  { key: "INSURANCE" as Role, label: "Insurance", icon: ShieldCheck },
  { key: "ADMIN" as Role, label: "Admin", icon: Building2 },
];

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("PATIENT");
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

  const selectedRole = roles.find((item) => item.key === role)!;
  const setDetail = (key: string, value: string) => setDetails((current) => ({ ...current, [key]: value }));

  function chooseRole(next: Role) {
    setRole(next);
    setDetails({});
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (mode === "signup") {
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
      setError("Sign-up is handled by the existing MediSync registration and OTP flow.");
      window.location.assign(`/register/${role.toLowerCase()}`);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const payload: AuthWebhookRequest = { action: "AUTH", role, email: normalizedEmail };
      const response = await fetch("/api/auth/sns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await response.text();
      let data: AuthWebhookResponse;
      try {
        data = JSON.parse(raw) as AuthWebhookResponse;
      } catch {
        const nested = raw.match(/\{[\s\S]*\}/)?.[0];
        if (!nested) throw new Error("Invalid response from authentication service.");
        data = JSON.parse(nested) as AuthWebhookResponse;
      }

      if (!response.ok || !data.success) throw new Error(data.message || "Authentication failed.");
      if (!data.token) throw new Error("Authentication succeeded but no token was returned.");

      localStorage.setItem("medisync_token", data.token);
      if (data.user) localStorage.setItem("medisync_user", JSON.stringify(data.user));
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mesh-bg relative min-h-screen overflow-hidden px-5 py-8 text-[var(--ink)] md:px-8 md:py-10">
      <div className="mesh-orb-delay absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#758FB5]/20 blur-3xl" />
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/medisync-mark.svg" alt="MediSync" width={44} height={44} className="rounded-2xl shadow-lg" />
          <div><p className="font-display text-lg font-extrabold tracking-tight">MediSync</p><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[var(--muted)]">Care OS</p></div>
        </Link>
        <span className="hidden rounded-full border border-black/5 bg-white/60 px-4 py-2 text-xs font-bold text-[var(--muted)] backdrop-blur md:inline-flex">Secure access</span>
      </nav>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-100px)] max-w-5xl items-center justify-center py-10">
        <div className="glass w-full max-w-4xl rounded-[34px] p-2 shadow-[0_28px_90px_rgba(18,22,29,.14)]">
          <div className="rounded-[28px] bg-white p-7 sm:p-10 md:p-12">
            <div className="text-center">
              <p className="mb-5 inline-flex rounded-full border border-black/5 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--care)]">MediSync authentication</p>
              <h1 className="font-display text-4xl font-extrabold leading-tight tracking-[-.045em] md:text-6xl">Sign in or <span className="text-[var(--care)]">sign up.</span></h1>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--muted-strong)]">Choose your portal and continue with MediSync.</p>
            </div>

            <div className="mx-auto mt-8 flex max-w-md rounded-2xl border border-black/10 bg-[#F7F7F7] p-1">
              <button type="button" onClick={() => { setMode("signin"); setError(""); }} className={`flex-1 rounded-xl px-4 py-3 text-sm font-extrabold transition ${mode === "signin" ? "bg-[var(--ink)] text-white shadow-lg" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>Sign in</button>
              <button type="button" onClick={() => { setMode("signup"); setError(""); }} className={`flex-1 rounded-xl px-4 py-3 text-sm font-extrabold transition ${mode === "signup" ? "bg-[var(--care-soft)] text-[var(--care)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>Sign up</button>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {roles.map((item) => {
                  const Icon = item.icon;
                  return <button key={item.key} type="button" onClick={() => chooseRole(item.key)} className={`flex items-center gap-3 rounded-[22px] border p-4 text-left transition ${role === item.key ? "border-black/10 bg-[var(--ink)] text-white shadow-xl" : "border-black/10 bg-[#FAFAFA] text-[var(--ink)] hover:bg-white hover:shadow-lg"}`}><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${role === item.key ? "bg-white/10" : "bg-[var(--care-soft)] text-[var(--care)]"}`}><Icon className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold">{item.label}</span><span className={`text-[10px] ${role === item.key ? "text-white/60" : "text-[var(--muted)]"}`}>Portal access</span></span></button>;
                })}
              </div>

              <form onSubmit={submit} className="rounded-[26px] border border-black/10 bg-[#FAFAFA] p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--care)]">{selectedRole.label} portal</p><h2 className="mt-1 font-display text-2xl font-extrabold">{mode === "signin" ? "Welcome back" : "Create your account"}</h2></div><ShieldCheck className="h-6 w-6 text-[var(--care)]" /></div>

                {mode === "signup" && role === "PATIENT" && <div className="mb-4 grid gap-4 sm:grid-cols-2"><Field label="Full name" value={details.name || ""} onChange={(v) => setDetail("name", v)} /><Field label="Date of birth" type="date" value={details.dob || ""} onChange={(v) => setDetail("dob", v)} /><Field label="Phone" value={details.phone || ""} onChange={(v) => setDetail("phone", v)} /></div>}
                {mode === "signup" && role === "HOSPITAL" && <div className="mb-4 grid gap-4 sm:grid-cols-2"><Field label="Hospital name" value={details.hospitalName || ""} onChange={(v) => setDetail("hospitalName", v)} /><Field label="Registration / License ID" value={details.registrationId || ""} onChange={(v) => setDetail("registrationId", v)} /></div>}
                {mode === "signup" && role === "INSURANCE" && <div className="mb-4 grid gap-4 sm:grid-cols-2"><Field label="Agency name" value={details.agencyName || ""} onChange={(v) => setDetail("agencyName", v)} /><Field label="Agency ID" value={details.agencyId || ""} onChange={(v) => setDetail("agencyId", v)} /></div>}
                {mode === "signup" && role === "ADMIN" && <div className="mb-4 grid gap-4 sm:grid-cols-2"><Field label="Full name" value={details.name || ""} onChange={(v) => setDetail("name", v)} /><Field label="Admin ID" value={details.adminId || ""} onChange={(v) => setDetail("adminId", v)} /></div>}

                <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                {mode === "signin" && <label className="mt-4 block"><div className="mb-2 flex justify-between"><span className="text-xs font-bold text-[var(--muted-strong)]">Password</span><Link href={`/forgot-password?role=${role.toLowerCase()}`} className="text-xs font-bold text-[var(--care)]">Forgot password?</Link></div><div className="relative"><input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 pr-12 text-sm text-[var(--ink)] outline-none placeholder:text-slate-400 focus:border-[var(--care)]" /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--ink)]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>}
                {mode === "signup" && <label className="mt-4 block"><span className="mb-2 block text-xs font-bold text-[var(--muted-strong)]">Password</span><div className="relative"><input required minLength={10} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 10 characters" className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 pr-12 text-sm text-[var(--ink)] outline-none placeholder:text-slate-400 focus:border-[var(--care)]" /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--ink)]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>}
                {mode === "signup" && <label className="mt-4 block"><span className="mb-2 block text-xs font-bold text-[var(--muted-strong)]">Confirm password</span><div className="relative"><input required type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 pr-12 text-sm text-[var(--ink)] outline-none focus:border-[var(--care)]" /><button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--ink)]">{showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>}
                {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">{error}</p>}
                <button disabled={loading} className="group mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50">{loading ? "Authenticating..." : mode === "signin" ? "Sign in" : "Continue to verification"}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
                {mode === "signin" && <Link href={`/forgot-password?role=${role.toLowerCase()}`} className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-xs font-bold text-[var(--muted-strong)]"><KeyRound className="h-4 w-4" /> Get OTP by email</Link>}
              </form>
            </div>

            <p className="mt-8 text-center text-xs text-[var(--muted)]">Secure authentication • Role-based access • Built for care teams</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-[var(--muted-strong)]">{label}</span><input required type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-sm text-[var(--ink)] outline-none placeholder:text-slate-400 focus:border-[var(--care)]" /></label>;
}
