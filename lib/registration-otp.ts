import { createHash, randomInt } from "crypto";
import nodemailer from "nodemailer";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export function createOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(otp: string) {
  return createHash("sha256").update(`${otp}:${process.env.MEDISYNC_SESSION_SECRET ?? ""}`).digest("hex");
}

export async function sendRegistrationOtp(email: string, otp: string, name: string) {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;

  if (!user || !pass || !from) {
    throw new Error("SMTP email service is not configured");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: "Your MediSync verification code",
    text: `Hi ${name}, your MediSync verification code is ${otp}. This code expires in ${OTP_TTL_MINUTES} minutes. If you did not start this registration, you can safely ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#18202a"><h2 style="margin:0 0 12px">Verify your MediSync email</h2><p style="line-height:1.6">Hi ${escapeHtml(name)}, use this one-time code to complete your MediSync patient registration:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;padding:20px 0">${otp}</div><p style="color:#667085;line-height:1.6">This code expires in ${OTP_TTL_MINUTES} minutes. If you did not start this registration, you can safely ignore this email.</p></div>`,
  });
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
  return value.replace(/[&<>\"']/g, (char) => entities[char] ?? char);
}
