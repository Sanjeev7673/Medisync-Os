"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

type Role = "patient" | "hospital" | "insurance_agent";

const roles: { id: Role; label: string; eyebrow: string; description: string; icon: string }[] = [
  { id: "patient", label: "Patient", eyebrow: "Care access", description: "Requests, documents, referrals and appointments.", icon: "✦" },
  { id: "hospital", label: "Hospital", eyebrow: "Care delivery", description: "Referrals, capacity and coordinated patient intake.", icon: "＋" },
  { id: "insurance_agent", label: "Insurance agent", eyebrow: "Coverage", description: "Authorizations, coverage review and case coordination.", icon: "◇" },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>("patient");
  const error = searchParams.get("error");
  const selected = searchParams.get("selected");
  const actual = searchParams.get("actual");

  const errorMessage = useMemo(() => {
    if (error === "role_mismatch") {
      const selectedLabel = roles.find((item) => item.id === selected)?.label ?? "selected workspace";
      const actualLabel = roles.find((item) => item.id === actual)?.label ?? actual ?? "your authorized workspace";
      return `This account is authorized for ${actualLabel}, not ${selectedLabel}. Choose the matching workspace and sign in again.`;
    }
    if (error === "oauth_state") return "Your secure sign-in session expired. Please start again.";
    if (error === "oauth_token") return "The identity provider could not complete sign-in. Please try again.";
    if (error) return "Authentication could not be completed. Please try again.";
    return null;
  }, [actual, error, selected]);

  return (
    <main className="mesh-bg relative min-h-screen overflow-hidden px-5 py-6 text-[var(--ink)] md:px-8 md:py-8">
      <div className="mesh-orb absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#B9C5EC]/60 blur-3xl" />
      <div className="mesh-orb-delay absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#758FB5]/20 blur-3xl" />
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3"><Image src="/medisync-mark.svg" alt="MediSync" width={44} height={44} className="rounded-2xl shadow-lg" /><div><p className="font-display text-lg font-extrabold tracking-tight">MediSync</p><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[var(--muted)]">Care OS</p></div></div>
        <div className="hidden items-center gap-2 rounded-full border border-black/5 bg-white/55 px-3 py-2 text-xs font-semibold text-[var(--muted)] backdrop-blur md:flex"><span className="h-2 w-2 rounded-full bg-[var(--success)]" /> Secure role-based access</div>
      </nav>
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-92px)] max-w-7xl items-center gap-10 py-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
        <div className="reveal hidden lg:block">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/60 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--care)] backdrop-blur">AI-assisted · Human-led care</p>
          <h1 className="max-w-2xl font-display text-6xl font-extrabold leading-[.98] tracking-[-.045em] xl:text-7xl">Healthcare coordination that feels <span className="text-[var(--care)]">human.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted-strong)]">One connected care network where patients, hospitals and insurance teams can move the right information to the right next step.</p>
          <div className="mt-12 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              ["01", "Your input", "Start with the request or task you need to handle."],
              ["02", "AI assistance", "MediSync organizes the information and next step."],
              ["03", "Human control", "Authorized teams review and act on the workflow."],
            ].map(([number, title, description]) => (
              <div key={number} className="float-card glass rounded-3xl p-4">
                <span className="text-[10px] font-bold tracking-[.16em] text-[var(--care)]">{number}</span>
                <p className="mt-2 font-display text-sm font-extrabold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="reveal reveal-delay-1 mx-auto w-full max-w-xl">
          <div className="glass rounded-[34px] p-2 shadow-[0_28px_90px_rgba(18,22,29,.14)]">
            <div className="rounded-[28px] bg-white p-7 sm:p-9">
              <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Welcome to MediSync</p><h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight">Choose your workspace.</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Your role determines the tools, pipelines and information you see after secure sign-in.</p></div>
              <div className="grid gap-3">
                {roles.map((item) => <button key={item.id} type="button" onClick={() => setRole(item.id)} className={`group rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${role === item.id ? "border-[var(--care)] bg-[var(--care-soft)]/55 shadow-[0_10px_30px_rgba(37,73,168,.10)]" : "border-black/5 bg-[#FAFAFA] hover:border-black/10"}`}><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm ${role === item.id ? "bg-[var(--care)] text-white" : "bg-black/5 text-[var(--muted-strong)]"}`}>{item.icon}</span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--muted)]">{item.eyebrow}</p><p className="font-display text-sm font-extrabold">{item.label}</p><p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">{item.description}</p></div><span className={`h-3 w-3 rounded-full border ${role === item.id ? "border-[var(--care)] bg-[var(--care)] ring-4 ring-[var(--care-soft)]" : "border-black/15"}`} /></div></button>)}
              </div>
              <a href={`/api/auth/login?role=${role}`} className="group mt-5 flex w-full items-center justify-between rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white shadow-xl shadow-slate-900/10 transition-transform hover:-translate-y-0.5"><span>Continue as {roles.find((item) => item.id === role)?.label}</span><span className="text-lg transition-transform group-hover:translate-x-1">→</span></a>
              {errorMessage && <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--danger)]">{errorMessage}</div>}
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[var(--care-soft)]/65 p-4"><span className="mt-0.5 text-[var(--care)]">◉</span><p className="text-xs leading-5 text-[var(--muted-strong)]"><strong>Secure by design.</strong> Workspace selection only guides routing. The authenticated role remains the authorization source for protected dashboards.</p></div>
              <p className="mt-7 text-center text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--muted)]">MediSync · Connected healthcare network</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() { return <Suspense fallback={null}><LoginForm /></Suspense>; }
