"use client";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); router.push("/dashboard"); }
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--paper)] px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center"><div className="h-9 w-9 rounded-md bg-[var(--care)] flex items-center justify-center"><span className="text-white font-display font-bold">M</span></div><span className="font-display font-bold text-xl tracking-tight">MediSync</span></div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-8">
          <h1 className="font-display font-bold text-xl mb-1">Sign in</h1>
          <p className="text-sm text-[var(--muted)] mb-6">Access your requests, referrals, and appointments.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">Email</span><input type="email" required defaultValue="patient@example.com" className="rounded-md border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--care)]" /></label>
            <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">Password</span><input type="password" required defaultValue="••••••••" className="rounded-md border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--care)]" /></label>
            <button type="submit" className="mt-2 rounded-md bg-[var(--ink)] text-white text-sm font-medium py-2.5 hover:opacity-90 transition-opacity">Sign in</button>
          </form>
          <p className="text-xs text-[var(--muted)] mt-4 text-center">Authentication is not wired to Cognito yet — this form signs you in as a demo patient (P1001).</p>
        </div>
      </div>
    </div>
  );
}