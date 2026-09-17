"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to reset password");
      setMessage(data.message);
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mesh-bg relative min-h-screen overflow-hidden px-5 py-8 text-[var(--ink)] md:px-8 md:py-10">
      <div className="mesh-orb absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#B9C5EC]/50 blur-3xl" />
      <div className="mesh-orb-delay absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#758FB5]/20 blur-3xl" />
      <div className="relative z-10 mx-auto flex min-h-[85vh] max-w-xl items-center justify-center">
        <div className="glass w-full rounded-[34px] p-2 shadow-[0_28px_90px_rgba(18,22,29,.14)]">
          <div className="rounded-[28px] bg-white p-7 sm:p-9">
            <Link href="/login" className="text-xs font-bold text-[var(--care)]">← Back to login</Link>
            <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Secure account recovery</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">Create a new password.</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Use at least 10 characters with uppercase, lowercase and a number.</p>
            {!token ? <div className="mt-7 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">This reset link is missing or invalid.</div> : (
              <form onSubmit={submit} className="mt-7">
                <label className="block text-sm font-bold">New password<input required minLength={10} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 outline-none focus:border-[var(--care)]" /></label>
                <label className="mt-4 block text-sm font-bold">Confirm password<input required minLength={10} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3 outline-none focus:border-[var(--care)]" /></label>
                {error && <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--danger)]">{error}</div>}
                {message && <div className="mt-4 rounded-2xl bg-[var(--care-soft)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--muted-strong)]">{message} <Link href="/login" className="font-bold text-[var(--care)] hover:underline">Sign in</Link></div>}
                <button disabled={loading} className="mt-5 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white shadow-xl disabled:opacity-60"><span>{loading ? "Updating…" : "Update password"}</span><span>→</span></button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
