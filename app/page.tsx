import Image from "next/image";

const features = [
  { icon: "⌁", title: "Patient Records", text: "Keep authorized teams aligned around a structured patient context and request history." },
  { icon: "▣", title: "Document Intelligence", text: "Turn healthcare documents into validated, usable information with OCR-assisted workflows." },
  { icon: "✦", title: "Provider Credentialing", text: "Track credentials, expiry dates and administrator review without repetitive manual follow-up." },
  { icon: "◇", title: "Insurance Management", text: "Organize coverage documents and surface missing, inconsistent or expired information." },
  { icon: "✓", title: "Compliance Monitoring", text: "Apply configurable administrative rules, surface exceptions and preserve an audit trail." },
  { icon: "↗", title: "Care Coordination", text: "Connect specialist review, hospital matching, referrals and appointments in one flow." },
];

const workflow = [
  ["01", "Request", "Patient or administrator starts a task"],
  ["02", "AI classify", "MediSync organizes the request"],
  ["03", "Workflow", "SNS Workbench routes the next step"],
  ["04", "Human review", "Authorized staff approve sensitive actions"],
  ["05", "Outcome", "Referral, compliance action or completion"],
];

const portals = [
  ["Patient", "Requests · Documents · Referrals · Appointments", "bg-[#E9F8F2]"],
  ["Specialist", "Reviews · Patient context · Approvals", "bg-[#EEF1FF]"],
  ["Hospital", "Referrals · Capabilities · Availability", "bg-[#F3EEFF]"],
  ["Admin", "Credentials · Insurance · Compliance · Audit", "bg-[#FFF3E6]"],
];

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[var(--background)] text-[var(--ink)]">
      <div className="mesh-bg relative">
        <div className="pointer-events-none absolute left-[4%] top-28 h-72 w-72 rounded-full bg-[#B9C5EC]/35 blur-3xl mesh-orb" />
        <div className="pointer-events-none absolute right-[-6%] top-10 h-96 w-96 rounded-full bg-[#CFEFE3]/45 blur-3xl mesh-orb-delay" />

        <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8">
          <a href="#top" className="flex items-center gap-3">
            <Image src="/medisync-mark.svg" alt="MediSync" width={42} height={42} className="rounded-2xl shadow-lg" />
            <div>
              <div className="font-display text-xl font-extrabold tracking-[-.04em]">MediSync</div>
              <div className="text-[9px] font-bold uppercase tracking-[.22em] text-[var(--muted)]">Connected Care OS</div>
            </div>
          </a>
          <div className="hidden items-center gap-7 text-sm font-semibold text-[var(--muted-strong)] md:flex">
            <a href="#platform" className="transition hover:text-[var(--care)]">Platform</a>
            <a href="#workflow" className="transition hover:text-[var(--care)]">How it works</a>
            <a href="#architecture" className="transition hover:text-[var(--care)]">Architecture</a>
          </div>
          <a href="/login" className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5">Open platform</a>
        </nav>

        <section id="top" className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 md:px-8 lg:grid-cols-[1.02fr_.98fr] lg:pb-28 lg:pt-20">
          <div className="reveal">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/65 px-4 py-2 text-[10px] font-bold uppercase tracking-[.17em] text-[var(--care)] backdrop-blur">
              <span className="pulse-soft h-2 w-2 rounded-full bg-[var(--success)]" /> AI-assisted · Human-led
            </div>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-extrabold leading-[.96] tracking-[-.055em] sm:text-6xl lg:text-[76px]">
              Healthcare administration, <span className="text-[var(--care)]">finally connected.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-[var(--muted-strong)] sm:text-lg sm:leading-8">
              MediSync coordinates patient records, documents, providers, insurance, compliance and care workflows through AI-assisted automation — while authorized people stay in control.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="/login" className="rounded-2xl bg-[var(--care)] px-6 py-3.5 text-center text-sm font-bold text-white shadow-xl shadow-blue-900/15 transition hover:-translate-y-1">Enter MediSync →</a>
              <a href="#workflow" className="rounded-2xl border border-black/8 bg-white/70 px-6 py-3.5 text-center text-sm font-bold text-[var(--ink)] backdrop-blur transition hover:-translate-y-1">See the workflow</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs font-semibold text-[var(--muted)]">
              <span>✓ Role-based access</span><span>✓ Human-in-the-loop</span><span>✓ Auditable workflows</span>
            </div>
          </div>

          <div className="relative reveal reveal-delay-2 min-h-[460px] lg:min-h-[540px]">
            <div className="absolute left-[4%] top-[7%] h-28 w-28 rounded-full border border-white/70 bg-white/45 blur-[1px] mesh-orb" />
            <div className="absolute right-[2%] top-[15%] h-20 w-20 rounded-full bg-[#DDE5FF]/70 blur-xl mesh-orb-delay" />
            <div className="float-card glass absolute left-[2%] top-[10%] w-[78%] rounded-[30px] p-4 shadow-[0_28px_90px_rgba(18,22,29,.13)] sm:left-[8%] sm:w-[76%]">
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">MediSync workspace</p><p className="mt-1 font-display text-sm font-extrabold">Administration overview</p></div>
                <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[9px] font-bold text-[var(--success)]">LIVE</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 py-4">
                {[["42", "Requests"], ["11", "Credentials"], ["05", "Alerts"]].map(([n, t]) => <div key={t} className="rounded-2xl bg-[#F7F8FB] p-3"><p className="font-display text-xl font-extrabold tracking-tight">{n}</p><p className="mt-1 text-[9px] font-semibold text-[var(--muted)]">{t}</p></div>)}
              </div>
              <div className="rounded-2xl bg-[var(--ink)] p-4 text-white">
                <div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/50">Active workflow</p><p className="mt-1 text-sm font-bold">Cardiology consultation</p></div><span className="text-xs text-[#A9DCC9]">94%</span></div>
                <div className="mt-4 flex items-center gap-1.5">{["Request", "AI", "Review", "Match", "Referral"].map((s, i) => <div key={s} className="flex flex-1 flex-col gap-1.5"><div className={`h-1.5 rounded-full ${i < 3 ? "bg-[#8FD4BD]" : "bg-white/15"}`} /><span className="text-[7px] font-semibold text-white/45">{s}</span></div>)}</div>
              </div>
            </div>

            <div className="float-card-delay glass absolute bottom-[4%] right-[1%] w-[62%] rounded-[26px] p-4 shadow-[0_24px_70px_rgba(18,22,29,.12)] sm:right-[5%]">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--care-soft)] text-lg text-[var(--care)]">✦</div><div><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[var(--muted)]">AI assistance</p><p className="text-sm font-extrabold">Specialist review required</p></div></div>
              <div className="mt-3 rounded-xl bg-[#F7F8FB] px-3 py-2 text-[10px] font-semibold text-[var(--muted-strong)]">Human approval remains the final action.</div>
            </div>

            <div className="absolute bottom-[22%] left-[-1%] hidden rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-lg backdrop-blur sm:block">
              <p className="text-[9px] font-bold uppercase tracking-[.15em] text-[var(--muted)]">Workflow engine</p><p className="mt-1 font-display text-sm font-extrabold text-[var(--care)]">SNS Workbench</p>
            </div>
          </div>
        </section>
      </div>

      <section className="border-y border-black/5 bg-white/70">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-black/5 md:grid-cols-4">
          {[["01", "Connected", "One administrative workspace"], ["02", "Assisted", "AI handles repetitive work"], ["03", "Controlled", "Humans approve sensitive actions"], ["04", "Auditable", "Every important transition is traceable"]].map(([n, t, d]) => <div key={n} className="p-6 md:p-8"><span className="text-[10px] font-bold tracking-[.18em] text-[var(--care)]">{n}</span><p className="mt-2 font-display text-base font-extrabold">{t}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{d}</p></div>)}
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="max-w-2xl reveal"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--care)]">One platform · four workspaces</p><h2 className="mt-4 font-display text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">Every team sees the part of healthcare administration they own.</h2><p className="mt-5 text-base leading-7 text-[var(--muted-strong)]">MediSync keeps the underlying workflow connected while giving each role a focused workspace.</p></div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {portals.map(([title, text, bg], i) => <div key={title} className={`reveal reveal-delay-${Math.min(i + 1, 3)} group rounded-[28px] border border-black/5 ${bg} p-6 transition duration-300 hover:-translate-y-2 hover:shadow-[0_24px_60px_rgba(18,22,29,.10)]`}><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 font-display text-lg font-extrabold">0{i + 1}</div><h3 className="mt-8 font-display text-xl font-extrabold">{title} Portal</h3><p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{text}</p><div className="mt-7 text-xs font-bold text-[var(--care)]">Explore workspace →</div></div>)}
        </div>
      </section>

      <section id="workflow" className="mesh-bg border-y border-black/5 px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--care)]">Core workflow · SNS Workbench</p><h2 className="mt-4 font-display text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">Automation without giving the wheel to AI.</h2><p className="mt-5 max-w-lg text-base leading-7 text-[var(--muted-strong)]">MediSync uses SNS Workbench as the AI and workflow orchestration layer. AI can classify, summarize and assist matching; authorized people remain responsible for sensitive decisions.</p><div className="mt-8 rounded-3xl border border-[var(--care)]/10 bg-white/65 p-5 backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--care)]">Guardrail</p><p className="mt-2 text-sm font-semibold leading-6">No autonomous diagnosis or prescribing. Sensitive clinical and administrative actions require appropriate human oversight.</p></div></div>
            <div className="space-y-3">
              {workflow.map(([number, title, text], i) => <div key={number} className="glass reveal flex items-center gap-4 rounded-3xl p-4 sm:p-5" style={{ animationDelay: `${i * 70}ms` }}><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ink)] font-display text-xs font-extrabold text-white">{number}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-sm font-extrabold sm:text-base">{title}</h3>{i === 2 && <span className="rounded-full bg-[var(--care-soft)] px-2 py-1 text-[8px] font-bold uppercase tracking-[.12em] text-[var(--care)]">SNS Workbench</span>}</div><p className="mt-1 text-xs leading-5 text-[var(--muted)] sm:text-sm">{text}</p></div><span className="hidden text-xl text-black/15 sm:block">→</span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[.82fr_1.18fr]">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--care)]">Built for the real administration problem</p><h2 className="mt-4 font-display text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">Less repetition. Better coordination. Stronger control.</h2></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((item, i) => <article key={item.title} className="group rounded-[26px] border border-black/5 bg-white p-5 shadow-[0_10px_35px_rgba(18,22,29,.045)] transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(18,22,29,.08)]"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--care-soft)] font-display text-lg font-extrabold text-[var(--care)]">{item.icon}</span><span className="text-[9px] font-bold tracking-[.15em] text-black/20">0{i + 1}</span></div><h3 className="mt-5 font-display text-base font-extrabold">{item.title}</h3><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="architecture" className="border-y border-black/5 bg-[var(--ink)] px-5 py-20 text-white md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#9FDAC7]">Architecture</p><h2 className="mt-4 font-display text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">A product layer on top of an intelligent workflow layer.</h2><p className="mt-5 max-w-lg text-sm leading-7 text-white/60">The frontend is the product experience. Next.js exposes the API boundary. SNS Workbench orchestrates AI and workflows. Supabase is the free MVP data layer and Cloudflare R2 stores documents.</p></div>
            <div className="rounded-[32px] border border-white/10 bg-white/[.04] p-5 sm:p-7">
              <div className="rounded-2xl border border-white/10 bg-white/[.05] p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-white/40">Experience</p><p className="mt-1 font-display text-lg font-extrabold">Next.js + React + Tailwind + Motion</p></div>
              <div className="mx-auto h-7 w-px bg-white/15" />
              <div className="rounded-2xl border border-[#8FCFBB]/20 bg-[#8FCFBB]/10 p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#9FDAC7]">API boundary</p><p className="mt-1 font-display text-lg font-extrabold">Next.js API Routes</p></div>
              <div className="mx-auto h-7 w-px bg-white/15" />
              <div className="rounded-2xl border border-[#9B9FF0]/25 bg-[#9B9FF0]/10 p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#C5C8FF]">Mandatory orchestration layer</p><p className="mt-1 font-display text-lg font-extrabold">SNS Workbench · AI + Workflows</p></div>
              <div className="grid grid-cols-2 gap-3 pt-3"><div className="rounded-2xl border border-white/10 bg-white/[.04] p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-white/40">Data</p><p className="mt-1 text-sm font-bold">Supabase</p></div><div className="rounded-2xl border border-white/10 bg-white/[.04] p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-white/40">Documents</p><p className="mt-1 text-sm font-bold">Cloudflare R2</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
        <div className="relative overflow-hidden rounded-[38px] bg-[var(--care)] p-8 text-white shadow-[0_30px_90px_rgba(37,73,168,.20)] sm:p-12 lg:p-16">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/15" /><div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border border-white/10" />
          <div className="relative max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/65">MediSync</p><h2 className="mt-4 font-display text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">Move healthcare administration forward.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-white/75">A connected platform for records, documents, credentialing, insurance, compliance and coordinated care — designed around people, not around paperwork.</p><a href="/login" className="mt-8 inline-flex rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-[var(--care)] transition hover:-translate-y-1">Open MediSync →</a></div>
        </div>
      </section>

      <footer className="border-t border-black/5 px-5 py-8 md:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs font-semibold text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Image src="/medisync-mark.svg" alt="" width={24} height={24} className="rounded-lg" /><span>MediSync · Connected Care OS</span></div><span>AI-assisted · Human-led · Auditable</span></div></footer>
    </main>
  );
}
