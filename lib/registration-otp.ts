import { createHash, randomInt } from "crypto";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export function createOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(otp: string) {
  return createHash("sha256").update(`${otp}:${process.env.MEDISYNC_SESSION_SECRET ?? ""}`).digest("hex");
}

export async function sendRegistrationOtp(email: string, otp: string, name: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Registration email service is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your MediSync verification code",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#18202a">
          <h2 style="margin:0 0 12px">Verify your MediSync email</h2>
          <p style="line-height:1.6">Hi ${escapeHtml(name)}, use this one-time code to complete your MediSync patient registration:</p>
          <div style="font-size:32px;font-weight:800;letter-spacing:8px;padding:20px 0">${otp}</div>
          <p style="color:#667085;line-height:1.6">This code expires in ${OTP_TTL_MINUTES} minutes. If you did not start this registration, you can safely ignore this email.</p>
        </div>
      `,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Registration email delivery failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char);
}
