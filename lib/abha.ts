import { createHmac } from "crypto";
import { getDb } from "@/lib/db";
import type { Session } from "@/lib/auth";

const ABHA_RE = /^\d{2}-\d{4}-\d{4}-\d{4}$/;

function secret() {
  const value = process.env.ABHA_IDENTITY_SECRET || process.env.MEDISYNC_WEBHOOK_SECRET;
  if (!value) throw new Error("Missing ABHA_IDENTITY_SECRET");
  return value;
}

export function normalizeAbha(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) throw new Error("ABHA number must contain 14 digits.");
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10, 14)}`;
}

export function hashAbha(value: string) {
  return createHmac("sha256", secret()).update(normalizeAbha(value)).digest("hex");
}

export async function getAbhaIdentity(session: Session) {
  if (session.role !== "patient" || !session.patientId) throw new Error("FORBIDDEN");
  const { data, error } = await getDb().from("abha_identifiers").select("verification_status,abha_last4,verified_at,verification_source,updated_at").eq("user_id", session.patientId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function linkAbha(session: Session, value: string) {
  if (session.role !== "patient" || !session.patientId) throw new Error("FORBIDDEN");
  const normalized = normalizeAbha(value);
  const hash = hashAbha(normalized);
  const { data: collision } = await getDb().from("abha_identifiers").select("user_id").eq("abha_hash", hash).neq("user_id", session.patientId).maybeSingle<{ user_id: string }>();
  if (collision) throw new Error("ABHA_ALREADY_LINKED");

  const verificationUrl = process.env.ABDM_ABHA_VERIFY_URL;
  let status: "PENDING" | "VERIFIED" | "UNAVAILABLE" = verificationUrl ? "PENDING" : "UNAVAILABLE";
  let verifiedAt: string | null = null;
  let source: string | null = verificationUrl ? "ABDM_CONFIGURED" : "ABDM_NOT_CONFIGURED";

  if (verificationUrl) {
    try {
      const response = await fetch(verificationUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(process.env.ABDM_ABHA_VERIFY_TOKEN ? { Authorization: `Bearer ${process.env.ABDM_ABHA_VERIFY_TOKEN}` } : {}) },
        body: JSON.stringify({ abha: normalized, patient_id: session.patientId }),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const result = await response.json().catch(() => null);
        if (result?.verified === true) { status = "VERIFIED"; verifiedAt = new Date().toISOString(); source = "ABDM"; }
        else status = "PENDING";
      } else status = "PENDING";
    } catch {
      status = "PENDING";
    }
  }

  const { data, error } = await getDb().from("abha_identifiers").upsert({ user_id: session.patientId, abha_hash: hash, abha_last4: normalized.slice(-4), verification_status: status, verified_at: verifiedAt, verification_source: source }, { onConflict: "user_id" }).select("verification_status,abha_last4,verified_at,verification_source,updated_at").single();
  if (error) throw error;
  return data;
}

export function isAbha(value: string) { return ABHA_RE.test(value); }
