"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, MessageCircle, Send, Sparkles, X } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const WELCOME =
  "Hi! I’m MediSync Care Assistant. Ask me anything about MediSync, documents, hospital matching, appointments, or general healthcare information.";

export default function MediSyncChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: WELCOME },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const message = input.trim();
    if (!message || sending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to reach MediSync Assistant.");
      }

      const answer =
        typeof data?.response === "string"
          ? data.response
          : "I couldn't generate a response right now. Please try again.";

      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-[80] w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-[26px] border border-black/10 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,.22)] backdrop-blur-2xl md:right-6">
          <div className="relative overflow-hidden bg-[var(--ink)] px-5 py-4 text-white">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[var(--care)]/30 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <Bot className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-extrabold">MediSync AI</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/60">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                  Care Assistant
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close MediSync AI"
                className="rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="h-[min(440px,58vh)] space-y-3 overflow-y-auto bg-white px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[82%] rounded-2xl rounded-br-md bg-[var(--care)] px-4 py-2.5 text-sm leading-6 text-white shadow-sm"
                      : "max-w-[88%] rounded-2xl rounded-bl-md bg-[var(--care-soft)] px-4 py-2.5 text-sm leading-6 text-[var(--ink)]"
                  }
                >
                  {message.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-[var(--care-soft)] px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--care)] [animation-delay:-.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--care)] [animation-delay:-.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--care)]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t border-black/5 bg-white p-3">
            <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-slate-50 px-3 py-2 transition focus-within:border-[var(--care)]/40 focus-within:bg-white">
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--care)]" />
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask MediSync anything..."
                disabled={sending}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ink)] text-white transition hover:-translate-y-0.5 hover:bg-[var(--care)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="px-1 pt-2 text-[9px] leading-4 text-slate-400">
              AI-assisted information only. It does not replace a qualified healthcare professional.
            </p>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Minimize MediSync AI" : "Open MediSync AI"}
        className="group fixed bottom-5 right-4 z-[81] md:right-6"
      >
        {!open && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[var(--care)]/20" />
        )}
        <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[var(--ink)] text-white shadow-[0_14px_35px_rgba(15,23,42,.25)] ring-4 ring-white/80 transition duration-300 group-hover:-translate-y-1 group-hover:scale-105 group-hover:bg-[var(--care)]">
          {open ? <ChevronDown className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
        </span>
        {!open && (
          <span className="absolute -top-2 right-0 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.12em] text-[var(--ink)] shadow-sm ring-1 ring-black/5">
            MediSync AI
          </span>
        )}
      </button>
    </>
  );
}
