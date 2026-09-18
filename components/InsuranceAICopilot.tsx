"use client";

import { FormEvent, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";

const QUICK_PROMPTS = [
  "Explain the insurance authorization workflow.",
  "What documents should I check before reviewing a case?",
  "Help me identify missing information in this insurance case.",
];

export default function InsuranceAICopilot() {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(event?: FormEvent, preset?: string) {
    event?.preventDefault();
    const question = (preset ?? input).trim();
    if (!question || loading) return;

    setInput(question);
    setLoading(true);
    setAnswer("");

    try {
      const message = [
        "You are MediSync Insurance AI Copilot.",
        "You assist an authenticated insurance operations user.",
        "Be clear, concise and professional.",
        "Only use facts supplied by the user or established MediSync workflow context.",
        "Never invent policy terms, eligibility, coverage, claim status, approval amounts, hospital availability, or case outcomes.",
        "You may summarize evidence, explain workflow concepts, identify missing information, and draft review questions.",
        "Do not make or imply a final insurance, coverage, medical, or authorization decision.",
        "If required information is missing, say exactly what is missing.",
        "",
        "User question:",
        question,
      ].join("\n");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Assistant unavailable.");
      setAnswer(typeof data?.response === "string" ? data.response : "No response returned.");
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-[28px] bg-[var(--ink)] p-6 text-white shadow-[var(--shadow-md)] md:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Insurance AI Copilot</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold">Review with AI assistance.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
            Summarize evidence, understand workflow steps and surface missing information. Final coverage and authorization decisions stay with authorized professionals.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button key={prompt} type="button" onClick={() => ask(undefined, prompt)} disabled={loading}
            className="rounded-full border border-white/10 bg-white/[.06] px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10 disabled:opacity-40">
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={ask} className="mt-4 flex gap-2 rounded-2xl bg-white p-2">
        <Sparkles className="ml-2 mt-2.5 h-4 w-4 shrink-0 text-[var(--care)]" />
        <input value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the Insurance AI Copilot..."
          disabled={loading}
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-slate-400" />
        <button type="submit" disabled={!input.trim() || loading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ink)] text-white disabled:opacity-30">
          <Send className="h-4 w-4" />
        </button>
      </form>

      {(loading || answer) && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.06] p-4">
          {loading ? <p className="text-sm text-white/60">Analyzing your request…</p> : <p className="whitespace-pre-wrap text-sm leading-6 text-white/85">{answer}</p>}
        </div>
      )}
    </section>
  );
}
