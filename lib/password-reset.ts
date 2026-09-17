import { createHash, randomBytes } from "crypto";
import nodemailer from "nodemailer";

export const PASSWORD_RESET_TTL_MINUTES = 30;

export function createPasswordResetToken() {
  return randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256")
    .update(`${token}:${process.env.MEDISYNC_SESSION_SECRET ?? ""}`)
    .digest("hex");
}

export async function sendPasswordResetEmail(email: string, name: string, resetUrl: string) {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;

  if (!user || !pass || !from) throw new Error("SMTP email service is not configured");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: "Reset your MediSync password",
    text: `Hi ${name}, use this link to reset your MediSync password: ${resetUrl}. This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes. If you did not request this, you can safely ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#18202a"><h2 style="margin:0 0 12px">Reset your MediSync password</h2><p style="line-height:1.6">Hi ${escapeHtml(name)}, we received a request to reset your MediSync password.</p><p style="margin:24px 0"><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#18202a;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700">Reset password</a></p><p style="color:#667085;line-height:1.6">This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes. If you did not request a password reset, you can safely ignore this email.</p></div>`,
  });
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
  return value.replace(/[&<>\"']/g, (char) => entities[char] ?? char);
}
