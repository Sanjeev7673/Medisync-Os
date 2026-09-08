"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardEntry() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then((data) => {
      const role = data?.user?.role;
      if (role === "hospital") router.replace("/hospital/dashboard");
      else if (role === "insurance_agent") router.replace("/insurance/dashboard");
      else if (role === "specialist") router.replace("/specialist/dashboard");
      else if (role === "admin") router.replace("/admin/dashboard");
      else router.replace("/patient/dashboard");
    }).catch(() => router.replace("/login"));
  }, [router]);

  return <main className="mesh-bg flex min-h-screen items-center justify-center"><div className="glass rounded-3xl px-6 py-5 text-sm font-semibold text-[var(--muted-strong)]">Opening your MediSync workspace…</div></main>;
}
