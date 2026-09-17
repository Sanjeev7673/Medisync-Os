"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to send OTP");
      setOtpSent(true); setMessage("OTP sent to your registered email. Please check your inbox.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to send OTP"); }
    finally { setLoading(false); }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to reset password");
      setMessage(data.message); setOtp(""); setPassword(""); setConfirmPassword("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to reset password"); }
    finally { setLoading(false); }
  }

  const EyeIcon = ({ off = false }: { off?: boolean }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d={off ? "M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.2A10.7 10.7 0 0112 4c5.2 0 8.8 4 9.8 6-.4.8-1.4 2.2-2.8 3.4M6.2 6.2C3.8 7.7 2.5 9.6 2.2 10c1 2 4.6 6 9.8 6 1 0 1.9-.2 2.7-.5" : "M2.2 12s3.6-6 9.8-6 9.8 6 9.8 6-3.6 6-9.8 6-9.8-6-9.8-6z"}/>{!off && <circle cx="12" cy="12" r="2.5"/>}</svg>;

  return (
    <main className="mesh-bg relative min-h-screen overflow-hidden px-5 py-8 text-[var(--ink)] md:px-8 md:py-10">
      <div className="mesh-orb absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#B9C5EC]/50 blur-3xl" />
      <div className="mesh-orb-delay absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#758FB5]/20 blur-3xl" />
      <div className="relative z-10 mx-auto flex min-h-[85vh] max-w-xl items-center justify-center">
        <div className="glass w-full rounded-[34px] p-2 shadow-[0_28px_90px_rgba(18,22,29,.14)]"><div className="rounded-[28px] bg-white p-7 sm:p-9">
          <Link href="/login" className="text-xs font-bold text-[var(--care)]">← Back to portal</Link>
          <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Account recovery</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">Forgot password?</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Enter your registered email and MediSync will send a 6-digit OTP to verify your password reset.</p>
          {!otpSent ? <form onSubmit={requestOtp} className="mt-7"><label className="block text-sm font-bold">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 outline-none focus:border-[var(--care)]" /></label><button disabled={loading} className="mt-5 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white shadow-xl disabled:opacity-60"><span>{loading ? "Sending OTP…" : "Send OTP"}</span><span>→</span></button></form> : <form onSubmit={resetPassword} className="mt-7 space-y-4">
            <label className="block text-sm font-bold">OTP<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 text-center text-xl font-bold tracking-[.35em] outline-none focus:border-[var(--care)]" /></label>
            <label className="block text-sm font-bold">New password<div className="relative mt-2"><input required minLength={10} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 pr-14 outline-none focus:border-[var(--care)]" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-[var(--muted)]" aria-label={showPassword ? "Hide password" : "Show password"}><EyeIcon off={!showPassword}/></button></div></label>
            <label className="block text-sm font-bold">Confirm password<div className="relative mt-2"><input required minLength={10} type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 pr-14 outline-none focus:border-[var(--care)]" /><button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-[var(--muted)]" aria-label={showConfirm ? "Hide password" : "Show password"}><EyeIcon off={!showConfirm}/></button></div></label>
            <button disabled={loading} className="flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white shadow-xl disabled:opacity-60"><span>{loading ? "Updating…" : "Verify OTP & reset password"}</span><span>→</span></button>
            <button type="button" onClick={() => { setOtpSent(false); setError(""); setMessage(""); }} className="w-full text-xs font-bold text-[var(--care)]">Send OTP again</button>
          </form>}
          {error && <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-xs font-semibold text-[var(--danger)]">{error}</div>}
          {message && <div className="mt-4 rounded-2xl bg-[var(--care-soft)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--muted-strong)]">{message}</div>}
        </div></div>
      </div>
    </main>
  );
}
