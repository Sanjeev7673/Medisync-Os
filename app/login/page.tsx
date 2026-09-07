"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--paper)] px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center"><div className="h-9 w-9 rounded-md bg-[var(--care)] flex items-center justify-center"><span className="text-white font-display font-bold">M</span></div><span className="font-display font-bold text-xl tracking-tight">MediSync</span></div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-8">
          <h1 className="font-display font-bold text-xl mb-1">Sign in</h1>
          <p className="text-sm text-[var(--muted)] mb-6">Access your requests, referrals, and appointments.</p>
          <a href="/api/auth/login" className="block w-full text-center rounded-md bg-[var(--ink)] text-white text-sm font-medium py-2.5 hover:opacity-90 transition-opacity">Continue with MediSync</a>
          {error && <p className="text-xs text-red-600 mt-4 text-center">Authentication could not be completed. Please try again.</p>}
          <p className="text-xs text-[var(--muted)] mt-4 text-center">Secure sign-in is provided by Amazon Cognito.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
