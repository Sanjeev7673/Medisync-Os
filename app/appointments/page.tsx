"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PatientShell from "@/components/PatientShell";

type Specialist = { id: string; full_name: string; specialty: string; sub_specialty: string | null; profile: Record<string, unknown> };
type Slot = { id: string; specialist_id: string; hospital_id: string; starts_at: string; ends_at: string; status: string; booking_reference: string | null };

export default function AppointmentsPage() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [specialistResponse, slotResponse] = await Promise.all([fetch("/api/providers/specialists", { cache: "no-store" }), fetch("/api/appointments", { cache: "no-store" })]);
      const specialistBody = await specialistResponse.json();
      const slotBody = await slotResponse.json();
      if (!specialistResponse.ok) throw new Error(specialistBody?.error || "Unable to load specialists");
      if (!slotResponse.ok) throw new Error(slotBody?.error || "Unable to load appointments");
      setSpecialists(specialistBody.specialists ?? []); setSlots(slotBody.appointments ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load care providers"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load().catch(() => undefined); }, []);

  async function book(slotId: string) {
    setBooking(slotId); setMessage(""); setError("");
    try {
      const response = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointment_id: slotId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to book appointment");
      setMessage(`Appointment booked. Reference: ${data.appointment.booking_reference || "confirmed"}.`);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to book appointment"); }
    finally { setBooking(""); }
  }

  const visibleSlots = selectedSpecialist ? slots.filter((slot) => slot.specialist_id === selectedSpecialist) : slots;
  const specialistById = new Map(specialists.map((item) => [item.id, item]));

  return <PatientShell>
    <div className="reveal max-w-6xl">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--care)]">Specialist connection</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.04em] md:text-5xl">Talk to an authorized specialist.</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">Use your MediSync record as the shared context for a human specialist conversation. You can request a review or book an available appointment; MediSync does not replace clinical judgment.</p>

      {error && <div className="mt-6 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</div>}
      {message && <div className="mt-6 rounded-2xl bg-[var(--care-soft)] px-4 py-3 text-sm font-semibold text-[var(--care)]">{message}</div>}

      <section className="mt-8 grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="glass rounded-[30px] p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Verified specialist network</p><h2 className="mt-1 font-display text-2xl font-extrabold">Available professionals</h2><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Only verified and available specialist profiles are surfaced here.</p><div className="mt-5 space-y-3">{loading ? <p className="text-sm text-[var(--muted)]">Loading specialists…</p> : specialists.length ? specialists.map((specialist) => <button type="button" key={specialist.id} onClick={() => setSelectedSpecialist(specialist.id)} className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedSpecialist === specialist.id ? "border-[var(--care)] bg-[var(--care-soft)]" : "border-black/5 bg-white/70 hover:border-black/10"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold">{specialist.full_name}</p><p className="mt-1 text-xs text-[var(--muted)]">{specialist.specialty}{specialist.sub_specialty ? ` · ${specialist.sub_specialty}` : ""}</p></div><span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--success)]">Verified</span></div></button>) : <div className="rounded-2xl bg-white/70 p-5"><p className="text-sm font-bold">No available specialists yet.</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Verified professionals will appear here when they are onboarded and available.</p></div>}</div></div>

        <div className="glass rounded-[30px] p-6 md:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Appointment slots</p><h2 className="mt-1 font-display text-2xl font-extrabold">Book a consultation.</h2></div>{selectedSpecialist && <button onClick={() => setSelectedSpecialist("")} className="text-xs font-bold text-[var(--care)]">Show all</button>}</div><div className="mt-5 space-y-3">{visibleSlots.length ? visibleSlots.map((slot) => { const specialist = specialistById.get(slot.specialist_id); return <div key={slot.id} className="rounded-2xl border border-black/5 bg-white/70 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold">{specialist?.full_name || "Authorized specialist"}</p><p className="mt-1 text-xs text-[var(--muted)]">{specialist?.specialty || "Specialist care"} · {new Date(slot.starts_at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></div><button onClick={() => book(slot.id)} disabled={booking === slot.id} className="rounded-xl bg-[var(--ink)] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{booking === slot.id ? "Booking…" : "Book appointment"}</button></div></div>; }) : <div className="rounded-2xl bg-white/70 p-6"><p className="text-sm font-bold">No appointment slots available.</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">A hospital or specialist must publish an available slot before it can be booked.</p></div>}</div><div className="mt-6 rounded-2xl bg-[var(--ink)] p-5 text-white"><p className="text-xs font-bold uppercase tracking-wider text-white/45">Record context</p><p className="mt-2 text-sm leading-6 text-white/65">Your MediSync ID and uploaded medical evidence remain the source context for authorized care coordination.</p><Link href="/documents" className="mt-4 inline-flex text-xs font-bold text-white">Review medical records →</Link></div></div>
      </section>
    </div>
  </PatientShell>;
}
