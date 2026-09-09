"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [concern, setConcern] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to start registration");
      setEmail(data.email || email.trim().toLowerCase());
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start registration");
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, concern }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to complete registration");
      router.replace(data.redirectTo || "/patient/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete registration");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setError("");
    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-registration-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to resend code");
      setOtp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend code");
    } finally {
      setResending(false);
    }
  }

  const progress = step === 1 ? 1 : step === 2 ? 2 : 3;

  return (
    <main className="mesh-bg relative min-h-screen overflow-hidden px-5 py-6 text-[var(--ink)] md:px-8 md:py-8">
      <div className="mesh-orb absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#B9C5EC]/60 blur-3xl" />
      <div className="mesh-orb-delay absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#758FB5]/20 blur-3xl" />
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3"><Image src="/medisync-mark.svg" alt="MediSync" width={44} height={44} className="rounded-2xl shadow-lg" /><div><p className="font-display text-lg font-extrabold tracking-tight">MediSync</p><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[var(--muted)]">Care OS</p></div></div>
        <Link href="/login" className="text-sm font-bold text-[var(--care)]">Sign in →</Link>
      </nav>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-92px)] max-w-2xl items-center py-10">
        <div className="glass w-full rounded-[34px] p-2 shadow-[0_28px_90px_rgba(18,22,29,.14)]">
          <div className="rounded-[28px] bg-white p-7 sm:p-10">
            <div className="mb-8 flex items-center gap-2">
              {["Account", "Verify", "Care need"].map((label, index) => { const number = index + 1; const active = number <= progress; return <div key={label} className="flex flex-1 items-center gap-2"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${active ? "bg-[var(--ink)] text-white" : "bg-black/5 text-[var(--muted)]"}`}>{number}</div><span className={`hidden text-[11px] font-bold sm:block ${active ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{label}</span>{number < 3 && <div className={`h-px flex-1 ${number < progress ? "bg-[var(--ink)]" : "bg-black/10"}`} />}</div>; })}
            </div>

            {step === 1 && <form onSubmit={createAccount}>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Join MediSync</p>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">Create your patient account.</h1>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">We’ll verify your email before activating the account, then ask what you need help with.</p>
              <label className="mt-7 block text-sm font-bold">Full name<input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 outline-none focus:border-[var(--care)]" /></label>
              <label className="mt-4 block text-sm font-bold">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 outline-none focus:border-[var(--care)]" /></label>
              <label className="mt-4 block text-sm font-bold">Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={10} className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 outline-none focus:border-[var(--care)]" /><span className="mt-2 block text-xs font-normal text-[var(--muted)]">10+ characters with uppercase, lowercase, and a number.</span></label>
              {error && <ErrorBox>{error}</ErrorBox>}
              <button disabled={loading} className="mt-6 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"><span>{loading ? "Sending verification code…" : "Continue"}</span><span>→</span></button>
            </form>}

            {step === 2 && <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Email verification</p>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">Check your inbox.</h1>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">We sent a 6-digit verification code to <strong className="text-[var(--ink)]">{email}</strong>. The code is valid for 10 minutes.</p>
              <label className="mt-8 block text-sm font-bold">Verification code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-4 text-center text-2xl font-extrabold tracking-[.45em] outline-none focus:border-[var(--care)]" /></label>
              {error && <ErrorBox>{error}</ErrorBox>}
              <button disabled={otp.length !== 6} onClick={() => { setError(""); setStep(3); }} className="mt-6 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white disabled:opacity-45"><span>Verify code</span><span>→</span></button>
              <div className="mt-5 flex items-center justify-between text-xs"><button type="button" disabled={resending} onClick={resendOtp} className="font-bold text-[var(--care)] disabled:opacity-50">{resending ? "Sending…" : "Resend code"}</button><button type="button" onClick={() => { setError(""); setStep(1); }} className="font-semibold text-[var(--muted)]">Change email</button></div>
            </div>}

            {step === 3 && <form onSubmit={verifyAndCreate}>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Care intake</p>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">What can MediSync help with?</h1>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Describe your concern or administrative request in your own words. This helps MediSync route you to the right workflow.</p>
              <label className="mt-7 block text-sm font-bold">Your request<textarea required minLength={10} maxLength={2000} rows={8} value={concern} onChange={(e) => setConcern(e.target.value)} placeholder="For example: I have a heart-related concern and need help finding the appropriate cardiologist." className="mt-2 w-full resize-none rounded-[22px] border border-black/10 bg-[#FAFAFA] px-5 py-4 text-sm leading-6 outline-none focus:border-[var(--care)]" /></label>
              <div className="mt-2 flex justify-between text-[11px] text-[var(--muted)]"><span>10–2000 characters</span><span>{concern.length}/2000</span></div>
              <p className="mt-4 rounded-2xl bg-[var(--care-soft)] px-4 py-3 text-xs leading-5 text-[var(--care)]">MediSync assists with administrative coordination. It does not diagnose or prescribe.</p>
              {error && <ErrorBox>{error}</ErrorBox>}
              <button disabled={loading || concern.trim().length < 10} className="mt-6 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-45"><span>{loading ? "Creating your care journey…" : "Create account & continue"}</span><span>→</span></button>
            </form>}
          </div>
        </div>
      </section>
    </main>
  );
}

function ErrorBox({ children }: { children: string }) {
  return <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--danger)]">{children}</div>;
}
