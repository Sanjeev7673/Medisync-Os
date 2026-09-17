"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Fingerprint,
  Globe2,
  Hospital,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useState } from "react";

type Mode = "signin" | "signup";

type Role = {
  key: string;
  label: string;
  description: string;
  signIn: string;
  signUp: string;
  icon: typeof CircleUserRound;
};

const roles: Role[] = [
  {
    key: "patient",
    label: "Patient",
    description: "Personal care, records & appointments",
    signIn: "/patient/login",
    signUp: "/register/patient",
    icon: CircleUserRound,
  },
  {
    key: "hospital",
    label: "Hospital",
    description: "Care coordination & operations",
    signIn: "/hospital/login",
    signUp: "/register/hospital",
    icon: Hospital,
  },
  {
    key: "insurance",
    label: "Insurance",
    description: "Claims, coverage & authorizations",
    signIn: "/insurance/login",
    signUp: "/register/insurance",
    icon: ShieldCheck,
  },
  {
    key: "admin",
    label: "Admin",
    description: "Platform, users & system control",
    signIn: "/admin/login",
    signUp: "/register/admin",
    icon: Building2,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export default function LoginPortalSelector() {
  const [mode, setMode] = useState<Mode>("signin");

  const target = (role: Role) => (mode === "signin" ? role.signIn : role.signUp);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090D16] text-white selection:bg-cyan-400/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.13),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(34,211,238,0.12),transparent_25%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.07),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(148,163,184,0.5)_0.7px,transparent_0.7px)] [background-size:18px_18px]" />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-28 top-32 h-72 w-72 rounded-full bg-emerald-400/10 blur-[100px]"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-cyan-400/10 blur-[110px]"
        animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-1.5 shadow-[0_0_35px_rgba(16,185,129,0.12)] backdrop-blur-xl">
            <Image src="/medisync-mark.svg" alt="MediSync" width={38} height={38} className="rounded-xl" />
          </div>
          <div>
            <p className="font-display text-lg font-extrabold tracking-tight">MediSync</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">Care OS</p>
          </div>
        </Link>

        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2.5 text-xs font-bold text-slate-300 backdrop-blur-xl transition hover:border-emerald-400/30 hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to home
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-92px)] max-w-7xl items-center justify-center px-5 pb-12 pt-5 sm:px-8 lg:px-10 lg:pb-16">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="w-full max-w-5xl"
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300 backdrop-blur-xl">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              Secure healthcare access
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
              One platform. <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">Every care role.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Choose how you want to access MediSync, then continue directly to your secure workspace.
            </p>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-2 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-3">
            <div className="rounded-[24px] border border-white/[0.07] bg-[#0D1320]/90 p-5 sm:p-7 lg:p-9">
              <div className="mx-auto flex w-full max-w-md rounded-2xl border border-white/10 bg-black/20 p-1" role="tablist" aria-label="Authentication mode">
                {(["signin", "signup"] as Mode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={mode === item}
                    onClick={() => setMode(item)}
                    className="relative flex-1 rounded-xl px-4 py-3 text-sm font-bold capitalize text-slate-400 transition-colors hover:text-white"
                  >
                    {mode === item && (
                      <motion.span
                        layoutId="auth-mode"
                        className="absolute inset-0 rounded-xl border border-emerald-300/20 bg-gradient-to-r from-emerald-400/15 to-cyan-400/10 shadow-[0_0_25px_rgba(16,185,129,0.08)]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 ${mode === item ? "text-white" : ""}`}>
                      {item === "signin" ? "Sign In" : "Sign Up"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-stretch">
                <div className="flex-1">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">{mode === "signin" ? "Continue securely" : "Create access"}</p>
                      <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white">Choose your portal</h2>
                    </div>
                    <Fingerprint className="h-6 w-6 text-cyan-300/70" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {roles.map((role, index) => {
                      const Icon = role.icon;
                      return (
                        <motion.div
                          key={role.key}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.06, duration: 0.35 }}
                        >
                          <Link
                            href={target(role)}
                            className="group relative block overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-white/[0.07] hover:shadow-[0_12px_40px_rgba(16,185,129,0.08)]"
                          >
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/0 to-transparent transition-all duration-300 group-hover:via-emerald-300/60" />
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-emerald-400/15 to-cyan-400/10 text-emerald-300 transition-transform duration-300 group-hover:scale-105">
                                <Icon className="h-5 w-5" />
                              </div>
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Active
                              </span>
                            </div>
                            <h3 className="mt-5 font-display text-lg font-extrabold text-white">{role.label}</h3>
                            <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{role.description}</p>
                            <div className="mt-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 transition-colors group-hover:text-emerald-300">
                              <span>{mode === "signin" ? "Continue" : "Create account"}</span>
                              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className="hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent lg:block" />

                <div className="lg:w-64 lg:pt-1">
                  <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.08] text-cyan-300">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="mt-4 font-display text-base font-extrabold text-white">Fast, secure access</h3>
                    <p className="mt-2 text-xs leading-5 text-slate-500">Use your role-specific portal and keep every authentication path in one clean flow.</p>
                    <div className="mt-5 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Role-based access</div>
                      <div className="flex items-center gap-2 text-xs text-slate-400"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Protected sessions</div>
                      <div className="flex items-center gap-2 text-xs text-slate-400"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Healthcare-first workflow</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-white/[0.07] pt-5 text-[11px] text-slate-500">
                <Globe2 className="h-3.5 w-3.5 text-slate-600" />
                <span>Secure authentication</span>
                <span className="text-slate-700">•</span>
                <UsersRound className="h-3.5 w-3.5 text-slate-600" />
                <span>Built for care teams</span>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Link href="/signin" className="group flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-bold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white">
                  <KeyRound className="h-4 w-4" />
                  Email / Password
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link href="/signin" className="group flex items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] px-4 py-3 text-xs font-bold text-cyan-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.08]">
                  <Mail className="h-4 w-4" />
                  Google / Email OTP
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-[10px] leading-5 text-slate-600">By continuing, you use the MediSync authentication flow for your selected workspace.</p>
        </motion.div>
      </section>
    </main>
  );
}
