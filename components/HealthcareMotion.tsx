"use client";

import { useEffect, useState } from "react";

const signals = [
  { label: "Secure intake", icon: "▣" },
  { label: "Clinical review", icon: "✚" },
  { label: "Care coordination", icon: "⌁" },
];

export default function HealthcareMotion() {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setPulse((value) => (value + 1) % 3), 2600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div aria-hidden="true" className="health-motion relative mx-auto mt-10 h-52 w-full max-w-xl overflow-hidden rounded-[30px] border border-white/60 bg-white/45 shadow-[0_24px_70px_rgba(18,22,29,.08)] backdrop-blur-xl">
      <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--care)]/10" />
      <div className="health-grid absolute inset-0 opacity-30" />
      <div className="health-heartbeat absolute left-8 right-8 top-1/2 h-20 -translate-y-1/2">
        <svg viewBox="0 0 700 100" className="h-full w-full overflow-visible">
          <path d="M0 52 H145 L170 52 L190 25 L211 78 L235 12 L260 52 H390 L415 52 L435 35 L452 67 L470 22 L492 52 H700" fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" className="text-[var(--care)]/80" />
        </svg>
      </div>
      <div className="health-scan absolute left-8 top-5 h-40 w-1 rounded-full bg-[var(--care)]/25 blur-[1px]" />
      <div className="absolute left-6 top-5 rounded-full bg-white/75 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.18em] text-[var(--care)]">Live care pathway</div>
      <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between gap-2">
        {signals.map((signal, index) => (
          <div key={signal.label} className={`health-signal rounded-2xl border border-white/80 bg-white/70 px-3 py-2 transition-all duration-500 ${pulse === index ? "-translate-y-1 shadow-lg" : ""}`}>
            <span className="mr-2 font-display text-sm font-extrabold text-[var(--care)]">{signal.icon}</span>
            <span className="text-[10px] font-bold text-[var(--muted-strong)]">{signal.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
